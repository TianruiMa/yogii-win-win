import { ref, computed } from 'vue'
import type { LocaleType, TranslateFunction, LocaleMessages } from './types'
import zhLocale from './locales/zh'
import enLocale from './locales/en'

// 语言包集合
const locales: Record<LocaleType, LocaleMessages> = {
  zh: zhLocale,
  en: enLocale
}

// 当前语言状态
const currentLocale = ref<LocaleType>('zh')

// 获取嵌套对象的值
function getNestedValue(obj: any, path: string): string {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null
  }, obj)
}

// 替换模板变量 {key} -> value
function interpolate(template: string, params: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match
  })
}

// 翻译函数
const translate: TranslateFunction = (key: string, params?: Record<string, string | number>) => {
  const locale = locales[currentLocale.value]
  const value = getNestedValue(locale, key)
  
  if (value === null || value === undefined) {
    console.warn(`Translation key not found: ${key}`)
    return key // 返回键名作为降级
  }
  
  if (typeof value !== 'string') {
    console.warn(`Translation value is not a string: ${key}`)
    return key
  }
  
  return params ? interpolate(value, params) : value
}

// 设置当前语言
function setLocale(locale: LocaleType) {
  if (locales[locale]) {
    currentLocale.value = locale
    console.log(`🌐 Language switched to: ${locale}`)
  } else {
    console.warn(`Locale not found: ${locale}`)
  }
}

// 获取当前语言
function getLocale(): LocaleType {
  return currentLocale.value
}

// 检查翻译键是否存在
function hasTranslation(key: string): boolean {
  const locale = locales[currentLocale.value]
  const value = getNestedValue(locale, key)
  return value !== null && value !== undefined && typeof value === 'string'
}

// 响应式的翻译函数
const t = computed(() => translate)

// 导出所有功能
export {
  translate,
  setLocale,
  getLocale,
  hasTranslation,
  currentLocale,
  t
}

// 默认导出翻译函数
export default translate
