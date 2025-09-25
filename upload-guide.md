# 🚀 Yogii项目 - Google Compute Engine部署指南

## 📋 部署步骤

### 第一步：准备你的Compute Engine实例

1. **确保实例运行中**
   ```bash
   # 在Google Cloud Console检查实例状态
   # 记录下外部IP地址
   ```

2. **连接到实例**
   ```bash
   # 方法1：通过Google Cloud Console的SSH按钮
   # 方法2：使用gcloud命令
   gcloud compute ssh your-instance-name --zone=your-zone
   ```

### 第二步：上传项目文件

**方法1：使用gcloud命令（推荐）**
```bash
# 在你的本地项目目录运行
gcloud compute scp --recurse . your-instance-name:/tmp/yogii --zone=your-zone

# 然后在服务器上移动文件
sudo mv /tmp/yogii /var/www/
sudo chown -R $USER:$USER /var/www/yogii
```

**方法2：使用GitHub（推荐给新手）**
```bash
# 1. 将项目推送到GitHub
git add .
git commit -m "Ready for deployment"
git push origin main

# 2. 在Compute Engine实例上克隆
git clone https://github.com/your-username/your-repo.git /var/www/yogii
```

**方法3：使用SCP**
```bash
# 从本地上传到服务器
scp -r . username@your-instance-ip:/var/www/yogii
```

### 第三步：运行部署脚本

```bash
# 在Compute Engine实例上
cd /var/www/yogii
chmod +x deploy.sh
./deploy.sh
```

### 第四步：配置前端

1. **更新前端API地址**
   ```bash
   # 编辑 frontend/env.production
   # 将YOUR_INSTANCE_IP替换为你的实例外部IP
   VITE_API_URL=http://YOUR_ACTUAL_IP:3000
   ```

2. **构建前端**
   ```bash
   cd /var/www/yogii/frontend
   npm install
   npm run build
   ```

3. **部署前端（简单方式）**
   ```bash
   # 使用Vercel部署（推荐）
   npm install -g vercel
   vercel --prod
   ```

### 第五步：配置Google Cloud防火墙

```bash
# 创建防火墙规则允许3000端口
gcloud compute firewall-rules create allow-yogii-backend \
    --allow tcp:3000 \
    --source-ranges 0.0.0.0/0 \
    --description "Allow Yogii backend"
```

## ✅ 验证部署

1. **检查后端服务**
   ```bash
   pm2 status
   curl http://localhost:3000/api/players
   ```

2. **访问应用**
   ```
   后端API: http://your-instance-ip:3000
   前端应用: 部署到Vercel后的域名
   ```

## 🛠️ 常用命令

```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs

# 重启应用
pm2 restart yogii-backend

# 停止应用
pm2 stop yogii-backend

# 查看数据库
cd /var/www/yogii/backend
sqlite3 database/yogii.db
.tables
.exit
```

## 🔧 故障排除

### 如果应用无法启动：
```bash
# 检查Node.js版本
node --version  # 应该是18.x

# 检查端口占用
sudo netstat -tlnp | grep :3000

# 手动启动调试
cd /var/www/yogii/backend
npm start
```

### 如果无法连接：
```bash
# 检查防火墙
sudo ufw status

# 检查Google Cloud防火墙规则
gcloud compute firewall-rules list
```

## 💡 重要提醒

1. **数据库文件**：SQLite文件会自动创建在 `/var/www/yogii/backend/database/yogii.db`
2. **备份**：定期备份数据库文件
3. **更新**：代码更新后需要重新运行部署脚本
4. **安全**：生产环境建议配置HTTPS和更严格的防火墙规则

## 🎯 下一步

部署完成后，你可以：
- 配置自定义域名
- 设置HTTPS证书
- 配置CDN加速
- 监控和日志分析
