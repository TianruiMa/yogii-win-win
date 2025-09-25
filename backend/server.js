import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';

// Import database and services
import database from './database/database.js';
import userService from './services/userService.js';
import roomService from './services/roomService.js';
import recordService from './services/recordService.js';
import exchangeRateService from './services/exchangeRateService.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173", 
      "http://10.0.0.172:5173", // Vue dev server
      "https://yogii-win-win.vercel.app", // Production frontend
      /^https:\/\/.*\.vercel\.app$/ // Any Vercel preview domains
    ],
    methods: ["GET", "POST"]
  }
});

// 中间件
app.use(cors({
  origin: [
    "http://localhost:5173", 
    "http://10.0.0.172:5173", // Vue dev server
    "https://yogii-win-win.vercel.app", // Production frontend
    /^https:\/\/.*\.vercel\.app$/ // Any Vercel preview domains
  ],
  credentials: true
}));
app.use(express.json());

// 数据文件路径
const DATA_FILE = './data/game-data.json';

// 确保数据目录存在
try {
  await fs.mkdir('./data', { recursive: true });
} catch (error) {
  // Directory already exists
}

// 存储每个房间的游戏数据
const roomGameData = new Map();

// 默认游戏数据模板
function createDefaultGameData(chipsPerHand = 1000) {
  return {
    currentChips: chipsPerHand,
    currentAdminId: 1,
    players: []
  };
}

// 获取房间游戏数据的辅助函数
function getRoomGameData(roomId, chipsPerHand = 1000) {
  if (!roomGameData.has(roomId)) {
    roomGameData.set(roomId, createDefaultGameData(chipsPerHand));
  }
  return roomGameData.get(roomId);
}

// 加载数据 (现在使用数据库存储，这个函数保留兼容性)
async function loadData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    console.log('Legacy data file found but not used (using database now)');
  } catch (error) {
    console.log('No legacy data file (using database storage)');
  }
}

// 保存数据 (现在使用数据库存储，这个函数保留兼容性)
async function saveData() {
  try {
    // 数据现在保存在数据库中，这个函数保留兼容性
    console.log('Data persisted to database');
  } catch (error) {
    console.error('Error with data operation:', error);
  }
}

// 计算统计数据
function calculateStats(gameData) {
  const players = gameData.players;
  let totalUp = 0;
  let totalDown = 0;

  players.forEach(player => {
    totalUp += player.hands; // sum all hands
    totalDown += player.chips;
  });

  totalUp = totalUp * gameData.currentChips; // chips taken from bank (hands * per hand)
  const finalResult = totalDown - totalUp; // actual vs expected difference

  return {
    totalUp,
    totalDown,
    finalResult
  };
}

// API 路由
app.get('/api/game-data/:roomId', async (req, res) => {
  const { roomId } = req.params;
  
  try {
    // 验证房间是否已结算（不允许访问已结算房间）
    await roomService.validateRoom(roomId);
    
    // 房间有效，返回游戏数据
    const gameData = getRoomGameData(roomId, 1000); // 使用默认值
    const stats = calculateStats(gameData);
    res.json({ ...gameData, stats });
  } catch (error) {
    console.error('Error getting game data:', error);
    res.status(404).json({ error: error.message });
  }
});

app.post('/api/player/:roomId', async (req, res) => {
  const { roomId } = req.params;
  const { nickname, userId } = req.body;
  
  if (!nickname) {
    return res.status(400).json({ error: 'Nickname required' });
  }

  let gameData;
  try {
    // 获取活跃房间信息并确保配置在内存中
    const room = await roomService.getActiveRoom(roomId);
    gameData = getRoomGameData(roomId, room.chipsPerHand);
    
    // 确保房间配置在内存中
    gameData.currentChips = room.chipsPerHand;
    gameData.costPerHand = room.costPerHand;
    gameData.currency = room.currency;
  } catch (error) {
    console.error('Error getting room:', error);
    return res.status(404).json({ error: error.message });
  }
  
  const newPlayer = {
    id: Date.now(),
    nickname,
    hands: 0,
    chips: null, // 默认为null表示未输入状态
    isAdmin: gameData.players.length === 0, // 第一个玩家是管理员（房主）
    userId: userId || null, // 存储用户ID
    joinedAt: new Date().toISOString() // 加入时间
  };

  gameData.players.push(newPlayer);
  
  // 玩家数量在内存中管理，不需要数据库更新
  
  const stats = calculateStats(gameData);
  io.to(roomId).emit('gameDataUpdate', { ...gameData, stats });
  
  res.json(newPlayer);
});

