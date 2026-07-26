import { scoreFillClass } from '../../utils/formatters'

export default function ScoreBar({ score, max = 100, height = 'h-2', showLabel = false }) {
  const pct = score != null ? Math.min(100, Math.max(0, (score / max) * 100)) : 0
  const fillClass = scoreFillClass(score)

  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 diq-score-track ${height}`} style={{ borderRadius: '999px' }}>
        <div
          className={`diq-score-fill ${fillClass} ${height}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-semibold tabular-nums w-12 text-right"
          style={{ color: 'var(--color-text-secondary)' }}>
          {score != null ? `${score.toFixed(1)}%` : '—'}
        </span>
      )}
    </div>
  )
}
