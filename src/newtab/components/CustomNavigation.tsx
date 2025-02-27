import React, { useState, useRef } from 'react'
import { Navigation } from '../../types/navigation'
import { useNavigationStore } from '../../store/navigation'

interface CustomNavigationProps {
  navigations: Navigation[]
}

const CustomNavigation: React.FC<CustomNavigationProps> = ({ navigations }) => {
  const { reorderNavigations } = useNavigationStore()
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({})
  const [draggedItem, setDraggedItem] = useState<number | null>(null)
  const [dragOverItem, setDragOverItem] = useState<number | null>(null)
  
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
  
  return (
    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
      {navigations.map((nav, index) => (
        <div
          key={nav.id}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragEnd={handleDragEnd}
          className={`card bg-base-200 hover:bg-base-300 transition-colors shadow-sm flex flex-col items-center justify-center p-2 cursor-move ${
            draggedItem === index ? 'opacity-50' : ''
          } ${dragOverItem === index ? 'ring-2 ring-primary' : ''}`}
        >
          <a
            href={nav.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-full flex flex-col items-center justify-center"
            onClick={(e) => {
              // 如果正在拖拽，阻止点击事件
              if (draggedItem !== null) {
                e.preventDefault()
              }
            }}
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
    </div>
  )
}

export default CustomNavigation 