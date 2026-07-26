import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, Clock, CheckCircle, Activity,
  BarChart3, TrendingUp, Users, ChevronRight, RefreshCw,
} from 'lucide-react'
import { listCaseFiles } from '../../services/caseApi'
import { getResolutionState } from '../../services/resolutionApi'
import KPICard from '../../components/shared/KPICard'
import ScoreBar from '../../components/shared/ScoreBar'
import { CardSkeleton } from '../../components/shared/LoadingSkeleton'
import ErrorState from '../../components/shared/ErrorState'
import { formatDate, formatOutcome, formatReadiness, scoreColor } from '../../utils/formatters'

export default function ResolutionDashboard() {
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
      const batch = fileList.slice(0, 20)
      const results = await Promise.allSettled(
        batch.map((cf) => getResolutionState(cf.dispute_id).then((s) => ({ ...s, _caseFile: cf })))
      )
      const loaded = results
        .filter((r) => r.status === 'fulfilled' && r.value)
        .map((r) => r.value)
      setStates(loaded)
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Derived KPIs
  const total = cases.length
  const completed = states.filter((s) => s.has_final_decision).length
  const readyForDecision = states.filter(
    (s) => s.resolution_readiness === 'ready_for_decision' || s.resolution_readiness === 'ready_for_review'
  ).length
  const pending = states.filter(
    (s) => !s.has_final_decision && s.resolution_readiness !== 'completed'
  ).length
  const scoresWithValues = states.filter((s) => s.fairness_score != null)
  const avgFairness =
    scoresWithValues.length > 0
      ? scoresWithValues.reduce((acc, s) => acc + s.fairness_score, 0) / scoresWithValues.length
      : null
  const module2Active = states.filter((s) => s.module2_available).length
  const recentCases = states
    .sort((a, b) => new Date(b.last_updated) - new Date(a.last_updated))
    .slice(0, 8)

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Dashboard
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
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
            Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Live summary across all investigated cases
          </p>
        </div>
        <button onClick={load} className="diq-btn diq-btn-outline diq-btn-sm">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KPICard
          icon={<FileText className="w-5 h-5" style={{ color: 'var(--color-navy-500)' }} />}
          title="Total Cases"
          value={total}
          subtitle={`${states.length} with resolution state`}
          accentColor="var(--color-navy-500)"
        />
        <KPICard
          icon={<Clock className="w-5 h-5" style={{ color: 'var(--color-amber-600)' }} />}
          title="Pending Resolution"
          value={pending}
          subtitle="Awaiting investigator action"
          accentColor="var(--color-amber-500)"
        />
        <KPICard
          icon={<CheckCircle className="w-5 h-5" style={{ color: 'var(--color-green-600)' }} />}
          title="Decisions Made"
          value={completed}
          subtitle={`${readyForDecision} ready for decision`}
          accentColor="var(--color-green-600)"
        />
        <KPICard
          icon={<Activity className="w-5 h-5" style={{ color: 'var(--color-violet-600)' }} />}
          title="Avg Fairness Score"
          value={avgFairness != null ? `${avgFairness.toFixed(1)}%` : '—'}
          subtitle={`${module2Active} cases with AI reasoning`}
          accentColor="var(--color-violet-600)"
        />
      </div>

      {/* AI + Readiness + Status breakdown cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="diq-card">
          <div className="diq-card-header">
            <TrendingUp className="w-4 h-4" style={{ color: 'var(--color-navy-500)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              AI Recommendation Breakdown
            </h3>
          </div>
          <div className="diq-card-body">
            {states.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No data</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(
                  states.reduce((acc, s) => {
                    const k = s.ai_recommendation || 'pending'
                    acc[k] = (acc[k] || 0) + 1
                    return acc
                  }, {})
                ).map(([outcome, count]) => (
                  <div key={outcome} className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {formatOutcome(outcome)}
                    </span>
                    <span className="diq-badge diq-badge-navy">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="diq-card">
          <div className="diq-card-header">
            <BarChart3 className="w-4 h-4" style={{ color: 'var(--color-navy-500)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Resolution Readiness
            </h3>
          </div>
          <div className="diq-card-body">
            {states.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No data</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(
                  states.reduce((acc, s) => {
                    const k = s.resolution_readiness || 'not_ready'
                    acc[k] = (acc[k] || 0) + 1
                    return acc
                  }, {})
                ).map(([r, count]) => (
                  <div key={r} className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {formatReadiness(r)}
                    </span>
                    <span className="diq-badge diq-badge-navy">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="diq-card">
          <div className="diq-card-header">
            <Users className="w-4 h-4" style={{ color: 'var(--color-navy-500)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Case File Status
            </h3>
          </div>
          <div className="diq-card-body">
            {cases.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No data</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(
                  cases.reduce((acc, cf) => {
                    acc[cf.status || 'draft'] = (acc[cf.status || 'draft'] || 0) + 1
                    return acc
                  }, {})
                ).map(([s, count]) => (
                  <div key={s} className="flex items-center justify-between">
                    <span className="text-xs capitalize" style={{ color: 'var(--color-text-secondary)' }}>
                      {s.replace('_', ' ')}
                    </span>
                    <span className="diq-badge diq-badge-navy">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recently Updated Cases */}
      <div className="diq-card">
        <div className="diq-card-header" style={{ justifyContent: 'space-between' }}>
          <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
            Recently Updated Cases
          </h3>
          <button
            onClick={() => navigate('/resolution/cases')}
            className="diq-btn diq-btn-ghost diq-btn-sm"
            style={{ padding: '2px 8px' }}
          >
            View all →
          </button>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
          {recentCases.length === 0 ? (
            <p className="text-sm p-5" style={{ color: 'var(--color-text-muted)' }}>
              No cases available
            </p>
          ) : (
            recentCases.map((s) => (
              <div
                key={s.case_id}
                className="diq-row-hover flex items-center justify-between px-5 py-3"
                onClick={() => navigate(`/resolution/${s.case_id}`)}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {s.dispute_external_id || `Case #${s.case_id}`}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {formatReadiness(s.resolution_readiness)} · Updated {formatDate(s.last_updated)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {s.fairness_score != null && (
                    <div className="text-right w-24">
                      <div className={`text-sm font-medium ${scoreColor(s.fairness_score)}`}>
                        {s.fairness_score.toFixed(1)}%
                      </div>
                      <ScoreBar score={s.fairness_score} height="h-1" />
                    </div>
                  )}
                  <ChevronRight className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
