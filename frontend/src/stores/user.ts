import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/api'

interface UserStats {
  totalGames: number
  totalProfit: number
  winGames?: number
  drawGames?: number
  totalHours?: number
  bbPerHour?: number
}

interface GameRecord {
  id: number
  roomId: string
  hands: number
  finalChips: number
  createdAt: string
  // profit 将从 API 动态计算得到
  profit?: number
  // 游戏时长（小时）
  game_duration_hours?: number
  // 筹码盈亏
  chip_profit?: number
  // 大盲注
  big_blind?: number
  // 游戏货币
  currency?: 'CAD' | 'RMB'
  // 服务器返回的其他字段
  room_id?: string
  joined_at?: string
  created_at?: string
  settled_at?: string
}

interface MonthlyStats {
  totalGames: number
  totalProfit: number
  winGames: number
}

export const useUserStore = defineStore('user', () => {
  // 状态
  const userId = ref<string>('')
  const nickname = ref<string>('')
  const preferredCurrency = ref<'CAD' | 'RMB'>('CAD')
  const preferredLanguage = ref<'zh' | 'en'>('zh')
  const isInitialized = ref(false)

  // 生成用户ID
  function generateUserId(): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substr(2, 9)
    return `user_${timestamp}_${random}`
  }

  // 初始化用户
  async function initializeUser(preferredNickname?: string): Promise<string> {
    try {
      console.log('🚀 开始初始化用户...')
      // 检查是否已有用户ID
      let currentUserId = localStorage.getItem('userId')
      
      if (!currentUserId) {
        // 生成新的用户ID
        currentUserId = generateUserId()
        localStorage.setItem('userId', currentUserId)
        console.log('🆔 生成新用户ID:', currentUserId)
      } else {
        console.log('🆔 使用现有用户ID:', currentUserId)
      }

      // 设置用户数据（不再调用后端用户API）
      userId.value = currentUserId
      
      // 从localStorage恢复昵称
      const savedNickname = localStorage.getItem('userNickname')
      nickname.value = preferredNickname || savedNickname || ''
      
      // 如果提供了新昵称，保存到localStorage
      if (preferredNickname && preferredNickname !== savedNickname) {
        localStorage.setItem('userNickname', preferredNickname)
        nickname.value = preferredNickname
        console.log('💾 保存新昵称到localStorage:', preferredNickname)
      }
      
      isInitialized.value = true

      console.log('✅ 用户初始化完成 - ID:', userId.value, '昵称:', nickname.value)
      return currentUserId
    } catch (error) {
      console.error('❌ 初始化用户失败:', error)
      
      // 降级处理 - 仅使用本地存储
      console.log('🔄 使用降级处理（仅本地存储）...')
      let currentUserId = localStorage.getItem('userId')
      if (!currentUserId) {
        currentUserId = generateUserId()
        localStorage.setItem('userId', currentUserId)
        console.log('🆔 降级处理：生成新用户ID:', currentUserId)
      } else {
        console.log('🆔 降级处理：使用现有用户ID:', currentUserId)
      }
      
      userId.value = currentUserId
      nickname.value = localStorage.getItem('userNickname') || ''
      isInitialized.value = true
      
      console.log('✅ 降级处理完成 - ID:', userId.value, '昵称:', nickname.value)
      return currentUserId
    }
  }

  // 更新昵称（本地存储 + 服务器同步）
  async function updateNickname(newNickname: string): Promise<void> {
    try {
      // 验证昵称
      if (!newNickname || !newNickname.trim()) {
        throw new Error('昵称不能为空')
      }

      const trimmedNickname = newNickname.trim()
      
      if (trimmedNickname.length > 20) {
        throw new Error('昵称长度不能超过20个字符')
      }

      console.log('📡 开始更新昵称到服务器:', trimmedNickname)

      // 先更新到服务器
      const response = await api.put(`/user/${userId.value}/nickname`, {
        nickname: trimmedNickname
      })

      if (response.data.success) {
        console.log(`✅ 服务器昵称更新成功，已更新 ${response.data.updatedRecords} 条历史记录`)
        
        // 服务器更新成功后，更新本地状态
        nickname.value = trimmedNickname
        localStorage.setItem('userNickname', trimmedNickname)
        
        // 同步更新当前游戏中的玩家名字（如果在房间中）
        console.log('🔄 检查是否需要同步游戏中的名字...')
        await syncNicknameToCurrentGame(trimmedNickname)
        
        console.log('✅ 昵称更新完成:', trimmedNickname)
      } else {
        throw new Error('服务器更新失败')
      }
    } catch (error: any) {
      console.error('更新昵称失败:', error)
      // 如果是网络错误或服务器错误，仍然更新本地存储作为fallback
      if (error.message?.includes('网络') || error.response?.status >= 500) {
        console.log('⚠️ 服务器更新失败，仅更新本地存储')
        nickname.value = newNickname.trim()
        localStorage.setItem('userNickname', newNickname.trim())
      }
      throw error
    }
  }
  
  // 更新货币偏好（仅本地存储）
  function updatePreferredCurrency(newCurrency: 'CAD' | 'RMB'): void {
    preferredCurrency.value = newCurrency
    localStorage.setItem('userPreferredCurrency', newCurrency)
    console.log('✅ 货币偏好已更新（本地）:', newCurrency)
  }

  // 更新语言偏好（仅本地存储）
  function updatePreferredLanguage(newLanguage: 'zh' | 'en'): void {
    console.log('🌐 updatePreferredLanguage 被调用，参数:', newLanguage)
    console.log('🌐 当前 preferredLanguage.value:', preferredLanguage.value)
    preferredLanguage.value = newLanguage
    localStorage.setItem('userPreferredLanguage', newLanguage)
    
    console.log('✅ 语言偏好已更新（本地）:', newLanguage)
    console.log('🌐 更新后 preferredLanguage.value:', preferredLanguage.value)
  }
  
  // 同步昵称到当前游戏
  async function syncNicknameToCurrentGame(newNickname: string): Promise<void> {
    try {
      // 动态导入避免循环依赖
      const { useRoomStore } = await import('./room')
      const { useGameStore } = await import('./game')
      const roomStore = useRoomStore()
      const gameStore = useGameStore()
      
      // 检查是否在房间中
      if (!roomStore.currentRoom?.roomId) {
        console.log('📝 不在房间中，跳过游戏昵称同步')
        return
      }
      
      // 调试：显示所有玩家信息
      console.log('🔍 当前游戏中的所有玩家:', gameStore.gameData.players.map(p => ({
        id: p.id,
        nickname: p.nickname,
        userId: p.userId,
        isCurrentUser: p.userId === userId.value
      })))
      console.log('🔍 当前用户ID:', userId.value)
      
      // 找到当前用户在游戏中的玩家记录
      const currentPlayer = gameStore.gameData.players.find(player => 
        // 使用userId精确匹配
        player.userId === userId.value
      )
      
      if (currentPlayer) {
        console.log(`🎮 找到当前用户在游戏中的记录，更新昵称: ${currentPlayer.nickname} → ${newNickname}`)
        await gameStore.updatePlayer(roomStore.currentRoom.roomId, currentPlayer.id, { 
          nickname: newNickname 
        })
        console.log('✅ 游戏中的昵称同步成功')
      } else {
        console.log('⚠️ 未找到当前用户在游戏中的玩家记录')
        
        // 尝试其他匹配策略作为fallback
        const fallbackPlayer = gameStore.gameData.players.find(player => 
          // 如果没有userId，尝试通过昵称模式匹配
          !player.userId && (
            player.nickname.includes('User_') && 
            userId.value && 
            player.nickname.includes(userId.value.slice(-4))
          )
        )
        
        if (fallbackPlayer) {
          console.log(`🔧 使用fallback策略找到玩家，更新昵称: ${fallbackPlayer.nickname} → ${newNickname}`)
          await gameStore.updatePlayer(roomStore.currentRoom.roomId, fallbackPlayer.id, { 
            nickname: newNickname 
          })
          console.log('✅ 使用fallback策略同步成功')
        } else {
          console.log('❌ 所有匹配策略都失败了')
        }
      }
    } catch (error) {
      console.error('❌ 同步昵称到游戏失败:', error)
    }
  }

  // 获取用户统计
  async function getUserStats(): Promise<UserStats> {
    try {
      const response = await api.get(`/user/${userId.value}/stats?currency=${preferredCurrency.value}`)
      const userData = response.data
      
      // 更新本地昵称（如果服务器返回了更新的昵称）
      if (userData.preferred_nickname !== undefined) {
        nickname.value = userData.preferred_nickname || ''
        if (userData.preferred_nickname) {
          localStorage.setItem('userNickname', userData.preferred_nickname)
        }
      }
      
      return {
        totalGames: userData.detailed_stats?.games_played || 0,
        totalProfit: userData.detailed_stats?.total_profit || 0,
        winGames: userData.detailed_stats?.win_games || 0,
        drawGames: userData.detailed_stats?.draw_games || 0,
        totalHours: userData.detailed_stats?.total_hours || 0,
        bbPerHour: userData.detailed_stats?.bb_per_hour || 0
      }
    } catch (error) {
      console.error('获取用户统计失败:', error)
      return {
        totalGames: 0,
        totalProfit: 0,
        winGames: 0,
        drawGames: 0,
        totalHours: 0,
        bbPerHour: 0
      }
    }
  }

  // 获取最近游戏
  async function getRecentGames(limit: number = 10): Promise<GameRecord[]> {
    try {
      const response = await api.get(`/user/${userId.value}/games?limit=${limit}`)
      return response.data
    } catch (error) {
      console.error('获取最近游戏失败:', error)
      return []
    }
  }

  // 获取全部游戏
  async function getAllGames(): Promise<GameRecord[]> {
    try {
      const response = await api.get(`/record/user/${userId.value}`)
      return response.data
    } catch (error) {
      console.error('获取全部游戏失败:', error)
      return []
    }
  }

  // 获取月度统计
  async function getMonthlyStats(year: number, month: number): Promise<MonthlyStats> {
    try {
      const response = await api.get(`/record/user/${userId.value}/monthly?year=${year}&month=${month}`)
      return response.data
    } catch (error) {
      console.error('获取月度统计失败:', error)
      return {
        totalGames: 0,
        totalProfit: 0,
        winGames: 0
      }
    }
  }

  // 保存游戏记录 (profit现在由后端动态计算)
  async function saveGameRecord(roomId: string, hands: number, finalChips: number): Promise<void> {
    try {
      await api.post('/record/save', {
        roomId,
        userId: userId.value,
        hands,
        finalChips
      })
    } catch (error) {
      console.error('保存游戏记录失败:', error)
      throw error
    }
  }

  // 添加手动记录
  async function addManualRecord(record: {
    date: string
    duration: number
    chipsPerHand: number
    bigBlind: number
    costPerHand: number
    currency: 'CAD' | 'RMB'
    hands: number
    finalChips: number
  }) {
    try {
      // 生成用户显示名称（与房间创建逻辑一致）
      let displayName = 'Host' // 默认值
      
      if (nickname.value && nickname.value.trim()) {
        displayName = nickname.value.trim()
        console.log('👑 使用用户昵称:', displayName)
      } else if (userId.value && userId.value.length >= 4) {
        displayName = `User_${userId.value.slice(-4)}`
        console.log('👑 使用用户ID生成显示名:', displayName)
      } else {
        console.log('👑 使用默认显示名:', displayName)
      }

      // 将昵称添加到记录中
      const recordWithNickname = {
        ...record,
        userNickname: displayName
      }

      const response = await api.post(`/user/${userId.value}/add-record`, recordWithNickname)
      return response.data
    } catch (error) {
      console.error('添加手动记录失败:', error)
      throw error
    }
  }

  // 清除用户数据
  function clearUserData() {
    localStorage.removeItem('userId')
    localStorage.removeItem('userNickname')
    localStorage.removeItem('userPreferredCurrency')
    localStorage.removeItem('userPreferredLanguage')
    userId.value = ''
    nickname.value = ''
    preferredCurrency.value = 'CAD'
    preferredLanguage.value = 'zh'
    isInitialized.value = false
  }

  // 从localStorage恢复用户状态
  function restoreUserState() {
    const savedUserId = localStorage.getItem('userId')
    const savedNickname = localStorage.getItem('userNickname')
    const savedCurrency = localStorage.getItem('userPreferredCurrency') as 'CAD' | 'RMB' | null
    const savedLanguage = localStorage.getItem('userPreferredLanguage') as 'zh' | 'en' | null
    
    console.log('🔄 恢复用户状态 - ID:', savedUserId, '昵称:', savedNickname, '货币:', savedCurrency, '语言:', savedLanguage)
    
    // 始终恢复偏好设置，即使没有userId
    preferredCurrency.value = savedCurrency || 'CAD'
    preferredLanguage.value = savedLanguage || 'zh'
    
    if (savedUserId) {
      userId.value = savedUserId
      nickname.value = savedNickname || ''
      isInitialized.value = true
      console.log('✅ 用户状态恢复成功')
    } else {
      console.log('⚠️ 未找到保存的用户状态，需要初始化')
    }
  }

  // 导出
  return {
    // 状态
    userId,
    nickname,
    preferredCurrency,
    preferredLanguage,
    isInitialized,
    
    // 行为
    initializeUser,
    updateNickname,
    updatePreferredCurrency,
    updatePreferredLanguage,
    syncNicknameToCurrentGame,
    getUserStats,
    getRecentGames,
    getAllGames,
    getMonthlyStats,
    saveGameRecord,
    addManualRecord,
    clearUserData,
    restoreUserState
  }
})
