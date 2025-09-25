import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { setLocale } from './i18n'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// 初始化语言设置
const savedLanguage = localStorage.getItem('userPreferredLanguage') as 'zh' | 'en' | null
setLocale(savedLanguage || 'zh')

app.mount('#app')
