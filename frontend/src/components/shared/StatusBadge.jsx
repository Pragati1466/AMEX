export default function StatusBadge({ label, colorClass }) {
  return (
    <span className={`diq-badge ${colorClass || 'diq-badge-gray'}`}>
      {label}
    </span>
  )
}
