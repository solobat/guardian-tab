import React, { useState, useEffect } from 'react'
import { Navigation } from '../../types/navigation'
import { useNavigationStore } from '../../store/navigation'
import ContextMenu from './common/ContextMenu'
import Confirm from './common/Confirm'
import EditModal from './common/EditModal'
import { eventBus } from '../../utils/eventBus'

interface CustomNavigationProps {
  navigations: Navigation[]
}

const CustomNavigation: React.FC<CustomNavigationProps> = ({ navigations }) => {
  const { 
    reorderNavigations, 
    removeNavigation, 
    updateNavigation, 
    incrementClickCount,
    getUnusedNavigations,
    getActiveNavigations 
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
    navigation: null
  })

  // 添加确认和编辑对话框的状态
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean
    navigation: Navigation | null
  }>({
    show: false,
    navigation: null
  })
  
  const [editDialog, setEditDialog] = useState<{
    show: boolean
    navigation: Navigation | null
  }>({
    show: false,
    navigation: null
  })
  
  const [unusedFolderOpen, setUnusedFolderOpen] = useState(false)

  // 获取活跃和未使用的导航
  const activeNavigations = getActiveNavigations()
  const unusedNavigations = getUnusedNavigations()

  const handleImageError = (id: string) => {
    setFailedImages(prev => ({ ...prev, [id]: true }))
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
      reorderNavigations(draggedItem, dragOverItem)
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
      navigation
    })
  }

  const handleEdit = () => {
    if (contextMenu.navigation) {
      eventBus.emit('openSettings', {
        tab: 'navigations',
        itemId: contextMenu.navigation.id
      })
      setContextMenu({ show: false, x: 0, y: 0, navigation: null })
    }
  }

  const handleDelete = () => {
    if (contextMenu.navigation) {
      setConfirmDialog({
        show: true,
        navigation: contextMenu.navigation
      })
      setContextMenu({ show: false, x: 0, y: 0, navigation: null })
    }
  }

  const handleNavigationClick = (e: React.MouseEvent, nav: Navigation) => {
    if (draggedItem !== null) {
      e.preventDefault()
      return
    }
    incrementClickCount(nav.id)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
        {activeNavigations.map((nav, index) => (
          <div
            key={nav.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            onContextMenu={(e) => handleContextMenu(e, nav)}
            className={`card bg-base-200 hover:bg-base-300 transition-colors shadow-sm flex flex-col items-center justify-center p-2 cursor-move ${
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
            </a>
          </div>
        ))}

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
            <span className="text-xs text-gray-500 mt-1">
              {unusedNavigations.length}
            </span>
          </div>
        )}
      </div>

      {/* 未使用导航文件夹展开内容 */}
      {unusedFolderOpen && unusedNavigations.length > 0 && (
        <div className="mt-4 p-4 bg-base-200 rounded-lg">
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
            {unusedNavigations.map((nav, index) => (
              <div
                key={nav.id}
                draggable
                onDragStart={() => handleDragStart(activeNavigations.length + index)}
                onDragOver={(e) => handleDragOver(e, activeNavigations.length + index)}
                onDragEnd={handleDragEnd}
                onContextMenu={(e) => handleContextMenu(e, nav)}
                className={`card bg-base-100 hover:bg-base-200 transition-colors shadow-sm flex flex-col items-center justify-center p-2 cursor-move ${
                  draggedItem === (activeNavigations.length + index) ? 'opacity-50' : ''
                } ${dragOverItem === (activeNavigations.length + index) ? 'ring-2 ring-primary' : ''}`}
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
                  <span className="text-xs text-gray-500 mt-1">
                    创建于 {new Date(nav.createdAt).toLocaleDateString()}
                  </span>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {contextMenu.show && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu({ show: false, x: 0, y: 0, navigation: null })}
          onEdit={handleEdit}
          onDelete={handleDelete}
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

      <EditModal
        isOpen={editDialog.show}
        title="编辑导航名称"
        initialValue={editDialog.navigation?.name || ''}
        onConfirm={(newName) => {
          if (editDialog.navigation) {
            updateNavigation(editDialog.navigation.id, { ...editDialog.navigation, name: newName })
          }
          setEditDialog({ show: false, navigation: null })
        }}
        onCancel={() => setEditDialog({ show: false, navigation: null })}
      />
    </div>
  )
}

export default CustomNavigation 