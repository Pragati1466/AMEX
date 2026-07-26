import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, RefreshCw, ChevronRight, FileText } from 'lucide-react'
import { listCaseFiles } from '../../services/caseApi'
import { getResolutionState } from '../../services/resolutionApi'
import StatusBadge from '../../components/shared/StatusBadge'
import ScoreBar from '../../components/shared/ScoreBar'
import LoadingSkeleton from '../../components/shared/LoadingSkeleton'
import ErrorState from '../../components/shared/ErrorState'
import EmptyState from '../../components/shared/EmptyState'
import {
  formatDate,
  formatOutcome,
  formatReadiness,
  disputeStatusColor,
  scoreColor,
} from '../../utils/formatters'

const STATUS_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'Complete', value: 'complete' },
  { label: 'Submitted', value: 'submitted' },
]

const CASE_FILE_BADGE = {
  draft:     'diq-badge-gray',
  complete:  'diq-badge-blue',
  submitted: 'diq-badge-green',
  archived:  'diq-badge-violet',
}

export default function ResolutionCaseList() {
  const navigate = useNavigate()
  const [cases, setCases] = useState([])
  const [stateMap, setStateMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortField, setSortField] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listCaseFiles({ limit: 100, offset: 0, status: statusFilter || undefined })
      const fileList = data.case_files || data || []
      setCases(fileList)
      const batch = fileList.slice(0, 20)
      const stateResults = await Promise.allSettled(
        batch.map((cf) =>
          getResolutionState(cf.dispute_id).then((s) => ({ id: cf.dispute_id, state: s }))
        )
      )
      const newMap = {}
      stateResults.forEach((r) => {
        if (r.status === 'fulfilled' && r.value) newMap[r.value.id] = r.value.state
      })
      setStateMap(newMap)
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'Failed to load cases')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  const filtered = cases
    .filter((cf) => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        cf.case_file_id?.toLowerCase().includes(q) ||
        String(cf.dispute_id)?.includes(q) ||
        String(cf.id)?.includes(q)
      )
    })
    .sort((a, b) => {
      let av, bv
      if (sortField === 'fairness_score') {
        av = stateMap[a.dispute_id]?.fairness_score ?? -1
        bv = stateMap[b.dispute_id]?.fairness_score ?? -1
      } else if (sortField === 'created_at') {
        av = new Date(a.created_at || 0).getTime()
        bv = new Date(b.created_at || 0).getTime()
      } else {
        av = a[sortField] ?? ''
        bv = b[sortField] ?? ''
      }
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : av < bv ? 1 : -1
    })

  const toggleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('desc') }
  }

  const SortIcon = ({ field }) =>
    sortField !== field ? null : (
      <span className="ml-1" style={{ color: 'var(--color-navy-500)' }}>
        {sortDir === 'asc' ? '▲' : '▼'}
      </span>
    )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Resolution Cases
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {loading ? 'Loading…' : `${filtered.length} case${filtered.length !== 1 ? 's' : ''} found`}
          </p>
        </div>
        <button onClick={load} className="diq-btn diq-btn-outline diq-btn-sm">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Search by Case ID or Dispute ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="diq-input"
            style={{ paddingLeft: '36px' }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="diq-input diq-select"
            style={{ width: 'auto', minWidth: '130px' }}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="diq-card diq-card-body">
          <LoadingSkeleton rows={6} />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <EmptyState
          message="No cases found. Adjust filters or create a new investigation."
          icon={<FileText className="w-6 h-6" style={{ color: 'var(--color-text-muted)' }} />}
        />
      ) : (
        <div className="diq-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-muted)' }}>
                  <th
                    className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none"
                    style={{ color: 'var(--color-text-muted)', letterSpacing: '0.07em' }}
                    onClick={() => toggleSort('case_file_id')}
                  >
                    Case ID <SortIcon field="case_file_id" />
                  </th>
                  <th
                    className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--color-text-muted)', letterSpacing: '0.07em' }}
                  >
                    Status
                  </th>
                  <th
                    className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--color-text-muted)', letterSpacing: '0.07em' }}
                  >
                    Resolution
                  </th>
                  <th
                    className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none"
                    style={{ color: 'var(--color-text-muted)', letterSpacing: '0.07em' }}
                    onClick={() => toggleSort('fairness_score')}
                  >
                    Fairness <SortIcon field="fairness_score" />
                  </th>
                  <th
                    className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--color-text-muted)', letterSpacing: '0.07em' }}
                  >
                    AI Recommendation
                  </th>
                  <th
                    className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none"
                    style={{ color: 'var(--color-text-muted)', letterSpacing: '0.07em' }}
                    onClick={() => toggleSort('created_at')}
                  >
                    Created <SortIcon field="created_at" />
                  </th>
                  <th className="px-5 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((cf, idx) => {
                  const state = stateMap[cf.dispute_id]
                  return (
                    <tr
                      key={cf.id}
                      className="diq-row-hover"
                      style={{
                        borderBottom: idx < filtered.length - 1 ? '1px solid var(--color-border)' : 'none',
                      }}
                      onClick={() => navigate(`/resolution/${cf.dispute_id}`)}
                    >
                      <td className="px-5 py-3.5">
                        <div
                          className="font-mono text-sm font-semibold"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {cf.case_file_id}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                          Dispute #{cf.dispute_id}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge
                          label={cf.status?.replace('_', ' ').toUpperCase() || 'DRAFT'}
                          colorClass={CASE_FILE_BADGE[cf.status] || 'diq-badge-gray'}
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        {state ? (
                          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            {formatReadiness(state.resolution_readiness)}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {state?.fairness_score != null ? (
                          <div className="space-y-1 w-28">
                            <div className={`text-sm font-medium ${scoreColor(state.fairness_score)}`}>
                              {state.fairness_score.toFixed(1)}%
                            </div>
                            <ScoreBar score={state.fairness_score} />
                          </div>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {state?.ai_recommendation ? (
                          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            {formatOutcome(state.ai_recommendation)}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Pending</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {formatDate(cf.created_at)}
                      </td>
                      <td className="px-5 py-3.5">
                        <ChevronRight className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
