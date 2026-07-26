export default function LoadingSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="diq-skeleton h-4 rounded"
          style={{ width: `${60 + (i % 3) * 15}%`, height: '14px' }}
        />
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="diq-card p-5 space-y-3">
      <div className="diq-skeleton rounded" style={{ height: '12px', width: '40%' }} />
      <div className="diq-skeleton rounded" style={{ height: '28px', width: '55%' }} />
      <div className="diq-skeleton rounded" style={{ height: '10px', width: '70%' }} />
    </div>
  )
}

export function TableRowSkeleton({ cols = 5 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div className="diq-skeleton rounded" style={{ height: '14px', width: `${50 + i * 8}%` }} />
        </td>
      ))}
    </tr>
  )
}
