import { BaseMarketService } from './base'
import { MarketInfo } from '../types'

export class BinanceMarketService extends BaseMarketService {
  private readonly restBaseUrl = 'https://fapi.binance.com'
  private readonly wsBaseUrl = 'wss://fstream.binance.com'
  private ws: WebSocket | null = null
  private useWebSocket: boolean = false
  private pingInterval: number | null = null
  private pongTimeout: number | null = null
  private reconnectTimeout: number | null = null
  private readonly PING_INTERVAL = 3 * 60 * 1000  // 3分钟
  private readonly PONG_TIMEOUT = 10 * 60 * 1000  // 10分钟
  private readonly RECONNECT_DELAY = 5000  // 5秒重连延迟
  private fundingIntervals = new Map<string, number>()

  constructor(useWebSocket: boolean = false) {
    super('binance')
    this.useWebSocket = useWebSocket
    if (useWebSocket) {
      this.initWebSocket()
    }
  }

  private initWebSocket() {
    if (this.ws) {
      this.cleanup()
    }

    // 使用正确的 WebSocket 连接格式
    this.ws = new WebSocket(`${this.wsBaseUrl}/ws/!markPrice@arr`)
    
    this.ws.onopen = () => {
      console.log('Binance WebSocket已连接')
      this.startPingPong()
    }

    this.ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data)
        // 处理 ping 消息
        if (data.ping) {
          this.ws?.send(JSON.stringify({ pong: data.ping }))
          return
        }
        
        const markets = await this.parseWsData(Array.isArray(data) ? data : [data])
        this.setCache(markets)
      } catch (error) {
        console.error('解析WebSocket数据失败:', error)
      }
    }

    this.ws.onerror = (error) => {
      console.error('Binance WebSocket错误:', error)
      this.reconnect()
    }

    this.ws.onclose = () => {
      console.log('Binance WebSocket连接关闭')
      this.stopPingPong()
      this.reconnect()
    }
  }

  private startPingPong() {
    this.stopPingPong()

    this.pingInterval = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ ping: Date.now() }))
        
        this.pongTimeout = window.setTimeout(() => {
          console.log('Pong 超时，重新连接')
          this.reconnect()
        }, this.PONG_TIMEOUT)
      }
    }, this.PING_INTERVAL)
  }

  private stopPingPong() {
    if (this.pingInterval) {
      window.clearInterval(this.pingInterval)
      this.pingInterval = null
    }
    if (this.pongTimeout) {
      window.clearTimeout(this.pongTimeout)
      this.pongTimeout = null
    }
  }

  private reconnect() {
    this.cleanup()
    
    if (this.reconnectTimeout) {
      window.clearTimeout(this.reconnectTimeout)
    }
    
    this.reconnectTimeout = window.setTimeout(() => {
      console.log('尝试重新连接 Binance WebSocket')
      this.initWebSocket()
    }, this.RECONNECT_DELAY)
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

  private async parseWsData(data: any[]): Promise<MarketInfo[]> {
    // 确保有资金费率间隔数据
    await this.ensureFundingIntervals();

    return data.map(market => {
      const baseToken = market.s.slice(0, -4)
      const quoteToken = 'USDT'
      const intervalHours = this.fundingIntervals.get(market.s) || 8
      const annualizedMultiplier = (24 / intervalHours) * 365
      const fundingRate = parseFloat(market.r) || 0
      const nextFundingTime = market.T || 0

      return {
        symbol: baseToken + '/' + quoteToken,
        baseToken: baseToken,
        quoteToken: quoteToken,
        markPrice: parseFloat(market.p) || 0,
        maxLeverage: 125,
        openInterest: 0,
        intervalHours: intervalHours,
        fundingRate: fundingRate * 100,
        fundingRateAnnualized: fundingRate * annualizedMultiplier * 100,
        fundingLongRate: -fundingRate * 100,
        fundingLongRateAnnualized: -fundingRate * annualizedMultiplier * 100,
        nextFundingTime: nextFundingTime
      }
    })
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

  // 重写父类的 getMarkets 方法
  async getMarkets(): Promise<MarketInfo[]> {
    if (this.useWebSocket) {
      const cached = this.getCache()
      return cached?.markets || []
    }
    return super.getMarkets()
  }

  // 清理方法
  public cleanup() {
    this.stopPingPong()
    if (this.reconnectTimeout) {
      window.clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}
