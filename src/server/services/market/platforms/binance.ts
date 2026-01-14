import { BaseMarketService } from './base'
import { MarketInfo } from '../types'

export class BinanceMarketService extends BaseMarketService {
  private readonly restBaseUrl = 'https://fapi.binance.com'
  private fundingIntervals = new Map<string, number>()

  constructor() {
    super('binance')
  }


  private async ensureFundingIntervals() {
    if (this.fundingIntervals.size === 0) {
      try {
        const response = await fetch(`${this.restBaseUrl}/fapi/v1/fundingInfo`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const fundingInfoData = await response.json();
        this.fundingIntervals = new Map(
          fundingInfoData.map((info: any) => [info.symbol, info.fundingIntervalHours])
        );
        console.log('fundingIntervals', this.fundingIntervals);
        
      } catch (error) {
        console.error('获取Binance资金费率间隔数据失败:', error);
      }
    }
  }


  protected async fetchMarkets(): Promise<MarketInfo[]> {
    try {
      // 并行请求两个接口
      const [marketsResponse, fundingInfoResponse] = await Promise.all([
        fetch(`${this.restBaseUrl}/fapi/v1/premiumIndex`),
        fetch(`${this.restBaseUrl}/fapi/v1/fundingInfo`)
      ]);

      if (!marketsResponse.ok || !fundingInfoResponse.ok) {
        throw new Error(`HTTP error! status: ${marketsResponse.status} ${fundingInfoResponse.status}`)
      }

      const [marketsData, fundingInfoData] = await Promise.all([
        marketsResponse.json(),
        fundingInfoResponse.json()
      ]);

      // 创建资金费率间隔映射
      this.fundingIntervals = new Map<string, number>(
        fundingInfoData.map((info: any) => [info.symbol, info.fundingIntervalHours])
      );
      console.log('fundingIntervals', this.fundingIntervals);
      
      const markets: MarketInfo[] = marketsData.map((market: any) => {
        const baseToken = market.symbol.slice(0, -4)
        const quoteToken = 'USDT'
        // 获取该交易对的资金费率间隔（小时），默认为8
        const intervalHours = this.fundingIntervals.get(market.symbol.replace('/', '')) || 8
        // 计算年化倍数：(24/间隔小时数) * 365
        const annualizedMultiplier = (24 / intervalHours) * 365

        return {
          symbol: baseToken + '/' + quoteToken,
          intervalHours: intervalHours,
          baseToken: baseToken,
          quoteToken: quoteToken,
          markPrice: parseFloat(market.markPrice) || 0,
          maxLeverage: 125,
          openInterest: 0,
          fundingRate: (parseFloat(market.lastFundingRate) || 0) * 100,
          fundingRateAnnualized: (parseFloat(market.lastFundingRate) || 0) * annualizedMultiplier * 100,
          fundingLongRate: -(parseFloat(market.lastFundingRate) || 0) * 100,
          fundingLongRateAnnualized: -(parseFloat(market.lastFundingRate) || 0) * annualizedMultiplier * 100
        }
      })

      return markets
    } catch (error) {
      console.error('获取Binance市场数据失败:', error)
      return []
    }
  }

}
