import { useState, useEffect, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { ClipboardList, Search, RefreshCw, User } from 'lucide-react'
import { getAuditHistory } from '../../services/resolutionApi'
import LoadingSkeleton from '../shared/LoadingSkeleton'
import ErrorState from '../shared/ErrorState'
import EmptyState from '../shared/EmptyState'
import { formatDateTime } from '../../utils/formatters'

const EVENT_TYPE_COLOR = {
  evidence_submitted: 'bg-blue-100 text-blue-700',
  recommendation_generated: 'bg-indigo-100 text-indigo-700',
  recommendation_changed: 'bg-purple-100 text-purple-700',
  rescoring_triggered: 'bg-cyan-100 text-cyan-700',
  fairness_score_changed: 'bg-yellow-100 text-yellow-700',
  investigator_approved: 'bg-green-100 text-green-700',
  investigator_rejected: 'bg-red-100 text-red-700',
  investigator_modified: 'bg-orange-100 text-orange-700',
  final_decision_recorded: 'bg-green-100 text-green-800',
  report_generated: 'bg-gray-100 text-gray-600',
  notification_created: 'bg-gray-100 text-gray-500',
  collaboration_event: 'bg-teal-100 text-teal-700',
}

export default function AuditLogs() {
  const { caseId } = useOutletContext()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAuditHistory(caseId)
      setLogs(data || [])
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => { load() }, [load])

  const filtered = logs.filter((l) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      l.action?.toLowerCase().includes(q) ||
      l.event_type?.toLowerCase().includes(q) ||
      l.actor_role?.toLowerCase().includes(q) ||
      JSON.stringify(l.new_state || {}).toLowerCase().includes(q)
    )
  })

  if (loading) return <div className="p-6"><LoadingSkeleton rows={7} /></div>
  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <div className="space-y-5 p-1">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-indigo-500" />
          Audit Log ({filtered.length})
        </h2>
        <button
          onClick={load}
          className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by action, event type, or actor…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {filtered.length === 0 ? (
          <EmptyState message={search ? 'No matching audit entries.' : 'No audit history yet.'} />
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((log) => (
              <div key={log.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-0.5 flex-shrink-0">
                      <span
                        className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                          EVENT_TYPE_COLOR[log.event_type] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {String(log.event_type).replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {String(log.action).replace(/_/g, ' ')}
                      </p>
                      {(log.actor_role || log.actor_id) && (
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {log.actor_role || `User #${log.actor_id}`}
                        </p>
                      )}
                      {/* State changes */}
                      {log.new_state && Object.keys(log.new_state).length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-400 mb-0.5">Changes:</p>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(log.new_state).map(([k, v]) => (
                              <span
                                key={k}
                                className="text-xs bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5"
                              >
                                <span className="text-gray-500">{k}:</span>{' '}
                                <span className="text-gray-800 font-medium">
                                  {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {log.previous_state && Object.keys(log.previous_state).length > 0 && (
                        <div className="mt-1">
                          <p className="text-xs text-gray-400 mb-0.5">Previous:</p>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(log.previous_state).map(([k, v]) => (
                              <span
                                key={k}
                                className="text-xs bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 line-through text-gray-400"
                              >
                                {k}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 flex-shrink-0 text-right">
                    {formatDateTime(log.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
