// app.ts
App<IAppOption>({
  globalData: {},
  onLaunch() {
    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      try {
        wx.cloud.init({
          // 暂时不指定env，使用默认环境
          traceUser: true,
        });
        console.log('🌈 云开发初始化成功');
      } catch (error) {
        console.error('☁️ 云开发初始化失败:', error);
      }
    }

    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)
  },
})