import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Scale, GitBranch, Zap, ChevronRight, RefreshCw,
  CheckCircle, AlertTriangle, Clock, FileText, Activity,
} from 'lucide-react'
import { listCaseFiles } from '../../services/caseApi'
import { getResolutionState } from '../../services/resolutionApi'
import ScoreBar from '../../components/shared/ScoreBar'
import { CardSkeleton } from '../../components/shared/LoadingSkeleton'
import ErrorState from '../../components/shared/ErrorState'
import EmptyState from '../../components/shared/EmptyState'
import { formatDate, formatOutcome, formatReadiness, scoreColor } from '../../utils/formatters'

// Readiness tiers — what action is needed and where to navigate
const TIERS = [
  {
    key: 'ready_for_decision',
    label: 'Ready for Decision',
    icon: GitBranch,
    accentColor: 'var(--color-green-600)',
    badgeClass: 'diq-badge-green',
    tab: 'decision',
    cta: 'Record Decision',
    description: 'These cases have sufficient evidence and AI recommendation. Investigator decision required.',
  },
  {
    key: 'ready_for_review',
    label: 'Ready for Review',
    icon: CheckCircle,
    accentColor: 'var(--color-blue-600)',
    badgeClass: 'diq-badge-blue',
    tab: 'fairness',
    cta: 'Review Fairness',
    description: 'AI analysis complete. Review fairness score and recommendation before deciding.',
  },
  {
    key: 'partial',
    label: 'Partial — Evidence Pending',
    icon: Zap,
    accentColor: 'var(--color-amber-600)',
    badgeClass: 'diq-badge-amber',
    tab: 'rescore',
    cta: 'Continue',
    description: 'Investigation in progress. Evidence or re-scoring may be needed.',
  },
  {
    key: 'not_ready',
    label: 'Not Ready',
    icon: Clock,
    accentColor: 'var(--color-text-muted)',
    badgeClass: 'diq-badge-gray',
    tab: 'overview',
    cta: 'Open',
    description: 'Investigation not yet started or insufficient evidence to proceed.',
  },
]

// Map backend readiness values to tiers
function tierKey(readiness) {
  if (readiness === 'ready_for_decision' || readiness === 'decision_recorded') return 'ready_for_decision'
  if (readiness === 'ready_for_review') return 'ready_for_review'
  if (readiness === 'partial') return 'partial'
  return 'not_ready'
}

function CaseRow({ s, tab, navigate }) {
  return (
    <div
      className="diq-row-hover flex items-center justify-between px-5 py-3"
      onClick={() => navigate(`/resolution/${s.case_id}/${tab}`)}
    >
      <div className="flex items-center gap-3 min-w-0">
        <FileText className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
            {s.dispute_external_id || `Case #${s.case_id}`}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {s.ai_recommendation
              ? formatOutcome(s.ai_recommendation)
              : 'No AI recommendation yet'}
            {s.last_updated ? ` · ${formatDate(s.last_updated)}` : ''}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0 ml-4">
        {s.fairness_score != null && (
          <div className="text-right w-24 hidden sm:block">
            <div className={`text-sm font-semibold ${scoreColor(s.fairness_score)}`}>
              {s.fairness_score.toFixed(1)}%
            </div>
            <ScoreBar score={s.fairness_score} height="h-1" />
          </div>
        )}
        <ChevronRight className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    </div>
  )
}

