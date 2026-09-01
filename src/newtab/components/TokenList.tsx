import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Token } from '../../types/token'
import { useMarketStore } from '../../store/market'
import { useTokenStore } from '../../store/token'
import { CryptoCurrencyIcon, DeleteIcon, EditIcon } from '../../assets/icons'
import { getCryptoLogoUrl } from '../../utils/token'
import ContextMenu from './common/ContextMenu'
import Confirm from './common/Confirm'
import FormModal, { FormField } from './common/FormModal'

interface TokenListProps {
  tokens: Token[]
}

const TOKEN_FIELDS: FormField[] = [
  { key: 'name', label: '名称', placeholder: '例如: Bitcoin', required: true },
  { key: 'symbol', label: '符号', placeholder: '例如: BTC', required: true },
  { key: 'icon', label: '图标', placeholder: '留空自动生成' },
]

interface TokenFormState {
  open: boolean
  mode: 'add' | 'edit'
  editingId: string | null
  name: string
  symbol: string
  icon: string
}

const EMPTY_TOKEN_FORM: TokenFormState = {
  open: false,
  mode: 'add',
  editingId: null,
  name: '',
  symbol: '',
  icon: '',
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
    isFlashing: false,
  })

  useEffect(() => {
    const updatePrice = () => {
      const newPrice = getTokenPrice(symbol)
      const newIndexPrice = getTokenIndexPrice(symbol)
      const new24hChange = getTokenPriceChange(symbol, '24h')

      setPriceData((prev) => {
        // 检查价格是否发生变化
        if (newPrice !== prev.price || newIndexPrice !== prev.indexPrice) {
          return {
            price: newPrice,
            indexPrice: newIndexPrice,
            previousPrice: prev.price, // 保存前一次价格用于动效判断
            change24h: new24hChange, // 24小时涨跌幅
            isFlashing: true,
          }
        }
        // 如果只有24h涨跌幅变化
        if (new24hChange !== prev.change24h) {
          return {
            ...prev,
            change24h: new24hChange,
          }
        }
        return prev
      })

      // 重置闪烁状态
      if (priceData.isFlashing) {
        setTimeout(() => {
          setPriceData((prev) => ({
            ...prev,
            isFlashing: false,
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

  // 计算价差百分比
  const priceDiff = useMemo(() => {
    if (priceData.price !== null && priceData.indexPrice !== null && priceData.indexPrice !== 0) {
      return ((priceData.price - priceData.indexPrice) / priceData.indexPrice) * 100
    }
    return null
  }, [priceData.price, priceData.indexPrice])

  return (
    <>
      <div className="mt-1">
        {priceData.price !== null ? (
          <div className="flex items-center justify-between gap-2">
            <div
              className={`text-sm font-mono tracking-tight
                ${isPriceIncreased ? 'text-green-500' : 'text-red-500'}
                transition-all duration-300
                ${priceData.isFlashing ? 'font-bold scale-105' : 'font-normal scale-100'}`}
            >
              ${priceData.price.toPrecision(5)}
            </div>
            {priceData.indexPrice !== null && (
              <div className="text-[9px] opacity-50 font-mono text-base-content/60 leading-none">
                ${priceData.indexPrice.toPrecision(5)}
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm font-bold">价格未知</div>
        )}
      </div>
      <div className="mt-0.5 flex items-center justify-between">
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
        {priceDiff !== null && (
          <div
            className={`text-[9px] font-mono opacity-70
              ${priceDiff >= 0 ? 'text-green-500' : 'text-red-500'}`}
          >
            {priceDiff >= 0 ? '+' : ''}
            {priceDiff.toFixed(3)}%
          </div>
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
  <div className="flex items-center">
    {token.icon && !imageLoadFailed ? (
      <img src={token.icon} alt={token.name} className="w-4 h-4 mr-1" onError={onImageError} />
    ) : (
      <div className="w-4 h-4 mr-1 text-primary">
        <CryptoCurrencyIcon />
      </div>
    )}
    <h3 className="text-sm font-medium truncate">{token.symbol}</h3>
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
  onEdit: (token: Token) => void
  onDelete: (token: Token) => void
  isDragged: boolean
  isDragOver: boolean
}> = React.memo(
  ({
    token,
    index,
    onDragStart,
    onDragOver,
    onDragEnd,
    onContextMenu,
    onEdit,
    onDelete,
    isDragged,
    isDragOver,
  }) => {
    const [failedImage, setFailedImage] = useState(false)

    return (
      <div
        draggable
        onDragStart={() => onDragStart(index)}
        onDragOver={(e) => onDragOver(e, index)}
        onDragEnd={onDragEnd}
        onContextMenu={(e) => onContextMenu(e, token)}
        onDoubleClick={() => onEdit(token)}
        title={`${token.name} (${token.symbol}) · 双击编辑，右键更多操作`}
        className={`card bg-base-200 shadow-sm cursor-move relative group
        ${isDragged ? 'opacity-50' : ''}
        ${isDragOver ? 'ring-2 ring-primary' : ''}`}
      >
        {/* 悬停快捷操作 */}
        <div className="absolute top-1 right-1 z-10 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="btn btn-xs btn-circle btn-ghost h-5 w-5 min-h-0 text-info"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onEdit(token)
            }}
            title="编辑"
          >
            <EditIcon />
          </button>
          <button
            className="btn btn-xs btn-circle btn-ghost h-5 w-5 min-h-0 text-error"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onDelete(token)
            }}
            title="删除"
          >
            <DeleteIcon />
          </button>
        </div>
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
  },
)

const TokenList: React.FC<TokenListProps> = React.memo(({ tokens }) => {
  const addToken = useTokenStore((state) => state.addToken)
  const reorderTokens = useTokenStore((state) => state.reorderTokens)
  const removeToken = useTokenStore((state) => state.removeToken)
  const updateToken = useTokenStore((state) => state.updateToken)

  const [dragState, setDragState] = useState({
    draggedItem: null as number | null,
    dragOverItem: null as number | null,
  })

  const [dialogState, setDialogState] = useState({
    contextMenu: { show: false, x: 0, y: 0, token: null as Token | null },
    confirmDialog: { show: false, token: null as Token | null },
  })

  // 添加快捷表单状态（新增与编辑共用）
  const [form, setForm] = useState<TokenFormState>(EMPTY_TOKEN_FORM)

  // 新增时自动生成图标 URL
  useEffect(() => {
    if (form.open && form.mode === 'add' && !form.icon && form.name.trim() && form.symbol.trim()) {
      setForm((prev) => ({
        ...prev,
        icon: getCryptoLogoUrl(form.name.trim(), form.symbol.trim()),
      }))
    }
  }, [form.open, form.mode, form.name, form.symbol, form.icon])

  // 符号重复校验
  const duplicateError = useMemo(() => {
    const symbol = form.symbol.trim().toUpperCase()
    if (!form.open || !symbol) return null
    const dup = tokens.find((t) => t.symbol.toUpperCase() === symbol && t.id !== form.editingId)
    return dup ? `已存在相同符号的代币：${dup.name} (${dup.symbol})` : null
  }, [form, tokens])

  const openAddForm = useCallback(() => {
    setForm({ ...EMPTY_TOKEN_FORM, open: true, mode: 'add' })
  }, [])

  const openEditForm = useCallback((token: Token) => {
    setForm({
      open: true,
      mode: 'edit',
      editingId: token.id,
      name: token.name,
      symbol: token.symbol,
      icon: token.icon || '',
    })
  }, [])

  const handleFormConfirm = useCallback(() => {
    const name = form.name.trim()
    const symbol = form.symbol.trim().toUpperCase()
    const icon = form.icon.trim()
    if (!name || !symbol) return

    if (form.mode === 'add') {
      addToken({
        id: Date.now().toString(),
        name,
        symbol,
        icon,
      })
    } else if (form.editingId) {
      updateToken(form.editingId, { name, symbol, icon })
    }
    setForm(EMPTY_TOKEN_FORM)
  }, [form, addToken, updateToken])

  // 缓存事件处理函数
  const handleDragStart = useCallback((index: number) => {
    setDragState((prev) => ({ ...prev, draggedItem: index }))
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragState((prev) => ({ ...prev, dragOverItem: index }))
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
    setDialogState((prev) => ({
      ...prev,
      contextMenu: { show: true, x: e.pageX, y: e.pageY, token },
    }))
  }, [])

  const handleEdit = useCallback(() => {
    const { token } = dialogState.contextMenu
    if (token) {
      openEditForm(token)
      setDialogState((prev) => ({
        ...prev,
        contextMenu: { show: false, x: 0, y: 0, token: null },
      }))
    }
  }, [dialogState.contextMenu, openEditForm])

  const handleDelete = useCallback((token: Token | null) => {
    if (token) {
      setDialogState((prev) => ({
        ...prev,
        confirmDialog: { show: true, token },
        contextMenu: { show: false, x: 0, y: 0, token: null },
      }))
    }
  }, [])

  const handleDeleteFromMenu = useCallback(() => {
    handleDelete(dialogState.contextMenu.token)
  }, [dialogState.contextMenu.token, handleDelete])

  // 缓存 TokenItem 的渲染
  const renderTokenItem = useCallback(
    (token: Token, index: number) => (
      <TokenItem
        key={token.id}
        token={token}
        index={index}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onContextMenu={handleContextMenu}
        onEdit={openEditForm}
        onDelete={handleDelete}
        isDragged={dragState.draggedItem === index}
        isDragOver={dragState.dragOverItem === index}
      />
    ),
    [
      dragState,
      handleDragStart,
      handleDragOver,
      handleDragEnd,
      handleContextMenu,
      openEditForm,
      handleDelete,
    ],
  )

  return (
    <>
      <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
        {tokens.map(renderTokenItem)}

        {/* 快捷添加入口 */}
        <button
          onClick={openAddForm}
          title="添加代币"
          className="card bg-base-200/60 border-2 border-dashed border-base-300 hover:border-primary hover:bg-base-200 hover:text-primary transition-colors shadow-sm flex flex-col items-center justify-center gap-1 p-2 cursor-pointer text-base-content/50 min-h-[76px]"
        >
          <span className="text-xl font-light leading-none">+</span>
          <span className="text-xs">添加代币</span>
        </button>
      </div>

      {dialogState.contextMenu.show && (
        <ContextMenu
          x={dialogState.contextMenu.x}
          y={dialogState.contextMenu.y}
          onClose={() =>
            setDialogState((prev) => ({
              ...prev,
              contextMenu: { show: false, x: 0, y: 0, token: null },
            }))
          }
          onEdit={handleEdit}
          onDelete={handleDeleteFromMenu}
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
          setDialogState((prev) => ({
            ...prev,
            confirmDialog: { show: false, token: null },
          }))
        }}
        onCancel={() =>
          setDialogState((prev) => ({
            ...prev,
            confirmDialog: { show: false, token: null },
          }))
        }
      />

      <FormModal
        isOpen={form.open}
        title={form.mode === 'add' ? '添加代币' : '编辑代币'}
        submitLabel={form.mode === 'add' ? '添加' : '保存'}
        fields={TOKEN_FIELDS}
        values={{ name: form.name, symbol: form.symbol, icon: form.icon }}
        onChange={(key, value) => setForm((prev) => ({ ...prev, [key]: value }))}
        onConfirm={handleFormConfirm}
        onCancel={() => setForm(EMPTY_TOKEN_FORM)}
        previewUrl={form.icon || undefined}
        error={duplicateError}
      />
    </>
  )
})

export default TokenList
