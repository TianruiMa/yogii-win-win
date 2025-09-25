# 🚀 Yogii-win-win 移植到 Google Cloud 计划

## 📱 项目概述
将微信小程序移植为Google Cloud上的响应式网页应用，保留所有原有功能并增强跨平台体验。

## 🛠️ 技术栈选择

### 前端
- **框架**: Vue.js 3 + TypeScript
- **构建工具**: Vite
- **UI组件**: Element Plus / Naive UI (手机优化)
- **状态管理**: Pinia
- **PWA**: Workbox

### 后端
- **运行时**: Node.js 18+
- **框架**: Express.js + TypeScript
- **数据库**: SQLite (轻量) 或 PostgreSQL
- **实时通信**: Socket.IO
- **认证**: JWT

### 部署
- **云平台**: Google Cloud Platform
- **服务器**: Compute Engine (e2-micro 免费实例)
- **域名**: Google Domains (可选)
- **SSL**: Let's Encrypt (免费)

## 📋 移植步骤

### 第一阶段：环境准备 (1天)
1. **注册 Google Cloud 账户**
   - 获取 $300 免费赠金
   - 启用所需服务 (Compute Engine, Cloud Storage)

2. **创建服务器实例**
   - 选择 e2-micro (永久免费)
   - 配置 Ubuntu 20.04 LTS
   - 设置防火墙规则

3. **安装开发环境**
   - Node.js 18+
   - PM2 (进程管理)
   - Nginx (反向代理)

### 第二阶段：后端开发 (1天)
1. **创建 Express.js 项目**
   - TypeScript 配置
   - SQLite 数据库设计
   - RESTful API 设计

2. **数据模型设计**
   ```sql
   CREATE TABLE players (
     id INTEGER PRIMARY KEY,
     nickname TEXT NOT NULL,
     hands INTEGER DEFAULT 0,
     chips INTEGER DEFAULT 0,
     profit INTEGER DEFAULT 0,
     is_admin BOOLEAN DEFAULT FALSE,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );

   CREATE TABLE games (
     id INTEGER PRIMARY KEY,
     current_chips INTEGER DEFAULT 1000,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );
   ```

3. **API 端点实现**
   - `GET /api/players` - 获取玩家列表
   - `POST /api/players` - 添加玩家
   - `PUT /api/players/:id` - 更新玩家数据
   - `DELETE /api/players/:id` - 删除玩家
   - `GET /api/stats` - 获取统计数据
   - `POST /api/clear` - 清除所有数据

4. **Socket.IO 实时同步**
   - 玩家数据变更广播
   - 实时统计更新

### 第三阶段：前端开发 (1-2天)
1. **创建 Vue.js 项目**
   ```bash
   npm create vue@latest yogii-web
   cd yogii-web
   npm install
   ```

2. **移植核心组件**
   - ScoreBoard.vue (主计分板)
   - PlayerItem.vue (玩家条目)
   - StatsPanel.vue (统计面板)
   - QRDialog.vue (二维码弹窗)

3. **实现状态管理**
   - Pinia stores for players, game state
   - Socket.IO 集成
   - 权限管理

4. **响应式设计**
   - 移动端优先设计
   - Touch 事件优化
   - PWA 配置

### 第四阶段：功能移植 (1天)
1. **核心功能对应**
   ```
   微信小程序 → 网页版
   wx.showModal → Element Plus Dialog
   wx.showToast → Element Plus Message
   Component → Vue Component
   this.setData → Vue Reactive
   bindinput → @input
   bindtap → @click
   ```

2. **特殊功能处理**
   - 长按事件 → Pointer Events
   - 分享功能 → Web Share API
   - 权限管理 → localStorage + JWT

### 第五阶段：部署配置 (半天)
1. **服务器配置**
   - Nginx 配置
   - PM2 进程管理
   - SSL 证书

2. **前端构建部署**
   - Vite 生产构建
   - 静态文件服务
   - PWA 配置

3. **域名配置 (可选)**
   - DNS 解析
   - SSL 证书自动更新

## 💰 成本估算

### 免费方案 (推荐)
- **服务器**: Google Cloud e2-micro (免费)
- **域名**: 使用 IP 或免费二级域名
- **SSL**: Let's Encrypt (免费)
- **总成本**: $0/月

### 付费方案
- **服务器**: $0-6/月 (如需升级)
- **域名**: $12/年 (可选)
- **总成本**: $12-84/年

## 📱 功能对比

| 功能 | 微信小程序 | 网页版 |
|------|------------|--------|
| 计分板 | ✅ | ✅ |
| 实时同步 | ✅ | ✅ (Socket.IO) |
| 权限管理 | ✅ | ✅ (JWT) |
| 分享功能 | ✅ | ✅ (Web Share API) |
| 离线使用 | ❌ | ✅ (PWA) |
| 跨平台 | ❌ | ✅ (所有浏览器) |
| 安装到桌面 | ❌ | ✅ (PWA) |
| 推送通知 | ❌ | ✅ (可选) |

## 🎯 实施时间线

```
第1天: Google Cloud 环境准备
第2天: 后端 API 开发
第3天: 前端组件移植
第4天: 功能集成测试
第5天: 部署上线

总计: 5天完成移植
```

## 🚀 开始行动

立即可以开始的步骤：
1. 注册 Google Cloud 账户
2. 创建前端 Vue.js 项目
3. 设计数据库结构
4. 开发核心 API

这样移植后，您将拥有一个完全自主控制、成本极低、功能更强的网页版游戏计分系统！
