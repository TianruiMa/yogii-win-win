import type { Player, GameData } from '@/types'

// 动态API地址配置
const getApiBase = () => {
  // 优先使用环境变量
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  
  // 自动检测网络环境
  const hostname = window.location.hostname
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // 本地开发
    return 'http://localhost:3000/api'
  } else {
    // 生产环境，使用服务器IP
    return 'http://34.130.185.125:3000/api'
  }
}

const API_BASE = getApiBase()

const api = {
  // 获取游戏数据
  async getGameData(roomId: string): Promise<GameData> {
    const response = await fetch(`${API_BASE}/game-data/${roomId}`)
    return response.json()
  },

  // 添加玩家
  async addPlayer(roomId: string, nickname: string, userId?: string): Promise<Player> {
    const response = await fetch(`${API_BASE}/player/${roomId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname, userId })
    })
    return response.json()
  },

  // 更新玩家
  async updatePlayer(roomId: string, id: number, updates: Partial<Player>): Promise<Player> {
    const response = await fetch(`${API_BASE}/player/${roomId}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
    return response.json()
  },

  // 删除玩家
  async deletePlayer(roomId: string, id: number): Promise<void> {
    console.log('🌐 API调用: DELETE /player', { roomId, playerId: id, url: `${API_BASE}/player/${roomId}/${id}` })
    const response = await fetch(`${API_BASE}/player/${roomId}/${id}`, {
      method: 'DELETE'
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ deletePlayer API失败:', response.status, errorText)
      throw new Error(`Failed to delete player: ${response.status} ${errorText}`)
    }
    
    console.log('✅ deletePlayer API成功')
  },

  // 清除数据
  async clearData(roomId: string): Promise<void> {
    await fetch(`${API_BASE}/clear-data/${roomId}`, {
      method: 'POST'
    })
  },

  // 更新当前筹码
  async updateCurrentChips(roomId: string, currentChips: number): Promise<void> {
    await fetch(`${API_BASE}/current-chips/${roomId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentChips })
    })
  },

  // ========================
  // 新的数据库API
  // ========================

  // 用户相关API
  async post(url: string, data: any): Promise<any> {
    const response = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return { data: await response.json() }
  },

  async get(url: string): Promise<any> {
    const response = await fetch(`${API_BASE}${url}`)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      const error = new Error(errorData.error || `HTTP ${response.status}`)
      if (response.status === 404) {
        error.name = 'RoomNotFoundError'
      }
      throw error
    }
    return { data: await response.json() }
  },

  async put(url: string, data: any): Promise<any> {
    const response = await fetch(`${API_BASE}${url}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return { data: await response.json() }
  },

  async delete(url: string, data?: any): Promise<any> {
    const options: RequestInit = {
      method: 'DELETE'
    }
    if (data) {
      options.headers = { 'Content-Type': 'application/json' }
      options.body = JSON.stringify(data)
    }
    const response = await fetch(`${API_BASE}${url}`, options)
    return { data: await response.json() }
  },

  // 检查记录是否可以删除
  async canDeleteRecord(recordId: number, userId: string): Promise<{ canDelete: boolean; reason?: string; roomId?: string }> {
    const response = await fetch(`${API_BASE}/record/${recordId}/can-delete?userId=${encodeURIComponent(userId)}`)
    if (!response.ok) {
      throw new Error('Failed to check if record can be deleted')
    }
    return response.json()
  },

  // 删除记录
  async deleteRecord(recordId: number, userId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE}/record/${recordId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to delete record' }))
      throw new Error(errorData.error || 'Failed to delete record')
    }
    return response.json()
  },

  // 获取房间玩家结算信息
  async getRoomPlayers(roomId: string): Promise<any[]> {
    const response = await fetch(`${API_BASE}/room/${roomId}/players`)
    
    if (!response.ok) {
      throw new Error('Failed to get room players')
    }
    
    return response.json()
  }
}

export { api }
export default api
