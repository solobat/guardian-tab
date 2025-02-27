import { BaseMarketService } from './base'
import { MarketInfo } from '../types'

interface OkxInstrument {
  instId: string
  baseCcy: string
  quoteCcy: string
  lever: string
  settleCcy: string
}

// 添加新的接口定义
interface PendingUpdate {
  markPrice?: number
  fundingRate?: number
  fundingInterval?: number  // 添加资金费率结算间隔
  nextFundingTime?: number
}

export class OkxMarketService extends BaseMarketService {
  private readonly wsBaseUrl = 'wss://ws.okx.com:8443/ws/v5/public'
  private readonly restBaseUrl = 'https://www.okx.com'
  private ws: WebSocket | null = null
  private useWebSocket: boolean = false
  private reconnectTimeout: number | null = null
  private heartbeatTimeout: number | null = null
  private pingTimeout: number | null = null
  private instruments: Map<string, OkxInstrument> = new Map()

  private readonly RECONNECT_DELAY = 5000 // 5秒重连延迟
  private readonly HEARTBEAT_INTERVAL = 25000 // 25秒心跳间隔（小于30秒的限制）
  private readonly PING_TIMEOUT = 5000 // 5秒ping超时
  private readonly RATE_LIMIT_WINDOW = 3600000 // 1小时的毫秒数
  private readonly MAX_SUBSCRIPTIONS_PER_HOUR = 480
  private reconnectAttempts = 0
  private readonly MAX_RECONNECT_ATTEMPTS = 5
  private subscriptionCount = 0
  private subscriptionTimer: number | null = null

  // 添加节流相关的属性
  private readonly UPDATE_INTERVAL = 1000 // 1秒内最多更新一次
  private lastUpdateTime: number = 0
  private pendingUpdates: Map<string, PendingUpdate> = new Map()

  constructor(useWebSocket: boolean = false) {
    super('okx')
    this.useWebSocket = useWebSocket
    if (useWebSocket) {
      this.fetchInitialInstruments()
        .then(() => {
          this.initWebSocket()
        })
        .catch((error) => {
          console.error('获取初始instruments数据失败:', error)
          this.initWebSocket() // 即使失败也尝试建立WebSocket连接
        })
    }
  }

