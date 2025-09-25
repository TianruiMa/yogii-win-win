// 动态汇率服务
import { apiClient } from './api'

// 汇率缓存
interface ExchangeRateCache {
  [key: string]: {
    rate: number
    timestamp: number
    ttl: number // 生存时间（毫秒）
  }
}

class ExchangeRateService {
  private cache: ExchangeRateCache = {}
  private readonly CACHE_TTL = 30 * 60 * 1000 // 30分钟缓存
  private readonly FALLBACK_RATES = {
    'CAD_RMB': 5.2,
    'RMB_CAD': 1 / 5.2
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(from: string, to: string): string {
    return `${from.toUpperCase()}_${to.toUpperCase()}`
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(key: string): boolean {
    const cached = this.cache[key]
    if (!cached) return false
    
    const now = Date.now()
    return (now - cached.timestamp) < cached.ttl
  }

  /**
   * 从缓存获取汇率
   */
  private getFromCache(from: string, to: string): number | null {
    const key = this.getCacheKey(from, to)
    
    if (this.isCacheValid(key)) {
      console.log(`💾 使用缓存汇率: ${from}→${to} = ${this.cache[key].rate}`)
      return this.cache[key].rate
    }
    
    return null
  }

  /**
   * 缓存汇率
   */
  private setCache(from: string, to: string, rate: number): void {
    const key = this.getCacheKey(from, to)
    this.cache[key] = {
      rate,
      timestamp: Date.now(),
      ttl: this.CACHE_TTL
    }
  }

  /**
   * 从后端API获取汇率
   */
  async fetchRate(from: string, to: string): Promise<number | null> {
    try {
      const response = await apiClient.get(`/exchange-rate/${from}/${to}`)
      
      if (response.data.rate) {
        const rate = response.data.rate
        this.setCache(from, to, rate)
        console.log(`🌐 获取新汇率: ${from}→${to} = ${rate}`)
        return rate
      }
      
      return null
    } catch (error) {
      console.warn(`获取汇率失败 ${from}→${to}:`, error)
      return null
    }
  }

  /**
   * 获取汇率（缓存优先，然后API，最后备用）
   */
  async getRate(from: string, to: string): Promise<number> {
    // 1. 相同货币
    if (from.toUpperCase() === to.toUpperCase()) {
      return 1
    }

    // 2. 检查缓存
    const cachedRate = this.getFromCache(from, to)
    if (cachedRate !== null) {
      return cachedRate
    }

    // 3. 从API获取
    const apiRate = await this.fetchRate(from, to)
    if (apiRate !== null) {
      return apiRate
    }

    // 4. 使用备用汇率
    const fallbackKey = this.getCacheKey(from, to)
    const fallbackRate = this.FALLBACK_RATES[fallbackKey as keyof typeof this.FALLBACK_RATES]
    
    if (fallbackRate) {
      console.log(`⚠️ 使用备用汇率: ${from}→${to} = ${fallbackRate}`)
      return fallbackRate
    }

    // 5. 最后的备选方案：反向计算
    const reverseKey = this.getCacheKey(to, from)
    const reverseRate = this.FALLBACK_RATES[reverseKey as keyof typeof this.FALLBACK_RATES]
    
    if (reverseRate) {
      const calculatedRate = 1 / reverseRate
      console.log(`⚠️ 使用反向备用汇率: ${from}→${to} = ${calculatedRate}`)
      return calculatedRate
    }

    // 6. 完全失败，返回1（不转换）
    console.error(`❌ 无法获取汇率: ${from}→${to}，使用1.0`)
    return 1
  }

  /**
   * 批量获取汇率
   */
  async getRates(ratePairs: Array<{ from: string; to: string }>): Promise<{ [key: string]: number }> {
    const results: { [key: string]: number } = {}
    
    // 检查缓存，收集需要从API获取的汇率
    const toFetch: Array<{ from: string; to: string }> = []
    
    for (const { from, to } of ratePairs) {
      const key = this.getCacheKey(from, to)
      
      if (from.toUpperCase() === to.toUpperCase()) {
        results[key] = 1
        continue
      }
      
      const cachedRate = this.getFromCache(from, to)
      if (cachedRate !== null) {
        results[key] = cachedRate
      } else {
        toFetch.push({ from, to })
      }
    }
    
    // 批量请求未缓存的汇率
    if (toFetch.length > 0) {
      try {
        const response = await apiClient.post('/exchange-rates', {
          rates: toFetch
        })
        
        const apiRates = response.data.rates
        
        for (const { from, to } of toFetch) {
          const key = this.getCacheKey(from, to)
          const apiData = apiRates[key]
          
          if (apiData && apiData.rate !== null) {
            const rate = apiData.rate
            this.setCache(from, to, rate)
            results[key] = rate
          } else {
            // 使用备用汇率
            results[key] = await this.getRate(from, to)
          }
        }
      } catch (error) {
        console.warn('批量获取汇率失败:', error)
        
        // 失败时逐个获取备用汇率
        for (const { from, to } of toFetch) {
          const key = this.getCacheKey(from, to)
          results[key] = await this.getRate(from, to)
        }
      }
    }
    
    return results
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache = {}
    console.log('🗑️ 汇率缓存已清除')
  }

  /**
   * 获取缓存状态
   */
  getCacheStatus(): { [key: string]: { rate: number; age: number; valid: boolean } } {
    const now = Date.now()
    const status: { [key: string]: { rate: number; age: number; valid: boolean } } = {}
    
    for (const [key, cached] of Object.entries(this.cache)) {
      const age = now - cached.timestamp
      status[key] = {
        rate: cached.rate,
        age: Math.round(age / 1000), // 秒
        valid: age < cached.ttl
      }
    }
    
    return status
  }
}

// 创建单例实例
export const exchangeRateService = new ExchangeRateService()
export default exchangeRateService
