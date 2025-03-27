import React, { useState } from 'react'

interface EditModalProps {
  isOpen: boolean
  title: string
  initialValue: string
  onConfirm: (value: string) => void
  onCancel: () => void
}

const EditModal: React.FC<EditModalProps> = ({
  isOpen,
  title,
  initialValue,
  onConfirm,
  onCancel,
}) => {
  const [value, setValue] = useState(initialValue)

  if (!isOpen) return null

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">{title}</h3>
        <div className="py-4">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="input input-bordered w-full"
            autoFocus
          />
        </div>
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onCancel}>
            取消
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => onConfirm(value)}
            disabled={!value.trim()}
          >
            确认
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onCancel}></div>
    </div>
  )
}

export default EditModal 