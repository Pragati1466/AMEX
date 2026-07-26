import { useOutletContext } from 'react-router-dom'
import { Scale, Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Minus } from 'lucide-react'
import ScoreBar from '../shared/ScoreBar'
import LoadingSkeleton from '../shared/LoadingSkeleton'
import { formatPct, formatOutcome, scoreColor } from '../../utils/formatters'

function ArgumentCard({ title, data, color }) {
  if (!data) return null
  return (
    <div className={`rounded-lg border p-4 ${color}`}>
      <h4 className="text-sm font-semibold text-gray-800 mb-2">{title}</h4>
      {data.claim && <p className="text-xs text-gray-600 mb-3 leading-relaxed">{data.claim}</p>}
      {data.supporting_evidence?.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Supporting Evidence:</p>
          <ul className="space-y-0.5">
            {data.supporting_evidence.slice(0, 4).map((e, i) => (
              <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" /> {e}
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.confidence != null && (
        <p className="text-xs text-gray-400 mt-2">Confidence: {data.confidence}%</p>
      )}
    </div>
  )
}

export default function LiveFairnessDashboard() {
  const { dashboard } = useOutletContext()

  if (!dashboard) {
    return <div className="p-6"><LoadingSkeleton rows={8} /></div>
  }

  const fairness = dashboard.fairness_overview || {}
  const rec = dashboard.ai_recommendation || {}
  const completeness = dashboard.evidence_completeness || {}
  const explain = dashboard.explainability || {}
  const customer = dashboard.customer_argument || {}
  const merchant = dashboard.merchant_argument || {}
  const rescoreHistory = dashboard.rescoring_history || []
  const lastRescore = rescoreHistory[0] || null

  const scoreDelta = lastRescore?.score_change
  const ScoreDeltaIcon = scoreDelta == null ? Minus : scoreDelta > 0 ? TrendingUp : TrendingDown
  const scoreDeltaColor = scoreDelta == null ? 'text-gray-400' : scoreDelta > 0 ? 'text-green-600' : 'text-red-600'

  return (
    <div className="space-y-5 p-1">
      {/* Fairness Score Hero */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-2">
              <Scale className="w-4 h-4 text-indigo-500" /> Live Fairness Score
            </h2>
            {fairness.available === false ? (
              <p className="text-gray-400 text-sm">{fairness.message || 'Not yet calculated'}</p>
            ) : (
              <>
                <div className={`text-5xl font-bold ${scoreColor(fairness.fairness_score)} leading-none`}>
                  {fairness.fairness_score != null ? `${fairness.fairness_score.toFixed(1)}%` : '—'}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <ScoreDeltaIcon className={`w-4 h-4 ${scoreDeltaColor}`} />
                  <span className={`text-sm font-medium ${scoreDeltaColor}`}>
                    {scoreDelta != null ? `${scoreDelta > 0 ? '+' : ''}${scoreDelta.toFixed(1)} from last rescore` : 'No prior rescore'}
                  </span>
                </div>
              </>
            )}
          </div>
          <div className="space-y-2 min-w-48">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-blue-600">Customer Balance</span>
                <span className="font-medium">{formatPct(fairness.customer_balance)}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${fairness.customer_balance != null ? Math.min(100, fairness.customer_balance > 1 ? fairness.customer_balance : fairness.customer_balance * 100) : 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-orange-600">Merchant Balance</span>
                <span className="font-medium">{formatPct(fairness.merchant_balance)}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full"
                  style={{ width: `${fairness.merchant_balance != null ? Math.min(100, fairness.merchant_balance > 1 ? fairness.merchant_balance : fairness.merchant_balance * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        {fairness.score_explanation && (
          <p className="text-xs text-gray-500 mt-4 border-t border-gray-100 pt-3 leading-relaxed">
            {fairness.score_explanation}
          </p>
        )}
      </div>

      {/* AI Recommendation */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Brain className="w-4 h-4 text-indigo-500" /> AI Recommendation
          <span className="ml-auto text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
            Advisory only — final decision is yours
          </span>
        </h3>
        {rec.available === false ? (
          <p className="text-sm text-gray-400">{rec.message || 'Not yet available'}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-indigo-50 rounded-lg p-3">
              <p className="text-xs text-indigo-500 mb-1">Recommendation</p>
              <p className="text-sm font-bold text-indigo-800">{formatOutcome(rec.recommended_outcome)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Confidence</p>
              <div className="text-sm font-bold text-gray-800">
                {rec.confidence != null ? `${(rec.confidence > 1 ? rec.confidence : rec.confidence * 100).toFixed(1)}%` : '—'}
              </div>
              {rec.confidence != null && (
                <ScoreBar score={rec.confidence > 1 ? rec.confidence : rec.confidence * 100} height="h-1" />
              )}
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <p className="text-sm font-semibold capitalize text-gray-700">
                {rec.recommendation_status?.replace(/_/g, ' ') || '—'}
              </p>
            </div>
          </div>
        )}
        {rec.rationale && (
          <p className="text-xs text-gray-600 mt-3 leading-relaxed border-t border-gray-100 pt-3">
            {rec.rationale}
          </p>
        )}
      </div>

      {/* Evidence Completeness */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Evidence Completeness</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Completeness</span>
              <span className="font-medium">
                {completeness.completeness_pct != null ? `${completeness.completeness_pct.toFixed(1)}%` : '—'}
              </span>
            </div>
            <ScoreBar score={completeness.completeness_pct} height="h-3" />
            <p className="text-xs text-gray-400 mt-1">Total evidence items: {completeness.total_evidence ?? 0}</p>
          </div>
          <div className="space-y-2">
            {completeness.missing_evidence?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-red-600 mb-1">Missing Evidence:</p>
                <ul className="space-y-0.5">
                  {completeness.missing_evidence.slice(0, 4).map((m, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" /> {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {completeness.contradictory_evidence?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-orange-600 mb-1">Contradictions:</p>
                <ul className="space-y-0.5">
                  {completeness.contradictory_evidence.slice(0, 3).map((c, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 text-orange-400 flex-shrink-0 mt-0.5" /> {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Arguments */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <ArgumentCard title="Customer Advocate" data={customer} color="border-blue-200 bg-blue-50" />
        <ArgumentCard title="Merchant Advocate" data={merchant} color="border-orange-200 bg-orange-50" />
      </div>

      {/* Explainability */}
      {explain.available !== false && (explain.summary || explain.key_factors?.length > 0) && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">AI Explainability</h3>
          {explain.summary && (
            <p className="text-xs text-gray-600 leading-relaxed mb-3">{explain.summary}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {explain.key_factors?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Key Factors:</p>
                <ul className="space-y-0.5">
                  {explain.key_factors.map((f, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                      <span className="text-indigo-400 font-bold mt-0.5">•</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {explain.supporting_evidence?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-green-600 mb-1">Supporting Evidence:</p>
                <ul className="space-y-0.5">
                  {explain.supporting_evidence.slice(0, 4).map((e, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                      <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" /> {e}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {explain.contradictory_evidence?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-red-600 mb-1">Contradictory Evidence:</p>
                <ul className="space-y-0.5">
                  {explain.contradictory_evidence.slice(0, 3).map((e, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" /> {e}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {explain.unresolved_issues?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-orange-600 mb-1">Unresolved Issues:</p>
                <ul className="space-y-0.5">
                  {explain.unresolved_issues.slice(0, 3).map((u, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 text-orange-400 flex-shrink-0 mt-0.5" /> {u}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
