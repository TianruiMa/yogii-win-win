import database from '../database/database.js';

class RecordService {
  // 保存玩家结果记录
  async savePlayerResult(roomId, userId, userNickname, hands, finalChips, joinedAt) {
    try {
      // 插入玩家结果记录
      const result = await database.run(
        'INSERT INTO player_results (room_id, user_id, user_nickname, hands, final_chips, joined_at) VALUES (?, ?, ?, ?, ?, ?)',
        [roomId, userId, userNickname, hands, finalChips, joinedAt]
      );

      console.log(`💾 保存玩家结果: ${userId} (${userNickname}) 房间 ${roomId}
        hands: ${hands}, finalChips: ${finalChips}, joinedAt: ${joinedAt}`);
      
      const savedRecord = await database.get(
        'SELECT * FROM player_results WHERE id = ?',
        [result.lastID]
      );
      
      // 验证保存的原始数据
      console.log(`📊 保存的原始数据: finalChips=${finalChips}, hands=${hands}, roomId=${roomId}`);
      
      // 验证数据库中动态计算的profit（延迟一点再查询，确保数据完全提交）
      setTimeout(async () => {
        try {
          const dbProfit = await database.get(
            `SELECT 
               pr.final_chips, pr.hands, pr.room_id,
               gs.chips_per_hand, gs.cost_per_hand, gs.currency,
               ROUND((pr.final_chips - (pr.hands * gs.chips_per_hand)) * 1.0 / gs.chips_per_hand * gs.cost_per_hand, 2) as profit
             FROM player_results pr
             JOIN game_sessions gs ON pr.room_id = gs.room_id
             WHERE pr.id = ?`,
            [result.lastID]
          );
          
          console.log(`📊 延迟查询结果:`, dbProfit);
          if (dbProfit) {
            console.log(`📊 计算过程: (${dbProfit.final_chips} - ${dbProfit.hands} * ${dbProfit.chips_per_hand}) * 1.0 / ${dbProfit.chips_per_hand} * ${dbProfit.cost_per_hand} = ${dbProfit.profit}`);
          }
        } catch (error) {
          console.error('延迟验证查询失败:', error);
        }
      }, 100);
      
      return savedRecord;
    } catch (error) {
      console.error('Error saving player result:', error);
      throw error;
    }
  }