app.put('/api/player/:roomId/:id', async (req, res) => {
  const { roomId } = req.params;
  const playerId = parseInt(req.params.id);
  const updates = req.body;
  
  try {
    // 验证房间是否已结算
    await roomService.validateRoom(roomId);
  } catch (error) {
    console.error('Error validating room:', error);
    return res.status(404).json({ error: error.message });
  }

  const gameData = getRoomGameData(roomId, 1000);
  const playerIndex = gameData.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) {
    return res.status(404).json({ error: 'Player not found' });
  }

  // 更新玩家数据（保护重要字段不被意外覆盖）
  const protectedFields = ['id', 'userId', 'isAdmin'];
  const safeUpdates = { ...updates };
  protectedFields.forEach(field => {
    if (safeUpdates.hasOwnProperty(field)) {
      delete safeUpdates[field];
    }
  });
  
  Object.assign(gameData.players[playerIndex], safeUpdates);
  
  const stats = calculateStats(gameData);
  io.to(roomId).emit('gameDataUpdate', { ...gameData, stats });
  
  res.json(gameData.players[playerIndex]);
});

app.delete('/api/player/:roomId/:id', async (req, res) => {
  const { roomId } = req.params;
  const playerId = parseInt(req.params.id);
  
  console.log(`🗑️ 删除玩家请求: 房间=${roomId}, 玩家ID=${playerId}`);
  
  try {
    // 验证房间是否已结算
    await roomService.validateRoom(roomId);
  } catch (error) {
    console.error('Error validating room:', error);
    return res.status(404).json({ error: error.message });
  }
  
  const gameData = getRoomGameData(roomId, 1000);
  const playerCountBefore = gameData.players.length;
  const deletedPlayer = gameData.players.find(p => p.id === playerId);
  
  gameData.players = gameData.players.filter(p => p.id !== playerId);
  const playerCountAfter = gameData.players.length;
  
  console.log(`🗑️ 玩家删除: ${deletedPlayer?.nickname || 'Unknown'} (ID: ${playerId})`);
  console.log(`🗑️ 玩家数量变化: ${playerCountBefore} → ${playerCountAfter}`);
  
  // 玩家数量在内存中管理，不需要数据库更新
  
  const stats = calculateStats(gameData);
  
  // 检查房间中有多少Socket连接
  const roomSockets = io.sockets.adapter.rooms.get(roomId);
  const socketCount = roomSockets ? roomSockets.size : 0;
  
  console.log(`📡 向房间 ${roomId} 发送更新，剩余玩家:`, gameData.players.map(p => p.nickname));
  console.log(`📡 房间 ${roomId} 当前Socket连接数: ${socketCount}`);
  
  // 检查房间内具体的Socket连接
  if (roomSockets) {
    console.log(`📡 房间 ${roomId} 内的Socket ID列表:`, Array.from(roomSockets));
  }
  
  io.to(roomId).emit('gameDataUpdate', { ...gameData, stats });
  console.log(`📡 gameDataUpdate事件已发送到房间 ${roomId}`);
  
  res.json({ success: true });
});

// 调试端点：获取房间当前状态
app.get('/api/debug/room/:roomId', async (req, res) => {
  const { roomId } = req.params;
  
  try {
    // 验证房间是否已结算
    await roomService.validateRoom(roomId);
  } catch (error) {
    console.error('Error validating room:', error);
    return res.status(404).json({ error: error.message });
  }
  
  const gameData = getRoomGameData(roomId);
  const roomSockets = io.sockets.adapter.rooms.get(roomId);
  const socketCount = roomSockets ? roomSockets.size : 0;
  
  res.json({
    roomId,
    playerCount: gameData.players.length,
    players: gameData.players.map(p => ({
      id: p.id,
      nickname: p.nickname,
      userId: p.userId,
      isAdmin: p.isAdmin
    })),
    socketConnections: socketCount
  });
});

