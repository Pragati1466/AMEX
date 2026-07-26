import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, NavLink, Outlet } from 'react-router-dom'
import {
  ArrowLeft, LayoutDashboard, Users, Zap, GitBranch,
  Scale, FileText, Bell, ClipboardList, RefreshCw,
} from 'lucide-react'
import { getResolutionDashboard } from '../../services/resolutionApi'
import { getNotifications } from '../../services/notificationApi'
import { useResolutionWebSocket } from '../../hooks/useResolutionWebSocket'
import { useToast } from '../../hooks/useToast'
import { ToastContainer } from '../../components/shared/Toast'
import { formatReadiness, formatOutcome } from '../../utils/formatters'
import LoadingSkeleton from '../../components/shared/LoadingSkeleton'
import ErrorState from '../../components/shared/ErrorState'

// Tab configuration for CaseWorkspace sub-routes
const TABS = [
  { label: 'Overview', path: 'overview', icon: LayoutDashboard },
  { label: 'Fairness', path: 'fairness', icon: Scale },
  { label: 'Collaboration', path: 'collaboration', icon: Users },
  { label: 'Re-Score', path: 'rescore', icon: Zap },
  { label: 'Decision', path: 'decision', icon: GitBranch },
  { label: 'Report', path: 'report', icon: FileText },
  { label: 'Notifications', path: 'notifications', icon: Bell },
  { label: 'Audit', path: 'audit', icon: ClipboardList },
]

export default function CaseWorkspace() {
  const { caseId } = useParams()
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const { toasts, addToast, dismissToast } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [dash, notifs] = await Promise.all([
        getResolutionDashboard(caseId),
        getNotifications(caseId),
      ])
      setDashboard(dash)
      setUnreadCount((notifs || []).filter((n) => !n.is_read).length)
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'Failed to load case')
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => { load() }, [load])

  // WebSocket real-time updates
  const handleWsEvent = useCallback((event, data) => {
    switch (event) {
      case 'rescoring_completed':
        addToast('info', '⚡ Re-scoring completed. Refreshing…')
        load()
        break
      case 'fairness_score_updated':
        addToast('success', `✅ Fairness score updated: ${data.fairness_score?.toFixed?.(1) ?? ''}%`)
        load()
        break
      case 'recommendation_updated':
        addToast('info', `💡 AI recommendation: ${formatOutcome(data.recommendation)}`)
        load()
        break
      case 'evidence_submitted':
        addToast('info', '📄 New evidence submitted.')
        setUnreadCount((c) => c + 1)
        load()
        break
      case 'evidence_requested':
        addToast('warning', `📩 Evidence requested: ${data.evidence_type || ''}`)
        setUnreadCount((c) => c + 1)
        break
      case 'decision_recorded':
        addToast('success', '✓ Final decision recorded.')
        load()
        break
      case 'resolution_completed':
        addToast('success', '🏁 Resolution completed!')
        load()
        break
      case 'error':
        // WebSocket error - silently ignore for UX
        break
      default:
        break
    }
  }, [addToast, load])

  useResolutionWebSocket({ caseId: Number(caseId), onEvent: handleWsEvent, enabled: !!caseId })

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <ArrowLeft className="w-5 h-5 text-gray-400" />
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <LoadingSkeleton rows={5} />
        </div>
      </div>
    )
  }

  if (error) {
    return <ErrorState message={error} onRetry={load} />
  }

  const header = dashboard?.case_header || {}
  const readiness = dashboard?.resolution_readiness
  const hasFinalDecision = !!dashboard?.final_decision

  return (
    <div className="space-y-0">
      {/* Top: back + case header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/resolution/cases')}
              className="text-gray-500 hover:text-indigo-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                {header.dispute_external_id || `Case #${caseId}`}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-gray-500">
                {header.dispute_reason && (
                  <span className="capitalize">
                    {String(header.dispute_reason).replace(/_/g, ' ')}
                  </span>
                )}
                {header.amount && (
                  <span className="font-medium text-gray-700">
                    {header.currency || 'USD'} {Number(header.amount).toLocaleString()}
                  </span>
                )}
                {readiness && (
                  <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                    {formatReadiness(readiness)}
                  </span>
                )}
                {hasFinalDecision && (
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    Decision Recorded
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={load}
              className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button
              onClick={() => navigate(`/resolution/${caseId}/notifications`)}
              className="relative text-gray-500 hover:text-indigo-600"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <nav className="flex gap-0.5 mt-3 overflow-x-auto">
          {TABS.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={`/resolution/${caseId}/${path}`}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-indigo-600 text-indigo-700 bg-indigo-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`
              }
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {path === 'decision' && hasFinalDecision && (
                <span className="w-2 h-2 bg-green-500 rounded-full" />
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Routed child components receive dashboard as context */}
      <div className="mt-4 px-0">
        <Outlet context={{ dashboard, caseId: Number(caseId), reload: load }} />
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
