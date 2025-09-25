# 🚀 服务器更新指南

## 📋 更新步骤

### 1. 连接到服务器
```bash
# SSH连接（使用Google Cloud Console或本地终端）
ssh tianruima2@34.130.185.125
```

### 2. 停止当前应用
```bash
cd /var/www/yogii
pm2 stop all
```

### 3. 拉取最新代码
```bash
git pull origin main
```

### 4. 安装新依赖（如果有）
```bash
cd backend
npm install
```

### 5. 重启应用
```bash
pm2 restart all
# 或者使用生态系统配置
pm2 start ecosystem.config.cjs
```

### 6. 验证更新
```bash
# 检查应用状态
pm2 status

# 检查日志
pm2 logs

# 测试汇率API
curl http://localhost:3000/api/exchange-rate/status
```

## 🗄️ 数据库说明

**✅ 不需要删除数据库文件！**

- SQLite会自动执行schema.sql中的更新
- 使用`CREATE TABLE IF NOT EXISTS` - 安全创建新表
- 使用`INSERT OR IGNORE` - 安全插入默认配置
- 现有数据会保留，新功能会自动添加

## 🎯 预期结果

更新后应该看到：
- ✅ 应用正常启动
- ✅ 汇率服务开始工作（5秒后第一次请求）
- ✅ 新的API端点可用
- ✅ 现有功能继续正常工作

## 🔧 配置管理

### 查看汇率服务状态
```bash
curl http://localhost:3000/api/exchange-rate/status
```

### 调整请求频率（可选）
```bash
# 改为20次/天
curl -X POST http://localhost:3000/api/exchange-rate/config \
  -H "Content-Type: application/json" \
  -d '{"requestsPerDay": 20}'
```

### 手动刷新汇率（测试用）
```bash
curl -X POST http://localhost:3000/api/exchange-rate/refresh
```

## 🚨 故障排除

### 如果应用启动失败
```bash
# 查看详细日志
pm2 logs --lines 50

# 重新创建PM2配置
pm2 delete all
pm2 start ecosystem.config.cjs
```

### 如果汇率API不工作
```bash
# 检查数据库
sqlite3 database/yogii.db "SELECT * FROM system_config;"
sqlite3 database/yogii.db "SELECT * FROM exchange_rates LIMIT 5;"
```
