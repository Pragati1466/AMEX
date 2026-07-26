import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, Clock, CheckCircle, AlertTriangle, Activity,
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
      // Fetch resolution states for all cases (up to 20)
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
        <h1 className="text-2xl font-bold text-gray-900">Resolution Dashboard</h1>
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
          <h1 className="text-2xl font-bold text-gray-900">Resolution Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Live summary across all investigated cases</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KPICard
          icon={<FileText className="w-7 h-7 text-indigo-500" />}
          title="Total Cases"
          value={total}
          subtitle={`${states.length} with resolution state`}
          colorClass="border-indigo-200 bg-indigo-50"
        />
        <KPICard
          icon={<Clock className="w-7 h-7 text-yellow-500" />}
          title="Pending Resolution"
          value={pending}
          subtitle="Awaiting investigator action"
          colorClass="border-yellow-200 bg-yellow-50"
        />
        <KPICard
          icon={<CheckCircle className="w-7 h-7 text-green-500" />}
          title="Decisions Made"
          value={completed}
          subtitle={`${readyForDecision} ready for decision`}
          colorClass="border-green-200 bg-green-50"
        />
        <KPICard
          icon={<Activity className="w-7 h-7 text-purple-500" />}
          title="Avg Fairness Score"
          value={avgFairness != null ? `${avgFairness.toFixed(1)}%` : '—'}
          subtitle={`${module2Active} cases with AI reasoning`}
          colorClass="border-purple-200 bg-purple-50"
        />
      </div>

      {/* Module 2 AI summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" /> AI Recommendation Breakdown
          </h3>
          {states.length === 0 ? (
            <p className="text-xs text-gray-400">No data</p>
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
                  <span className="text-xs text-gray-600">{formatOutcome(outcome)}</span>
                  <span className="text-xs font-medium text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-500" /> Resolution Readiness
          </h3>
          {states.length === 0 ? (
            <p className="text-xs text-gray-400">No data</p>
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
                  <span className="text-xs text-gray-600">{formatReadiness(r)}</span>
                  <span className="text-xs font-medium text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" /> Case File Status
          </h3>
          {cases.length === 0 ? (
            <p className="text-xs text-gray-400">No data</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(
                cases.reduce((acc, cf) => {
                  acc[cf.status || 'draft'] = (acc[cf.status || 'draft'] || 0) + 1
                  return acc
                }, {})
              ).map(([s, count]) => (
                <div key={s} className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 capitalize">{s.replace('_', ' ')}</span>
                  <span className="text-xs font-medium text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recently Updated Cases */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Recently Updated Cases</h3>
          <button
            onClick={() => navigate('/resolution/cases')}
            className="text-sm text-indigo-600 hover:underline"
          >
            View all →
          </button>
        </div>
        <div className="divide-y divide-gray-50">
          {recentCases.length === 0 ? (
            <p className="text-sm text-gray-400 p-5">No cases available</p>
          ) : (
            recentCases.map((s) => (
              <div
                key={s.case_id}
                className="flex items-center justify-between px-5 py-3 hover:bg-indigo-50 cursor-pointer transition-colors"
                onClick={() => navigate(`/resolution/${s.case_id}`)}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {s.dispute_external_id || `Case #${s.case_id}`}
                    </p>
                    <p className="text-xs text-gray-400">
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
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
