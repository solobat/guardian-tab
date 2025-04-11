import React, { useEffect } from 'react'

interface ContextMenuProps {
  x: number
  y: number
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onReset?: () => void
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, onEdit, onDelete, onReset }) => {
  useEffect(() => {
    const handleClick = () => onClose()
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [onClose])

  return (
    <div
      className="fixed bg-base-200 shadow-lg rounded-lg py-1 z-50"
      style={{ left: x, top: y }}
    >
      <button
        className="w-full px-4 py-2 text-left hover:bg-base-300 flex items-center gap-2"
        onClick={(e) => {
          e.stopPropagation()
          onEdit()
          onClose()
        }}
      >
        编辑
      </button>
      <button
        className="w-full px-4 py-2 text-left hover:bg-base-300 text-warning flex items-center gap-2"
        onClick={(e) => {
          e.stopPropagation()
          onReset?.()
          onClose()
        }}
      >
        重置点击次数
      </button>
      <button
        className="w-full px-4 py-2 text-left hover:bg-base-300 text-error flex items-center gap-2"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
          onClose()
        }}
      >
        删除
      </button>
    </div>
  )
}

export default ContextMenu 