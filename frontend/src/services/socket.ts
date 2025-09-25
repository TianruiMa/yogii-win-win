import { io, type Socket } from 'socket.io-client'
import type { GameData } from '@/types'

// 获取Socket服务器地址 - 与API服务保持一致
const getSocketUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    // 如果设置了API_URL，将 /api 替换为空来获取基础URL
    return import.meta.env.VITE_API_URL.replace('/api', '')
  }
  const hostname = window.location.hostname
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3000'
  } else {
    return `http://${hostname}:3000`
  }
}

class SocketService {
  private socket: Socket | null = null
  private listeners: Map<string, Function[]> = new Map()
  private pendingRoomId: string | null = null

  connect() {
    if (this.socket?.connected) return

    const socketUrl = getSocketUrl()
    console.log('🔌 连接Socket服务器:', socketUrl)
    console.log('🔌 当前环境信息:', {
      hostname: window.location.hostname,
      VITE_API_URL: import.meta.env.VITE_API_URL || 'undefined',
      userAgent: navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'
    })
    this.socket = io(socketUrl)

    this.socket.on('connect', () => {
      console.log('🔌 Connected to server')
      // 如果有待加入的房间，连接成功后立即加入
      if (this.pendingRoomId) {
        this.socket!.emit('joinRoom', this.pendingRoomId)
        console.log(`🏠 Connected and joined room: ${this.pendingRoomId}`)
        this.pendingRoomId = null
      }
    })

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from server')
    })

    this.socket.on('gameDataUpdate', (data: GameData) => {
      this.emit('gameDataUpdate', data)
    })

    this.socket.on('roomSettled', (data: any) => {
      console.log('🏁 Socket收到房间结算通知:', data)
      this.emit('roomSettled', data)
    })
  }

  joinRoom(roomId: string) {
    const isConnected = this.socket?.connected || false
    console.log(`🏠 尝试加入房间: ${roomId}, Socket连接状态: ${isConnected}`)
    
    if (this.socket?.connected) {
      this.socket.emit('joinRoom', roomId)
      console.log(`🏠 已发送joinRoom事件: ${roomId}`)
    } else {
      // 如果还没连接，保存房间ID等连接后再加入
      console.log(`⏳ Socket未连接，等待连接后加入房间: ${roomId}`)
      this.pendingRoomId = roomId
    }
  }

  leaveRoom(roomId: string) {
    if (this.socket?.connected) {
      this.socket.emit('leaveRoom', roomId)
      console.log(`🚪 Left room: ${roomId}`)
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)?.push(callback)
  }

  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event) || []
    console.log(`📡 Socket emit ${event} 事件, 监听器数量: ${callbacks.length}`, data)
    callbacks.forEach(callback => callback(data))
  }
}

export const socketService = new SocketService()
