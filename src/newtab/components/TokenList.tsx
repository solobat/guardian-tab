import React, { useEffect, useState, useCallback } from 'react'
import { Token } from '../../types/token'
import { useMarketStore } from '../../store/market'
import { SUPPORTED_PLATFORMS } from '../../server/services/market/platforms/config'
import { CryptoCurrencyIcon } from '../../assets/icons'
import { useTokenStore } from '../../store/token'

interface TokenListProps {
  tokens: Token[]
}

const TokenList: React.FC<TokenListProps> = ({ tokens }) => {
  const { getTokenPrice, getTokenPriceChange } = useMarketStore()
  const { reorderTokens } = useTokenStore()
  const [prices, setPrices] = useState<Record<string, { price: number | null, change: number | null }>>({})
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({})
  const [draggedItem, setDraggedItem] = useState<number | null>(null)
  const [dragOverItem, setDragOverItem] = useState<number | null>(null)
  
  // 使用 useCallback 减少不必要的函数重建
  const updatePrices = useCallback(() => {
    const newPrices: Record<string, { price: number | null, change: number | null }> = {}
    
    tokens.forEach(token => {
      const price = getTokenPrice(token.symbol)
      const change = getTokenPriceChange(token.symbol, '24h')
      newPrices[token.symbol] = { price, change }
    })
    
    setPrices(newPrices)
  }, [tokens, getTokenPrice, getTokenPriceChange])
  
  useEffect(() => {
    // 初始更新
    updatePrices()
    
    // 设置更合理的更新间隔
    const interval = setInterval(updatePrices, 500) // 每0.5秒更新一次UI
    
    return () => clearInterval(interval)
  }, [updatePrices])
  
  // 只在组件挂载时启动市场数据刷新
  useEffect(() => {
    const { startAutoRefresh, stopAutoRefresh } = useMarketStore.getState()
    
    // 为所有支持的平台启动自动刷新
    SUPPORTED_PLATFORMS.forEach((platform) => {
      startAutoRefresh(platform)
    })
    
    return () => {
      // 清理定时器
      SUPPORTED_PLATFORMS.forEach((platform) => {
        stopAutoRefresh(platform)
      })
    }
  }, [])

  // 处理图片加载失败
  const handleImageError = (tokenId: string) => {
    setFailedImages(prev => ({
      ...prev,
      [tokenId]: true
    }))
  }

  // 添加拖拽相关处理函数
  const handleDragStart = (index: number) => {
    setDraggedItem(index)
  }
  
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverItem(index)
  }
  
  const handleDragEnd = () => {
    if (draggedItem !== null && dragOverItem !== null && draggedItem !== dragOverItem) {
      reorderTokens(draggedItem, dragOverItem)
    }
    
    setDraggedItem(null)
    setDragOverItem(null)
  }

  return (
    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
      {tokens.map((token, index) => {
        const tokenData = prices[token.symbol] || { price: null, change: null }
        const isPositive = tokenData.change !== null ? tokenData.change >= 0 : true
        const imageLoadFailed = failedImages[token.id]
        
        return (
          <div
            key={token.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`card bg-base-200 shadow-sm cursor-move
              ${draggedItem === index ? 'opacity-50' : ''}
              ${dragOverItem === index ? 'ring-2 ring-primary' : ''}`}
          >
            <div className="card-body p-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {token.icon && !imageLoadFailed ? (
                    <img 
                      src={token.icon} 
                      alt={token.name} 
                      className="w-4 h-4 mr-1" 
                      onError={() => handleImageError(token.id)}
                    />
                  ) : (
                    <div className="w-4 h-4 mr-1 text-primary">
                      <CryptoCurrencyIcon />
                    </div>
                  )}
                  <h3 className="text-sm font-medium">{token.symbol}</h3>
                </div>
                <span className="text-xs opacity-70 hidden 2xl:inline">{token.name.substring(0, 8)}</span>
              </div>
              
              <div className="mt-1">
                {tokenData.price !== null ? (
                  <div className={`text-sm font-bold ${isPositive ? 'text-success' : 'text-error'}`}>
                    ${tokenData.price.toPrecision(5)}
                  </div>
                ) : (
                  <div className="text-sm font-bold">价格未知</div>
                )}
              </div>
              <div className="mt-1">
                {tokenData.change !== null ? (
                  <div className={`text-sm ${isPositive ? 'text-success' : 'text-error'}`}>
                    {(tokenData.change * 100).toFixed(2)}%
                  </div>
                ) : (
                  <div className="text-sm">--</div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default TokenList 