  // 获取用户游戏记录
  async getUserRecords(userId, limit = 50, offset = 0) {
    try {
      const records = await database.all(
        `SELECT 
           pr.*,
           gs.chips_per_hand,
           gs.cost_per_hand,
           gs.big_blind,
           gs.currency,
           gs.created_at,
           gs.settled_at,
           -- 动态计算profit
           ROUND((pr.final_chips - (pr.hands * gs.chips_per_hand)) * 1.0 / gs.chips_per_hand * gs.cost_per_hand, 2) as profit,
           -- 计算筹码盈亏
           (pr.final_chips - (pr.hands * gs.chips_per_hand)) as chip_profit,
           -- 计算游戏时长（小时）
           ROUND((julianday(gs.settled_at) - julianday(pr.joined_at)) * 24, 2) as game_duration_hours
         FROM player_results pr
         JOIN game_sessions gs ON pr.room_id = gs.room_id
         WHERE pr.user_id = ?
         ORDER BY pr.id DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      );

      return records;
    } catch (error) {
      console.error('Error getting user records:', error);
      throw error;
    }
  }

  // 获取房间游戏记录
  async getRoomRecords(roomId) {
    try {
      const records = await database.all(
        `SELECT 
           pr.*,
           gs.chips_per_hand,
           gs.cost_per_hand,
           gs.big_blind,
           gs.currency,
           gs.created_at,
           -- 动态计算profit
           ROUND((pr.final_chips - (pr.hands * gs.chips_per_hand)) * 1.0 / gs.chips_per_hand * gs.cost_per_hand, 2) as profit
         FROM player_results pr
         JOIN game_sessions gs ON pr.room_id = gs.room_id
         WHERE pr.room_id = ?
         ORDER BY ROUND((pr.final_chips - (pr.hands * gs.chips_per_hand)) / gs.chips_per_hand * gs.cost_per_hand, 2) DESC`,
        [roomId]
      );

      return records;
    } catch (error) {
      console.error('Error getting room records:', error);
      throw error;
    }
  }

  // 获取用户与特定对手的对战记录
  async getUserVsOpponentStats(userId, opponentUserId) {
    try {
      const records = await database.all(
        `SELECT 
           pr1.room_id,
           -- 动态计算user profit
           ROUND((pr1.final_chips - (pr1.hands * gs.chips_per_hand)) / gs.chips_per_hand * gs.cost_per_hand, 2) as user_profit,
           -- 动态计算opponent profit
           ROUND((pr2.final_chips - (pr2.hands * gs.chips_per_hand)) / gs.chips_per_hand * gs.cost_per_hand, 2) as opponent_profit,
           gs.created_at,
           gs.chips_per_hand,
           gs.cost_per_hand,
           gs.big_blind,
           gs.currency
         FROM player_results pr1
         JOIN player_results pr2 ON pr1.room_id = pr2.room_id
         JOIN game_sessions gs ON pr1.room_id = gs.room_id
         WHERE pr1.user_id = ? AND pr2.user_id = ?
         ORDER BY gs.created_at DESC`,
        [userId, opponentUserId]
      );

      // 计算统计数据
      const stats = {
        total_games: records.length,
        user_wins: records.filter(r => r.user_profit > r.opponent_profit).length,
        opponent_wins: records.filter(r => r.user_profit < r.opponent_profit).length,
        ties: records.filter(r => r.user_profit === r.opponent_profit).length,
        user_total_profit: records.reduce((sum, r) => sum + r.user_profit, 0),
        opponent_total_profit: records.reduce((sum, r) => sum + r.opponent_profit, 0)
      };

      stats.user_win_rate = stats.total_games > 0 ? (stats.user_wins / stats.total_games * 100) : 0;

      return {
        records,
        stats
      };
    } catch (error) {
      console.error('Error getting user vs opponent stats:', error);
      throw error;
    }
  }

  // 获取用户按月统计
  async getUserMonthlyStats(userId, year = null, month = null) {
    try {
      let dateFilter = '';
      let params = [userId];

      if (year && month) {
        dateFilter = "AND strftime('%Y-%m', gs.created_at) = ?";
        params.push(`${year}-${month.toString().padStart(2, '0')}`);
      } else if (year) {
        dateFilter = "AND strftime('%Y', gs.created_at) = ?";
        params.push(year.toString());
      }

      const stats = await database.all(
        `SELECT 
           strftime('%Y-%m', gs.created_at) as month,
           COUNT(*) as games_played,
           -- 动态计算profit统计
           SUM(ROUND((pr.final_chips - (pr.hands * gs.chips_per_hand)) / gs.chips_per_hand * gs.cost_per_hand, 2)) as total_profit,
           AVG(ROUND((pr.final_chips - (pr.hands * gs.chips_per_hand)) / gs.chips_per_hand * gs.cost_per_hand, 2)) as avg_profit,
           SUM(CASE WHEN ROUND((pr.final_chips - (pr.hands * gs.chips_per_hand)) / gs.chips_per_hand * gs.cost_per_hand, 2) > 0 THEN 1 ELSE 0 END) as wins
         FROM player_results pr
         JOIN game_sessions gs ON pr.room_id = gs.room_id
         WHERE pr.user_id = ? ${dateFilter}
         GROUP BY strftime('%Y-%m', gs.created_at)
         ORDER BY month DESC`,
        params
      );

      return stats;
    } catch (error) {
      console.error('Error getting user monthly stats:', error);
      throw error;
    }
  }

  // 获取特定房间的所有玩家结算信息
  async getRoomPlayersResult(roomId) {
    try {
      const players = await database.all(
        `SELECT 
           pr.id,
           pr.user_id,
           pr.user_nickname,
           pr.hands,
           pr.final_chips,
           pr.joined_at,
           gs.chips_per_hand,
           gs.cost_per_hand,
           gs.big_blind,
           gs.currency,
           gs.created_at,
           gs.settled_at,
           -- 动态计算profit
           ROUND((pr.final_chips - (pr.hands * gs.chips_per_hand)) * 1.0 / gs.chips_per_hand * gs.cost_per_hand, 2) as profit,
           -- 计算筹码盈亏
           (pr.final_chips - (pr.hands * gs.chips_per_hand)) as chip_profit,
           -- 计算游戏时长（小时）
           ROUND((julianday(COALESCE(gs.settled_at, CURRENT_TIMESTAMP)) - julianday(pr.joined_at)) * 24, 2) as game_duration_hours
         FROM player_results pr
         JOIN game_sessions gs ON pr.room_id = gs.room_id
         WHERE pr.room_id = ?
         ORDER BY profit DESC`,
        [roomId]
      );

      console.log(`🏆 获取房间 ${roomId} 的玩家结算信息:`, players.map(p => ({
        nickname: p.user_nickname,
        profit: p.profit,
        chips: p.final_chips,
        hands: p.hands
      })));

      return players;
    } catch (error) {
      console.error('Error getting room players result:', error);
      throw error;
    }
  }

  // 检查记录是否可以删除（只有该玩家一人的房间）
  async canDeleteRecord(recordId, userId) {
    try {
      // 首先获取记录信息
      const record = await database.get(
        'SELECT * FROM player_results WHERE id = ? AND user_id = ?',
        [recordId, userId]
      );

      if (!record) {
        return { canDelete: false, reason: 'Record not found or access denied' };
      }

      // 检查该房间中的玩家数量
      const playerCount = await database.get(
        'SELECT COUNT(*) as count FROM player_results WHERE room_id = ?',
        [record.room_id]
      );

      const canDelete = playerCount.count === 1;
      return { 
        canDelete, 
        reason: canDelete ? null : 'Other players in this room',
        roomId: record.room_id 
      };
    } catch (error) {
      console.error('Error checking if record can be deleted:', error);
      return { canDelete: false, reason: error.message };
    }
  }

  // 删除玩家结果记录（包含房间清理）
  async deletePlayerResult(recordId, userId) {
    try {
      // 首先检查是否可以删除
      const checkResult = await this.canDeleteRecord(recordId, userId);
      if (!checkResult.canDelete) {
        throw new Error(checkResult.reason);
      }

      // 获取记录信息
      const record = await database.get(
        'SELECT * FROM player_results WHERE id = ? AND user_id = ?',
        [recordId, userId]
      );

      if (!record) {
        throw new Error('Record not found or access denied');
      }

      // 删除玩家记录
      await database.run(
        'DELETE FROM player_results WHERE id = ?',
        [recordId]
      );

      // 删除对应的游戏会话（因为只有该玩家一人）
      await database.run(
        'DELETE FROM game_sessions WHERE room_id = ?',
        [record.room_id]
      );

      console.log(`🗑️ Deleted player result and game session: ${recordId}, room: ${record.room_id}`);
      return true;
    } catch (error) {
      console.error('Error deleting player result:', error);
      throw error;
    }
  }
}

export default new RecordService();
