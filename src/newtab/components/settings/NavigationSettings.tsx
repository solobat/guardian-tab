import React, { useState } from 'react'
import { useNavigationStore } from '../../../store/navigation'
import { Navigation } from '../../../types/navigation'
import { DeleteIcon, EditIcon } from '../../../assets/icons'

const NavigationSettings: React.FC = () => {
  const { navigations, addNavigation, removeNavigation, updateNavigation } = useNavigationStore()

  // Navigation 表单状态
  const [newNavigation, setNewNavigation] = useState<Partial<Navigation>>({
    name: '',
    url: '',
    icon: '',
  })
  
  // 添加编辑状态
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const handleAddNavigation = () => {
    if (newNavigation.name && newNavigation.url) {
      if (isEditing && editingId) {
        // 更新现有导航
        updateNavigation(editingId, {
          name: newNavigation.name,
          url: newNavigation.url,
          icon: newNavigation.icon || '',
        })
        setIsEditing(false)
        setEditingId(null)
      } else {
        // 添加新导航
        addNavigation({
          id: Date.now().toString(),
          name: newNavigation.name,
          url: newNavigation.url,
          icon: newNavigation.icon || '',
        })
      }
      setNewNavigation({ name: '', url: '', icon: '' })
    }
  }

  // 开始编辑导航
  const handleEditNavigation = (nav: Navigation) => {
    setNewNavigation({
      name: nav.name,
      url: nav.url,
      icon: nav.icon,
    })
    setEditingId(nav.id)
    setIsEditing(true)
  }
  
  // 取消编辑
  const handleCancelEdit = () => {
    setNewNavigation({ name: '', url: '', icon: '' })
    setEditingId(null)
    setIsEditing(false)
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
          <button className="btn btn-primary" onClick={handleAddNavigation}>
            {isEditing ? '保存修改' : '添加导航'}
          </button>
          {isEditing && (
            <button className="btn btn-outline" onClick={handleCancelEdit}>
              取消
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th className="w-1/5">名称</th>
              <th className="w-2/5">URL</th>
              <th className="w-1/5">图标</th>
              <th className="w-1/5">操作</th>
            </tr>
          </thead>
          <tbody>
            {navigations.map((nav) => (
              <tr key={nav.id} className={editingId === nav.id ? 'bg-base-200' : ''}>
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
                  <div className="flex gap-2">
                    <button
                      className="btn btn-sm btn-ghost text-info"
                      onClick={() => handleEditNavigation(nav)}
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