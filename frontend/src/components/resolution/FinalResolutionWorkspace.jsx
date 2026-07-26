import { useOutletContext, useNavigate } from 'react-router-dom'
import {
  Brain, Scale, FileText, CheckCircle, AlertTriangle,
  TrendingUp, Users, ClipboardList, ArrowRight,
} from 'lucide-react'
import ScoreBar from '../shared/ScoreBar'
import LoadingSkeleton from '../shared/LoadingSkeleton'
import { formatOutcome, formatDateTime, formatPct, scoreColor } from '../../utils/formatters'

function Card({ title, icon: Icon, color = 'border-gray-200', children }) {
  return (
    <div className={`bg-white rounded-lg border shadow-sm ${color}`}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        {Icon && <Icon className="w-4 h-4 text-indigo-500" />}
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  )
}

function ListItems({ items, color = 'text-gray-600', icon: Icon, iconColor = 'text-gray-400' }) {
  if (!items?.length) return <p className="text-xs text-gray-400">None identified</p>
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-1.5 text-xs">
          {Icon && <Icon className={`w-3 h-3 flex-shrink-0 mt-0.5 ${iconColor}`} />}
          <span className={color}>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export default function FinalResolutionWorkspace() {
  const { dashboard, caseId } = useOutletContext()
  const navigate = useNavigate()

  if (!dashboard) return <div className="p-6"><LoadingSkeleton rows={10} /></div>

  const header = dashboard.case_header || {}
  const fairness = dashboard.fairness_overview || {}
  const rec = dashboard.ai_recommendation || {}
  const completeness = dashboard.evidence_completeness || {}
  const explain = dashboard.explainability || {}
  const customer = dashboard.customer_argument || {}
  const merchant = dashboard.merchant_argument || {}
  const evidenceRecs = dashboard.evidence_recommendations || []
  const rescoreHistory = dashboard.rescoring_history || []
  const finalDecision = dashboard.final_decision
  const readiness = dashboard.resolution_readiness
  const humanReviewRequired = dashboard.human_review_required

  const openRecs = evidenceRecs.filter((r) => r.status === 'open' || r.status === 'requested')
  const lastRescore = rescoreHistory[0]

  return (
    <div className="space-y-5 p-1">
      {/* Readiness banner */}
      <div className={`rounded-lg border px-4 py-3 flex items-center justify-between gap-3 ${
        finalDecision
          ? 'bg-green-50 border-green-200'
          : readiness === 'ready_for_decision'
          ? 'bg-indigo-50 border-indigo-200'
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-center gap-2">
          {finalDecision
            ? <CheckCircle className="w-5 h-5 text-green-600" />
            : readiness === 'ready_for_decision'
            ? <TrendingUp className="w-5 h-5 text-indigo-600" />
            : <AlertTriangle className="w-5 h-5 text-yellow-600" />
          }
          <p className="text-sm font-medium text-gray-800">
            {finalDecision
              ? 'Final decision has been recorded.'
              : readiness === 'ready_for_decision'
              ? 'This case is ready for a final decision.'
              : `Resolution readiness: ${String(readiness || 'not_ready').replace(/_/g, ' ')}`
            }
          </p>
        </div>
        {!finalDecision && (
          <button
            onClick={() => navigate(`/resolution/${caseId}/decision`)}
            className="flex items-center gap-1 text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 flex-shrink-0"
          >
            Make Decision <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {humanReviewRequired && !finalDecision && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Human review is recommended before making a final decision.
        </div>
      )}

      {/* Key metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1">
            <Scale className="w-3 h-3" /> Fairness Score
          </p>
          <p className={`text-2xl font-bold ${scoreColor(fairness.fairness_score)}`}>
            {fairness.fairness_score != null ? `${fairness.fairness_score.toFixed(1)}%` : '—'}
          </p>
          {fairness.fairness_score != null && (
            <ScoreBar score={fairness.fairness_score} height="h-1" />
          )}
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1">
            <Brain className="w-3 h-3" /> AI Confidence
          </p>
          <p className="text-2xl font-bold text-gray-800">
            {rec.confidence != null
              ? `${(rec.confidence > 1 ? rec.confidence : rec.confidence * 100).toFixed(1)}%`
              : '—'}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-400 mb-1">Evidence</p>
          <p className="text-2xl font-bold text-gray-800">{completeness.total_evidence ?? 0}</p>
          <p className="text-xs text-gray-400">items collected</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-400 mb-1">Rescores</p>
          <p className="text-2xl font-bold text-gray-800">{rescoreHistory.length}</p>
          <p className="text-xs text-gray-400">events</p>
        </div>
      </div>

      {/* AI Recommendation */}
      <Card title="AI Recommendation" icon={Brain} color="border-indigo-200">
        {rec.available === false ? (
          <p className="text-sm text-gray-400">{rec.message || 'Not yet available'}</p>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-base font-bold text-indigo-700">{formatOutcome(rec.recommended_outcome)}</span>
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Advisory only</span>
            </div>
            {rec.rationale && (
              <p className="text-xs text-gray-600 leading-relaxed">{rec.rationale}</p>
            )}
          </>
        )}
      </Card>

      {/* Arguments side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Card title="Customer Advocate" icon={Users} color="border-blue-200">
          {customer.claim ? (
            <>
              <p className="text-xs text-gray-600 leading-relaxed mb-2">{customer.claim}</p>
              <ListItems items={customer.supporting_evidence} icon={CheckCircle} iconColor="text-green-400" />
            </>
          ) : (
            <p className="text-xs text-gray-400">No customer argument available</p>
          )}
        </Card>
        <Card title="Merchant Advocate" icon={Users} color="border-orange-200">
          {merchant.claim ? (
            <>
              <p className="text-xs text-gray-600 leading-relaxed mb-2">{merchant.claim}</p>
              <ListItems items={merchant.supporting_evidence} icon={CheckCircle} iconColor="text-green-400" />
            </>
          ) : (
            <p className="text-xs text-gray-400">No merchant argument available</p>
          )}
        </Card>
      </div>

      {/* Explainability */}
      {(explain.summary || explain.key_factors?.length > 0) && (
        <Card title="AI Explainability" icon={ClipboardList}>
          {explain.summary && (
            <p className="text-xs text-gray-600 leading-relaxed mb-3">{explain.summary}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Key Factors:</p>
              <ListItems items={explain.key_factors} />
            </div>
            {explain.unresolved_issues?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-orange-600 mb-1">Unresolved Issues:</p>
                <ListItems items={explain.unresolved_issues} icon={AlertTriangle} iconColor="text-orange-400" color="text-gray-600" />
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Missing / Contradictory Evidence */}
      {(completeness.missing_evidence?.length > 0 || completeness.contradictory_evidence?.length > 0) && (
        <Card title="Evidence Gaps" icon={AlertTriangle} color="border-red-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {completeness.missing_evidence?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-red-600 mb-1">Missing Evidence:</p>
                <ListItems items={completeness.missing_evidence} icon={AlertTriangle} iconColor="text-red-400" color="text-gray-600" />
              </div>
            )}
            {completeness.contradictory_evidence?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-orange-600 mb-1">Contradictions:</p>
                <ListItems items={completeness.contradictory_evidence} icon={AlertTriangle} iconColor="text-orange-400" color="text-gray-600" />
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Open evidence requests */}
      {openRecs.length > 0 && (
        <Card title={`Open Evidence Requests (${openRecs.length})`} icon={FileText} color="border-yellow-200">
          <ul className="space-y-2">
            {openRecs.map((r) => (
              <li key={r.id} className="text-xs flex items-start gap-2">
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                  r.priority === 'critical' ? 'bg-red-100 text-red-700' :
                  r.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>{r.priority}</span>
                <span className="text-gray-700">{r.description}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Final Decision (if already made) */}
      {finalDecision && (
        <Card title="Final Decision" icon={CheckCircle} color="border-green-200">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-400">Outcome</p>
              <p className="text-sm font-bold text-green-700">{formatOutcome(finalDecision.outcome)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Type</p>
              <p className="text-sm font-medium capitalize text-gray-700">{finalDecision.decision_type}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Recorded At</p>
              <p className="text-sm text-gray-600">{formatDateTime(finalDecision.created_at)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">AI Rec at Decision</p>
              <p className="text-sm text-gray-600">{formatOutcome(finalDecision.ai_recommendation_at_decision)}</p>
            </div>
          </div>
          {finalDecision.rationale && (
            <p className="text-xs text-gray-600 mt-3 leading-relaxed border-t border-gray-100 pt-3">
              {finalDecision.rationale}
            </p>
          )}
        </Card>
      )}
    </div>
  )
}
