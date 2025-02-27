export interface Alert {
  id: string
  pairId: string
  value: number
  type: 'greater' | 'less'  // 大于或小于
  createdAt: number
}

export interface CompositePair {
  id: string
  basePlatform: string
  baseSymbol: string
  quotePlatform: string
  quoteSymbol: string
  pairSymbol: string
  isExpanded?: boolean  // 控制警报列表的展开状态
}