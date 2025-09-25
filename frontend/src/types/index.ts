export interface Player {
  id: number
  nickname: string
  hands: number
  chips: number | null  // chips可以为null表示未输入
  isAdmin: boolean
  userId?: string // 添加用户ID字段，用于识别玩家
}

export interface GameStats {
  totalUp: number
  totalDown: number
  finalResult: number
}

export interface GameData {
  currentChips: number
  currentAdminId: number
  players: Player[]
  stats: GameStats
}
