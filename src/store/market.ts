import { create } from 'zustand'
import { MarketServiceManager } from '../server/services/market/manager'
import { MarketInfo } from '../server/services/market/types'
import { isWsMarket, MarketName, SUPPORTED_PLATFORMS } from '../server/services/market/platforms/config'

interface MarketState {
  // 市场数据
  markets: {
    [platform: string]: MarketInfo[]
  }
  // 加载状态
  loading: {
    [platform: string]: boolean
  }
  // 最后更新时间
  lastUpdated: {
    [platform: string]: number
  }
  // 刷新间隔(毫秒)
  refreshInterval: number
  // 获取代币价格
  getTokenPrice: (symbol: string) => number | null
  // 获取代币价格变化百分比
  getTokenPriceChange: (symbol: string, timeframe?: '1h' | '24h') => number | null
  // 操作方法
  fetchMarkets: (platform: string) => Promise<void>
  startAutoRefresh: (platform: string) => void
  stopAutoRefresh: (platform: string) => void
  // 添加价格历史记录
  priceHistory: {
    [symbol: string]: {
      price: number,
      timestamp: number
    }[]
  }
}

const DEFAULT_REFRESH_INTERVAL = 30000 // 30秒
const WS_REFRESH_INTERVAL = 100 // 10毫秒

// 存储定时器的 Map
const refreshTimers: Map<string, number> = new Map()

export const useMarketStore = create<MarketState>((set, get) => ({
  markets: {},
  loading: {},
  lastUpdated: {},
  refreshInterval: DEFAULT_REFRESH_INTERVAL,
  priceHistory: {},

  getTokenPrice: (symbol: string) => {
    const { markets, priceHistory } = get()
    
    // 标准化代币符号
    const normalizedSymbol = symbol.toUpperCase()
    
    // 遍历所有平台寻找匹配的市场
    for (const platform of SUPPORTED_PLATFORMS) {
      const platformMarkets = markets[platform] || []
      
      // 查找匹配的市场
      const market = platformMarkets.find(m => {
        // 检查 USDT 交易对
        if (m.symbol === `${normalizedSymbol}/USDT` || m.symbol === `${normalizedSymbol}USDT`) {
          return true
        }
        // 检查 USDC 交易对
        if (m.symbol === `${normalizedSymbol}/USDC` || m.symbol === `${normalizedSymbol}USDC`) {
          return true
        }
        return false
      })

      if (market) {
        return market.markPrice
      }
    }

    // 特殊处理稳定币
    if (normalizedSymbol === 'USDT' || normalizedSymbol === 'USDC') {
      return 1
    }

    return null
  },

  getTokenPriceChange: (symbol: string, timeframe = '24h') => {
    const { markets } = get()
    
    // 标准化代币符号
    const normalizedSymbol = symbol.toUpperCase()
    
    // 遍历所有平台寻找匹配的市场
    for (const platform of SUPPORTED_PLATFORMS) {
      const platformMarkets = markets[platform] || []
      
      // 查找匹配的市场
      const market = platformMarkets.find(m => {
        // 检查 USDT 交易对
        if (m.symbol === `${normalizedSymbol}/USDT` || m.symbol === `${normalizedSymbol}USDT`) {
          return true
        }
        // 检查 USDC 交易对
        if (m.symbol === `${normalizedSymbol}/USDC` || m.symbol === `${normalizedSymbol}USDC`) {
          return true
        }
        return false
      })
      
      if (market) {
        // 根据时间段返回相应的价格变化百分比
        if (timeframe === '24h' && market.priceChange24hPercentage !== undefined) {
          return market.priceChange24hPercentage
        }
      }
    }
    
    // 如果在市场数据中没有找到，尝试使用价格历史记录
    return null
  },

  fetchMarkets: async (platform: string) => {
    const marketManager = MarketServiceManager.getInstance()

    set((state) => ({
      loading: { ...state.loading, [platform]: true },
    }))

    try {
      const markets = await marketManager.getMarkets(platform)
      set((state) => ({
        markets: { ...state.markets, [platform]: markets as unknown as MarketInfo[] },
        lastUpdated: { ...state.lastUpdated, [platform]: Date.now() },
      }))
    } catch (error) {
      console.error(`获取${platform}市场数据失败:`, error)
    } finally {
      set((state) => ({
        loading: { ...state.loading, [platform]: false },
      }))
    }
  },

  startAutoRefresh: (platform: string) => {
    // 如果已经存在定时器，先清除
    if (refreshTimers.has(platform)) {
      clearInterval(refreshTimers.get(platform))
    }

    // 立即获取一次数据
    get().fetchMarkets(platform)

    // 根据平台类型设置刷新间隔
    const interval = isWsMarket(platform as MarketName) 
      ? WS_REFRESH_INTERVAL 
      : DEFAULT_REFRESH_INTERVAL

    // 设置定时刷新
    const timer = window.setInterval(async () => {
      await get().fetchMarkets(platform)
    }, interval)

    refreshTimers.set(platform, timer)
  },

  stopAutoRefresh: (platform: string) => {
    const timer = refreshTimers.get(platform)
    if (timer) {
      clearInterval(timer)
      refreshTimers.delete(platform)
    }
  },
}))

// 导出便捷的 hooks
export const useMarketsData = (platform: string) => {
  const { markets, loading, lastUpdated } = useMarketStore()

  return {
    markets: markets[platform] || [],
    loading: loading[platform] || false,
    lastUpdated: lastUpdated[platform] || 0,
  }
}

// 自动启动所有平台的自动刷新
export const initializeMarketRefresh = () => {
  SUPPORTED_PLATFORMS.forEach((platform) => {
    useMarketStore.getState().startAutoRefresh(platform)
  })
}

// 清理所有定时器
export const cleanupMarketRefresh = () => {
  SUPPORTED_PLATFORMS.forEach((platform) => {
    useMarketStore.getState().stopAutoRefresh(platform)
  })
}
