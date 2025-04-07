import React, { useState, useEffect } from 'react'
import { useNavigationStore } from '../../../store/navigation'
import { Navigation } from '../../../types/navigation'
import { DeleteIcon, EditIcon } from '../../../assets/icons'

interface NavigationSettingsProps {
  editingNavId?: string
}

const NavigationSettings: React.FC<NavigationSettingsProps> = ({ editingNavId }) => {
  const { navigations, addNavigation, removeNavigation, updateNavigation } = useNavigationStore()
  const [editingNavigation, setEditingNavigation] = useState<Navigation | null>(null)

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

  // 当编辑的导航变化时，更新表单
  useEffect(() => {
    if (editingNavId) {
      const navigation = navigations.find(nav => nav.id === editingNavId)
      setEditingNavigationAndNewNav(navigation || null)
    } else {
      setEditingNavigation(null)
      setNewNavigation({ name: '', url: '', icon: '' })
    }
  }, [editingNavId, navigations])

  const handleSubmit = () => {
    if (newNavigation.name && newNavigation.url) {
      if (editingNavigation) {
        // 更新现有导航
        updateNavigation(editingNavigation.id, {
          name: newNavigation.name,
          url: newNavigation.url,
          icon: newNavigation.icon || '',
        })
      } else {
        // 添加新导航
        addNavigation({
          id: Date.now().toString(),
          name: newNavigation.name,
          url: newNavigation.url,
          icon: newNavigation.icon || '',
          clickCount: 0,
          createdAt: Date.now(),
        })
      }
      setEditingNavigationAndNewNav(null)
    }
  }

  const handleCancel = () => {
    setEditingNavigationAndNewNav(null)
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
                  className="max-w-[80%] max-h-[80%] object-contain"
                  onError={(e) => {
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
            {editingNavigation ? '更新导航' : '添加导航'}
          </button>
          {editingNavigation && (
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
                          const target = e.target as HTMLImageElement
                          target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIj48L2NpcmNsZT48bGluZSB4MT0iMTIiIHkxPSI4IiB4Mj0iMTIiIHkyPSIxMiI+PC9saW5lPjxsaW5lIHgxPSIxMiIgeTE9IjE2IiB4Mj0iMTIuMDEiIHkyPSIxNiI+PC9saW5lPjwvc3ZnPg=='
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