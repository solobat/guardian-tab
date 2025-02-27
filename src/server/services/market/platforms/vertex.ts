import { BaseMarketService } from './base'
import { MarketInfo } from '../types'

interface VertexProduct {
  product_id: number
  oracle_price_x18: string
  risk: {
    long_weight_initial_x18: string
    short_weight_initial_x18: string
  }
  state: {
    open_interest: string
  }
}

interface VertexFundingRate {
  product_id: number
  funding_rate_x18: string
  update_time: string
}

interface VertexSymbol {
  type: string
  product_id: number
  symbol: string
  // ... other fields not needed for our use case
}

interface VertexSymbolsResponse {
  status: string
  data: {
    symbols: Record<string, VertexSymbol>
  }
}

export class VertexMarketService extends BaseMarketService {
  private readonly GATEWAY_API = 'https://gateway.prod.vertexprotocol.com/v1/query'
  private readonly ARCHIVE_API = 'https://archive.prod.vertexprotocol.com/v1'
  private readonly CHAIN_ID = '42161' // Arbitrum One

  private products: any = null
  private symbolMap: Map<number, string> = new Map()
  private initialized = false

  constructor() {
    super('vertex')
  }

  private async initialize() {
    if (this.initialized) return

    try {
      // 并行获取产品和符号数据
      const [products, symbols] = await Promise.all([this.fetchProducts(), this.fetchSymbols()])

      this.products = products

      // 创建产品ID到符号的映射
      Object.values(symbols.data.symbols).forEach((symbolInfo) => {
        this.symbolMap.set(symbolInfo.product_id, symbolInfo.symbol)
      })

      this.initialized = true
    } catch (error) {
      console.error('初始化Vertex市场服务失败:', error)
      throw error
    }
  }

  protected async fetchMarkets(): Promise<MarketInfo[]> {
    try {
      // 确保已初始化
      await this.initialize()

      // 从缓存的产品列表中获取有效的 product_ids
      const productIds = this.products[this.CHAIN_ID].perp_products.map(
        (product: VertexProduct) => product.product_id,
      )

      // 获取资金费率
      const fundingRates = await this.fetchFundingRates(productIds)

      // 创建资金费率映射
      const fundingRatesMap = new Map<number, VertexFundingRate>()
      Object.values(fundingRates).forEach((rate) => {
        fundingRatesMap.set(rate.product_id, rate)
      })

      const markets: MarketInfo[] = []

      this.products[this.CHAIN_ID].perp_products.forEach((product: VertexProduct) => {
        const fundingInfo = fundingRatesMap.get(product.product_id)
        if (!fundingInfo) return

        // 从缓存的映射中获取符号
        const symbol = this.symbolMap.get(product.product_id) || `PRODUCT${product.product_id}`

        // 计算标记价格（从 x18 格式转换）
        const markPrice = Number(product.oracle_price_x18) / 1e18

        // 计算资金费率（从 x18 格式转换）
        const fundingRate = (Number(fundingInfo.funding_rate_x18) / 1e18) * 100

        // 计算年化资金费率（假设8小时一次）
        const intervalsPerYear = 365
        const fundingRateAnnualized = fundingRate * intervalsPerYear

        // 计算最大杠杆
        const initialMargin = Number(product.risk.long_weight_initial_x18) / 1e18
        const maxLeverage = initialMargin > 0 ? Math.floor(1 / initialMargin) : 0

        // 计算未平仓量（从 wei 转换为标准单位）
        const openInterest = (Number(product.state.open_interest) / 1e18 * markPrice)
        const baseToken = symbol.split('-')[0]

        markets.push({
          symbol: `${baseToken}/USD`,
          baseToken: baseToken,
          quoteToken: 'USD',
          markPrice,
          maxLeverage,
          openInterest,
          fundingRate,
          fundingRateAnnualized,
          fundingLongRate: -fundingRate,
          fundingLongRateAnnualized: -fundingRateAnnualized,
          nextFundingTime: Number(fundingInfo.update_time) * 1000, // 转换为毫秒
        })
      })

      return markets
    } catch (error) {
      console.error('获取Vertex市场数据失败:', error)
      return []
    }
  }

  private async fetchProducts() {
    const response = await fetch(this.GATEWAY_API, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ type: 'edge_all_products' }),
    })

    if (!response.ok) {
      throw new Error('获取Vertex产品数据失败')
    }

    const data = await response.json()
    return data.data.edge_all_products
  }

  private async fetchFundingRates(productIds: number[]) {
    const response = await fetch(this.ARCHIVE_API, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        funding_rates: {
          product_ids: productIds,
        },
      }),
    })

    if (!response.ok) {
      throw new Error('获取Vertex资金费率数据失败')
    }

    const data = await response.json()
    return data as Record<number, VertexFundingRate>
  }

  private async fetchSymbols(): Promise<VertexSymbolsResponse> {
    const response = await fetch(`${this.GATEWAY_API}?type=symbols&product_type=perp`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('获取Vertex符号数据失败')
    }

    return response.json()
  }
}
