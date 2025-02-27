import { IMarketService, MarketInfo } from './types'
import { BinanceMarketService } from './platforms/binance'
import { isWsMarket } from './platforms/config'
import { OkxMarketService } from './platforms/okx'
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
    // 初始化支持的平台服务
    this.services.set('binance', new BinanceMarketService(isWsMarket('binance')))
    this.services.set('okx', new OkxMarketService(isWsMarket('okx')))
    this.services.set('bybit', new BybitMarketService(isWsMarket('bybit')))
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