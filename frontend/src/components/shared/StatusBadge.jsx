export default function StatusBadge({ label, colorClass }) {
  return (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${colorClass || 'bg-gray-100 text-gray-600'}`}>
      {label}
    </span>
  )
}
