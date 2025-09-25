import { computed } from 'vue'
import { translate, currentLocale, setLocale, getLocale, hasTranslation } from '../i18n'
import type { LocaleType } from '../i18n/types'

/**
 * 国际化组合式函数
 * 提供在Vue组件中使用的i18n功能
 */
export function useI18n() {
  // 响应式的翻译函数
  const t = (key: string, params?: Record<string, string | number>) => {
    // 在函数内部读取currentLocale.value来建立响应式依赖
    // 这样当currentLocale改变时，使用t函数的组件会重新渲染
    const currentLang = currentLocale.value
    return translate(key, params)
  }

  // 当前语言的响应式引用
  const locale = computed(() => currentLocale.value)

  // 设置语言
  const setLanguage = (newLocale: LocaleType) => {
    setLocale(newLocale)
  }

  // 获取当前语言
  const getLanguage = () => {
    return getLocale()
  }

  // 检查翻译是否存在
  const hasKey = (key: string) => {
    return hasTranslation(key)
  }

  // 语言切换助手
  const isZh = computed(() => currentLocale.value === 'zh')
  const isEn = computed(() => currentLocale.value === 'en')

  return {
    t,
    locale,
    setLanguage,
    getLanguage,
    hasKey,
    isZh,
    isEn
  }
}
