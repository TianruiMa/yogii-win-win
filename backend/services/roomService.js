import database from '../database/database.js';

class RoomService {
  // 生成房间ID - 6位纯数字
  generateRoomId() {
    // 生成100000到999999之间的随机数字，确保6位数
    const roomId = Math.floor(Math.random() * 900000) + 100000;
    return roomId.toString();
  }

  // 检查房间ID是否已经使用过
  async isRoomIdUsed(roomId) {
    try {
      // 检查是否在 game_sessions 表中（包括进行中和已结算的房间）
      const session = await database.get(
        'SELECT room_id FROM game_sessions WHERE room_id = ?',
        [roomId]
      );
      
      return !!session;
    } catch (error) {
      console.error('Error checking room ID usage:', error);
      return true; // 出错时假设已使用，确保安全
    }
  }

  // 生成唯一房间ID
  async generateUniqueRoomId() {
    let roomId;
    let attempts = 0;
    const maxAttempts = 50;

    do {
      roomId = this.generateRoomId();
      const isUsed = await this.isRoomIdUsed(roomId);
      
      if (!isUsed) break;
      
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique room ID');
      }
    } while (true);

    return roomId;
  }

  // 创建游戏房间（保存到数据库）
  async createRoom(chipsPerHand, bigBlind, costPerHand, currency = 'CAD') {
    try {
      const roomId = await this.generateUniqueRoomId();

      // 保存到数据库
      await database.run(
        'INSERT INTO game_sessions (room_id, chips_per_hand, big_blind, cost_per_hand, currency) VALUES (?, ?, ?, ?, ?)',
        [roomId, chipsPerHand, bigBlind, costPerHand, currency]
      );

      console.log(`🏠 Created room in database: ${roomId} (${chipsPerHand} chips, BB ${bigBlind}, ${costPerHand} ${currency} per hand)`);
      
      // 返回房间信息
      return {
        roomId,
        chipsPerHand,
        bigBlind,
        costPerHand,
        currency,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }

  // 验证房间是否活跃（简化版本，兼容旧代码）
  async validateRoom(roomId) {
    try {
      const room = await database.get(
        'SELECT room_id FROM game_sessions WHERE room_id = ? AND settled_at IS NULL',
        [roomId]
      );

      if (!room) {
        throw new Error('Room not found or has been settled');
      }

      return true;
    } catch (error) {
      console.error('Error validating room:', error);
      throw error;
    }
  }

  // 获取活跃房间信息
  async getActiveRoom(roomId) {
    try {
      // 查询活跃房间（settled_at IS NULL）
      const room = await database.get(
        'SELECT * FROM game_sessions WHERE room_id = ? AND settled_at IS NULL',
        [roomId]
      );

      if (!room) {
        throw new Error('Room not found or has been settled');
      }

      return {
        roomId: room.room_id,
        chipsPerHand: room.chips_per_hand,
        costPerHand: room.cost_per_hand,
        currency: room.currency,
        createdAt: room.created_at
      };
    } catch (error) {
      console.error('Error getting active room:', error);
      throw error;
    }
  }

  // 结算游戏会话
  async settleGameSession(roomId) {
    try {
      await database.run(
        'UPDATE game_sessions SET settled_at = CURRENT_TIMESTAMP WHERE room_id = ? AND settled_at IS NULL',
        [roomId]
      );

      console.log(`💾 Settled game session: ${roomId}`);
      return true;
    } catch (error) {
      console.error('Error settling game session:', error);
      throw error;
    }
  }

  // 获取已结算房间的信息
  async getSettledSession(roomId) {
    try {
      const session = await database.get(
        'SELECT * FROM game_sessions WHERE room_id = ? AND settled_at IS NOT NULL',
        [roomId]
      );

      if (!session) {
        throw new Error('Settled session not found');
      }

      return {
        roomId: session.room_id,
        chipsPerHand: session.chips_per_hand,
        costPerHand: session.cost_per_hand,
        currency: session.currency,
        createdAt: session.created_at,
        settledAt: session.settled_at
      };
    } catch (error) {
      console.error('Error getting settled session:', error);
      throw error;
    }
  }
}

export default new RoomService();
