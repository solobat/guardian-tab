export const SUPPORTED_PLATFORMS = ['binance', 'bybit'] as const

export type MarketName = (typeof SUPPORTED_PLATFORMS)[number]

export const MarketsConfig: Record<
  MarketName,
  {
    sourceType: 'rest' | 'ws'
  }
> = {
  binance: {
    sourceType: 'rest',
  },
  bybit: {
    sourceType: 'rest',
  },
}

export const getSourceType = (name: MarketName) => {
  return MarketsConfig[name].sourceType
}

export const isWsMarket = (name: MarketName) => {
  return MarketsConfig[name].sourceType === 'ws'
}
