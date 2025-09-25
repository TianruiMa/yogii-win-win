// 货币转换工具
export type CurrencyType = 'CAD' | 'RMB'

// 汇率常量 (CAD to RMB = 1:5.2)
const EXCHANGE_RATES = {
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
 * 转换货币金额
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
    return Number((amount * EXCHANGE_RATES.CAD_TO_RMB).toFixed(2))
  }

  if (fromCurrency === 'RMB' && toCurrency === 'CAD') {
    return Number((amount * EXCHANGE_RATES.RMB_TO_CAD).toFixed(2))
  }

  return amount
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
 * 根据用户偏好转换并格式化货币
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
