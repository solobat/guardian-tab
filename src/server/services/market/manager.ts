import { IMarketService, MarketInfo } from './types'
import { BinanceMarketService } from './platforms/binance'
import { BybitMarketService } from './platforms/bybit'
import { getRealPlatform } from '../../../utils/market'


const PlatformsMap: Record<string, string> = {
  raydium: 'orderly',
  woofi: 'orderly',
}

export class MarketServiceManager {
  private static instance: MarketServiceManager
  private services: Map<string, IMarketService> = new Map()

  private constructor() {
    // 初始化支持的平台服务，全部使用 REST API
    this.services.set('binance', new BinanceMarketService())
    this.services.set('bybit', new BybitMarketService())
    // 后续可以添加其他平台
  }

  static getInstance() {
    if (!MarketServiceManager.instance) {
      MarketServiceManager.instance = new MarketServiceManager()
    }
    return MarketServiceManager.instance
  }

  async getMarkets(platform: string): Promise<MarketInfo[]> {
    const realPlatform = getRealPlatform(platform)
    const service = this.services.get(realPlatform.toLowerCase())
    
    if (!service) throw new Error('不支持的平台')
    return service.getMarkets()
  }
} 