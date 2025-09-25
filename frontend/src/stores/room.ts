import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/api'

interface Room {
  roomId: string
  chipsPerHand: number
  costPerHand: number
  currency: 'CAD' | 'RMB'
  createdAt: string
}

export const useRoomStore = defineStore('room', () => {
  // 状态
  const currentRoom = ref<Room | null>(null)
  const isInRoom = computed(() => !!currentRoom.value)

  // 行为
  async function createRoom(chipsPerHand: number, bigBlind: number, costPerHand: number, currency: 'CAD' | 'RMB' = 'CAD'): Promise<Room> {
    try {
      const response = await api.post('/room/create', {
        chipsPerHand,
        bigBlind,
        costPerHand,
        currency
      })
      
      const room = response.data
      
      // 保存到localStorage
      localStorage.setItem('currentRoom', JSON.stringify(room))
      
      // 稍微等待确保房间在后端完全初始化
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // 自动添加房主作为第一个玩家 (在设置currentRoom之前)
      console.log('🏠 创建房间成功，开始添加房主...')
      const { useUserStore } = await import('./user')
      const { useGameStore } = await import('./game')
      const userStore = useUserStore()
      const gameStore = useGameStore()
      
      // 确保用户已初始化
      console.log('👤 当前用户ID:', userStore.userId)
      if (!userStore.userId) {
        console.log('👤 初始化用户...')
        await userStore.initializeUser()
        console.log('👤 用户初始化完成，ID:', userStore.userId)
      }
      
      // 确保我们有最新的用户昵称（暂时禁用自动获取，防止数据冲突）
      console.log('🔄 使用本地缓存的昵称:', userStore.nickname)
      
      // TODO: 重新启用getUserStats()当数据加载问题解决后
      // try {
      //   const stats = await userStore.getUserStats()
      //   console.log('📊 用户统计数据获取成功，当前昵称:', userStore.nickname)
      // } catch (error) {
      //   console.log('⚠️ 获取用户统计失败，使用本地昵称:', error)
      // }
      
      // 添加房主作为第一个玩家
      // 优先使用昵称，没有昵称则使用用户ID的简化版本
      let displayName = 'Host' // 默认值
      
      if (userStore.nickname && userStore.nickname.trim()) {
        displayName = userStore.nickname.trim()
        console.log('👑 使用用户昵称:', displayName)
      } else if (userStore.userId && userStore.userId.length >= 4) {
        displayName = `User_${userStore.userId.slice(-4)}`
        console.log('👑 使用用户ID生成显示名:', displayName)
      } else {
        console.log('👑 使用默认显示名:', displayName)
      }
      
      // 确保用户已完全初始化
      if (!userStore.isInitialized) {
        console.log('⚠️ 用户未初始化，开始初始化...')
        await userStore.initializeUser()
      }
      
      console.log('👑 最终显示名:', displayName, '(用户ID:', userStore.userId, '昵称:', userStore.nickname, ')')
      console.log('🔍 房主添加前检查 - userStore.userId:', userStore.userId, '类型:', typeof userStore.userId)
      console.log('🔍 房主添加前检查 - userStore.isInitialized:', userStore.isInitialized)
      
      try {
        await gameStore.addPlayer(room.roomId, displayName, userStore.userId)
        console.log('✅ 房主添加成功！')
        
        // 等待一小段时间，让服务器处理添加玩家的请求
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (addPlayerError) {
        console.error('❌ 添加房主失败:', addPlayerError)
        // 即使添加房主失败，仍然返回房间信息
      }
      
      // 设置currentRoom，让GameView的watch来处理数据加载
      currentRoom.value = room
      
      return room
    } catch (error) {
      console.error('创建房间失败:', error)
      throw error
    }
  }

  async function joinRoom(roomId: string): Promise<Room> {
    try {
      console.log('🚪 开始加入房间:', roomId)
      
      // 首先检查房间是否存在且可用
      const response = await api.get(`/room/${roomId}`)
      
      const room = response.data
      console.log('🏠 房间信息获取成功:', room.roomId)
      
      // 获取用户信息和游戏store
      const { useUserStore } = await import('./user')
      const { useGameStore } = await import('./game')
      const userStore = useUserStore()
      const gameStore = useGameStore()
      
      // 确保用户已初始化
      if (!userStore.userId) {
        console.log('👤 初始化用户...')
        await userStore.initializeUser()
        console.log('👤 用户初始化完成，ID:', userStore.userId)
      }
      
      // 获取最新的用户昵称
      console.log('🔄 使用本地缓存的昵称:', userStore.nickname)
      
      // 生成显示名
      let displayName = 'Guest'
      if (userStore.nickname && userStore.nickname.trim()) {
        displayName = userStore.nickname.trim()
        console.log('👤 使用用户昵称:', displayName)
      } else if (userStore.userId && userStore.userId.length >= 4) {
        displayName = `User_${userStore.userId.slice(-4)}`
        console.log('👤 使用用户ID生成显示名:', displayName)
      }
      
      // 先加载游戏数据，检查用户是否已在房间中
      console.log('🔄 加载游戏数据，检查用户是否已在房间...')
      await gameStore.loadGameData(room.roomId)
      
      // 检查当前用户是否已经在房间中
      const existingPlayer = gameStore.gameData.players.find(player => 
        player.userId === userStore.userId
      )
      
      if (existingPlayer) {
        console.log('✅ 用户已在房间中:', existingPlayer.nickname)
        // 设置房间信息
        currentRoom.value = room
        localStorage.setItem('currentRoom', JSON.stringify(room))
      } else {
        // 确保用户已完全初始化
        if (!userStore.isInitialized) {
          console.log('⚠️ 用户未初始化，开始初始化...')
          await userStore.initializeUser()
        }
        
        // 自动添加当前用户到房间
        console.log('👤 将当前用户添加到房间:', displayName)
        console.log('🔄 当前房间玩家数量:', gameStore.gameData.players.length)
        console.log('🔍 加入房间前检查 - userStore.userId:', userStore.userId, '类型:', typeof userStore.userId)
        console.log('🔍 加入房间前检查 - userStore.isInitialized:', userStore.isInitialized)
        
        try {
          await gameStore.addPlayer(room.roomId, displayName, userStore.userId)
          console.log('✅ 用户添加到房间成功！')
          
          // 等待一小段时间，让服务器处理添加玩家的请求
          await new Promise(resolve => setTimeout(resolve, 100))
          
          // 设置房间信息，让GameView的watch来处理数据加载
          currentRoom.value = room
          localStorage.setItem('currentRoom', JSON.stringify(room))
          
          console.log('🔄 房间设置完成，等待GameView加载数据')
        } catch (addPlayerError) {
          console.error('❌ 添加用户到房间失败:', addPlayerError)
          // 即使添加用户失败，仍然设置房间信息以便观看
          currentRoom.value = room
          localStorage.setItem('currentRoom', JSON.stringify(room))
        }
      }
      
      return room
    } catch (error: any) {
      console.error('加入房间失败:', error)
      
      // 检查是否是房间不存在或已关闭的错误
      if (error.response?.status === 404 || error.message?.includes('Room not found or closed')) {
        const friendlyError = new Error('房间不存在或已被关闭，请检查房间号是否正确')
        friendlyError.name = 'RoomNotFoundError'
        throw friendlyError
      }
      
      throw error
    }
  }

  async function settleRoom(roomId: string) {
    try {
      console.log('🏁 开始结算房间:', roomId)
      
      // 调用后端API结算房间
      const response = await api.post(`/room/${roomId}/settle`, {})
      console.log('✅ 房间结算API调用成功:', response.data)
      
      // Socket会自动通知所有玩家房间已结算，包括自己
      // handleRoomSettled会自动清除本地状态和跳转页面
      
      console.log('🏁 房间结算API调用完成，等待Socket通知...')
    } catch (error) {
      console.error('❌ 结算房间失败:', error)
      throw error
    }
  }

  // 处理房间结算通知（由Socket事件触发）
  function handleRoomSettled() {
    console.log('🏁 处理房间结算通知 - 清除本地房间状态')
    currentRoom.value = null
    localStorage.removeItem('currentRoom')
  }


  async function getRoomRecords(roomId: string) {
    try {
      const response = await api.get(`/room/${roomId}/records`)
      return response.data
    } catch (error) {
      console.error('获取房间记录失败:', error)
      throw error
    }
  }

  async function getRoomStats(roomId: string) {
    try {
      const response = await api.get(`/room/${roomId}/stats`)
      return response.data
    } catch (error) {
      console.error('获取房间统计失败:', error)
      throw error
    }
  }

  // 初始化 - 从localStorage恢复房间状态
  function initializeRoom() {
    const savedRoom = localStorage.getItem('currentRoom')
    if (savedRoom) {
      try {
        currentRoom.value = JSON.parse(savedRoom)
      } catch (error) {
        console.error('恢复房间状态失败:', error)
        localStorage.removeItem('currentRoom')
      }
    }
  }

  // 导出
  return {
    // 状态
    currentRoom,
    isInRoom,
    
    // 行为
    createRoom,
    joinRoom,
    settleRoom,
    handleRoomSettled,
    getRoomRecords,
    getRoomStats,
    initializeRoom
  }
})
