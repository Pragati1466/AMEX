import { Inbox } from 'lucide-react'

export default function EmptyState({ message = 'No data available', icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      {icon || <Inbox className="w-12 h-12 mb-3 opacity-40" />}
      <p className="text-sm">{message}</p>
    </div>
  )
}
