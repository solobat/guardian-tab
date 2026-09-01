import React, { useState } from 'react'
import { useNavigationStore } from '../../../store/navigation'
import { Navigation } from '../../../types/navigation'
import { getFaviconUrl } from '../../../utils/favicon'
import { isSafeNavUrl } from '../../../utils/url'
import { FALLBACK_ICON } from '../../../const'
import { DeleteIcon, EditIcon } from '../../../assets/icons'

const NavigationSettings: React.FC = () => {
  const { navigations, addNavigation, removeNavigation, updateNavigation } = useNavigationStore()
  const [editingNavigation, setEditingNavigation] = useState<Navigation | null>(null)
  const [urlError, setUrlError] = useState('')

  // Navigation 表单状态
  const [newNavigation, setNewNavigation] = useState<Partial<Navigation>>({
    name: '',
    url: '',
    icon: '',
  })

  const setEditingNavigationAndNewNav = (navigation: Navigation | null) => {
    setEditingNavigation(navigation)
    setNewNavigation({
      name: navigation?.name || '',
      url: navigation?.url || '',
      icon: navigation?.icon || '',
    })
  }

  const handleSubmit = () => {
    const name = newNavigation.name?.trim() || ''
    const url = newNavigation.url?.trim() || ''
    if (!name || !url) return

    // 安全校验：仅允许 http/https（防止 javascript: 等协议在扩展页执行脚本）
    if (!isSafeNavUrl(url)) {
      setUrlError('仅支持 http:// 或 https:// 链接')
      return
    }
    setUrlError('')

    if (editingNavigation) {
      // 更新现有导航
      updateNavigation(editingNavigation.id, {
        name,
        url,
        icon: newNavigation.icon?.trim() || '',
      })
    } else {
      // 添加新导航
      addNavigation({
        id: Date.now().toString(),
        name,
        url,
        icon: newNavigation.icon?.trim() || '',
        clickCount: 0,
        createdAt: Date.now(),
      })
    }
    setEditingNavigationAndNewNav(null)
  }

  const handleCancel = () => {
    setEditingNavigationAndNewNav(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  // 尝试从URL获取favicon
  const handleNavigationNameOrUrlChange = (field: string, value: string) => {
    const updatedNavigation = { ...newNavigation, [field]: value }

    if (urlError) setUrlError('')

    // 如果URL已填写且图标为空，自动获取favicon
    if (field === 'url' && value && !newNavigation.icon) {
      updatedNavigation.icon = getFaviconUrl(value)
    }

    setNewNavigation(updatedNavigation)
  }

  const canSubmit = Boolean(newNavigation.name?.trim() && newNavigation.url?.trim())

  return (
    <div>
      <div className="form-control mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            type="text"
            placeholder="名称 (例如: Binance)"
            className="input input-bordered"
            value={newNavigation.name}
            onChange={(e) => handleNavigationNameOrUrlChange('name', e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <input
            type="text"
            placeholder="URL (例如: https://binance.com)"
            className="input input-bordered"
            value={newNavigation.url}
            onChange={(e) => handleNavigationNameOrUrlChange('url', e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="图标 URL (自动获取)"
              className="input input-bordered flex-grow"
              value={newNavigation.icon || ''}
              onChange={(e) => setNewNavigation({ ...newNavigation, icon: e.target.value })}
              onKeyDown={handleKeyDown}
            />
            {newNavigation.icon && (
              <div className="w-10 h-10 flex items-center justify-center bg-base-200 rounded">
                <img
                  src={newNavigation.icon}
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
            {editingNavigation ? '更新导航' : '添加导航'}
          </button>
          {editingNavigation && (
            <button className="btn btn-outline" onClick={handleCancel}>
              取消
            </button>
          )}
        </div>
        {urlError && <p className="text-error text-xs mt-2">{urlError}</p>}
      </div>

      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th className="w-1/6">名称</th>
              <th className="w-2/6">URL</th>
              <th className="w-1/6">图标</th>
              <th className="w-1/6">点击次数</th>
              <th className="w-1/6">操作</th>
            </tr>
          </thead>
          <tbody>
            {navigations.map((nav) => (
              <tr key={nav.id} className={editingNavigation?.id === nav.id ? 'bg-base-200' : ''}>
                <td className="max-w-[100px]">
                  <span className="block truncate">{nav.name}</span>
                </td>
                <td className="max-w-[200px]">
                  <div className="w-full overflow-hidden">
                    <a
                      href={nav.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link block truncate"
                      title={nav.url}
                      onClick={(e) => {
                        // 兜底防护：旧数据中可能残留 javascript: 等危险链接
                        if (!isSafeNavUrl(nav.url)) {
                          e.preventDefault()
                          alert('该导航链接不安全（仅支持 http/https），已阻止访问')
                        }
                      }}
                    >
                      {nav.url}
                    </a>
                  </div>
                </td>
                <td>
                  <div className="w-8 h-8 flex items-center justify-center bg-base-200 rounded">
                    {nav.icon && (
                      <img
                        src={nav.icon}
                        alt={nav.name}
                        className="max-w-[80%] max-h-[80%] object-contain"
                        onError={(e) => {
                          e.currentTarget.src = FALLBACK_ICON
                        }}
                      />
                    )}
                  </div>
                </td>
                <td>
                  {nav.clickCount || 0}
                  {nav.clickCount === 0 && nav.createdAt < Date.now() - 24 * 60 * 60 * 1000 && (
                    <span className="text-warning text-xs ml-2">(未使用)</span>
                  )}
                </td>
                <td>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-sm btn-ghost text-info"
                      onClick={() => setEditingNavigationAndNewNav(nav)}
                      title="编辑"
                    >
                      <EditIcon />
                    </button>
                    <button
                      className="btn btn-sm btn-ghost text-error"
                      onClick={() => removeNavigation(nav.id)}
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

export default NavigationSettings
