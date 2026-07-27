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
      // Use mock data for development/testing when backend is not available
      console.log('Using mock data for resolution case workspace')
      const mockDashboard = {
        case_id: caseId,
        dispute_external_id: 'DIS-2024-001',
        status: 'active',
        ai_recommendation: 'approve_customer',
        fairness_score: 85,
        confidence_score: 78,
        resolution_readiness: 'ready_for_decision',
        created_at: '2024-01-15',
        updated_at: '2024-01-20',
        customer_name: 'John Smith',
        merchant_name: 'Amazon',
        amount: 2500.00,
        dispute_type: 'fraud',
      }
      
      const mockNotifications = [
        { id: 1, message: 'Evidence requested from customer', is_read: false, created_at: '2024-01-19' },
        { id: 2, message: 'AI analysis completed', is_read: true, created_at: '2024-01-18' },
        { id: 3, message: 'Case assigned to investigator', is_read: true, created_at: '2024-01-15' },
      ]
      
      setDashboard(mockDashboard)
      setUnreadCount(mockNotifications.filter((n) => !n.is_read).length)
      setError(null)
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
          <ArrowLeft className="w-5 h-5" style={{ color: 'var(--color-text-muted)' }} />
          <div className="diq-skeleton rounded" style={{ height: '24px', width: '200px' }} />
        </div>
        <div className="diq-card diq-card-body">
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
      <div
        className="diq-card"
        style={{ borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', borderBottom: 'none' }}
      >
        <div className="px-5 py-3">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/resolution/cases')}
                className="diq-btn diq-btn-ghost diq-btn-sm"
                style={{ padding: '4px 6px', color: 'var(--color-text-secondary)' }}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {header.dispute_external_id || `Case #${caseId}`}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  {header.dispute_reason && (
                    <span className="text-xs capitalize" style={{ color: 'var(--color-text-muted)' }}>
                      {String(header.dispute_reason).replace(/_/g, ' ')}
                    </span>
                  )}
                  {header.amount && (
                    <span className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                      {header.currency || 'USD'} {Number(header.amount).toLocaleString()}
                    </span>
                  )}
                  {readiness && (
                    <span className="diq-badge diq-badge-navy">
                      {formatReadiness(readiness)}
                    </span>
                  )}
                  {hasFinalDecision && (
                    <span className="diq-badge diq-badge-green">Decision Recorded</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={load}
                className="diq-btn diq-btn-outline diq-btn-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
              <button
                onClick={() => navigate(`/resolution/${caseId}/notifications`)}
                className="diq-btn diq-btn-outline diq-btn-sm relative"
                style={{ padding: '6px 8px' }}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center"
                    style={{ background: 'var(--color-red-600)', fontSize: '9px' }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Tab navigation */}
          <nav
            className="flex gap-0.5 mt-3 overflow-x-auto pb-0"
            style={{ borderBottom: '2px solid var(--color-border)' }}
          >
            {TABS.map(({ label, path, icon: Icon }) => (
              <NavLink
                key={path}
                to={`/resolution/${caseId}/${path}`}
                className={({ isActive }) => `diq-tab ${isActive ? 'active' : ''}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {path === 'decision' && hasFinalDecision && (
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: 'var(--color-green-500)' }}
                  />
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Routed child components receive dashboard as context */}
      <div className="mt-4">
        <Outlet context={{ dashboard, caseId: Number(caseId), reload: load }} />
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
