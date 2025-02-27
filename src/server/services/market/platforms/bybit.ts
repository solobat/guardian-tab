
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
  private readonly wsBaseUrl = 'wss://stream.bybit.com/v5/public/linear'
  private readonly restBaseUrl = 'https://api.bybit.com'
  private ws: WebSocket | null = null
  private useWebSocket: boolean = false
  private reconnectTimeout: number | null = null
  private heartbeatTimeout: number | null = null
  private instruments: Map<string, BybitInstrument> = new Map()
  private instrumentsInfo: Map<string, BybitInstrumentInfo> = new Map()

  private readonly RECONNECT_DELAY = 5000
  private readonly HEARTBEAT_INTERVAL = 20000
  private readonly MAX_RECONNECT_ATTEMPTS = 5
  private reconnectAttempts = 0

  // 添加节流相关的属性
  private readonly UPDATE_INTERVAL = 1000 // 1秒内最多更新一次
  private lastUpdateTime: number = 0
  private pendingUpdates: Map<string, any> = new Map() // 缓存待更新的数据

  constructor(useWebSocket: boolean = false) {
    super('bybit')
    this.useWebSocket = useWebSocket
    if (useWebSocket) {
      this.fetchInitialInstruments()
        .then(() => {
          this.initWebSocket()
        })
        .catch((error) => {
          console.error('获取初始instruments数据失败:', error)
          this.initWebSocket()
        })
    }
  }

  private async fetchInitialInstruments(): Promise<void> {
    try {
      // 首先获取 instruments-info
      const infoResponse = await fetch(`${this.restBaseUrl}/v5/market/instruments-info?category=linear`)
      const infoData = await infoResponse.json()
      
      if (infoData.retCode === 0 && Array.isArray(infoData.result.list)) {
        infoData.result.list.forEach((info: BybitInstrumentInfo) => {
          if (info.symbol.endsWith('USDT') && info.status === 'Trading') {
            this.instrumentsInfo.set(info.symbol, info)
          }
        })
      }

      // 然后获取行情数据
      const response = await fetch(`${this.restBaseUrl}/v5/market/tickers?category=linear`)
      const data = await response.json()

      if (data.retCode === 0 && Array.isArray(data.result.list)) {
        const markets: MarketInfo[] = []

        data.result.list.forEach((instrument: BybitInstrument) => {
          if (instrument.symbol.endsWith('USDT')) {
            this.instruments.set(instrument.symbol, instrument)
            
            const baseToken = instrument.symbol.replace('USDT', '')
            const instrumentInfo = this.instrumentsInfo.get(instrument.symbol)
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

        this.setCache(markets)
        console.log(`已初始化 ${this.instruments.size} 个USDT永续合约信息`)
      }
    } catch (error) {
      console.error('获取instruments数据失败:', error)
      throw error
    }
  }

  private initWebSocket() {
    if (this.ws) {
      this.cleanup()
    }

    this.ws = new WebSocket(this.wsBaseUrl)

    this.ws.onopen = () => {
      console.log('Bybit WebSocket已连接')
      this.reconnectAttempts = 0
      this.startHeartbeat()
      this.subscribe()
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'pong') {
          return
        }
        this.handleWebSocketMessage(data)
      } catch (error) {
        console.error('解析WebSocket数据失败:', error)
      }
    }

    this.ws.onerror = (error) => {
      console.error('Bybit WebSocket错误:', error)
      this.reconnect()
    }

    this.ws.onclose = () => {
      console.log('Bybit WebSocket连接关闭')
      this.reconnect()
    }
  }

  private subscribe() {
    const subscriptionArgs: string[] = []
    this.instruments.forEach((_, symbol) => {
      subscriptionArgs.push(`tickers.${symbol}`)
    })

    if (subscriptionArgs.length > 0) {
      const subscription = {
        op: 'subscribe',
        args: subscriptionArgs,
      }
      this.ws?.send(JSON.stringify(subscription))
    }
  }

  private handleWebSocketMessage(data: any) {
    try {
      if (data.type === 'pong') {
        return
      }
      
      if (!data.data || !data.topic) return

      const now = Date.now()
      const symbol = data.data.symbol
      if (!symbol) return

      // 获取或创建待更新数据
      let pendingUpdate = this.pendingUpdates.get(symbol) || {}

      // 更新数据
      const tickerData = data.data
      if (tickerData.markPrice) {
        pendingUpdate.markPrice = parseFloat(tickerData.markPrice)
      }
      if (tickerData.fundingRate) {
        const instrumentInfo = this.instrumentsInfo.get(symbol)
        const fundingInterval = instrumentInfo?.fundingInterval || 480
        const fundingRateDaily = (24 * 60) / fundingInterval
        const fundingRate = parseFloat(tickerData.fundingRate) * 100
        
        pendingUpdate.fundingRate = fundingRate
        pendingUpdate.fundingRateAnnualized = fundingRate * fundingRateDaily * 365
        pendingUpdate.fundingLongRate = -fundingRate
        pendingUpdate.fundingLongRateAnnualized = -fundingRate * fundingRateDaily * 365
      }
      if (tickerData.openInterest) {
        pendingUpdate.openInterest = parseFloat(tickerData.openInterest)
      }

      // 保存待更新数据
      this.pendingUpdates.set(symbol, pendingUpdate)

      // 检查是否需要处理更新
      if (now - this.lastUpdateTime >= this.UPDATE_INTERVAL) {
        this.processPendingUpdates()
      }
    } catch (error) {
      console.error('解析WebSocket数据失败:', error)
    }
  }

  private processPendingUpdates() {
    if (this.pendingUpdates.size === 0) return

    const cached = this.getCache()
    const existingMarkets = new Map(
      (cached?.markets || []).map(market => [market.symbol, market])
    )
    const updatedMarkets = new Map<string, MarketInfo>()

    // 首先处理所有现有的市场数据
    existingMarkets.forEach((market, symbol) => {
      updatedMarkets.set(symbol, { ...market })
    })

    // 处理待更新的数据
    for (const [symbol, updates] of this.pendingUpdates.entries()) {
      if (!symbol.endsWith('USDT')) continue

      const baseToken = symbol.replace('USDT', '')
      const marketSymbol = `${baseToken}/USDT`
      const existingMarket = existingMarkets.get(marketSymbol)
      const instrumentInfo = this.instrumentsInfo.get(symbol)
      const fundingInterval = instrumentInfo?.fundingInterval || 480
      const fundingRateDaily = (24 * 60) / fundingInterval

      // 构建更新数据
      const marketUpdate: Partial<MarketInfo> = {
        symbol: marketSymbol,
        baseToken,
        quoteToken: 'USDT',
      }

      // 处理标记价格
      if (updates.markPrice !== undefined) {
        marketUpdate.markPrice = updates.markPrice
      } else if (existingMarket) {
        marketUpdate.markPrice = existingMarket.markPrice
      }

      // 处理资金费率
      if (updates.fundingRate !== undefined) {
        marketUpdate.fundingRate = updates.fundingRate
        marketUpdate.fundingRateAnnualized = updates.fundingRate * fundingRateDaily * 365
        marketUpdate.fundingLongRate = updates.fundingLongRate
        marketUpdate.fundingLongRateAnnualized = updates.fundingLongRate * fundingRateDaily * 365
      } else if (existingMarket) {
        marketUpdate.fundingRate = existingMarket.fundingRate
        marketUpdate.fundingRateAnnualized = existingMarket.fundingRateAnnualized
        marketUpdate.fundingLongRate = existingMarket.fundingLongRate
        marketUpdate.fundingLongRateAnnualized = existingMarket.fundingLongRateAnnualized
      }

      // 处理持仓量
      if (updates.openInterest !== undefined) {
        marketUpdate.openInterest = updates.openInterest
      } else if (existingMarket) {
        marketUpdate.openInterest = existingMarket.openInterest
      }

      // 合并现有数据和更新数据
      updatedMarkets.set(marketSymbol, {
        ...(existingMarket || {
          symbol: marketSymbol,
          baseToken,
          quoteToken: 'USDT',
          maxLeverage: 100,
          markPrice: 0,
          fundingRate: 0,
          fundingRateAnnualized: 0,
          fundingLongRate: 0,
          fundingLongRateAnnualized: 0,
          openInterest: 0,
        }),
        ...marketUpdate,
      } as MarketInfo)
    }

    // 更新缓存，包含所有市场数据
    const markets = Array.from(updatedMarkets.values())
    if (markets.length > 0) {
      this.setCache(markets)
    }

    // 清空待更新队列并更新时间戳
    this.pendingUpdates.clear()
    this.lastUpdateTime = Date.now()
  }

  private startHeartbeat() {
    this.heartbeatTimeout = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ op: 'ping' }))
      }
    }, this.HEARTBEAT_INTERVAL)
  }

  private reconnect() {
    this.cleanup()

    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error('达到最大重连次数，停止重连')
      return
    }

    if (this.reconnectTimeout) {
      window.clearTimeout(this.reconnectTimeout)
    }

    const delay = this.RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts)
    this.reconnectTimeout = window.setTimeout(() => {
      console.log(`尝试重新连接 Bybit WebSocket (第${this.reconnectAttempts + 1}次)`)
      this.reconnectAttempts++
      this.initWebSocket()
    }, delay)
  }

  protected async fetchMarkets(): Promise<MarketInfo[]> {
    return []
  }

  async getMarkets(): Promise<MarketInfo[]> {
    if (this.useWebSocket) {
      const cached = this.getCache()
      return cached?.markets || []
    }
    return super.getMarkets()
  }

  public cleanup() {
    if (this.reconnectTimeout) {
      window.clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    if (this.heartbeatTimeout) {
      window.clearTimeout(this.heartbeatTimeout)
      this.heartbeatTimeout = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.instruments.clear()
  }
}
