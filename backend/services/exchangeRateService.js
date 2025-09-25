import database from '../database/database.js';

class ExchangeRateService {
  constructor() {
    this.apiUrl = 'https://api.exchangerate-api.com/v4/latest/';
    this.baseCurrency = 'CAD';
    this.lastRequestTime = null;
    this.requestCount = 0;
    this.startScheduler();
  }

  // 获取系统配置
  async getConfig(key) {
    try {
      const result = await database.get(
        'SELECT config_value FROM system_config WHERE config_key = ?',
        [key]
      );
      return result ? result.config_value : null;
    } catch (error) {
      console.error(`获取配置失败 ${key}:`, error);
      return null;
    }
  }

  // 更新系统配置
  async updateConfig(key, value) {
    try {
      await database.run(
        `INSERT OR REPLACE INTO system_config (config_key, config_value, updated_at) 
         VALUES (?, ?, CURRENT_TIMESTAMP)`,
        [key, value]
      );
      console.log(`✅ 配置已更新: ${key} = ${value}`);
      return true;
    } catch (error) {
      console.error(`更新配置失败 ${key}:`, error);
      return false;
    }
  }

  // 检查今日请求次数
  async getTodayRequestCount() {
    try {
      const result = await database.get(`
        SELECT COUNT(*) as count 
        FROM exchange_rates 
        WHERE DATE(updated_at) = DATE('now')
        AND source = 'exchangerate-api'
      `);
      return result ? result.count : 0;
    } catch (error) {
      console.error('获取今日请求次数失败:', error);
      return 0;
    }
  }

  // 检查是否可以请求API
  async canMakeRequest() {
    const maxRequests = parseInt(await this.getConfig('exchange_rate_requests_per_day')) || 10;
    const todayCount = await this.getTodayRequestCount();
    
    console.log(`📊 今日API请求: ${todayCount}/${maxRequests}`);
    return todayCount < maxRequests;
  }

  // 从API获取汇率
  async fetchRatesFromAPI() {
    if (!(await this.canMakeRequest())) {
      console.log('⚠️ 已达到今日API请求限制');
      return false;
    }

    try {
      const apiUrl = (await this.getConfig('exchange_rate_api_url')) || this.apiUrl;
      const baseCurrency = (await this.getConfig('exchange_rate_base_currency')) || this.baseCurrency;
      
      console.log(`🌐 正在获取汇率: ${apiUrl}${baseCurrency}`);
      
      const response = await fetch(`${apiUrl}${baseCurrency}`);
      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const data = await response.json();
      
      // 保存所有汇率到数据库
      const rates = data.rates;
      let savedCount = 0;
      
      for (const [currency, rate] of Object.entries(rates)) {
        try {
          await database.run(`
            INSERT OR REPLACE INTO exchange_rates 
            (base_currency, target_currency, rate, updated_at, source) 
            VALUES (?, ?, ?, CURRENT_TIMESTAMP, 'exchangerate-api')
          `, [baseCurrency, currency, rate]);
          savedCount++;
        } catch (error) {
          console.error(`保存汇率失败 ${baseCurrency}→${currency}:`, error);
        }
      }

      console.log(`✅ 汇率更新成功: 保存了 ${savedCount} 个汇率`);
      this.requestCount++;
      this.lastRequestTime = new Date();
      
      return true;
    } catch (error) {
      console.error('❌ 获取汇率失败:', error);
      return false;
    }
  }

  // 从数据库获取汇率
  async getRate(fromCurrency, toCurrency) {
    try {
      // 首先尝试获取今日汇率
      let result = await database.get(`
        SELECT rate, updated_at 
        FROM exchange_rates 
        WHERE base_currency = ? AND target_currency = ?
        AND DATE(updated_at) = DATE('now')
        ORDER BY updated_at DESC 
        LIMIT 1
      `, [fromCurrency, toCurrency]);

      if (result) {
        console.log(`💱 使用今日汇率: ${fromCurrency}→${toCurrency} = ${result.rate}`);
        return parseFloat(result.rate);
      }

      // 如果没有今日汇率，获取最近的汇率
      result = await database.get(`
        SELECT rate, updated_at 
        FROM exchange_rates 
        WHERE base_currency = ? AND target_currency = ?
        ORDER BY updated_at DESC 
        LIMIT 1
      `, [fromCurrency, toCurrency]);

      if (result) {
        console.log(`💱 使用历史汇率: ${fromCurrency}→${toCurrency} = ${result.rate} (${result.updated_at})`);
        return parseFloat(result.rate);
      }

      // 尝试反向查找并计算
      const reverseResult = await database.get(`
        SELECT rate, updated_at 
        FROM exchange_rates 
        WHERE base_currency = ? AND target_currency = ?
        ORDER BY updated_at DESC 
        LIMIT 1
      `, [toCurrency, fromCurrency]);

      if (reverseResult) {
        const reverseRate = 1 / parseFloat(reverseResult.rate);
        console.log(`💱 使用反向汇率计算: ${fromCurrency}→${toCurrency} = ${reverseRate} (基于${toCurrency}→${fromCurrency} = ${reverseResult.rate})`);
        return reverseRate;
      }

      // 如果没有任何汇率数据，使用备用汇率
      if (fromCurrency === 'CAD' && toCurrency === 'CNY') {
        const fallbackRate = parseFloat(await this.getConfig('exchange_rate_fallback_cad_cny')) || 5.2;
        console.log(`💱 使用备用汇率: ${fromCurrency}→${toCurrency} = ${fallbackRate}`);
        return fallbackRate;
      }

      if (fromCurrency === 'CNY' && toCurrency === 'CAD') {
        const fallbackRate = 1 / (parseFloat(await this.getConfig('exchange_rate_fallback_cad_cny')) || 5.2);
        console.log(`💱 使用备用汇率: ${fromCurrency}→${toCurrency} = ${fallbackRate}`);
        return fallbackRate;
      }

      return null;
    } catch (error) {
      console.error(`获取汇率失败 ${fromCurrency}→${toCurrency}:`, error);
      return null;
    }
  }

  // 启动定时任务
  startScheduler() {
    // 立即获取一次汇率
    setTimeout(() => {
      this.fetchRatesFromAPI();
    }, 5000); // 5秒后执行，避免启动时的并发问题

    // 设置定时器
    this.scheduleNextUpdate();
  }

  // 计算下次更新时间
  async scheduleNextUpdate() {
    const requestsPerDay = parseInt(await this.getConfig('exchange_rate_requests_per_day')) || 10;
    const intervalMs = (24 * 60 * 60 * 1000) / requestsPerDay; // 毫秒
    
    console.log(`⏰ 汇率更新间隔: ${Math.round(intervalMs / 1000 / 60)} 分钟`);
    
    setTimeout(async () => {
      await this.fetchRatesFromAPI();
      this.scheduleNextUpdate(); // 递归调度下次更新
    }, intervalMs);
  }

  // 获取状态信息
  async getStatus() {
    const requestsPerDay = await this.getConfig('exchange_rate_requests_per_day');
    const todayCount = await this.getTodayRequestCount();
    
    return {
      requestsPerDay: parseInt(requestsPerDay),
      todayRequestCount: todayCount,
      remainingRequests: parseInt(requestsPerDay) - todayCount,
      lastRequestTime: this.lastRequestTime,
      totalRequests: this.requestCount
    };
  }
}

// 创建单例实例
const exchangeRateService = new ExchangeRateService();

export default exchangeRateService;
