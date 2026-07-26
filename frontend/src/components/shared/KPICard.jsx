export default function KPICard({ icon, title, value, subtitle, colorClass = 'border-indigo-200 bg-indigo-50' }) {
  return (
    <div className={`rounded-lg border p-5 shadow-sm ${colorClass}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value ?? '—'}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {icon && <div className="opacity-80">{icon}</div>}
      </div>
    </div>
  )
}
