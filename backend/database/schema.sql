-- 游戏会话表（包括进行中和已结算的游戏）
CREATE TABLE IF NOT EXISTS game_sessions (
    room_id VARCHAR(10) PRIMARY KEY,           -- 房间号（唯一，永不重复）
    chips_per_hand INTEGER NOT NULL,          -- 每手筹码数量
    cost_per_hand INTEGER NOT NULL,           -- 每手成本
    big_blind INTEGER NOT NULL,               -- 大盲注金额
    currency VARCHAR(3) DEFAULT 'CAD',        -- 房间货币单位: CAD, RMB
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 创建时间
    settled_at TIMESTAMP NULL                  -- 结算时间（NULL=进行中，有值=已结算）
);

-- 玩家结果表（每局游戏中每个玩家的结果）
CREATE TABLE IF NOT EXISTS player_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,     -- 自增主键
    room_id VARCHAR(10) NOT NULL,             -- 关联游戏房间
    user_id VARCHAR(50) NOT NULL,             -- 玩家ID
    user_nickname VARCHAR(100),               -- 玩家昵称（快照，可为空）
    hands INTEGER NOT NULL,                   -- 手数
    final_chips INTEGER NOT NULL,             -- 最终筹码
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 加入游戏时间
    FOREIGN KEY (room_id) REFERENCES game_sessions(room_id)
);

-- 性能优化索引

-- 游戏会话查询优化
CREATE INDEX IF NOT EXISTS idx_game_sessions_created_at ON game_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_game_sessions_settled_at ON game_sessions(settled_at);
CREATE INDEX IF NOT EXISTS idx_game_sessions_currency ON game_sessions(currency);
CREATE INDEX IF NOT EXISTS idx_game_sessions_active ON game_sessions(settled_at) WHERE settled_at IS NULL;

-- 玩家结果查询优化（最重要的索引）
CREATE INDEX IF NOT EXISTS idx_player_results_user_id ON player_results(user_id);
CREATE INDEX IF NOT EXISTS idx_player_results_room_id ON player_results(room_id);
CREATE INDEX IF NOT EXISTS idx_player_results_joined_at ON player_results(joined_at);

-- 复合索引优化复杂查询
CREATE INDEX IF NOT EXISTS idx_player_results_user_room ON player_results(user_id, room_id);
CREATE INDEX IF NOT EXISTS idx_player_results_user_joined ON player_results(user_id, joined_at DESC);

-- 按用户查询历史记录（最常用）
CREATE INDEX IF NOT EXISTS idx_player_results_user_date ON player_results(user_id, id DESC);