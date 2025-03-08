import React, { useState, useEffect } from 'react'
import { useTokenStore } from '../../../store/token'
import { Token } from '../../../types/token'
import { DeleteIcon, EditIcon } from '../../../assets/icons'

const TokenSettings: React.FC = () => {
  const { tokens, addToken, removeToken, updateToken, editingToken, setEditingToken } = useTokenStore()

  // Token 表单状态
  const [newToken, setNewToken] = useState<Partial<Token>>({
    name: '',
    symbol: '',
    icon: '',
  })

  // 当编辑的代币变化时，更新表单
  useEffect(() => {
    if (editingToken) {
      setNewToken({
        name: editingToken.name,
        symbol: editingToken.symbol,
        icon: editingToken.icon,
      })
    } else {
      setNewToken({ name: '', symbol: '', icon: '' })
    }
  }, [editingToken])

  // 当名称或符号变化时，自动生成图标URL
  useEffect(() => {
    if (newToken.name && newToken.symbol && (!editingToken || !editingToken.icon)) {
      // 获取格式化的符号（小写）
      const formattedSymbol = newToken.symbol.toLowerCase()
      // 构建图标URL
      const iconUrl = `https://cryptologos.cc/logos/${newToken.name.toLowerCase()}-${formattedSymbol}-logo.png`
      setNewToken(prev => ({ ...prev, icon: iconUrl }))
    }
  }, [newToken.name, newToken.symbol, editingToken])

  const handleSubmit = () => {
    if (newToken.name && newToken.symbol) {
      if (editingToken) {
        // 更新现有代币
        updateToken(editingToken.id, {
          name: newToken.name,
          symbol: newToken.symbol,
          icon: newToken.icon || '',
        })
      } else {
        // 添加新代币
        addToken({
          id: Date.now().toString(),
          name: newToken.name,
          symbol: newToken.symbol,
          icon: newToken.icon || '',
        })
      }
      setNewToken({ name: '', symbol: '', icon: '' })
    }
  }

  const handleCancel = () => {
    setEditingToken(null)
    setNewToken({ name: '', symbol: '', icon: '' })
  }

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
          />
          <input
            type="text"
            placeholder="符号 (例如: BTC)"
            className="input input-bordered"
            value={newToken.symbol}
            onChange={(e) => setNewToken({ ...newToken, symbol: e.target.value })}
          />
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="图标 URL (自动生成)"
              className="input input-bordered flex-grow"
              value={newToken.icon || ''}
              onChange={(e) => setNewToken({ ...newToken, icon: e.target.value })}
            />
            {newToken.icon && (
              <div className="w-10 h-10 flex items-center justify-center bg-base-200 rounded">
                <img 
                  src={newToken.icon} 
                  alt="预览" 
                  className="max-w-[80%] max-h-[80%] object-contain"
                  onError={(e) => {
                    // 如果图片加载失败，清空图标URL
                    const target = e.target as HTMLImageElement
                    target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIj48L2NpcmNsZT48bGluZSB4MT0iMTIiIHkxPSI4IiB4Mj0iMTIiIHkyPSIxMiI+PC9saW5lPjxsaW5lIHgxPSIxMiIgeTE9IjE2IiB4Mj0iMTIuMDEiIHkyPSIxNiI+PC9saW5lPjwvc3ZnPg=='
                  }}
                />
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <button className="btn btn-primary" onClick={handleSubmit}>
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
                          const target = e.target as HTMLImageElement
                          target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIj48L2NpcmNsZT48bGluZSB4MT0iMTIiIHkxPSI4IiB4Mj0iMTIiIHkyPSIxMiI+PC9saW5lPjxsaW5lIHgxPSIxMiIgeTE9IjE2IiB4Mj0iMTIuMDEiIHkyPSIxNiI+PC9saW5lPjwvc3ZnPg=='
                        }}
                      />
                    )}
                  </div>
                </td>
                <td>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-sm btn-ghost text-info"
                      onClick={() => setEditingToken(token)}
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