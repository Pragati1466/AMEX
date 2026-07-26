import { AlertTriangle, X } from 'lucide-react'

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  danger = false,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(5, 13, 26, 0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="diq-card w-full max-w-sm p-0 overflow-hidden">
        {/* Header stripe */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
              danger
                ? 'bg-red-50 border border-red-100'
                : 'bg-navy-50 border border-navy-100'
            }`}
              style={danger
                ? { background: 'var(--color-red-50)', borderColor: 'var(--color-red-100)' }
                : { background: 'var(--color-navy-50)', borderColor: 'var(--color-navy-100)' }
              }>
              <AlertTriangle className="w-4 h-4" style={{ color: danger ? 'var(--color-red-600)' : 'var(--color-navy-600)' }} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                {title}
              </h3>
              {message && (
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  {message}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 flex gap-2.5 justify-end"
          style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-muted)' }}>
          <button onClick={onCancel} className="diq-btn diq-btn-outline diq-btn-sm">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`diq-btn diq-btn-sm ${danger ? 'diq-btn-danger' : 'diq-btn-primary'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
