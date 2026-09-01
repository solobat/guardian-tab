import React, { useState, useEffect } from 'react'
import { useTokenStore } from '../../../store/token'
import { Token } from '../../../types/token'
import { getCryptoLogoUrl } from '../../../utils/token'
import { FALLBACK_ICON } from '../../../const'
import { DeleteIcon, EditIcon } from '../../../assets/icons'

const TokenSettings: React.FC = () => {
  const { tokens, addToken, removeToken, updateToken, editingToken, setEditingToken } =
    useTokenStore()

  // Token 表单状态
  const [newToken, setNewToken] = useState<Partial<Token>>({
    name: '',
    symbol: '',
    icon: '',
  })

  const setEditingTokenAndNewToken = (token: Token | null) => {
    setEditingToken(token)
    setNewToken({
      name: token?.name || '',
      symbol: token?.symbol || '',
      icon: token?.icon || '',
    })
  }

  // 当名称或符号变化时，自动生成图标URL
  useEffect(() => {
    const name = newToken.name?.trim()
    const symbol = newToken.symbol?.trim()
    if (name && symbol && (!editingToken || !editingToken.icon)) {
      setNewToken((prev) => ({ ...prev, icon: getCryptoLogoUrl(name, symbol) }))
    }
  }, [newToken.name, newToken.symbol, editingToken])

  const handleSubmit = () => {
    const name = newToken.name?.trim() || ''
    const symbol = newToken.symbol?.trim().toUpperCase() || ''
    if (!name || !symbol) return

    if (editingToken) {
      // 更新现有代币
      updateToken(editingToken.id, {
        name,
        symbol,
        icon: newToken.icon?.trim() || '',
      })
    } else {
      // 添加新代币
      addToken({
        id: Date.now().toString(),
        name,
        symbol,
        icon: newToken.icon?.trim() || '',
      })
    }
    setNewToken({ name: '', symbol: '', icon: '' })
  }

  const handleCancel = () => {
    setEditingToken(null)
    setNewToken({ name: '', symbol: '', icon: '' })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  const canSubmit = Boolean(newToken.name?.trim() && newToken.symbol?.trim())

  return (
    <div>
      <div className="form-control mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            type="text"
            placeholder="名称 (例如: Bitcoin)"
            className="input input-bordered"
            value={newToken.name}
            onChange={(e) => setNewToken({ ...newToken, name: e.target.value })}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <input
            type="text"
            placeholder="符号 (例如: BTC)"
            className="input input-bordered"
            value={newToken.symbol}
            onChange={(e) => setNewToken({ ...newToken, symbol: e.target.value })}
            onKeyDown={handleKeyDown}
          />
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="图标 URL (自动生成)"
              className="input input-bordered flex-grow"
              value={newToken.icon || ''}
              onChange={(e) => setNewToken({ ...newToken, icon: e.target.value })}
              onKeyDown={handleKeyDown}
            />
            {newToken.icon && (
              <div className="w-10 h-10 flex items-center justify-center bg-base-200 rounded">
                <img
                  src={newToken.icon}
                  alt="预览"
                  className="max-w-[80%] max-h-[80%] object-contain"
                  onError={(e) => {
                    e.currentTarget.src = FALLBACK_ICON
                  }}
                />
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!canSubmit}>
            {editingToken ? '更新代币' : '添加代币'}
          </button>
          {editingToken && (
            <button className="btn btn-outline" onClick={handleCancel}>
              取消
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th>名称</th>
              <th>符号</th>
              <th>图标</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((token) => (
              <tr key={token.id}>
                <td>{token.name}</td>
                <td>{token.symbol}</td>
                <td>
                  <div className="w-8 h-8 flex items-center justify-center bg-base-200 rounded">
                    {token.icon && (
                      <img
                        src={token.icon}
                        alt={token.name}
                        className="max-w-[80%] max-h-[80%] object-contain"
                        onError={(e) => {
                          e.currentTarget.src = FALLBACK_ICON
                        }}
                      />
                    )}
                  </div>
                </td>
                <td>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-sm btn-ghost text-info"
                      onClick={() => setEditingTokenAndNewToken(token)}
                      title="编辑"
                    >
                      <EditIcon />
                    </button>
                    <button
                      className="btn btn-sm btn-ghost text-error"
                      onClick={() => removeToken(token.id)}
                      title="删除"
                    >
                      <DeleteIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TokenSettings
