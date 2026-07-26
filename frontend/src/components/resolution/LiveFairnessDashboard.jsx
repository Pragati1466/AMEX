import { useOutletContext } from 'react-router-dom'
import { Scale, Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Minus } from 'lucide-react'
import ScoreBar from '../shared/ScoreBar'
import LoadingSkeleton from '../shared/LoadingSkeleton'
import { formatPct, formatOutcome, scoreColor } from '../../utils/formatters'

function ArgumentCard({ title, data, accentClass }) {
  if (!data) return null
  return (
    <div className={`diq-card border-l-4 ${accentClass}`}>
      <div className="diq-card-body">
        <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </h4>
        {data.claim && (
          <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            {data.claim}
          </p>
        )}
        {data.supporting_evidence?.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
              Supporting Evidence:
            </p>
            <ul className="space-y-0.5">
              {data.supporting_evidence.slice(0, 4).map((e, i) => (
                <li key={i} className="text-xs flex items-start gap-1.5"
                  style={{ color: 'var(--color-text-secondary)' }}>
                  <CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5"
                    style={{ color: 'var(--color-green-500)' }} />
                  {e}
                </li>
              ))}
            </ul>
          </div>
        )}
        {data.confidence != null && (
          <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
            Confidence: {data.confidence}%
          </p>
        )}
      </div>
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
  const scoreDeltaColor = scoreDelta == null
    ? 'var(--color-text-muted)'
    : scoreDelta > 0
    ? 'var(--color-green-600)'
    : 'var(--color-red-600)'

  const balancePct = (val) =>
    val != null ? Math.min(100, val > 1 ? val : val * 100) : 0

  return (
    <div className="space-y-5 p-1">
      {/* Fairness Score Hero */}
      <div className="diq-card">
        <div className="diq-card-body">
          <div className="flex items-start justify-between flex-wrap gap-4">
            {/* Score side */}
            <div>
              <h2
                className="text-xs font-semibold uppercase tracking-widest mb-2 flex items-center gap-2"
                style={{ color: 'var(--color-text-muted)', letterSpacing: '0.08em' }}
              >
                <Scale className="w-4 h-4" style={{ color: 'var(--color-navy-500)' }} />
                Live Fairness Score
              </h2>
              {fairness.available === false ? (
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {fairness.message || 'Not yet calculated'}
                </p>
              ) : (
                <>
                  <div
                    className={`text-5xl font-bold diq-fairness-score leading-none ${scoreColor(fairness.fairness_score)}`}
                  >
                    {fairness.fairness_score != null
                      ? `${fairness.fairness_score.toFixed(1)}%`
                      : '—'}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <ScoreDeltaIcon className="w-4 h-4" style={{ color: scoreDeltaColor }} />
                    <span className="text-sm font-medium" style={{ color: scoreDeltaColor }}>
                      {scoreDelta != null
                        ? `${scoreDelta > 0 ? '+' : ''}${scoreDelta.toFixed(1)} from last rescore`
                        : 'No prior rescore'}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Balance bars */}
            <div className="space-y-3 min-w-48">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium" style={{ color: 'var(--color-blue-600)' }}>
                    Customer Balance
                  </span>
                  <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {formatPct(fairness.customer_balance)}
                  </span>
                </div>
                <div className="diq-score-track h-2">
                  <div
                    className="diq-score-fill h-2"
                    style={{
                      width: `${balancePct(fairness.customer_balance)}%`,
                      background: 'linear-gradient(90deg, var(--color-blue-500), var(--color-blue-400))',
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium" style={{ color: 'var(--color-amber-700)' }}>
                    Merchant Balance
                  </span>
                  <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {formatPct(fairness.merchant_balance)}
                  </span>
                </div>
                <div className="diq-score-track h-2">
                  <div
                    className="diq-score-fill h-2"
                    style={{
                      width: `${balancePct(fairness.merchant_balance)}%`,
                      background: 'linear-gradient(90deg, var(--color-amber-500), #fb923c)',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {fairness.score_explanation && (
            <p
              className="text-xs mt-4 leading-relaxed pt-3"
              style={{
                color: 'var(--color-text-secondary)',
                borderTop: '1px solid var(--color-border)',
              }}
            >
              {fairness.score_explanation}
            </p>
          )}
        </div>
      </div>

      {/* AI Recommendation */}
      <div className="diq-card">
        <div className="diq-card-header" style={{ justifyContent: 'space-between' }}>
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4" style={{ color: 'var(--color-violet-600)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              AI Recommendation
            </h3>
          </div>
          <span className="diq-badge diq-badge-amber">Advisory only — final decision is yours</span>
        </div>
        <div className="diq-card-body">
          {rec.available === false ? (
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {rec.message || 'Not yet available'}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div
                className="rounded-lg p-3"
                style={{ background: 'var(--color-navy-50)', border: '1px solid var(--color-navy-100)' }}
              >
                <p className="text-xs mb-1" style={{ color: 'var(--color-navy-500)' }}>
                  Recommendation
                </p>
                <p className="text-sm font-bold" style={{ color: 'var(--color-navy-800)' }}>
                  {formatOutcome(rec.recommended_outcome)}
                </p>
              </div>
              <div
                className="rounded-lg p-3"
                style={{ background: 'var(--color-surface-muted)', border: '1px solid var(--color-border)' }}
              >
                <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Confidence</p>
                <div className="text-sm font-bold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
                  {rec.confidence != null
                    ? `${(rec.confidence > 1 ? rec.confidence : rec.confidence * 100).toFixed(1)}%`
                    : '—'}
                </div>
                {rec.confidence != null && (
                  <ScoreBar
                    score={rec.confidence > 1 ? rec.confidence : rec.confidence * 100}
                    height="h-1"
                  />
                )}
              </div>
              <div
                className="rounded-lg p-3"
                style={{ background: 'var(--color-surface-muted)', border: '1px solid var(--color-border)' }}
              >
                <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Status</p>
                <p className="text-sm font-semibold capitalize" style={{ color: 'var(--color-text-secondary)' }}>
                  {rec.recommendation_status?.replace(/_/g, ' ') || '—'}
                </p>
              </div>
            </div>
          )}
          {rec.rationale && (
            <p
              className="text-xs mt-3 leading-relaxed pt-3"
              style={{
                color: 'var(--color-text-secondary)',
                borderTop: '1px solid var(--color-border)',
              }}
            >
              {rec.rationale}
            </p>
          )}
        </div>
      </div>

      {/* Evidence Completeness */}
      <div className="diq-card">
        <div className="diq-card-header">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Evidence Completeness
          </h3>
        </div>
        <div className="diq-card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span style={{ color: 'var(--color-text-secondary)' }}>Completeness</span>
                <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {completeness.completeness_pct != null
                    ? `${completeness.completeness_pct.toFixed(1)}%`
                    : '—'}
                </span>
              </div>
              <ScoreBar score={completeness.completeness_pct} height="h-3" />
              <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
                Total evidence items: {completeness.total_evidence ?? 0}
              </p>
            </div>
            <div className="space-y-3">
              {completeness.missing_evidence?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-red-600)' }}>
                    Missing Evidence:
                  </p>
                  <ul className="space-y-0.5">
                    {completeness.missing_evidence.slice(0, 4).map((m, i) => (
                      <li key={i} className="text-xs flex items-start gap-1.5"
                        style={{ color: 'var(--color-text-secondary)' }}>
                        <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5"
                          style={{ color: 'var(--color-red-400)' }} />
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {completeness.contradictory_evidence?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-amber-700)' }}>
                    Contradictions:
                  </p>
                  <ul className="space-y-0.5">
                    {completeness.contradictory_evidence.slice(0, 3).map((c, i) => (
                      <li key={i} className="text-xs flex items-start gap-1.5"
                        style={{ color: 'var(--color-text-secondary)' }}>
                        <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5"
                          style={{ color: 'var(--color-amber-500)' }} />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Arguments */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <ArgumentCard
          title="Customer Advocate"
          data={customer}
          accentClass="border-blue-300"
        />
        <ArgumentCard
          title="Merchant Advocate"
          data={merchant}
          accentClass="border-amber-300"
        />
      </div>

      {/* Explainability */}
      {explain.available !== false && (explain.summary || explain.key_factors?.length > 0) && (
        <div className="diq-card">
          <div className="diq-card-header">
            <Brain className="w-4 h-4" style={{ color: 'var(--color-violet-600)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              AI Explainability
            </h3>
          </div>
          <div className="diq-card-body space-y-4">
            {explain.summary && (
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {explain.summary}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {explain.key_factors?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Key Factors:
                  </p>
                  <ul className="space-y-0.5">
                    {explain.key_factors.map((f, i) => (
                      <li key={i} className="text-xs flex items-start gap-1.5"
                        style={{ color: 'var(--color-text-secondary)' }}>
                        <span className="font-bold mt-0.5" style={{ color: 'var(--color-navy-400)' }}>•</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {explain.supporting_evidence?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-green-600)' }}>
                    Supporting Evidence:
                  </p>
                  <ul className="space-y-0.5">
                    {explain.supporting_evidence.slice(0, 4).map((e, i) => (
                      <li key={i} className="text-xs flex items-start gap-1.5"
                        style={{ color: 'var(--color-text-secondary)' }}>
                        <CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5"
                          style={{ color: 'var(--color-green-500)' }} />
                        {e}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {explain.contradictory_evidence?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-red-600)' }}>
                    Contradictory Evidence:
                  </p>
                  <ul className="space-y-0.5">
                    {explain.contradictory_evidence.slice(0, 3).map((e, i) => (
                      <li key={i} className="text-xs flex items-start gap-1.5"
                        style={{ color: 'var(--color-text-secondary)' }}>
                        <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5"
                          style={{ color: 'var(--color-red-400)' }} />
                        {e}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {explain.unresolved_issues?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-amber-700)' }}>
                    Unresolved Issues:
                  </p>
                  <ul className="space-y-0.5">
                    {explain.unresolved_issues.slice(0, 3).map((u, i) => (
                      <li key={i} className="text-xs flex items-start gap-1.5"
                        style={{ color: 'var(--color-text-secondary)' }}>
                        <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5"
                          style={{ color: 'var(--color-amber-500)' }} />
                        {u}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
