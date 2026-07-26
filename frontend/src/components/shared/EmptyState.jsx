import { Inbox } from 'lucide-react'

export default function EmptyState({ message = 'No data available', icon, action }) {
  return (
    <div className="diq-empty" style={{ minHeight: '160px' }}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'var(--color-navy-50)', border: '1px solid var(--color-navy-100)' }}>
        {icon || <Inbox className="w-6 h-6" style={{ color: 'var(--color-text-muted)' }} />}
      </div>
      <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
        {message}
      </p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