export default function ResolutionOverview() {
  const navigate = useNavigate()
  const [cases, setCases] = useState([])
  const [states, setStates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listCaseFiles({ limit: 50 })
      const fileList = data.case_files || data || []
      setCases(fileList)
      const batch = fileList.slice(0, 30)
      const results = await Promise.allSettled(
        batch.map((cf) => getResolutionState(cf.dispute_id).then((s) => ({ ...s, _caseFile: cf })))
      )
      setStates(
        results
          .filter((r) => r.status === 'fulfilled' && r.value)
          .map((r) => r.value)
      )
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'Failed to load resolution queue')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Group states by tier
  const grouped = TIERS.reduce((acc, tier) => {
    acc[tier.key] = states.filter(
      (s) => !s.has_final_decision && tierKey(s.resolution_readiness) === tier.key
    )
    return acc
  }, {})

  // Completed (final decision recorded)
  const decided = states.filter((s) => s.has_final_decision)

  // Summary counts
  const actionNeeded = (grouped['ready_for_decision']?.length || 0) +
    (grouped['ready_for_review']?.length || 0)

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Resolution
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  if (error) {
    return <ErrorState message={error} onRetry={load} />
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Resolution
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Resolution workflow queue — cases grouped by action required
          </p>
        </div>
        <button onClick={load} className="diq-btn diq-btn-outline diq-btn-sm">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="diq-card diq-card-body flex items-center gap-3"
          style={{ '--kpi-accent': 'var(--color-green-600)' }}>
          <GitBranch className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-green-600)' }} />
          <div>
            <p className="text-2xl font-bold tabular-nums leading-none"
              style={{ color: 'var(--color-text-primary)' }}>
              {grouped['ready_for_decision']?.length ?? 0}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Ready for Decision
            </p>
          </div>
        </div>
        <div className="diq-card diq-card-body flex items-center gap-3">
          <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-blue-600)' }} />
          <div>
            <p className="text-2xl font-bold tabular-nums leading-none"
              style={{ color: 'var(--color-text-primary)' }}>
              {grouped['ready_for_review']?.length ?? 0}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Ready for Review
            </p>
          </div>
        </div>
        <div className="diq-card diq-card-body flex items-center gap-3">
          <Zap className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-amber-600)' }} />
          <div>
            <p className="text-2xl font-bold tabular-nums leading-none"
              style={{ color: 'var(--color-text-primary)' }}>
              {grouped['partial']?.length ?? 0}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Evidence Pending
            </p>
          </div>
        </div>
        <div className="diq-card diq-card-body flex items-center gap-3">
          <Activity className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-teal-600)' }} />
          <div>
            <p className="text-2xl font-bold tabular-nums leading-none"
              style={{ color: 'var(--color-text-primary)' }}>
              {decided.length}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Decisions Recorded
            </p>
          </div>
        </div>
      </div>

      {/* Action-needed banner */}
      {actionNeeded > 0 && (
        <div className="diq-alert diq-alert-info">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            <strong>{actionNeeded} case{actionNeeded !== 1 ? 's' : ''}</strong> require
            {actionNeeded === 1 ? 's' : ''} investigator action (ready for review or decision).
          </span>
        </div>
      )}

      {/* Tier sections */}
      {TIERS.map((tier) => {
        const items = grouped[tier.key] || []
        if (items.length === 0) return null
        const Icon = tier.icon
        return (
          <div key={tier.key} className="diq-card">
            <div className="diq-card-header" style={{ justifyContent: 'space-between' }}>
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" style={{ color: tier.accentColor }} />
                <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {tier.label}
                </h3>
                <span className={`diq-badge ${tier.badgeClass}`}>{items.length}</span>
              </div>
            </div>
            <div
              className="px-5 py-2 text-xs"
              style={{
                color: 'var(--color-text-muted)',
                borderBottom: '1px solid var(--color-border)',
                background: 'var(--color-surface-muted)',
              }}
            >
              {tier.description}
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {items.map((s) => (
                <CaseRow key={s.case_id} s={s} tab={tier.tab} navigate={navigate} />
              ))}
            </div>
          </div>
        )
      })}

      {/* Completed / decided */}
      {decided.length > 0 && (
        <div className="diq-card">
          <div className="diq-card-header" style={{ justifyContent: 'space-between' }}>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" style={{ color: 'var(--color-teal-600)' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Decisions Recorded
              </h3>
              <span className="diq-badge diq-badge-teal">{decided.length}</span>
            </div>
          </div>
          <div
            className="px-5 py-2 text-xs"
            style={{
              color: 'var(--color-text-muted)',
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-surface-muted)',
            }}
          >
            Final investigator decisions have been recorded for these cases.
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {decided.slice(0, 5).map((s) => (
              <CaseRow key={s.case_id} s={s} tab="decision" navigate={navigate} />
            ))}
          </div>
          {decided.length > 5 && (
            <div
              className="px-5 py-3 text-xs"
              style={{
                color: 'var(--color-text-muted)',
                borderTop: '1px solid var(--color-border)',
              }}
            >
              +{decided.length - 5} more decided cases —{' '}
              <button
                className="diq-btn diq-btn-ghost diq-btn-sm"
                style={{ padding: '0 4px', display: 'inline', fontSize: '12px' }}
                onClick={() => navigate('/resolution/cases')}
              >
                view all in Cases →
              </button>
            </div>
          )}
        </div>
      )}

      {/* All tiers empty */}
      {states.length === 0 && (
        <div className="diq-card">
          <EmptyState
            icon={<Scale className="w-6 h-6" style={{ color: 'var(--color-text-muted)' }} />}
            message="No cases with resolution state found. Start by opening a case from the Cases tab."
            action={
              <button
                className="diq-btn diq-btn-primary diq-btn-sm"
                onClick={() => navigate('/resolution/cases')}
              >
                <FileText className="w-3.5 h-3.5" /> Go to Cases
              </button>
            }
          />
        </div>
      )}
    </div>
  )
}
