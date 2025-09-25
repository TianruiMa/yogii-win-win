#!/bin/bash

# Yogii项目部署脚本 - 适用于Google Compute Engine

echo "🚀 开始部署Yogii项目..."

# 1. 更新系统
echo "📦 更新系统包..."
sudo apt-get update

# 2. 安装Node.js 18
echo "📦 安装Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. 安装PM2进程管理器
echo "📦 安装PM2..."
sudo npm install -g pm2

# 4. 创建应用目录
echo "📁 创建应用目录..."
sudo mkdir -p /var/www/yogii
sudo chown $USER:$USER /var/www/yogii

# 5. 进入项目目录
cd /var/www/yogii

# 6. 安装后端依赖
echo "📦 安装后端依赖..."
cd backend
npm install --production

# 7. 确保数据库目录存在
mkdir -p database

# 8. 启动应用
echo "🚀 启动应用..."
pm2 start ecosystem.config.js --env production

# 9. 设置PM2开机自启
pm2 startup
pm2 save

# 10. 配置防火墙
echo "🔒 配置防火墙..."
sudo ufw allow 3000
sudo ufw allow ssh
sudo ufw --force enable

echo "✅ 部署完成！"
echo "🌐 你的应用现在运行在: http://your-instance-ip:3000"
echo "📊 查看应用状态: pm2 status"
echo "📝 查看日志: pm2 logs"
