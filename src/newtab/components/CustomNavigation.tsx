import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Navigation } from '../../types/navigation'
import { useNavigationStore } from '../../store/navigation'
import { getFaviconUrl } from '../../utils/favicon'
import { isSafeNavUrl } from '../../utils/url'
import { DeleteIcon, EditIcon } from '../../assets/icons'
import ContextMenu from './common/ContextMenu'
import Confirm from './common/Confirm'
import FormModal, { FormField } from './common/FormModal'

interface CustomNavigationProps {
  navigations: Navigation[]
}

const NAV_FIELDS: FormField[] = [
  { key: 'name', label: '名称', placeholder: '例如: Binance', required: true },
  { key: 'url', label: 'URL', placeholder: 'https://binance.com', required: true },
  { key: 'icon', label: '图标', placeholder: '留空自动获取' },
]

interface NavFormState {
  open: boolean
  mode: 'add' | 'edit'
  editingId: string | null
  name: string
  url: string
  icon: string
}

const EMPTY_NAV_FORM: NavFormState = {
  open: false,
  mode: 'add',
  editingId: null,
  name: '',
  url: '',
  icon: '',
}

const CustomNavigation: React.FC<CustomNavigationProps> = ({ navigations }) => {
  const {
    reorderNavigations,
    removeNavigation,
    updateNavigation,
    addNavigation,
    incrementClickCount,
    resetNavigation,
    getUnusedNavigations,
    getActiveNavigations,
  } = useNavigationStore()
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({})
  const [draggedItem, setDraggedItem] = useState<number | null>(null)
  const [dragOverItem, setDragOverItem] = useState<number | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    show: boolean
    x: number
    y: number
    navigation: Navigation | null
  }>({
    show: false,
    x: 0,
    y: 0,
    navigation: null,
  })

  // 添加确认对话框的状态
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean
    navigation: Navigation | null
  }>({
    show: false,
    navigation: null,
  })

  // 新增与编辑共用的表单状态
  const [form, setForm] = useState<NavFormState>(EMPTY_NAV_FORM)
  // URL 协议校验错误
  const [urlError, setUrlError] = useState<string | null>(null)

  const [unusedFolderOpen, setUnusedFolderOpen] = useState(false)

  // 获取活跃和未使用的导航
  const activeNavigations = getActiveNavigations()
  const unusedNavigations = getUnusedNavigations()

  // 新增时自动获取 favicon
  useEffect(() => {
    if (form.open && form.mode === 'add' && !form.icon && form.url.trim()) {
      const favicon = getFaviconUrl(form.url.trim())
      if (favicon) {
        setForm((prev) => ({ ...prev, icon: favicon }))
      }
    }
  }, [form.open, form.mode, form.url, form.icon])

  // 名称或域名重复校验
  const duplicateError = useMemo(() => {
    if (!form.open) return null
    const name = form.name.trim().toLowerCase()
    let hostname: string | null = null
    if (form.url.trim()) {
      try {
        hostname = new URL(form.url.trim()).hostname
      } catch {
        // URL 格式不正确，暂时不校验域名
      }
    }
    const dup = navigations.find((nav) => {
      if (name && nav.name.toLowerCase() === name && nav.id !== form.editingId) return true
      if (hostname) {
        try {
          return new URL(nav.url).hostname === hostname && nav.id !== form.editingId
        } catch {
          return false
        }
      }
      return false
    })
    return dup ? `已存在相同的导航：${dup.name}` : null
  }, [form, navigations])

  const openAddForm = useCallback(() => {
    setUrlError(null)
    setForm({ ...EMPTY_NAV_FORM, open: true, mode: 'add' })
  }, [])

  const openEditForm = useCallback((navigation: Navigation) => {
    setUrlError(null)
    setForm({
      open: true,
      mode: 'edit',
      editingId: navigation.id,
      name: navigation.name,
      url: navigation.url,
      icon: navigation.icon || '',
    })
  }, [])

  const handleFormConfirm = useCallback(() => {
    const name = form.name.trim()
    const url = form.url.trim()
    if (!name || !url) return

    // 安全校验：仅允许 http/https 导航链接（防止 javascript: 等协议在扩展页执行脚本）
    if (!isSafeNavUrl(url)) {
      setUrlError('仅支持 http:// 或 https:// 链接')
      return
    }

    if (form.mode === 'add') {
      addNavigation({
        id: Date.now().toString(),
        name,
        url,
        icon: form.icon.trim(),
        clickCount: 0,
        createdAt: Date.now(),
      })
    } else if (form.editingId) {
      updateNavigation(form.editingId, { name, url, icon: form.icon.trim() })
    }
    setUrlError(null)
    setForm(EMPTY_NAV_FORM)
  }, [form, addNavigation, updateNavigation])

  const handleImageError = (id: string) => {
    setFailedImages((prev) => ({ ...prev, [id]: true }))
  }

  const handleDragStart = (index: number) => {
    setDraggedItem(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverItem(index)
  }

  const handleDragEnd = () => {
    if (draggedItem !== null && dragOverItem !== null && draggedItem !== dragOverItem) {
      reorderNavigations(draggedItem, dragOverItem, activeNavigations.length)
    }

    // 重置状态
    setDraggedItem(null)
    setDragOverItem(null)
  }

  const handleContextMenu = (e: React.MouseEvent, navigation: Navigation) => {
    e.preventDefault()
    setContextMenu({
      show: true,
      x: e.pageX,
      y: e.pageY,
      navigation,
    })
  }

  const handleEdit = () => {
    if (contextMenu.navigation) {
      openEditForm(contextMenu.navigation)
      setContextMenu({ show: false, x: 0, y: 0, navigation: null })
    }
  }

  const handleDelete = (navigation: Navigation | null) => {
    if (navigation) {
      setConfirmDialog({
        show: true,
        navigation,
      })
      setContextMenu({ show: false, x: 0, y: 0, navigation: null })
    }
  }

  const handleDeleteFromMenu = () => {
    handleDelete(contextMenu.navigation)
  }

  const handleReset = () => {
    if (contextMenu.navigation) {
      resetNavigation(contextMenu.navigation.id)
      setContextMenu({ show: false, x: 0, y: 0, navigation: null })
    }
  }

  const handleNavigationClick = (e: React.MouseEvent, nav: Navigation) => {
    if (draggedItem !== null) {
      e.preventDefault()
      return
    }
    // 兜底防护：旧数据中可能残留 javascript: 等危险链接，点击时拦截
    if (!isSafeNavUrl(nav.url)) {
      e.preventDefault()
      alert('该导航链接不安全（仅支持 http/https），已阻止访问')
      return
    }
    incrementClickCount(nav.id)
  }

  // 渲染单个导航卡片
  const renderNavCard = (nav: Navigation, index: number, isUnused: boolean) => (
    <div
      key={nav.id}
      draggable
      onDragStart={() => handleDragStart(index)}
      onDragOver={(e) => handleDragOver(e, index)}
      onDragEnd={handleDragEnd}
      onContextMenu={(e) => handleContextMenu(e, nav)}
      className={`card shadow-sm flex flex-col items-center justify-center p-2 cursor-move relative group ${
        isUnused ? 'bg-base-100 hover:bg-base-200' : 'bg-base-200 hover:bg-base-300'
      } transition-colors ${
        draggedItem === index ? 'opacity-50' : ''
      } ${dragOverItem === index ? 'ring-2 ring-primary' : ''}`}
    >
      <a
        href={nav.url}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full h-full flex flex-col items-center justify-center"
        onClick={(e) => handleNavigationClick(e, nav)}
      >
        {nav.icon && !failedImages[nav.id] ? (
          <img
            src={nav.icon}
            alt={nav.name}
            className="w-8 h-8 mb-1"
            onError={() => handleImageError(nav.id)}
          />
        ) : (
          <div className="w-8 h-8 mb-1 bg-primary rounded-full flex items-center justify-center text-primary-content text-sm font-bold">
            {nav.name.charAt(0).toUpperCase()}
          </div>
        )}
        <h3 className="text-center text-xs font-medium">{nav.name}</h3>
        {isUnused && (
          <span className="text-xs text-gray-500 mt-1">
            创建于 {new Date(nav.createdAt).toLocaleDateString()}
          </span>
        )}
      </a>

      {/* 悬停快捷操作 */}
      <div className="absolute top-1 right-1 z-10 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="btn btn-xs btn-circle btn-ghost text-info"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            openEditForm(nav)
          }}
          title="编辑"
        >
          <EditIcon />
        </button>
        <button
          className="btn btn-xs btn-circle btn-ghost text-error"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleDelete(nav)
          }}
          title="删除"
        >
          <DeleteIcon />
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
        {activeNavigations.map((nav, index) => renderNavCard(nav, index, false))}

        {/* 快捷添加入口 */}
        <button
          onClick={openAddForm}
          title="添加导航"
          className="card bg-base-200/60 border-2 border-dashed border-base-300 hover:border-primary hover:bg-base-200 hover:text-primary transition-colors shadow-sm flex flex-col items-center justify-center gap-1 p-2 cursor-pointer text-base-content/50 min-h-[88px]"
        >
          <span className="text-xl font-light leading-none">+</span>
          <span className="text-xs">添加导航</span>
        </button>

        {unusedNavigations.length > 0 && (
          <div
            className="card bg-base-200 hover:bg-base-300 transition-colors shadow-sm flex flex-col items-center justify-center p-2 cursor-pointer"
            onClick={() => setUnusedFolderOpen(!unusedFolderOpen)}
          >
            <div className="w-8 h-8 mb-1 bg-primary/20 rounded-full flex items-center justify-center">
              <span className="text-xl font-semibold text-primary">
                {unusedFolderOpen ? '−' : '+'}
              </span>
            </div>
            <h3 className="text-center text-xs font-medium">未使用导航</h3>
            <span className="text-xs text-gray-500 mt-1">{unusedNavigations.length}</span>
          </div>
        )}
      </div>

      {/* 未使用导航文件夹展开内容 */}
      {unusedFolderOpen && unusedNavigations.length > 0 && (
        <div className="mt-4 p-4 bg-base-200 rounded-lg">
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
            {unusedNavigations.map((nav, index) =>
              renderNavCard(nav, activeNavigations.length + index, true),
            )}
          </div>
        </div>
      )}

      {contextMenu.show && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu({ show: false, x: 0, y: 0, navigation: null })}
          onEdit={handleEdit}
          onDelete={handleDeleteFromMenu}
          onReset={handleReset}
        />
      )}

      <Confirm
        isOpen={confirmDialog.show}
        title="删除导航"
        message={`确定要删除 ${confirmDialog.navigation?.name} 吗？`}
        onConfirm={() => {
          if (confirmDialog.navigation) {
            removeNavigation(confirmDialog.navigation.id)
          }
          setConfirmDialog({ show: false, navigation: null })
        }}
        onCancel={() => setConfirmDialog({ show: false, navigation: null })}
      />

      <FormModal
        isOpen={form.open}
        title={form.mode === 'add' ? '添加导航' : '编辑导航'}
        submitLabel={form.mode === 'add' ? '添加' : '保存'}
        fields={NAV_FIELDS}
        values={{ name: form.name, url: form.url, icon: form.icon }}
        onChange={(key, value) => {
          if (urlError) setUrlError(null)
          setForm((prev) => ({ ...prev, [key]: value }))
        }}
        onConfirm={handleFormConfirm}
        onCancel={() => {
          setUrlError(null)
          setForm(EMPTY_NAV_FORM)
        }}
        previewUrl={form.icon || undefined}
        error={urlError || duplicateError}
      />
    </div>
  )
}

export default CustomNavigation
