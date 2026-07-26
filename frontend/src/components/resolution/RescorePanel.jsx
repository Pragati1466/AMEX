import { useState, useEffect, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Zap, TrendingUp, TrendingDown, Minus, RefreshCw, Clock } from 'lucide-react'
import { triggerRescore, getRescoreHistory } from '../../services/resolutionApi'
import LoadingSkeleton from '../shared/LoadingSkeleton'
import ErrorState from '../shared/ErrorState'
import EmptyState from '../shared/EmptyState'
import ScoreBar from '../shared/ScoreBar'
import { formatDateTime, formatOutcome, scoreColor } from '../../utils/formatters'

function DeltaBadge({ delta }) {
  if (delta == null) return <span className="text-gray-400">—</span>
  const color = delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-gray-500'
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus
  return (
    <span className={`flex items-center gap-0.5 text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      {delta > 0 ? '+' : ''}{delta.toFixed(1)}
    </span>
  )
}

export default function RescorePanel() {
  const { caseId, reload: reloadDashboard } = useOutletContext()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [triggering, setTriggering] = useState(false)
  const [triggerMsg, setTriggerMsg] = useState(null)
  const [reason, setReason] = useState('manual_trigger')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getRescoreHistory(caseId)
      setHistory(data || [])
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => { load() }, [load])

  const handleTrigger = async () => {
    setTriggering(true)
    setTriggerMsg(null)
    try {
      const result = await triggerRescore(caseId, reason)
      setTriggerMsg(`Re-scoring complete. New fairness score: ${result.rescoring_event?.new_fairness_score?.toFixed(1) ?? '—'}%`)
      await load()
      reloadDashboard()
    } catch (e) {
      setTriggerMsg(e?.response?.data?.detail || 'Re-scoring failed')
    } finally {
      setTriggering(false)
    }
  }

  if (loading) return <div className="p-6"><LoadingSkeleton rows={6} /></div>
  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <div className="space-y-6 p-1">
      {/* Trigger Panel */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-indigo-500" /> Trigger Re-Scoring
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="manual_trigger">Manual Trigger</option>
              <option value="new_evidence">New Evidence Available</option>
              <option value="investigation_update">Investigation Update</option>
              <option value="policy_change">Policy Change</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleTrigger}
              disabled={triggering}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              <Zap className={`w-4 h-4 ${triggering ? 'animate-pulse' : ''}`} />
              {triggering ? 'Rescoring…' : 'Run Re-Score'}
            </button>
          </div>
        </div>
        {triggerMsg && (
          <div className={`mt-3 text-sm px-3 py-2 rounded-lg border ${
            triggerMsg.includes('complete') || triggerMsg.includes('score:')
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {triggerMsg}
          </div>
        )}
      </div>

      {/* Re-Scoring History */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            Re-Scoring History ({history.length})
          </h3>
          <button
            onClick={load}
            className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>

        {history.length === 0 ? (
          <div className="p-5">
            <EmptyState message="No re-scoring events yet. Trigger a re-score above." />
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {history.map((evt, idx) => (
              <div key={evt.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-xs font-mono text-gray-400">{evt.event_id}</span>
                      {idx === 0 && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                          Latest
                        </span>
                      )}
                      {evt.used_module2 && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          AI Reasoning
                        </span>
                      )}
                    </div>

                    {/* Score comparison */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                      <div className="text-center bg-gray-50 rounded-lg p-2">
                        <p className="text-xs text-gray-400 mb-0.5">Previous Score</p>
                        <p className={`text-lg font-bold ${scoreColor(evt.previous_fairness_score)}`}>
                          {evt.previous_fairness_score != null ? `${evt.previous_fairness_score.toFixed(1)}%` : '—'}
                        </p>
                        {evt.previous_fairness_score != null && (
                          <ScoreBar score={evt.previous_fairness_score} height="h-1" />
                        )}
                      </div>
                      <div className="text-center bg-gray-50 rounded-lg p-2">
                        <p className="text-xs text-gray-400 mb-0.5">New Score</p>
                        <p className={`text-lg font-bold ${scoreColor(evt.new_fairness_score)}`}>
                          {evt.new_fairness_score != null ? `${evt.new_fairness_score.toFixed(1)}%` : '—'}
                        </p>
                        {evt.new_fairness_score != null && (
                          <ScoreBar score={evt.new_fairness_score} height="h-1" />
                        )}
                      </div>
                      <div className="text-center bg-gray-50 rounded-lg p-2">
                        <p className="text-xs text-gray-400 mb-0.5">Score Δ</p>
                        <div className="flex justify-center mt-1">
                          <DeltaBadge delta={evt.score_change} />
                        </div>
                      </div>
                      <div className="text-center bg-gray-50 rounded-lg p-2">
                        <p className="text-xs text-gray-400 mb-0.5">Confidence Δ</p>
                        <div className="flex justify-center mt-1">
                          <DeltaBadge delta={
                            evt.new_confidence != null && evt.previous_confidence != null
                              ? (evt.new_confidence - evt.previous_confidence) * 100
                              : null
                          } />
                        </div>
                      </div>
                    </div>

                    {/* Recommendation change */}
                    {(evt.previous_recommendation || evt.new_recommendation) && (
                      <div className="flex items-center gap-2 text-xs mb-2">
                        <span className="text-gray-500">Recommendation:</span>
                        <span className="text-gray-700">{formatOutcome(evt.previous_recommendation)}</span>
                        <span className="text-gray-400">→</span>
                        <span className={`font-medium ${
                          evt.new_recommendation !== evt.previous_recommendation
                            ? 'text-indigo-700'
                            : 'text-gray-700'
                        }`}>
                          {formatOutcome(evt.new_recommendation)}
                        </span>
                        {evt.new_recommendation !== evt.previous_recommendation && (
                          <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-xs">Changed</span>
                        )}
                      </div>
                    )}

                    {evt.change_reason && (
                      <p className="text-xs text-gray-500">Reason: {evt.change_reason.replace(/_/g, ' ')}</p>
                    )}
                    {evt.change_summary && (
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">{evt.change_summary}</p>
                    )}
                  </div>
                  <div className="text-right text-xs text-gray-400 flex-shrink-0">
                    {formatDateTime(evt.timestamp)}
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
