import { useState, useEffect, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Bell, Check, CheckCheck, RefreshCw } from 'lucide-react'
import { getNotifications, markNotificationRead } from '../../services/notificationApi'
import LoadingSkeleton from '../shared/LoadingSkeleton'
import ErrorState from '../shared/ErrorState'
import EmptyState from '../shared/EmptyState'
import { formatDateTime } from '../../utils/formatters'

const EVENT_COLORS = {
  evidence_requested: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  evidence_submitted: 'bg-blue-100 text-blue-700 border-blue-200',
  evidence_accepted: 'bg-green-100 text-green-700 border-green-200',
  fairness_score_updated: 'bg-purple-100 text-purple-700 border-purple-200',
  recommendation_changed: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  investigator_decision: 'bg-green-100 text-green-700 border-green-200',
  resolution_completed: 'bg-green-100 text-green-800 border-green-200',
  rescoring_completed: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  report_generated: 'bg-gray-100 text-gray-700 border-gray-200',
}

export default function NotificationCenter() {
  const { caseId } = useOutletContext()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [marking, setMarking] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getNotifications(caseId)
      setNotifications(data || [])
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => { load() }, [load])

  const handleMarkRead = async (notifId) => {
    setMarking(notifId)
    try {
      await markNotificationRead(caseId, notifId)
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
      )
    } catch (e) {
      // silently ignore
    } finally {
      setMarking(null)
    }
  }

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.is_read)
    for (const n of unread) {
      try {
        await markNotificationRead(caseId, n.id)
      } catch { /* ignore */ }
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  if (loading) return <div className="p-6"><LoadingSkeleton rows={5} /></div>
  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <div className="space-y-5 p-1">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <Bell className="w-5 h-5 text-indigo-500" />
          Notifications
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadCount} unread
            </span>
          )}
        </h2>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
            >
              <CheckCheck className="w-4 h-4" /> Mark all read
            </button>
          )}
          <button
            onClick={load}
            className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {notifications.length === 0 ? (
          <EmptyState message="No notifications yet." />
        ) : (
          <div className="divide-y divide-gray-50">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`px-5 py-4 flex items-start gap-4 transition-colors ${
                  n.is_read ? 'bg-white' : 'bg-indigo-50'
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <span
                    className={`inline-block px-2 py-0.5 text-xs rounded-full border ${
                      EVENT_COLORS[n.event_type] || 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}
                  >
                    {String(n.event_type).replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${n.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatDateTime(n.created_at)}</p>
                </div>
                {!n.is_read && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    disabled={marking === n.id}
                    className="flex-shrink-0 text-indigo-500 hover:text-indigo-700 mt-0.5"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                {n.is_read && (
                  <span className="text-gray-300 flex-shrink-0 mt-0.5" title="Read">
                    <CheckCheck className="w-4 h-4" />
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
