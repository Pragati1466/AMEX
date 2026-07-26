export default function KPICard({
  icon,
  title,
  value,
  subtitle,
  accentColor = 'var(--color-navy-500)',
  trend,
}) {
  return (
    <div className="diq-kpi" style={{ '--kpi-accent': accentColor }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2"
            style={{ color: 'var(--color-text-muted)', letterSpacing: '0.08em' }}>
            {title}
          </p>
          <p className="text-3xl font-bold tabular-nums leading-none mb-1.5"
            style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
            {value ?? '—'}
          </p>
          {subtitle && (
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              {subtitle}
            </p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-1.5">
              {trend}
            </div>
          )}
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(0,0,0,0.04)' }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
