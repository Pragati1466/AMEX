import { useState, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  CheckCircle, XCircle, Edit3, AlertTriangle, Scale, Brain, Clock,
} from 'lucide-react'
import { approveDecision, rejectDecision, modifyDecision } from '../../services/resolutionApi'
import ConfirmDialog from '../shared/ConfirmDialog'
import ScoreBar from '../shared/ScoreBar'
import LoadingSkeleton from '../shared/LoadingSkeleton'
import { formatOutcome, formatDateTime, scoreColor } from '../../utils/formatters'

const OUTCOME_OPTIONS = [
  { value: 'approve_customer', label: 'Approve — Customer' },
  { value: 'approve_merchant', label: 'Approve — Merchant' },
  { value: 'partial_resolution', label: 'Partial Resolution' },
  { value: 'request_more_evidence', label: 'Request More Evidence' },
  { value: 'escalate_to_human', label: 'Escalate to Human' },
]

export default function DecisionFlow() {
  const { dashboard, caseId, reload } = useOutletContext()
  const [mode, setMode] = useState(null) // 'approve' | 'reject' | 'modify'
  const [rationale, setRationale] = useState('')
  const [modifyOutcome, setModifyOutcome] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  if (!dashboard) return <div className="p-6"><LoadingSkeleton rows={6} /></div>

  const rec = dashboard.ai_recommendation || {}
  const fairness = dashboard.fairness_overview || {}
  const completeness = dashboard.evidence_completeness || {}
  const finalDecision = dashboard.final_decision
  const humanReviewRequired = dashboard.human_review_required

  const handleSubmit = useCallback(async () => {
    setConfirm(false)
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      let result
      if (mode === 'approve') {
        result = await approveDecision(caseId, rationale || null)
      } else if (mode === 'reject') {
        result = await rejectDecision(caseId, rationale)
      } else if (mode === 'modify') {
        result = await modifyDecision(caseId, modifyOutcome, rationale)
      }
      setSuccess(result)
      setMode(null)
      setRationale('')
      setModifyOutcome('')
      reload()
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'Decision submission failed')
    } finally {
      setSubmitting(false)
    }
  }, [mode, caseId, rationale, modifyOutcome, reload])

  const canSubmit = mode === 'approve'
    ? true
    : mode === 'reject'
    ? rationale.trim().length > 0
    : mode === 'modify'
    ? rationale.trim().length > 0 && modifyOutcome
    : false

  // If decision already recorded
  if (finalDecision) {
    return (
      <div className="space-y-5 p-1">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-7 h-7 text-green-600" />
            <h2 className="text-base font-bold text-green-800">Final Decision Recorded</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-green-600 mb-0.5">Outcome</p>
              <p className="text-lg font-bold text-green-800">{formatOutcome(finalDecision.outcome)}</p>
            </div>
            <div>
              <p className="text-xs text-green-600 mb-0.5">Decision Type</p>
              <p className="text-sm font-medium text-green-700 capitalize">{finalDecision.decision_type}</p>
            </div>
            <div>
              <p className="text-xs text-green-600 mb-0.5">AI Recommendation at Decision</p>
              <p className="text-sm text-green-700">{formatOutcome(finalDecision.ai_recommendation_at_decision)}</p>
            </div>
            <div>
              <p className="text-xs text-green-600 mb-0.5">Recorded At</p>
              <p className="text-sm text-green-700">{formatDateTime(finalDecision.created_at)}</p>
            </div>
          </div>
          {finalDecision.rationale && (
            <div className="mt-4 pt-4 border-t border-green-200">
              <p className="text-xs text-green-600 mb-1">Rationale</p>
              <p className="text-sm text-green-800 leading-relaxed">{finalDecision.rationale}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-1">
      {/* AI context panel */}
      <div className="bg-white rounded-lg border border-indigo-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Brain className="w-4 h-4 text-indigo-500" /> AI Analysis Summary
          <span className="ml-auto text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> AI is advisory only
          </span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-indigo-50 rounded-lg p-3">
            <p className="text-xs text-indigo-500 mb-1 flex items-center gap-1">
              <Brain className="w-3 h-3" /> AI Recommendation
            </p>
            <p className="text-sm font-bold text-indigo-800">
              {formatOutcome(rec.recommended_outcome) || 'Pending'}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <Scale className="w-3 h-3" /> Fairness Score
            </p>
            <p className={`text-lg font-bold ${scoreColor(fairness.fairness_score)}`}>
              {fairness.fairness_score != null ? `${fairness.fairness_score.toFixed(1)}%` : '—'}
            </p>
            {fairness.fairness_score != null && <ScoreBar score={fairness.fairness_score} height="h-1" />}
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Evidence Completeness
            </p>
            <p className="text-lg font-bold text-gray-800">
              {completeness.completeness_pct != null ? `${completeness.completeness_pct.toFixed(1)}%` : '—'}
            </p>
            {completeness.completeness_pct != null && (
              <ScoreBar score={completeness.completeness_pct} height="h-1" />
            )}
          </div>
        </div>
        {humanReviewRequired && (
          <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg mt-3 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Human review is recommended before making a final decision.
          </p>
        )}
        {completeness.missing_evidence?.length > 0 && (
          <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {completeness.missing_evidence.length} missing evidence item(s) identified.
          </p>
        )}
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Decision recorded successfully: <strong>{formatOutcome(success.outcome)}</strong>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 flex items-center gap-2">
          <XCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Decision buttons */}
      {!mode && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Make a Final Decision</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => setMode('approve')}
              disabled={!rec.recommended_outcome}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
            >
              <CheckCircle className="w-4 h-4" /> Approve AI Recommendation
            </button>
            <button
              onClick={() => setMode('reject')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
            >
              <XCircle className="w-4 h-4" /> Reject AI Recommendation
            </button>
            <button
              onClick={() => setMode('modify')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
            >
              <Edit3 className="w-4 h-4" /> Modify Decision
            </button>
          </div>
        </div>
      )}

      {/* Decision form */}
      {mode && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            {mode === 'approve' && <><CheckCircle className="w-4 h-4 text-green-500" /> Approve AI Recommendation</>}
            {mode === 'reject' && <><XCircle className="w-4 h-4 text-red-500" /> Reject AI Recommendation</>}
            {mode === 'modify' && <><Edit3 className="w-4 h-4 text-indigo-500" /> Modify Decision</>}
          </h3>

          {mode === 'approve' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-green-700">
                You are approving the AI recommendation: <strong>{formatOutcome(rec.recommended_outcome)}</strong>
              </p>
            </div>
          )}

          {mode === 'modify' && (
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">Outcome *</label>
              <select
                value={modifyOutcome}
                onChange={(e) => setModifyOutcome(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Select outcome…</option>
                {OUTCOME_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Rationale {mode !== 'approve' ? '*' : '(optional)'}
            </label>
            <textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder={
                mode === 'approve'
                  ? 'Add optional notes…'
                  : 'Explain your reasoning…'
              }
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 resize-none"
              required={mode !== 'approve'}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setConfirm(true)}
              disabled={!canSubmit || submitting}
              className={`flex items-center gap-2 px-4 py-2 text-white text-sm rounded-lg disabled:opacity-50 ${
                mode === 'approve'
                  ? 'bg-green-600 hover:bg-green-700'
                  : mode === 'reject'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {submitting ? 'Submitting…' : 'Submit Decision'}
            </button>
            <button
              onClick={() => { setMode(null); setRationale(''); setModifyOutcome('') }}
              className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {confirm && (
        <ConfirmDialog
          title="Confirm Final Decision"
          message={`This action will record the final decision and cannot be easily undone. Are you sure you want to ${mode} ${
            mode === 'approve'
              ? `"${formatOutcome(rec.recommended_outcome)}"`
              : mode === 'modify'
              ? `"${formatOutcome(modifyOutcome)}"`
              : 'the AI recommendation'
          }?`}
          confirmLabel="Yes, Submit Decision"
          cancelLabel="Go Back"
          onConfirm={handleSubmit}
          onCancel={() => setConfirm(false)}
          danger={mode === 'reject'}
        />
      )}
    </div>
  )
}