app.post('/api/clear-data/:roomId', async (req, res) => {
  const { roomId } = req.params;
  
  try {
    // 验证房间是否已结算
    await roomService.validateRoom(roomId);
  } catch (error) {
    console.error('Error validating room:', error);
    return res.status(404).json({ error: error.message });
  }
  
  // 重置所有玩家数据，但保留玩家列表
  const gameData = getRoomGameData(roomId);
  gameData.players.forEach(player => {
    player.hands = 0;
    player.chips = 0;
  });
  
  const stats = calculateStats(gameData);
  io.to(roomId).emit('gameDataUpdate', { ...gameData, stats });
  
  res.json({ success: true });
});

app.put('/api/current-chips/:roomId', async (req, res) => {
  const { roomId } = req.params;
  const { currentChips } = req.body;
  
  try {
    // 验证房间是否已结算
    await roomService.validateRoom(roomId);
  } catch (error) {
    console.error('Error validating room:', error);
    return res.status(404).json({ error: error.message });
  }
  
  const gameData = getRoomGameData(roomId);
  gameData.currentChips = currentChips;
  
  const stats = calculateStats(gameData);
  io.to(roomId).emit('gameDataUpdate', { ...gameData, stats });
  
  res.json({ currentChips });
});

// ========================
// 新的数据库API
// ========================

