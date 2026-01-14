
import { BaseMarketService } from './base'
import { MarketInfo } from '../types'

interface BybitInstrument {
  symbol: string
  lastPrice: string
  markPrice: string
  fundingRate: string
  openInterest: string
  nextFundingTime: string
  price24hPcnt: string
}

interface BybitInstrumentInfo {
  symbol: string
  fundingInterval: number
  status: string
}

export class BybitMarketService extends BaseMarketService {
  private readonly restBaseUrl = 'https://api.bybit.com'

  constructor() {
    super('bybit')
  }



  protected async fetchMarkets(): Promise<MarketInfo[]> {
    try {
      // 并行请求两个接口
      const [tickersResponse, instrumentsInfoResponse] = await Promise.all([
        fetch(`${this.restBaseUrl}/v5/market/tickers?category=linear`),
        fetch(`${this.restBaseUrl}/v5/market/instruments-info?category=linear`)
      ])

      if (!tickersResponse.ok || !instrumentsInfoResponse.ok) {
        throw new Error(`HTTP error! status: ${tickersResponse.status} ${instrumentsInfoResponse.status}`)
      }

      const [tickersData, instrumentsInfoData] = await Promise.all([
        tickersResponse.json(),
        instrumentsInfoResponse.json()
      ])

      if (tickersData.retCode !== 0 || instrumentsInfoData.retCode !== 0) {
        throw new Error(`API error! retCode: ${tickersData.retCode} ${instrumentsInfoData.retCode}`)
      }

      // 创建资金费率间隔映射
      const instrumentsInfoMap = new Map<string, BybitInstrumentInfo>()
      if (Array.isArray(instrumentsInfoData.result.list)) {
        instrumentsInfoData.result.list.forEach((info: BybitInstrumentInfo) => {
          if (info.symbol.endsWith('USDT') && info.status === 'Trading') {
            instrumentsInfoMap.set(info.symbol, info)
          }
        })
      }

      // 处理行情数据
      const markets: MarketInfo[] = []
      if (Array.isArray(tickersData.result.list)) {
        tickersData.result.list.forEach((instrument: BybitInstrument) => {
          if (instrument.symbol.endsWith('USDT')) {
            const baseToken = instrument.symbol.replace('USDT', '')
            const instrumentInfo = instrumentsInfoMap.get(instrument.symbol)
            const fundingInterval = instrumentInfo?.fundingInterval || 480 // 默认8小时（480分钟）
            
            // 计算年化资金费率时考虑实际的 fundingInterval
            const fundingRateDaily = (24 * 60) / fundingInterval
            const fundingRate = parseFloat(instrument.fundingRate) * 100
            const nextFundingTime = Number(instrument.nextFundingTime) || 0
            
            markets.push({
              symbol: `${baseToken}/USDT`,
              baseToken,
              quoteToken: 'USDT',
              markPrice: parseFloat(instrument.markPrice),
              indexPrice: parseFloat((instrument as any).indexPrice) || parseFloat(instrument.markPrice),
              maxLeverage: 100,
              fundingRate: fundingRate,
              fundingRateAnnualized: fundingRate * fundingRateDaily * 365,
              fundingLongRate: -fundingRate,
              fundingLongRateAnnualized: -fundingRate * fundingRateDaily * 365,
              openInterest: parseFloat(instrument.openInterest),
              nextFundingTime: nextFundingTime,
              priceChange24hPercentage: parseFloat(instrument.price24hPcnt),
            })
          }
        })
      }

      return markets
    } catch (error) {
      console.error('获取Bybit市场数据失败:', error)
      return []
    }
  }
}
