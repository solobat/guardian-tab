// 基础市场数据接口
export interface MarketInfo {
  id?: number
  fundingIntervalHours?: number
  symbol: string                  // 交易对符号
  baseToken: string              // 基础代币
  quoteToken: string             // 报价代币
  markPrice: number              // 标记价格
  indexPrice?: number            // 指数价格
  isActive?: boolean              // 是否激活
  maxLeverage: number            // 最大杠杆
  volume24h?: number              // 24小时交易量
  openInterest: number           // 未平仓量
  priceChange24h?: number         // 24小时价格变化
  priceChange24hPercentage?: number // 24小时价格变化百分比
  fundingRate: number            // 资金费率
  fundingRateAnnualized: number  // 年化资金费率
  fundingLongRate?: number
  fundingLongRateAnnualized?: number
  onlyIsolated?: boolean
  nextFundingTime?: number
}

// 平台服务接口
export interface IMarketService {
  getMarkets(): Promise<MarketInfo[]>
}