  private async fetchInitialInstruments(): Promise<void> {
    try {
      const response = await fetch(`${this.restBaseUrl}/api/v5/public/instruments?instType=SWAP`)
      const data = await response.json()

      if (data.code === '0' && Array.isArray(data.data)) {
        const markets: MarketInfo[] = []

        data.data.forEach((instrument: OkxInstrument) => {
          if (instrument.settleCcy === 'USDT') {
            this.instruments.set(instrument.instId, instrument)

            // 构建初始市场信息并添加到缓存
            const [baseCcy, quoteCcy] = instrument.instId.split('-')
            markets.push({
              symbol: `${baseCcy}/${quoteCcy}`,
              baseToken: baseCcy,
              quoteToken: quoteCcy,
              maxLeverage: parseInt(instrument.lever),
              markPrice: 0,
              fundingRate: 0,
              fundingRateAnnualized: 0,
              fundingLongRate: 0,
              fundingLongRateAnnualized: 0,
              openInterest: 0,
              nextFundingTime: 0,
            })
          }
        })

        // 更新缓存
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
      console.log('OKX WebSocket已连接')
      this.reconnectAttempts = 0
      this.startHeartbeat()
      this.subscribe()
    }

    this.ws.onmessage = (event) => {
      this.resetHeartbeat()
      try {
        const data = JSON.parse(event.data)
        if (data === 'pong') {
          if (this.pingTimeout) {
            clearTimeout(this.pingTimeout)
            this.pingTimeout = null
          }
          return
        }
        this.handleWebSocketMessage(data)
      } catch (error) {
        console.error('解析WebSocket数据失败:', error)
      }
    }

    this.ws.onerror = (error) => {
      console.error('OKX WebSocket错误:', error)
      this.reconnect()
    }

    this.ws.onclose = () => {
      console.log('OKX WebSocket连接关闭')
      this.reconnect()
    }
  }

  private subscribe() {
    // 检查订阅限制
    if (this.subscriptionCount >= this.MAX_SUBSCRIPTIONS_PER_HOUR) {
      console.warn('已达到每小时订阅限制')
      return
    }

    // 直接使用已获取的instruments数据进行订阅
    const subscriptionArgs: any[] = []

    this.instruments.forEach((instrument) => {
      subscriptionArgs.push(
        {
          channel: 'mark-price',
          instId: instrument.instId,
        },
        {
          channel: 'funding-rate',
          instId: instrument.instId,
        },
      )
    })

    // 一次性发送所有订阅
    if (subscriptionArgs.length > 0) {
      const subscriptions = {
        op: 'subscribe',
        args: subscriptionArgs,
      }
      this.ws?.send(JSON.stringify(subscriptions))
      this.subscriptionCount++
    }

    // 重置订阅计数器
    if (!this.subscriptionTimer) {
      this.subscriptionTimer = window.setTimeout(() => {
        this.subscriptionCount = 0
        this.subscriptionTimer = null
      }, this.RATE_LIMIT_WINDOW)
    }
  }

  private handleWebSocketMessage(data: any) {
    if (data === 'pong') {
      if (this.pingTimeout) {
        clearTimeout(this.pingTimeout)
        this.pingTimeout = null
      }
      return
    }

    if (!data.data) return

    const now = Date.now()
    const instId = data.arg?.instId
    if (!instId) return

    let pendingUpdate = this.pendingUpdates.get(instId) || {}

    if (data.arg?.channel === 'mark-price') {
      pendingUpdate.markPrice = parseFloat(data.data[0].markPx)
    } else if (data.arg?.channel === 'funding-rate') {
      pendingUpdate.fundingRate = parseFloat(data.data[0].fundingRate)
      // 计算资金费率结算间隔（毫秒）
      const fundingTime = data.data[0].fundingTime
      const nextFundingTime = data.data[0].nextFundingTime
      pendingUpdate.fundingInterval = nextFundingTime - fundingTime
      pendingUpdate.nextFundingTime = nextFundingTime
    }

    this.pendingUpdates.set(instId, pendingUpdate)

    if (now - this.lastUpdateTime >= this.UPDATE_INTERVAL) {
      this.processPendingUpdates()
    }
  }

  private processPendingUpdates() {
    if (this.pendingUpdates.size === 0) return

    const cached = this.getCache()
    // 获取现有的所有市场数据
    const markets = [...(cached?.markets || [])]
    const existingMarkets = new Map(
      markets.map(market => [market.symbol, market])
    )

    // 处理所有待更新的数据
    for (const [instId, updates] of this.pendingUpdates.entries()) {
      const instrument = this.instruments.get(instId)
      if (!instrument) continue

      const [baseCcy, quoteCcy] = instId.split('-')
      const symbol = `${baseCcy}/${quoteCcy}`
      const existingMarket = existingMarkets.get(symbol)

      // 构建更新数据
      const marketUpdate: Partial<MarketInfo> = {
        symbol,
        baseToken: baseCcy,
        quoteToken: quoteCcy,
        maxLeverage: parseInt(instrument.lever),
      }

      // 只在数据变化显著时才更新
      if (updates.markPrice !== undefined) {
        if (!existingMarket?.markPrice || 
            Math.abs(existingMarket.markPrice - updates.markPrice) / existingMarket.markPrice > 0.0001) {
          marketUpdate.markPrice = updates.markPrice
        }
      }

      if (updates.fundingRate !== undefined) {
        const fundingRate = updates.fundingRate
        const fundingInterval = updates.fundingInterval || (8 * 60 * 60 * 1000) // 默认8小时
        const hoursPerYear = 365 * 24
        const intervalsPerYear = (hoursPerYear * 60 * 60 * 1000) / fundingInterval

        marketUpdate.fundingRate = fundingRate * 100
        marketUpdate.fundingRateAnnualized = fundingRate * 100 * intervalsPerYear
        marketUpdate.fundingLongRate = -fundingRate * 100
        marketUpdate.fundingLongRateAnnualized = -fundingRate * 100 * intervalsPerYear
        marketUpdate.nextFundingTime = Number(updates.nextFundingTime)
      }

      // 更新或添加市场数据
      const marketIndex = markets.findIndex(m => m.symbol === symbol)
      const updatedMarket = {
        ...(existingMarket || {
          symbol,
          baseToken: baseCcy,
          quoteToken: quoteCcy,
          maxLeverage: parseInt(instrument.lever),
          markPrice: 0,
          fundingRate: 0,
          fundingRateAnnualized: 0,
          fundingLongRate: 0,
          fundingLongRateAnnualized: 0,
          openInterest: 0,
          nextFundingTime: 0,
        }),
        ...marketUpdate,
      } as MarketInfo

      if (marketIndex !== -1) {
        markets[marketIndex] = updatedMarket
      } else {
        markets.push(updatedMarket)
      }
    }

    // 更新缓存
    if (markets.length > 0) {
      this.setCache(markets)
    }

    // 清空待更新队列并更新时间戳
    this.pendingUpdates.clear()
    this.lastUpdateTime = Date.now()
  }

  private startHeartbeat() {
    this.resetHeartbeat()
  }

  private resetHeartbeat() {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout)
    }
    if (this.pingTimeout) {
      clearTimeout(this.pingTimeout)
      this.pingTimeout = null
    }

    this.heartbeatTimeout = window.setTimeout(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send('ping')
        this.pingTimeout = window.setTimeout(() => {
          console.log('ping超时，重新连接')
          this.reconnect()
        }, this.PING_TIMEOUT)
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
      console.log(`尝试重新连接 OKX WebSocket (第${this.reconnectAttempts + 1}次)`)
      this.reconnectAttempts++
      this.initWebSocket()
    }, delay)
  }

  protected async fetchMarkets(): Promise<MarketInfo[]> {
    // 由于我们使用WebSocket，这个方法可能不会被调用
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
    if (this.pingTimeout) {
      window.clearTimeout(this.pingTimeout)
      this.pingTimeout = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.instruments.clear()
    if (this.subscriptionTimer) {
      window.clearTimeout(this.subscriptionTimer)
      this.subscriptionTimer = null
    }
    this.subscriptionCount = 0
  }
}
