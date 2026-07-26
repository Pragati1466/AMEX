import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function ErrorState({ message = 'Something went wrong', onRetry }) {
  return (
    <div className="diq-card diq-empty" style={{ minHeight: '200px' }}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'var(--color-red-50)', border: '1px solid var(--color-red-100)' }}>
        <AlertTriangle className="w-6 h-6" style={{ color: 'var(--color-red-600)' }} />
      </div>
      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
        Failed to load data
      </p>
      <p className="text-xs text-center max-w-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
        {message}
      </p>
      {onRetry && (
        <button onClick={onRetry} className="diq-btn diq-btn-primary diq-btn-sm">
          <RefreshCw className="w-3.5 h-3.5" /> Try Again
        </button>
      )}
    </div>
  )
}
