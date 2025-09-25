# 原始微信小程序代码（参考用）

此目录保留了原始的微信小程序代码，作为继续开发的参考。

## 📁 目录说明

- `pages/scoreboard/` - 原始计分板页面
  - `scoreboard.ts` - 核心逻辑和数据结构
  - `scoreboard.wxml` - 页面布局和组件
  - `scoreboard.wxss` - 样式定义
  - `scoreboard.json` - 页面配置

## 🔄 与网页版的对应关系

| 微信小程序 | 网页版 |
|------------|---------|
| `scoreboard.ts` | `frontend/src/components/ScoreBoard.vue` |
| `scoreboard.wxml` | Vue template 部分 |
| `scoreboard.wxss` | Vue style 部分 |
| Component data | Pinia store (`frontend/src/stores/game.ts`) |
| wx.showModal | 自定义 Dialog 组件 |
| wx.showToast | 浏览器原生提示 |
| Socket.IO | `frontend/src/services/socket.ts` |

## 🎯 主要功能点

- ✅ 玩家管理（添加、删除、编辑）
- ✅ Sets 调整（+/-）
- ✅ RM-Points 输入
- ✅ 权限控制（管理员/普通用户）
- ✅ 实时统计计算
- ✅ 数据清理功能
- ✅ QR码分享功能

## 📱 界面差异对比

### 当前网页版缺少的功能：
1. **QR码实际图片显示**
2. **分享功能的实际实现**
3. **长按快速调整Sets**
4. **更精细的移动端交互**
5. **原始的精美样式和布局**

### 需要继续开发的部分：
- [ ] 完善QR码功能
- [ ] 实现分享到社交平台
- [ ] 优化移动端手势操作
- [ ] 美化界面样式
- [ ] 添加音效和动画
