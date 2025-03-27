import React, { useEffect, useState, useCallback } from 'react'
import { Token } from '../../types/token'
import { useMarketStore } from '../../store/market'
import { SUPPORTED_PLATFORMS } from '../../server/services/market/platforms/config'
import { CryptoCurrencyIcon } from '../../assets/icons'
import { useTokenStore } from '../../store/token'
import ContextMenu from './common/ContextMenu'
import Confirm from './common/Confirm'
import EditModal from './common/EditModal'
import { eventBus } from '../../utils/eventBus'

interface TokenListProps {
  tokens: Token[]
}

const TokenList: React.FC<TokenListProps> = ({ tokens }) => {
  const { getTokenPrice, getTokenPriceChange } = useMarketStore()
  const { reorderTokens, removeToken, updateToken } = useTokenStore()
  const [prices, setPrices] = useState<Record<string, { price: number | null, change: number | null }>>({})
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({})
  const [draggedItem, setDraggedItem] = useState<number | null>(null)
  const [dragOverItem, setDragOverItem] = useState<number | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    show: boolean
    x: number
    y: number
    token: Token | null
  }>({
    show: false,
    x: 0,
    y: 0,
    token: null
  })
  
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean
    token: Token | null
  }>({
    show: false,
    token: null
  })
  
  const [editDialog, setEditDialog] = useState<{
    show: boolean
    token: Token | null
  }>({
    show: false,
    token: null
  })
  
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

  // 处理右键菜单
  const handleContextMenu = (e: React.MouseEvent, token: Token) => {
    e.preventDefault()
    setContextMenu({
      show: true,
      x: e.pageX,
      y: e.pageY,
      token
    })
  }

  const handleEdit = () => {
    if (contextMenu.token) {
      eventBus.emit('openSettings', {
        tab: 'tokens',
        itemId: contextMenu.token.id
      })
      setContextMenu({ show: false, x: 0, y: 0, token: null })
    }
  }

  const handleDelete = () => {
    if (contextMenu.token) {
      setConfirmDialog({
        show: true,
        token: contextMenu.token
      })
      setContextMenu({ show: false, x: 0, y: 0, token: null })
    }
  }

  return (
    <>
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
              onContextMenu={(e) => handleContextMenu(e, token)}
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

      {contextMenu.show && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu({ show: false, x: 0, y: 0, token: null })}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <Confirm
        isOpen={confirmDialog.show}
        title="删除代币"
        message={`确定要删除 ${confirmDialog.token?.name} (${confirmDialog.token?.symbol}) 吗？`}
        onConfirm={() => {
          if (confirmDialog.token) {
            removeToken(confirmDialog.token.id)
          }
          setConfirmDialog({ show: false, token: null })
        }}
        onCancel={() => setConfirmDialog({ show: false, token: null })}
      />

      <EditModal
        isOpen={editDialog.show}
        title="编辑代币名称"
        initialValue={editDialog.token?.name || ''}
        onConfirm={(newName) => {
          if (editDialog.token) {
            updateToken(editDialog.token.id, { ...editDialog.token, name: newName })
          }
          setEditDialog({ show: false, token: null })
        }}
        onCancel={() => setEditDialog({ show: false, token: null })}
      />
    </>
  )
}

export default TokenList 