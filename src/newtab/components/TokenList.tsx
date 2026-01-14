import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
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

// 价格显示组件
const PriceDisplay: React.FC<{
  symbol: string
}> = React.memo(({ symbol }) => {
  const { getTokenPrice, getTokenIndexPrice, getTokenPriceChange } = useMarketStore()
  const [priceData, setPriceData] = useState({
    price: null as number | null,
    indexPrice: null as number | null,
    previousPrice: null as number | null,
    change24h: null as number | null,
    isFlashing: false
  })

  useEffect(() => {
    const updatePrice = () => {
      const newPrice = getTokenPrice(symbol)
      const newIndexPrice = getTokenIndexPrice(symbol)
      const new24hChange = getTokenPriceChange(symbol, '24h')
      
      setPriceData(prev => {
        // 检查价格是否发生变化
        if (newPrice !== prev.price || newIndexPrice !== prev.indexPrice) {
          return {
            price: newPrice,
            indexPrice: newIndexPrice,
            previousPrice: prev.price, // 保存前一次价格用于动效判断
            change24h: new24hChange,   // 24小时涨跌幅
            isFlashing: true
          }
        }
        // 如果只有24h涨跌幅变化
        if (new24hChange !== prev.change24h) {
          return {
            ...prev,
            change24h: new24hChange
          }
        }
        return prev
      })

      // 重置闪烁状态
      if (priceData.isFlashing) {
        setTimeout(() => {
          setPriceData(prev => ({
            ...prev,
            isFlashing: false
          }))
        }, 500)
      }
    }

    updatePrice()
    const interval = setInterval(updatePrice, 2000)
    return () => clearInterval(interval)
  }, [symbol, getTokenPrice, getTokenIndexPrice, getTokenPriceChange])

  // 计算实时价格变化方向（用于动效）
  const isPriceIncreased = useMemo(() => {
    if (priceData.price !== null && priceData.previousPrice !== null) {
      return priceData.price >= priceData.previousPrice
    }
    return true
  }, [priceData.price, priceData.previousPrice])

  // 24小时涨跌方向（用于显示）
  const is24hPositive = priceData.change24h !== null ? priceData.change24h >= 0 : true

  return (
    <>
      <div className="mt-1">
        {priceData.price !== null ? (
          <div className="flex items-baseline justify-between gap-2">
            <div 
              className={`text-sm font-mono tracking-tight
                ${isPriceIncreased ? 'text-green-500' : 'text-red-500'}
                transition-all duration-300
                ${priceData.isFlashing ? 'font-bold scale-105' : 'font-normal scale-100'}`}
            >
              ${priceData.price.toPrecision(5)}
            </div>
            {priceData.indexPrice !== null && (
              <div className="text-[9px] opacity-50 font-mono text-base-content/60">
                ${priceData.indexPrice.toPrecision(5)}
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm font-bold">价格未知</div>
        )}
      </div>
      <div className="mt-0.5">
        {priceData.change24h !== null ? (
          <div 
            className={`text-xs font-semibold tracking-wide
              ${is24hPositive ? 'text-green-500' : 'text-red-500'}`}
          >
            {(priceData.change24h * 100).toFixed(2)}%
          </div>
        ) : (
          <div className="text-sm">--</div>
        )}
      </div>
    </>
  )
})

// Token 基本信息组件
const TokenInfo: React.FC<{
  token: Token
  onImageError: () => void
  imageLoadFailed: boolean
}> = React.memo(({ token, onImageError, imageLoadFailed }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center">
      {token.icon && !imageLoadFailed ? (
        <img 
          src={token.icon} 
          alt={token.name} 
          className="w-4 h-4 mr-1" 
          onError={onImageError}
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
))

// Token 项组件
const TokenItem: React.FC<{
  token: Token
  index: number
  onDragStart: (index: number) => void
  onDragOver: (e: React.DragEvent, index: number) => void
  onDragEnd: () => void
  onContextMenu: (e: React.MouseEvent, token: Token) => void
  isDragged: boolean
  isDragOver: boolean
}> = React.memo(({
  token,
  index,
  onDragStart,
  onDragOver,
  onDragEnd,
  onContextMenu,
  isDragged,
  isDragOver
}) => {
  const [failedImage, setFailedImage] = useState(false)

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      onContextMenu={(e) => onContextMenu(e, token)}
      className={`card bg-base-200 shadow-sm cursor-move
        ${isDragged ? 'opacity-50' : ''}
        ${isDragOver ? 'ring-2 ring-primary' : ''}`}
    >
      <div className="card-body p-2">
        <TokenInfo 
          token={token}
          onImageError={() => setFailedImage(true)}
          imageLoadFailed={failedImage}
        />
        <PriceDisplay symbol={token.symbol} />
      </div>
    </div>
  )
})

const TokenList: React.FC<TokenListProps> = React.memo(({ tokens }) => {
  const reorderTokens = useTokenStore(state => state.reorderTokens)
  const removeToken = useTokenStore(state => state.removeToken)
  const updateToken = useTokenStore(state => state.updateToken)
  
  const [dragState, setDragState] = useState({
    draggedItem: null as number | null,
    dragOverItem: null as number | null
  })

  const [dialogState, setDialogState] = useState({
    contextMenu: { show: false, x: 0, y: 0, token: null as Token | null },
    confirmDialog: { show: false, token: null as Token | null },
    editDialog: { show: false, token: null as Token | null }
  })

  // 缓存事件处理函数
  const handleDragStart = useCallback((index: number) => {
    setDragState(prev => ({ ...prev, draggedItem: index }))
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragState(prev => ({ ...prev, dragOverItem: index }))
  }, [])

  const handleDragEnd = useCallback(() => {
    const { draggedItem, dragOverItem } = dragState
    if (draggedItem !== null && dragOverItem !== null && draggedItem !== dragOverItem) {
      reorderTokens(draggedItem, dragOverItem)
    }
    setDragState({ draggedItem: null, dragOverItem: null })
  }, [dragState, reorderTokens])

  const handleContextMenu = useCallback((e: React.MouseEvent, token: Token) => {
    e.preventDefault()
    setDialogState(prev => ({
      ...prev,
      contextMenu: { show: true, x: e.pageX, y: e.pageY, token }
    }))
  }, [])

  const handleEdit = useCallback(() => {
    const { token } = dialogState.contextMenu
    if (token) {
      eventBus.emit('openSettings', {
        tab: 'tokens',
        itemId: token.id
      })
      setDialogState(prev => ({
        ...prev,
        contextMenu: { show: false, x: 0, y: 0, token: null }
      }))
    }
  }, [dialogState.contextMenu])

  const handleDelete = useCallback(() => {
    const { token } = dialogState.contextMenu
    if (token) {
      setDialogState(prev => ({
        ...prev,
        confirmDialog: { show: true, token },
        contextMenu: { show: false, x: 0, y: 0, token: null }
      }))
    }
  }, [dialogState.contextMenu])

  // 缓存 TokenItem 的渲染
  const renderTokenItem = useCallback((token: Token, index: number) => (
    <TokenItem
      key={token.id}
      token={token}
      index={index}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onContextMenu={handleContextMenu}
      isDragged={dragState.draggedItem === index}
      isDragOver={dragState.dragOverItem === index}
    />
  ), [dragState, handleDragStart, handleDragOver, handleDragEnd, handleContextMenu])

  return (
    <>
      <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
        {tokens.map(renderTokenItem)}
      </div>

      {dialogState.contextMenu.show && (
        <ContextMenu
          x={dialogState.contextMenu.x}
          y={dialogState.contextMenu.y}
          onClose={() => setDialogState(prev => ({
            ...prev,
            contextMenu: { show: false, x: 0, y: 0, token: null }
          }))}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <Confirm
        isOpen={dialogState.confirmDialog.show}
        title="删除代币"
        message={`确定要删除 ${dialogState.confirmDialog.token?.name} (${dialogState.confirmDialog.token?.symbol}) 吗？`}
        onConfirm={() => {
          if (dialogState.confirmDialog.token) {
            removeToken(dialogState.confirmDialog.token.id)
          }
          setDialogState(prev => ({
            ...prev,
            confirmDialog: { show: false, token: null }
          }))
        }}
        onCancel={() => setDialogState(prev => ({
          ...prev,
          confirmDialog: { show: false, token: null }
        }))}
      />

      <EditModal
        isOpen={dialogState.editDialog.show}
        title="编辑代币名称"
        initialValue={dialogState.editDialog.token?.name || ''}
        onConfirm={(newName) => {
          if (dialogState.editDialog.token) {
            updateToken(dialogState.editDialog.token.id, {
              ...dialogState.editDialog.token,
              name: newName
            })
          }
          setDialogState(prev => ({
            ...prev,
            editDialog: { show: false, token: null }
          }))
        }}
        onCancel={() => setDialogState(prev => ({
          ...prev,
          editDialog: { show: false, token: null }
        }))}
      />
    </>
  )
})

export default TokenList 