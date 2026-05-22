import React from 'react'
import { X, AlertTriangle } from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'primary'
  isLoading?: boolean
  onConfirm: () => void
  onClose: () => void
}

/**
 * Generic confirm dialog — used for destructive actions like delete.
 */
const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onClose
}) => {
  if (!isOpen) return null

  const btnClass = {
    danger: 'btn-danger',
    warning: 'btn bg-warning text-white hover:bg-amber-600',
    primary: 'btn-primary'
  }[variant]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center
                           ${variant === 'danger' ? 'bg-danger-light' : variant === 'warning' ? 'bg-warning-light' : 'bg-primary-light'}`}>
              <AlertTriangle className={`w-5 h-5 ${variant === 'danger' ? 'text-danger' : variant === 'warning' ? 'text-warning' : 'text-primary'}`} />
            </div>
            <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost w-8 h-8 p-0 rounded-lg flex items-center justify-center"
            id="confirm-modal-close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <p className="text-text-secondary text-sm mb-6 leading-relaxed">{message}</p>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            id="confirm-modal-cancel"
            onClick={onClose}
            className="btn btn-secondary"
            disabled={isLoading}
          >
            {cancelLabel}
          </button>
          <button
            id="confirm-modal-confirm"
            onClick={onConfirm}
            className={`btn ${btnClass}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
