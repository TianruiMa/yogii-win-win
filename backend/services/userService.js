import database from '../database/database.js';

class UserService {
  // 生成用户ID
  generateUserId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `user_${timestamp}_${random}`;
  }

  // 货币转换函数
  convertCurrency(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    const EXCHANGE_RATES = {
      CAD_TO_CNY: 5.2,
      CNY_TO_CAD: 1 / 5.2
    };

    if (fromCurrency === 'CAD' && toCurrency === 'CNY') {
      return Number((amount * EXCHANGE_RATES.CAD_TO_CNY).toFixed(2));
    } else if (fromCurrency === 'CNY' && toCurrency === 'CAD') {
      return Number((amount * EXCHANGE_RATES.CNY_TO_CAD).toFixed(2));
    }

    return amount; // 默认不转换
  }

  // 获取用户统计（从 player_results 计算，支持货币转换）
  async getUserStats(userId, userPreferredCurrency = 'CAD') {
    try {
      // 获取所有游戏记录，动态计算profit并转换货币
      console.log(`🔍 查询用户 ${userId} 的游戏记录...`);
      const gameRecords = await database.all(
        `SELECT 
           -- 动态计算profit
           pr.final_chips, pr.hands, pr.room_id,
           gs.chips_per_hand, gs.cost_per_hand, gs.currency as room_currency, gs.big_blind,
           gs.settled_at,
           ROUND((pr.final_chips - (pr.hands * gs.chips_per_hand)) * 1.0 / gs.chips_per_hand * gs.cost_per_hand, 2) as profit
         FROM player_results pr
         JOIN game_sessions gs ON pr.room_id = gs.room_id
         WHERE pr.user_id = ? AND gs.settled_at IS NOT NULL`,
        [userId]
      );
      
      console.log(`🔍 查询到 ${gameRecords.length} 条记录:`, gameRecords);

      // 转换所有profit到用户偏好货币
      const convertedProfits = gameRecords.map(record => {
        const convertedProfit = this.convertCurrency(record.profit, record.room_currency, userPreferredCurrency);
        console.log(`💱 货币转换: ${record.profit} ${record.room_currency} -> ${convertedProfit} ${userPreferredCurrency}`);
        return convertedProfit;
      });

      console.log(`📈 所有转换后的profits: [${convertedProfits.join(', ')}]`);

      // 计算统计数据
      const totalGames = convertedProfits.length;
      const totalProfit = convertedProfits.reduce((sum, profit) => sum + profit, 0);
      const winGames = convertedProfits.filter(profit => profit > 0).length;
      const drawGames = convertedProfits.filter(profit => profit === 0).length;
      
      console.log(`📊 统计计算:
        totalGames: ${totalGames}
        原始totalProfit: ${totalProfit}
        winGames: ${winGames} (profits > 0: ${convertedProfits.filter(p => p > 0).join(', ')})
        drawGames: ${drawGames} (profits === 0: ${convertedProfits.filter(p => p === 0).join(', ')})`);
      const avgProfit = totalGames > 0 ? totalProfit / totalGames : 0;
      const winRate = totalGames > 0 ? (winGames / totalGames) * 100 : 0;
      const bestGame = convertedProfits.length > 0 ? Math.max(...convertedProfits) : 0;
      const worstGame = convertedProfits.length > 0 ? Math.min(...convertedProfits) : 0;

      const detailedStats = {
        games_played: totalGames,
        total_profit: Number(totalProfit.toFixed(2)), // 使用toFixed保持精度
        avg_profit: Number(avgProfit.toFixed(2)),
        win_rate: winRate,
        best_game: Number(bestGame.toFixed(2)),
        worst_game: Number(worstGame.toFixed(2)),
        win_games: winGames,
        draw_games: drawGames
      };
      
      console.log(`✅ 最终统计结果:`, detailedStats);

      // 计算总游戏时长（小时，基于玩家实际游戏时长，精确到小数点后一位）
      const durationStats = await database.get(
        `SELECT 
           ROUND(
             SUM(
               (julianday(gs.settled_at) - julianday(pr.joined_at)) * 24
             ), 1
           ) as total_hours
         FROM player_results pr
         JOIN game_sessions gs ON pr.room_id = gs.room_id
         WHERE pr.user_id = ? AND gs.settled_at IS NOT NULL`,
        [userId]
      );

      // 计算BB/小时统计
      const bbStats = await database.get(
        `SELECT 
           ROUND(
             SUM(
               (pr.final_chips - (pr.hands * gs.chips_per_hand)) * 1.0 / gs.big_blind
             ) / SUM(
               (julianday(gs.settled_at) - julianday(pr.joined_at)) * 24
             ), 1
           ) as bb_per_hour
         FROM player_results pr
         JOIN game_sessions gs ON pr.room_id = gs.room_id
         WHERE pr.user_id = ? AND gs.settled_at IS NOT NULL`,
        [userId]
      );

      return {
        user_id: userId,
        detailed_stats: {
          ...(detailedStats || {
            games_played: 0,
            total_profit: 0,
            avg_profit: 0,
            win_rate: 0,
            best_game: 0,
            worst_game: 0,
            win_games: 0
          }),
          total_hours: durationStats?.total_hours || 0,
          bb_per_hour: bbStats?.bb_per_hour || 0
        }
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }

  // 获取用户最近游戏记录
  async getUserRecentGames(userId, limit = 10) {
    try {
      const games = await database.all(
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
         ORDER BY gs.settled_at DESC
         LIMIT ?`,
        [userId, limit]
      );

      return games;
    } catch (error) {
      console.error('Error getting user recent games:', error);
      throw error;
    }
  }
}

export default new UserService();
