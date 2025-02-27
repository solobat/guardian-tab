import React, { useState, useEffect } from 'react'
import { useTokenStore } from '../../store/token'
import { useNavigationStore } from '../../store/navigation'
import { Token } from '../../types/token'
import { Navigation } from '../../types/navigation'
import { SettingsIcon } from '../../assets/icons'

const Settings: React.FC = () => {
  const { tokens, addToken, removeToken, updateToken } = useTokenStore()
  const { navigations, addNavigation, removeNavigation, updateNavigation } = useNavigationStore()

  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('tokens')

  // Token 表单状态
  const [newToken, setNewToken] = useState<Partial<Token>>({
    name: '',
    symbol: '',
    icon: '',
  })

  // Navigation 表单状态
  const [newNavigation, setNewNavigation] = useState<Partial<Navigation>>({
    name: '',
    url: '',
    icon: '',
  })

  // 当名称或符号变化时，自动生成图标URL
  useEffect(() => {
    if (newToken.name && newToken.symbol) {
      // 获取格式化的符号（小写）
      const formattedSymbol = newToken.symbol.toLowerCase()
      // 构建图标URL
      const iconUrl = `https://cryptologos.cc/logos/${newToken.name.toLowerCase()}-${formattedSymbol}-logo.png`
      setNewToken(prev => ({ ...prev, icon: iconUrl }))
    }
  }, [newToken.name, newToken.symbol])

  const handleAddToken = () => {
    if (newToken.name && newToken.symbol) {
      addToken({
        id: Date.now().toString(),
        name: newToken.name,
        symbol: newToken.symbol,
        icon: newToken.icon || '',
      })
      setNewToken({ name: '', symbol: '', icon: '' })
    }
  }

  const handleAddNavigation = () => {
    if (newNavigation.name && newNavigation.url) {
      addNavigation({
        id: Date.now().toString(),
        name: newNavigation.name,
        url: newNavigation.url,
        icon: newNavigation.icon || '',
      })
      setNewNavigation({ name: '', url: '', icon: '' })
    }
  }

  // 尝试从URL获取favicon
  const handleNavigationNameOrUrlChange = (field: string, value: string) => {
    const updatedNavigation = { ...newNavigation, [field]: value }
    
    // 如果URL已填写且图标为空，尝试获取favicon
    if (field === 'url' && value && !newNavigation.icon) {
      try {
        const url = new URL(value)
        const faviconUrl = `${url.protocol}//${url.hostname}/favicon.ico`
        updatedNavigation.icon = faviconUrl
      } catch (e) {
        // URL格式不正确，忽略
      }
    }
    
    setNewNavigation(updatedNavigation)
  }

  return (
    <>
      <button
        className="btn btn-circle btn-sm absolute bottom-4 right-4 z-10"
        onClick={() => setIsOpen(true)}
        title="设置"
      >
        <SettingsIcon />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-base-100 p-6 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">设置</h2>
              <button className="btn btn-sm btn-circle" onClick={() => setIsOpen(false)}>
                ✕
              </button>
            </div>

            <div className="tabs tabs-boxed mb-4">
              <a
                className={`tab ${activeTab === 'tokens' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('tokens')}
              >
                代币
              </a>
              <a
                className={`tab ${activeTab === 'navigations' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('navigations')}
              >
                导航
              </a>
            </div>

            {activeTab === 'tokens' && (
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
                            className="max-w-full max-h-full"
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
                  <button className="btn btn-primary mt-2" onClick={handleAddToken}>
                    添加代币
                  </button>
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
                            {token.icon && (
                              <img 
                                src={token.icon} 
                                alt={token.name} 
                                className="w-6 h-6"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIj48L2NpcmNsZT48bGluZSB4MT0iMTIiIHkxPSI4IiB4Mj0iMTIiIHkyPSIxMiI+PC9saW5lPjxsaW5lIHgxPSIxMiIgeTE9IjE2IiB4Mj0iMTIuMDEiIHkyPSIxNiI+PC9saW5lPjwvc3ZnPg=='
                                }}
                              />
                            )}
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-error"
                              onClick={() => removeToken(token.id)}
                            >
                              删除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'navigations' && (
              <div>
                <div className="form-control mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="名称 (例如: Binance)"
                      className="input input-bordered"
                      value={newNavigation.name}
                      onChange={(e) => handleNavigationNameOrUrlChange('name', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="URL (例如: https://binance.com)"
                      className="input input-bordered"
                      value={newNavigation.url}
                      onChange={(e) => handleNavigationNameOrUrlChange('url', e.target.value)}
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="图标 URL (自动获取)"
                        className="input input-bordered flex-grow"
                        value={newNavigation.icon || ''}
                        onChange={(e) => setNewNavigation({ ...newNavigation, icon: e.target.value })}
                      />
                      {newNavigation.icon && (
                        <div className="w-10 h-10 flex items-center justify-center bg-base-200 rounded">
                          <img 
                            src={newNavigation.icon} 
                            alt="预览" 
                            className="max-w-full max-h-full"
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
                  <button className="btn btn-primary mt-2" onClick={handleAddNavigation}>
                    添加导航
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="table w-full">
                    <thead>
                      <tr>
                        <th>名称</th>
                        <th>URL</th>
                        <th>图标</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {navigations.map((nav) => (
                        <tr key={nav.id}>
                          <td>{nav.name}</td>
                          <td>
                            <a
                              href={nav.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="link"
                            >
                              {nav.url}
                            </a>
                          </td>
                          <td>
                            {nav.icon && (
                              <img 
                                src={nav.icon} 
                                alt={nav.name} 
                                className="w-6 h-6"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIj48L2NpcmNsZT48bGluZSB4MT0iMTIiIHkxPSI4IiB4Mj0iMTIiIHkyPSIxMiI+PC9saW5lPjxsaW5lIHgxPSIxMiIgeTE9IjE2IiB4Mj0iMTIuMDEiIHkyPSIxNiI+PC9saW5lPjwvc3ZnPg=='
                                }}
                              />
                            )}
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-error"
                              onClick={() => removeNavigation(nav.id)}
                            >
                              删除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default Settings
