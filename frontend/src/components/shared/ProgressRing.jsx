/**
 * Reusable Circular Progress Ring component
 * Eliminates duplication across EvidenceUploadCenter, TimelineView, PolicyMapping, and CaseWorkspace
 */
export default function ProgressRing({ value = 0, size = 48, strokeWidth = 6, color = '#4F46E5', children }) {
  const r = (size - strokeWidth) / 2
  const c = 2 * Math.PI * r
  const offset = c - (value / 100) * c

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="#F1F5F9" strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={c} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
        />
      </svg>
      {children && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          {children}
        </div>
      )}
    </div>
  )
}

/**
 * Larger Circular Progress variant for metric displays
 */
export function CircularProgress({ value = 0, size = 100, strokeWidth = 8, color = '#4F46E5' }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="#F1F5F9" strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
      />
    </svg>
  )
}