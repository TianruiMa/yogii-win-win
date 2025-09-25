# 🚀 你的Yogii项目专用部署命令

## 📋 你的实例信息
- **实例名称**: yogii-server
- **外部IP**: 34.130.185.125
- **区域**: northamerica-northeast2-c
- **状态**: ✅ 运行中

## 🛠️ 第一步：连接到你的实例

```bash
# 方法1：通过gcloud命令连接
gcloud compute ssh yogii-server --zone=northamerica-northeast2-c

# 方法2：通过Google Cloud Console点击SSH按钮
```

## 📦 第二步：上传项目代码

### 方法A：使用gcloud上传（推荐）
```bash
# 在你的本地项目根目录（E:\Projects\Yogii-win-win）运行：
gcloud compute scp --recurse . yogii-server:/tmp/yogii --zone=northamerica-northeast2-c

# 然后在服务器上移动文件：
# （连接到服务器后运行）
sudo mkdir -p /var/www
sudo mv /tmp/yogii /var/www/
sudo chown -R $USER:$USER /var/www/yogii
```

### 方法B：使用GitHub（更简单）
```bash
# 1. 在本地推送到GitHub
git add .
git commit -m "Ready for deployment"
git push origin main

# 2. 在服务器上克隆（连接到服务器后运行）
sudo mkdir -p /var/www
cd /var/www
sudo git clone https://github.com/你的用户名/你的仓库名.git yogii
sudo chown -R $USER:$USER /var/www/yogii
```

## 🔧 第三步：运行部署脚本

```bash
# 在服务器上运行（连接到yogii-server后）
cd /var/www/yogii
chmod +x deploy.sh
./deploy.sh
```

## 🔒 第四步：配置防火墙

```bash
# 在你的本地命令行运行：
gcloud compute firewall-rules create allow-yogii-backend \
    --allow tcp:3000 \
    --source-ranges 0.0.0.0/0 \
    --description "Allow Yogii backend on port 3000"

# 验证防火墙规则：
gcloud compute firewall-rules list | grep yogii
```

## ✅ 第五步：验证部署

```bash
# 在服务器上检查服务状态：
pm2 status

# 测试后端API：
curl http://localhost:3000/api/players

# 从外网测试（在你的本地运行）：
curl http://34.130.185.125:3000/api/players
```

## 🌐 第六步：前端部署

```bash
# 在服务器上构建前端：
cd /var/www/yogii/frontend
npm install
npm run build

# 使用Vercel部署前端（推荐）：
npm install -g vercel
vercel --prod
```

## 🎯 部署完成后的访问地址

- **后端API**: http://34.130.185.125:3000
- **测试页面**: http://34.130.185.125:3000/api/players
- **前端应用**: Vercel提供的域名

## 🆘 如果遇到问题

### SSH连接问题：
```bash
# 确保你已经认证
gcloud auth login

# 设置默认项目
gcloud config set project 你的项目ID
```

### 防火墙问题：
```bash
# 检查现有规则
gcloud compute firewall-rules list

# 删除重复规则（如果需要）
gcloud compute firewall-rules delete rule-name
```

### 应用启动问题：
```bash
# 在服务器上查看日志
pm2 logs yogii-backend

# 手动启动调试
cd /var/www/yogii/backend
npm start
```

## 🚀 准备好了吗？

现在你可以：
1. 选择上传代码的方法（GitHub更简单）
2. 按照上面的命令一步步执行
3. 有问题随时告诉我！
