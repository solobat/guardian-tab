import React, { useEffect } from 'react'
import { FALLBACK_ICON } from '../../../const'

export interface FormField {
  key: string
  label: string
  placeholder?: string
  required?: boolean
}

interface FormModalProps {
  isOpen: boolean
  title: string
  submitLabel?: string
  fields: FormField[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  onConfirm: () => void
  onCancel: () => void
  /** 图标预览 URL，为空则不显示预览 */
  previewUrl?: string
  /** 校验错误信息（如重复项提示），非空时禁止提交 */
  error?: string | null
}

const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  title,
  submitLabel = '保存',
  fields,
  values,
  onChange,
  onConfirm,
  onCancel,
  previewUrl,
  error,
}) => {
  // Esc 关闭弹窗
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const isValid =
    fields.every((field) => !field.required || (values[field.key] || '').trim() !== '') && !error

  const handleConfirm = () => {
    if (isValid) onConfirm()
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">{title}</h3>
        <div className="py-4 space-y-3">
          {fields.map((field, index) => (
            <div key={field.key} className="flex items-center gap-2">
              <label className="w-16 shrink-0 text-sm text-base-content/70">{field.label}</label>
              <input
                type="text"
                className="input input-bordered flex-1"
                placeholder={field.placeholder}
                value={values[field.key] || ''}
                onChange={(e) => onChange(field.key, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleConfirm()
                  }
                }}
                autoFocus={index === 0}
              />
            </div>
          ))}
          {previewUrl && (
            <div className="flex items-center gap-2">
              <label className="w-16 shrink-0 text-sm text-base-content/70">预览</label>
              <div className="w-9 h-9 flex items-center justify-center bg-base-200 rounded">
                <img
                  src={previewUrl}
                  alt="图标预览"
                  className="max-w-[80%] max-h-[80%] object-contain"
                  onError={(e) => {
                    e.currentTarget.src = FALLBACK_ICON
                  }}
                />
              </div>
              <span className="text-xs opacity-60">留空可自动生成</span>
            </div>
          )}
          {error && <p className="text-error text-xs">{error}</p>}
        </div>
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onCancel}>
            取消
          </button>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={!isValid}>
            {submitLabel}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onCancel}></div>
    </div>
  )
}

export default FormModal
