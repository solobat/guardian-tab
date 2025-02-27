import { MarketInfo } from '../types'

export abstract class BaseMarketService {
  protected readonly CACHE_KEY: string
  protected readonly CACHE_TTL = 5 * 1000 // 默认缓存时间5秒
  private isRefreshing = false

  constructor(platform: string) {
    this.CACHE_KEY = `${platform}_markets_cache`
  }

  protected getCache(): { markets: MarketInfo[], timestamp: number } | null {
    const cacheStr = localStorage.getItem(this.CACHE_KEY)
    if (!cacheStr) return null
    
    const cache = JSON.parse(cacheStr)
    // 如果缓存过期且没有在刷新中，触发后台刷新
    if (Date.now() - cache.timestamp >= this.CACHE_TTL && !this.isRefreshing) {
      this.refreshCache()
    }
    // 无论是否过期都返回缓存数据
    return cache
  }

  private async refreshCache() {
    if (this.isRefreshing) return
    this.isRefreshing = true
    try {
      const markets = await this.fetchMarkets()
      this.setCache(markets)
    } finally {
      this.isRefreshing = false
    }
  }

  protected setCache(markets: MarketInfo[]) {
    // 只在 markets 不为空时写入缓存
    if (markets && markets.length > 0) {
      localStorage.setItem(
        this.CACHE_KEY,
        JSON.stringify({
          markets,
          timestamp: Date.now()
        })
      )
    }
  }

  // 新增抽象方法，用于实际获取市场数据
  protected abstract fetchMarkets(): Promise<MarketInfo[]>

  // 修改 getMarkets 方法实现
  async getMarkets(): Promise<MarketInfo[]> {
    const cached = this.getCache()
    if (cached) {
      return cached.markets
    }
    // 如果没有缓存，直接获取新数据
    const markets = await this.fetchMarkets()
    // 只在有数据时写入缓存
    if (markets && markets.length > 0) {
      this.setCache(markets)
    }
    return markets
  }
} 