import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GameData, Player } from '@/types'
import api from '@/services/api'
import { socketService } from '@/services/socket'

export const useGameStore = defineStore('game', () => {
  // 当前用户ID - 从外部设置
  const currentUserId = ref<string | null>(null)
  // State
  const gameData = ref<GameData>({
    currentChips: 1000,
    currentAdminId: 1,
    players: [],
    stats: {
      totalUp: 0,
      totalDown: 0,
      finalResult: 0
    }
  })
  
  const isConnected = ref(false)
  
  // Settlement state
  const showSettlementDialog = ref(false)
  const settlementData = ref<any[]>([])
  const settlementRoomInfo = ref<{ chipsPerHand: number, costPerHand: number, currency: string } | null>(null)

  // Getters - 判断当前用户是否是管理员
  const isCurrentUserAdmin = computed(() => {
    if (!currentUserId.value || !gameData.value?.players) return false
    
    // 找到当前用户在游戏中的玩家记录
    const currentPlayer = gameData.value.players.find(player => 
      player.userId === currentUserId.value
    )
    
    return currentPlayer?.isAdmin || false
  })

  // 获取当前用户在游戏中的玩家ID
  const currentUserPlayerId = computed(() => {
    if (!currentUserId.value || !gameData.value?.players) return null
    
    const currentPlayer = gameData.value.players.find(player => 
      player.userId === currentUserId.value
    )
    
    return currentPlayer?.id || null
  })

  const getPlayerById = computed(() => {
    return (id: number) => gameData.value?.players?.find(p => p.id === id)
  })

  // 计算每个玩家的正确 balance
  const playersWithCalculatedBalance = computed(() => {
    if (!gameData.value?.players) return []
    return gameData.value.players.map(player => ({
      ...player,
      balance: (player.chips === null || player.chips === undefined) 
        ? null  // 使用null表示未输入状态，在显示时会转换为"--"
        : Number((player.chips - player.hands * gameData.value.currentChips).toFixed(2))
    }))
  })

  // 计算统计数据
  const calculatedStats = computed(() => {
    const players = gameData.value.players
    const chipsPerHand = gameData.value.currentChips

    // Expected = 所有玩家的 hands × chips per hand 的总和
    const expected = players.reduce((sum, player) => sum + (player.hands * chipsPerHand), 0)
    
    // Actual = 所有玩家的 rm-chips 的总和（忽略null值）
    const actual = players.reduce((sum, player) => sum + (player.chips || 0), 0)
    
    // Result = actual - expected
    const result = actual - expected

    return {
      totalProfit: 0, // 保留原字段
      totalUp: expected,
      totalDown: actual,
      finalResult: result
    }
  })

  // Actions
  function setCurrentUserId(userId: string | null) {
    currentUserId.value = userId
  }

  async function loadGameData(roomId: string) {
    try {
      console.log('📊 加载房间游戏数据:', roomId)
      const data = await api.getGameData(roomId)
      console.log('📊 收到的完整数据:', data)
      console.log('📊 数据类型:', typeof data)
      console.log('📊 players属性:', data?.players)
      console.log('📊 游戏数据加载成功，玩家数量:', data.players?.length || 0)
      gameData.value = data
      console.log('📊 设置后的gameData.value:', gameData.value)
      console.log('📊 设置后的gameData.value.players:', gameData.value.players)
    } catch (error) {
      console.error('Failed to load game data:', error)
    }
  }

  function updateGameData(data: GameData) {
    const deviceType = navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'
    console.log(`🔄 Socket数据更新 (${deviceType}):`, {
      玩家数量: data.players?.length || 0,
      玩家列表: data.players?.map(p => ({ id: p.id, nickname: p.nickname, userId: p.userId })) || []
    })
    gameData.value = data
  }

  // Settlement functions
  function setSettlementData(players: any[], roomInfo: { chipsPerHand: number, costPerHand: number }) {
    // 计算每个玩家的profit并排序
    const sortedPlayers = players.map(player => {
      // 计算profit: balance转换为手数，然后乘以每手成本
      const handsProfit = player.balance / roomInfo.chipsPerHand
      const profitRaw = handsProfit * roomInfo.costPerHand
      // 使用更精确的舍入，避免小数损失导致的平局问题
      const profit = Number(profitRaw.toFixed(2))
      
      return {
        ...player,
        profit
      }
    }).sort((a, b) => b.profit - a.profit) // 按收益从高到低排序
    
    settlementData.value = sortedPlayers
    settlementRoomInfo.value = { ...roomInfo, currency: 'CAD' }
    showSettlementDialog.value = true
  }
  
  function clearSettlementData() {
    showSettlementDialog.value = false
    settlementData.value = []
    settlementRoomInfo.value = null
  }

  async function handleRoomSettled(data: any) {
    console.log('🏁 Game Store 收到房间结算通知:', data)
    console.log('🏁 当前 Socket 连接状态:', isConnected.value)
    console.log('🏁 收到的结算数据:', data.settlementResults)
    
    // 先设置结算数据，避免在路由跳转过程中丢失
    if (data.settlementResults) {
      console.log('🏁 立即设置结算数据到全局状态:', data.settlementResults)
      console.log('🏁 结算数据玩家数量:', data.settlementResults.players?.length)
      console.log('🏁 房间信息:', data.settlementResults.roomInfo)
      
      settlementData.value = data.settlementResults.players
      settlementRoomInfo.value = data.settlementResults.roomInfo
      showSettlementDialog.value = true
      
      console.log('🏁 结算弹窗状态已设置:', showSettlementDialog.value)
      console.log('🏁 当前结算数据:', settlementData.value)
    }
    
    // 清除游戏数据
    gameData.value = { 
      players: [], 
      currentChips: 1000,
      currentAdminId: 0,
      stats: {
        totalUp: 0,
        totalDown: 0,
        finalResult: 0
      }
    }
    
    // 导入路由并跳转到游戏主页
    import('@/router').then(async ({ default: router }) => {
      console.log('🏁 准备跳转到 /game 页面')
      await router.push('/game')
      console.log('🏁 页面跳转完成')
      
      // 页面跳转完成后，再清除房间状态
      // 这样可以避免在数据设置之前就断开Socket
      const { useRoomStore } = await import('./room')
      const roomStore = useRoomStore()
      roomStore.handleRoomSettled()
      console.log('🏁 已清除房间状态')
    })
    
    console.log('🏁 房间结算处理完成')
  }

  async function addPlayer(roomId: string, nickname: string, userId?: string) {
    try {
      await api.addPlayer(roomId, nickname, userId)
      // Data will be updated via socket
    } catch (error) {
      console.error('Failed to add player:', error)
      throw error
    }
  }

  async function updatePlayer(roomId: string, id: number, updates: Partial<Player>) {
    try {
      console.log('🎮 正在更新玩家:', { roomId, playerId: id, updates })
      await api.updatePlayer(roomId, id, updates)
      console.log('🎮 玩家更新API调用成功，等待Socket更新...')
      
      // 添加一个备用机制：等待1秒后如果没有Socket更新就手动刷新数据
      setTimeout(async () => {
        if (gameData.value?.players?.find(p => p.id === id)) {
          const currentPlayer = gameData.value.players.find(p => p.id === id)
          let needsRefresh = false
          
          // 检查更新是否已经应用
          if (updates.nickname && currentPlayer?.nickname !== updates.nickname) {
            needsRefresh = true
          }
          if (updates.hands !== undefined && currentPlayer?.hands !== updates.hands) {
            needsRefresh = true
          }
          if (updates.chips !== undefined && currentPlayer?.chips !== updates.chips) {
            needsRefresh = true
          }
          
          if (needsRefresh) {
            console.log('⚠️ Socket更新超时，手动刷新数据...')
            await loadGameData(roomId)
          }
        }
      }, 1000)
      
      // Data will be updated via socket
    } catch (error) {
      console.error('Failed to update player:', error)
      throw error
    }
  }

  async function deletePlayer(roomId: string, id: number) {
    try {
      console.log('🗑️ 正在删除玩家:', { roomId, playerId: id })
      await api.deletePlayer(roomId, id)
      console.log('🗑️ 玩家删除API调用成功，等待Socket更新...')
      // Data will be updated via socket
    } catch (error) {
      console.error('Failed to delete player:', error)
      throw error
    }
  }

  async function clearData(roomId: string) {
    try {
      await api.clearData(roomId)
      // Data will be updated via socket
    } catch (error) {
      console.error('Failed to clear data:', error)
      throw error
    }
  }

  async function updateCurrentChips(roomId: string, chips: number) {
    try {
      await api.updateCurrentChips(roomId, chips)
      // Data will be updated via socket
    } catch (error) {
      console.error('Failed to update current chips:', error)
      throw error
    }
  }

  function connectSocket(roomId?: string) {
    console.log('🔌 正在连接Socket...', { roomId, isConnected: isConnected.value })
    
    // 避免重复注册监听器
    if (!isConnected.value) {
      socketService.connect()
      socketService.on('gameDataUpdate', updateGameData)
      socketService.on('roomSettled', handleRoomSettled)
      isConnected.value = true
      console.log('✅ Socket监听器已注册 (gameDataUpdate, roomSettled)')
    } else {
      console.log('⚠️ Socket已连接，跳过重复注册监听器')
    }
    
    if (roomId) {
      console.log('🏠 加入Socket房间:', roomId)
      socketService.joinRoom(roomId)
    }
    
    console.log('✅ Socket连接流程完成')
  }

  function disconnectSocket(roomId?: string) {
    if (roomId) {
      console.log('🚪 离开Socket房间:', roomId)
      socketService.leaveRoom(roomId)
    }
    console.log('❌ 断开Socket连接')
    socketService.off('gameDataUpdate', updateGameData)
    socketService.off('roomSettled', handleRoomSettled)
    socketService.disconnect()
    isConnected.value = false
  }

  return {
    // State
    gameData,
    currentUserId,
    isConnected,
    showSettlementDialog,
    settlementData,
    settlementRoomInfo,
    
    // Getters
    isCurrentUserAdmin,
    currentUserPlayerId,
    getPlayerById,
    playersWithCalculatedBalance,
    calculatedStats,
    
    // Actions
    setCurrentUserId,
    loadGameData,
    updateGameData,
    addPlayer,
    updatePlayer,
    deletePlayer,
    clearData,
    updateCurrentChips,
    connectSocket,
    disconnectSocket,
    setSettlementData,
    clearSettlementData
  }
})