// 用户相关API（简化版，主要功能移至前端localStorage）
app.post('/api/user/generate-id', async (req, res) => {
  try {
    const userId = userService.generateUserId();
    res.json({ userId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/user/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;
    const { currency = 'CAD' } = req.query; // 获取用户偏好货币
    const stats = await userService.getUserStats(userId, currency);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新用户昵称
app.put('/api/user/:userId/nickname', async (req, res) => {
  try {
    const { userId } = req.params;
    const { nickname } = req.body;

    // 验证必填字段
    if (!nickname || !nickname.trim()) {
      return res.status(400).json({ error: 'Nickname is required' });
    }

    const trimmedNickname = nickname.trim();

    // 验证昵称长度
    if (trimmedNickname.length > 20) {
      return res.status(400).json({ error: 'Nickname too long (max 20 characters)' });
    }

    console.log(`📝 更新用户昵称: ${userId} -> ${trimmedNickname}`);

    // 更新该用户的所有历史记录中的昵称
    const result = await database.run(
      'UPDATE player_results SET user_nickname = ? WHERE user_id = ?',
      [trimmedNickname, userId]
    );

    console.log(`✅ 已更新 ${result.changes} 条记录的昵称`);

    res.json({ 
      success: true, 
      message: 'Nickname updated successfully',
      updatedRecords: result.changes
    });

  } catch (error) {
    console.error('Error updating nickname:', error);
    res.status(500).json({ error: error.message });
  }
});

// 添加手动记录
app.post('/api/user/:userId/add-record', async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      date,           // 游戏日期 (YYYY-MM-DD)
      duration,       // 游戏时长 (小时)
      chipsPerHand,   // 每手筹码
      bigBlind,       // 大盲注
      costPerHand,    // 每手成本
      currency,       // 货币单位
      hands,          // 手数
      finalChips,     // 最终筹码
      userNickname    // 用户昵称
    } = req.body;

    // 验证必填字段
    if (!date || !duration || !chipsPerHand || !bigBlind || !costPerHand || !currency || hands === undefined || finalChips === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 生成唯一房间号
    const roomId = await roomService.generateUniqueRoomId();

    // 调试：输出接收到的日期数据
    console.log('📥 后端接收到的日期数据:', {
      rawDate: date,
      dateType: typeof date,
      constructedDate: date + 'T00:00:00',
      parsedDate: new Date(date + 'T00:00:00'),
      parsedISOString: new Date(date + 'T00:00:00').toISOString()
    })

    // 计算时间 - 使用本地时区避免时区偏移问题
    const gameDate = new Date(date + 'T00:00:00'); // 游戏日期的0点（本地时区）
    const durationMs = duration * 60 * 60 * 1000; // 时长转换为毫秒
    const settledAt = new Date(gameDate.getTime() + durationMs);
    const joinedAt = gameDate; // 加入时间设为游戏日期0点
    const createdAt = gameDate; // 创建时间设为游戏日期0点

    // 创建游戏会话
    await database.run(
      `INSERT INTO game_sessions (room_id, chips_per_hand, big_blind, cost_per_hand, currency, created_at, settled_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [roomId, chipsPerHand, bigBlind, costPerHand, currency, 
       createdAt.toISOString().replace('Z', ''), 
       settledAt.toISOString().replace('Z', '')]
    );

    // 使用前端传递的用户昵称，如果没有则生成显示名称
    let displayName = userNickname;
    
    if (!displayName || !displayName.trim()) {
      // 如果前端没有传递昵称，则使用用户ID的简化版本（与房间创建逻辑一致）
      displayName = `User_${userId.slice(-4)}`;
      console.log(`📝 前端未传递昵称，生成显示名: ${displayName} (用户ID: ${userId})`);
    } else {
      console.log(`📝 使用前端传递的昵称: ${displayName} (用户ID: ${userId})`);
    }

    // 创建玩家结果记录
    await recordService.savePlayerResult(roomId, userId, displayName, hands, finalChips, joinedAt.toISOString().replace('Z', ''));

    console.log(`📝 手动添加记录: 用户 ${userId}, 房间 ${roomId}, 时长 ${duration}小时`);
    
    res.json({ 
      success: true, 
      roomId,
      message: 'Record added successfully' 
    });

  } catch (error) {
    console.error('Error adding manual record:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/user/:userId/games', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;
    const games = await userService.getUserRecentGames(userId, parseInt(limit));
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 房间相关API
app.post('/api/room/create', async (req, res) => {
  try {
    const { chipsPerHand, bigBlind, costPerHand, currency } = req.body;
    const room = await roomService.createRoom(chipsPerHand, bigBlind, costPerHand, currency);
    
    // 在内存中设置房间配置
    const gameData = getRoomGameData(room.roomId, chipsPerHand);
    gameData.currentChips = chipsPerHand;
    gameData.costPerHand = costPerHand;
    gameData.bigBlind = bigBlind;
    gameData.currency = currency;
    
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取活跃房间信息（从数据库查询）
app.get('/api/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    // 从数据库获取活跃房间信息
    const room = await roomService.getActiveRoom(roomId);
    
    // 确保房间配置在内存中（首次加载时）
    const gameData = getRoomGameData(roomId, room.chipsPerHand);
    gameData.currentChips = room.chipsPerHand;
    gameData.costPerHand = room.costPerHand;
    gameData.currency = room.currency;
    
    res.json(room);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

app.get('/api/room/:roomId/history', async (req, res) => {
  try {
    const { roomId } = req.params;
    const history = await roomService.getSettledSession(roomId);
    res.json(history);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

app.get('/api/room/:roomId/records', async (req, res) => {
  try {
    const { roomId } = req.params;
    const records = await recordService.getRoomRecords(roomId);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 结算房间API
app.post('/api/room/:roomId/settle', async (req, res) => {
  try {
    const { roomId } = req.params;
    console.log(`🏁 收到结算房间请求: ${roomId}`);
    
    // 获取活跃房间信息
    const room = await roomService.getActiveRoom(roomId);
    
    // 获取当前游戏数据
    const gameData = getRoomGameData(roomId);
    console.log(`🏁 房间 ${roomId} 当前玩家数量: ${gameData.players.length}`);
    
    // 从数据库获取的房间配置信息
    const roomInfo = {
      chipsPerHand: room.chipsPerHand,
      costPerHand: room.costPerHand,
      currency: room.currency
    };
    
    // 计算每个玩家的结算数据
    const playersWithBalance = gameData.players.map(player => {
      // 如果chips为null、undefined，balance和profit都设为null
      // 但是如果chips为0，则正常计算（因为0是有效的输入）
      if (player.chips === null || player.chips === undefined) {
        return {
          id: player.id,
          nickname: player.nickname,
          hands: player.hands,
          chips: player.chips,
          balance: null,
          profit: null,
          userId: player.userId,
          joinedAt: player.joinedAt
        };
      }
      
      const balance = player.chips - (player.hands * roomInfo.chipsPerHand);
      const handsProfit = balance / roomInfo.chipsPerHand;
      const profitRaw = handsProfit * roomInfo.costPerHand;
      // 使用更精确的舍入，避免小数损失导致的平局问题
      const profit = Number(profitRaw.toFixed(2));
      
      console.log(`🧮 结算计算调试 - 玩家 ${player.nickname}:
        chips: ${player.chips}, hands: ${player.hands}, chipsPerHand: ${roomInfo.chipsPerHand}
        balance: ${balance}, handsProfit: ${handsProfit}, profitRaw: ${profitRaw}
        最终profit: ${profit}, 类型: ${typeof profit}`);
      return {
        id: player.id,
        userId: player.userId, // ✅ 添加缺失的userId
        nickname: player.nickname,
        hands: player.hands,
        chips: player.chips,
        balance: balance,
        profit: profit,
        joinedAt: player.joinedAt
      };
    });
    
    // 按新的排序逻辑：赢家 → 输家 → 平局和未输入
    const sortedPlayers = playersWithBalance.sort((a, b) => {
      // 处理null值：null放到最后
      if (a.profit === null && b.profit === null) return 0;
      if (a.profit === null) return 1;  // a.profit是null，放到后面
      if (b.profit === null) return -1; // b.profit是null，a放到前面
      
      // 都有数值时：
      // 1. 先按照是否为正数分组（赢家 vs 输家）
      const aIsWinner = a.profit > 0;
      const bIsWinner = b.profit > 0;
      const aIsLoser = a.profit < 0;
      const bIsLoser = b.profit < 0;
      
      // 赢家在前
      if (aIsWinner && !bIsWinner) return -1;
      if (!aIsWinner && bIsWinner) return 1;
      
      // 都是赢家时，按收益从高到低
      if (aIsWinner && bIsWinner) return b.profit - a.profit;
      
      // 输家在中间（在平局前面）
      if (aIsLoser && !bIsLoser) return -1;
      if (!aIsLoser && bIsLoser) return 1;
      
      // 都是输家时，按收益从高到低（损失最少的在前）
      if (aIsLoser && bIsLoser) return b.profit - a.profit;
      
      // 平局（profit = 0）在最后，按收益排序
      return b.profit - a.profit;
    });
    
    // 结算游戏会话
    await roomService.settleGameSession(roomId);
    console.log(`💾 已结算游戏会话: ${roomId}`);

    // 自动为所有玩家保存结果记录
    console.log(`💾 开始为所有玩家保存结果记录...`);
    for (const player of playersWithBalance) {
      // 只为有userId且有完整数据的玩家保存记录
      if (player.id && player.userId && player.hands !== undefined && player.chips !== null) {
        try {
          await recordService.savePlayerResult(
            roomId, 
            player.userId, 
            player.nickname,
            player.hands, 
            player.chips,
            player.joinedAt
          );
          console.log(`✅ 已保存玩家 ${player.nickname} (${player.userId}) 的记录`);
        } catch (error) {
          console.error(`❌ 保存玩家 ${player.nickname} 记录失败:`, error);
        }
      } else {
        console.log(`⚠️ 跳过玩家 ${player.nickname} - 数据不完整`);
      }
    }
    console.log(`💾 游戏记录保存完成`);
    
    // 通知所有玩家房间已结算，包含完整的结算数据
    const settlementData = { 
      roomId, 
      message: 'Room has been settled and closed',
      settlementResults: {
        players: sortedPlayers,
        roomInfo: roomInfo
      }
    };
    console.log(`📡 准备向房间 ${roomId} 发送结算通知:`, settlementData);
    
    // 获取房间内的所有socket连接
    const socketsInRoom = io.sockets.adapter.rooms.get(roomId);
    console.log(`📡 房间 ${roomId} 内的Socket连接数: ${socketsInRoom ? socketsInRoom.size : 0}`);
    if (socketsInRoom) {
      console.log(`📡 房间 ${roomId} 内的Socket ID列表:`, Array.from(socketsInRoom));
    }
    
    io.to(roomId).emit('roomSettled', settlementData);
    console.log(`📡 roomSettled事件已发送到房间 ${roomId}`);
    
    // 清除服务器内存中的游戏数据
    roomGameData.delete(roomId);
    console.log(`🗑️ 清除房间 ${roomId} 的内存数据`);
    
    res.json({ 
      success: true, 
      message: 'Room settled successfully',
      roomId 
    });
  } catch (error) {
    console.error(`❌ 结算房间失败:`, error);
    res.status(500).json({ error: error.message });
  }
});

// 游戏记录相关API
// 记录相关API
app.get('/api/record/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const records = await recordService.getUserRecords(userId, parseInt(limit), parseInt(offset));
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/record/user/:userId/monthly', async (req, res) => {
  try {
    const { userId } = req.params;
    const { year, month } = req.query;
    const stats = await recordService.getUserMonthlyStats(
      userId, 
      year ? parseInt(year) : null, 
      month ? parseInt(month) : null
    );
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 检查记录是否可以删除
app.get('/api/record/:recordId/can-delete', async (req, res) => {
  try {
    const { recordId } = req.params;
    const { userId } = req.query;
    const result = await recordService.canDeleteRecord(parseInt(recordId), userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/record/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;
    const { userId } = req.body;
    await recordService.deletePlayerResult(parseInt(recordId), userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取房间玩家结算信息
app.get('/api/room/:roomId/players', async (req, res) => {
  try {
    const { roomId } = req.params;
    const players = await recordService.getRoomPlayersResult(roomId);
    res.json(players);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Socket.IO 连接处理
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // 处理加入房间
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    console.log(`Client ${socket.id} joined room: ${roomId}`);
    
    // 检查房间状态
    const roomSockets = io.sockets.adapter.rooms.get(roomId);
    const socketCount = roomSockets ? roomSockets.size : 0;
    console.log(`📊 房间 ${roomId} 加入后Socket数量: ${socketCount}, Socket列表:`, Array.from(roomSockets || []));
    
    // 发送房间的游戏数据
    const gameData = getRoomGameData(roomId);
    const stats = calculateStats(gameData);
    socket.emit('gameDataUpdate', { ...gameData, stats });
    console.log(`📤 向 ${socket.id} 发送初始游戏数据`);
  });
  
  // 处理离开房间
  socket.on('leaveRoom', (roomId) => {
    socket.leave(roomId);
    console.log(`Client ${socket.id} left room: ${roomId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// 启动服务器
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // 初始化数据库
    await database.initialize();
    
    // 加载现有游戏数据
    await loadData();
    
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🏠 Room-based game system ready`);
      console.log(`💾 Database system ready`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  try {
    await database.close();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// 汇率相关路由
// 获取单个汇率
app.get('/api/exchange-rate/:from/:to', async (req, res) => {
  try {
    const { from, to } = req.params;
    const rate = await exchangeRateService.getRate(from.toUpperCase(), to.toUpperCase());
    
    if (rate === null) {
      return res.status(404).json({ 
        error: `汇率不存在: ${from} → ${to}`,
        fallback: from === 'CAD' && to.toUpperCase() === 'RMB' ? 5.2 : null
      });
    }
    
    res.json({
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      rate: rate,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('获取汇率失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取多个汇率
app.post('/api/exchange-rates', async (req, res) => {
  try {
    const { rates } = req.body; // [{ from: 'CAD', to: 'RMB' }, ...]
    
    if (!Array.isArray(rates)) {
      return res.status(400).json({ error: '请求格式错误' });
    }
    
    const results = {};
    
    for (const { from, to } of rates) {
      const rate = await exchangeRateService.getRate(from.toUpperCase(), to.toUpperCase());
      results[`${from.toUpperCase()}_${to.toUpperCase()}`] = {
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        rate: rate,
        available: rate !== null
      };
    }
    
    res.json({
      rates: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('批量获取汇率失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 汇率服务状态
app.get('/api/exchange-rate/status', async (req, res) => {
  try {
    const status = await exchangeRateService.getStatus();
    res.json(status);
  } catch (error) {
    console.error('获取汇率服务状态失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新汇率配置（管理接口）
app.post('/api/exchange-rate/config', async (req, res) => {
  try {
    const { requestsPerDay } = req.body;
    
    if (!requestsPerDay || requestsPerDay < 1 || requestsPerDay > 100) {
      return res.status(400).json({ error: '请求次数必须在1-100之间' });
    }
    
    const success = await exchangeRateService.updateConfig('exchange_rate_requests_per_day', requestsPerDay.toString());
    
    if (success) {
      res.json({ 
        message: `汇率请求频率已更新为 ${requestsPerDay} 次/天`,
        requestsPerDay: requestsPerDay
      });
    } else {
      res.status(500).json({ error: '配置更新失败' });
    }
  } catch (error) {
    console.error('更新汇率配置失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 手动刷新汇率（管理接口）
app.post('/api/exchange-rate/refresh', async (req, res) => {
  try {
    const success = await exchangeRateService.fetchRatesFromAPI();
    
    if (success) {
      res.json({ message: '汇率刷新成功' });
    } else {
      res.status(429).json({ error: '已达到今日API请求限制或网络错误' });
    }
  } catch (error) {
    console.error('手动刷新汇率失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down server...');
  try {
    await database.close();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

startServer().catch(console.error);
