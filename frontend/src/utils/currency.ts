// 货币转换工具
import exchangeRateService from '../services/exchangeRate'

export type CurrencyType = 'CAD' | 'RMB'

// 备用汇率常量（当动态汇率不可用时使用）
const FALLBACK_EXCHANGE_RATES = {
  CAD_TO_RMB: 5.2,
  RMB_TO_CAD: 1 / 5.2
}

// 货币符号映射
export const CURRENCY_SYMBOLS = {
  CAD: '$',
  RMB: '¥'
} as const

// 货币名称映射
export const CURRENCY_NAMES = {
  CAD: 'CAD($)',
  RMB: 'RMB(¥)'
} as const

/**
 * 转换货币金额（同步版本，使用备用汇率）
 * @param amount 金额
 * @param fromCurrency 源货币
 * @param toCurrency 目标货币
 * @returns 转换后的金额
 */
export function convertCurrency(
  amount: number,
  fromCurrency: CurrencyType,
  toCurrency: CurrencyType
): number {
  if (fromCurrency === toCurrency) {
    return amount
  }

  if (fromCurrency === 'CAD' && toCurrency === 'RMB') {
    return Number((amount * FALLBACK_EXCHANGE_RATES.CAD_TO_RMB).toFixed(2))
  }

  if (fromCurrency === 'RMB' && toCurrency === 'CAD') {
    return Number((amount * FALLBACK_EXCHANGE_RATES.RMB_TO_CAD).toFixed(2))
  }

  return amount
}

/**
 * 转换货币金额（异步版本，使用动态汇率）
 * @param amount 金额
 * @param fromCurrency 源货币
 * @param toCurrency 目标货币
 * @returns 转换后的金额
 */
export async function convertCurrencyAsync(
  amount: number,
  fromCurrency: CurrencyType,
  toCurrency: CurrencyType
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount
  }

  try {
    const rate = await exchangeRateService.getRate(fromCurrency, toCurrency)
    return Number((amount * rate).toFixed(2))
  } catch (error) {
    console.warn('动态汇率转换失败，使用备用汇率:', error)
    return convertCurrency(amount, fromCurrency, toCurrency)
  }
}

/**
 * 格式化货币显示
 * @param amount 金额
 * @param currency 货币类型
 * @param showSymbol 是否显示货币符号
 * @returns 格式化的货币字符串
 */
export function formatCurrency(
  amount: number | null,
  currency: CurrencyType,
  showSymbol: boolean = true
): string {
  if (amount === null) {
    return '--'
  }

  const symbol = showSymbol ? CURRENCY_SYMBOLS[currency] : ''
  return `${symbol}${amount}`
}

/**
 * 根据用户偏好转换并格式化货币（同步版本，使用备用汇率）
 * @param amount 金额
 * @param originalCurrency 原始货币
 * @param userPreferredCurrency 用户偏好货币
 * @param showSymbol 是否显示货币符号
 * @returns 转换并格式化后的货币字符串
 */
export function convertAndFormatCurrency(
  amount: number | null,
  originalCurrency: CurrencyType,
  userPreferredCurrency: CurrencyType,
  showSymbol: boolean = true
): string {
  if (amount === null) {
    return '--'
  }

  const convertedAmount = convertCurrency(amount, originalCurrency, userPreferredCurrency)
  return formatCurrency(convertedAmount, userPreferredCurrency, showSymbol)
}

/**
 * 根据用户偏好转换并格式化货币（异步版本，使用动态汇率）
 * @param amount 金额
 * @param originalCurrency 原始货币
 * @param userPreferredCurrency 用户偏好货币
 * @param showSymbol 是否显示货币符号
 * @returns 转换并格式化后的货币字符串
 */
export async function convertAndFormatCurrencyAsync(
  amount: number | null,
  originalCurrency: CurrencyType,
  userPreferredCurrency: CurrencyType,
  showSymbol: boolean = true
): Promise<string> {
  if (amount === null) {
    return '--'
  }

  try {
    const convertedAmount = await convertCurrencyAsync(amount, originalCurrency, userPreferredCurrency)
    return formatCurrency(convertedAmount, userPreferredCurrency, showSymbol)
  } catch (error) {
    console.warn('动态汇率格式化失败，使用备用汇率:', error)
    return convertAndFormatCurrency(amount, originalCurrency, userPreferredCurrency, showSymbol)
  }
}

/**
 * 获取汇率信息
 * @param fromCurrency 源货币
 * @param toCurrency 目标货币
 * @returns 汇率信息
 */
export async function getExchangeRateInfo(
  fromCurrency: CurrencyType,
  toCurrency: CurrencyType
): Promise<{
  rate: number
  source: 'cache' | 'api' | 'fallback'
  timestamp?: number
}> {
  try {
    const rate = await exchangeRateService.getRate(fromCurrency, toCurrency)
    
    // 检查是否为备用汇率
    const fallbackKey = `${fromCurrency}_${toCurrency}`
    const isFallback = (fromCurrency === 'CAD' && toCurrency === 'RMB' && rate === FALLBACK_EXCHANGE_RATES.CAD_TO_RMB) ||
                       (fromCurrency === 'RMB' && toCurrency === 'CAD' && rate === FALLBACK_EXCHANGE_RATES.RMB_TO_CAD)
    
    return {
      rate,
      source: isFallback ? 'fallback' : 'api',
      timestamp: Date.now()
    }
  } catch (error) {
    console.warn('获取汇率信息失败:', error)
    return {
      rate: convertCurrency(1, fromCurrency, toCurrency),
      source: 'fallback',
      timestamp: Date.now()
    }
  }
}
