import { scoreBgColor } from '../../utils/formatters'

export default function ScoreBar({ score, max = 100, height = 'h-2', showLabel = false }) {
  const pct = score != null ? Math.min(100, Math.max(0, (score / max) * 100)) : 0
  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 bg-gray-200 rounded-full ${height}`}>
        <div
          className={`${height} rounded-full transition-all duration-500 ${scoreBgColor(score)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-sm font-medium text-gray-700 w-12 text-right">
          {score != null ? `${score.toFixed(1)}%` : '—'}
        </span>
      )}
    </div>
  )
}
