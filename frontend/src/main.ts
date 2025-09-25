import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { setLocale } from './i18n'
import exchangeRateService from './services/exchangeRate'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// 初始化语言设置
const savedLanguage = localStorage.getItem('userPreferredLanguage') as 'zh' | 'en' | null
setLocale(savedLanguage || 'zh')

// 预加载汇率（异步，不阻塞应用启动）
;(async () => {
  try {
    console.log('🔄 预加载汇率...')
    await exchangeRateService.getRate('CAD', 'CNY')
    await exchangeRateService.getRate('CNY', 'CAD')
    console.log('✅ 汇率预加载完成')
  } catch (error) {
    console.warn('⚠️ 汇率预加载失败，将使用备用汇率:', error)
  }
})()

app.mount('#app')
