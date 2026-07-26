import { useEffect } from 'react'
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react'

const TYPE_CONFIG = {
  success: {
    icon: CheckCircle,
    iconColor: 'var(--color-green-600)',
    borderColor: '#bbf7d0',
    bg: 'var(--color-green-50)',
  },
  error: {
    icon: XCircle,
    iconColor: 'var(--color-red-600)',
    borderColor: '#fecaca',
    bg: 'var(--color-red-50)',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'var(--color-amber-600)',
    borderColor: '#fde68a',
    bg: 'var(--color-amber-50)',
  },
  info: {
    icon: Info,
    iconColor: 'var(--color-navy-600)',
    borderColor: '#a8c0ea',
    bg: 'var(--color-navy-50)',
  },
}

export default function Toast({ id, type = 'info', message, onDismiss, duration = 4000 }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(id), duration)
    return () => clearTimeout(t)
  }, [id, duration, onDismiss])

  const config = TYPE_CONFIG[type] || TYPE_CONFIG.info
  const IconComp = config.icon

  return (
    <div
      className="diq-toast flex items-start gap-3 rounded-xl px-4 py-3 min-w-64 max-w-sm"
      style={{
        background: config.bg,
        border: `1px solid ${config.borderColor}`,
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <div className="flex-shrink-0 mt-0.5">
        <IconComp className="w-4 h-4" style={{ color: config.iconColor }} />
      </div>
      <p className="text-sm flex-1 leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
        {message}
      </p>
      <button
        onClick={() => onDismiss(id)}
        className="flex-shrink-0 transition-opacity hover:opacity-70"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <Toast key={t.id} {...t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
