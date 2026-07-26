import { useOutletContext } from 'react-router-dom'
import { User, Store, CreditCard, FileText, CheckCircle, AlertTriangle, Clock } from 'lucide-react'
import LoadingSkeleton from '../shared/LoadingSkeleton'
import ScoreBar from '../shared/ScoreBar'
import StatusBadge from '../shared/StatusBadge'
import {
  formatDate, formatDateTime, formatPct, formatOutcome, formatReadiness,
  scoreColor, disputeStatusColor, recommendationStatusColor,
} from '../../utils/formatters'

function InfoRow({ label, value }) {
  return (
    <div className="diq-info-row">
      <span className="diq-info-label">{label}</span>
      <span className="diq-info-value">{value || '—'}</span>
    </div>
  )
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="diq-card">
      <div className="diq-card-header">
        {Icon && <Icon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-navy-500)' }} />}
        <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </h3>
      </div>
      <div className="diq-card-body">{children}</div>
    </div>
  )
}

export default function CaseOverview() {
  const { dashboard, caseId } = useOutletContext()

  if (!dashboard) {
    return <div className="p-6"><LoadingSkeleton rows={8} /></div>
  }

  const header = dashboard.case_header || {}
  const fairness = dashboard.fairness_overview || {}
  const rec = dashboard.ai_recommendation || {}
  const completeness = dashboard.evidence_completeness || {}
  const decision = dashboard.final_decision

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 p-1">
      {/* Left column */}
      <div className="space-y-5 lg:col-span-2">
        {/* Dispute Info */}
        <Section title="Dispute Information" icon={FileText}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <InfoRow label="Dispute ID" value={header.dispute_external_id} />
              <InfoRow label="Reason" value={String(header.dispute_reason || '').replace(/_/g, ' ')} />
              <InfoRow
                label="Amount"
                value={header.amount
                  ? `${header.currency || 'USD'} ${Number(header.amount).toLocaleString()}`
                  : null}
              />
              <InfoRow label="Filed At" value={formatDateTime(header.filed_at)} />
              <InfoRow
                label="Status"
                value={
                  <StatusBadge
                    label={String(header.dispute_status || '').toUpperCase().replace('_', ' ')}
                    colorClass={disputeStatusColor(header.dispute_status)}
                  />
                }
              />
            </div>
            <div>
              <InfoRow label="Description" value={header.description} />
              <InfoRow label="Case File ID" value={header.case_file_id} />
              <InfoRow label="Investigation" value={header.investigation_status} />
              <InfoRow label="Resolved At" value={formatDateTime(header.resolved_at)} />
            </div>
          </div>
        </Section>

        {/* Customer */}
        <Section title="Customer" icon={User}>
          <InfoRow label="Name" value={header.customer_name} />
          <InfoRow label="Email" value={header.customer_email} />
          <InfoRow label="Customer ID" value={header.customer_id} />
          <InfoRow
            label="Verified"
            value={header.customer_verified != null ? (header.customer_verified ? 'Yes' : 'No') : null}
          />
        </Section>

        {/* Merchant */}
        <Section title="Merchant" icon={Store}>
          <InfoRow label="Business Name" value={header.merchant_name} />
          <InfoRow label="Email" value={header.merchant_email} />
          <InfoRow label="Merchant ID" value={header.merchant_id} />
        </Section>

        {/* Transaction */}
        <Section title="Transaction" icon={CreditCard}>
          <InfoRow label="Transaction ID" value={header.transaction_id} />
          <InfoRow
            label="Amount"
            value={header.amount
              ? `${header.currency || 'USD'} ${Number(header.amount).toLocaleString()}`
              : null}
          />
          <InfoRow label="Transaction Date" value={formatDateTime(header.transaction_date)} />
          <InfoRow label="Order ID" value={header.order_id} />
          <InfoRow label="Payment Method" value={header.payment_method} />
        </Section>
      </div>

      {/* Right column — summary */}
      <div className="space-y-5">
        {/* Fairness Score */}
        <Section title="Fairness Score" icon={CheckCircle}>
          {fairness.available === false ? (
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {fairness.message || 'Not yet available'}
            </p>
          ) : (
            <>
              <div className={`text-3xl font-bold tabular-nums mb-2 ${scoreColor(fairness.fairness_score)}`}
                style={{ letterSpacing: '-0.02em' }}>
                {fairness.fairness_score != null ? `${fairness.fairness_score.toFixed(1)}%` : '—'}
              </div>
              <ScoreBar score={fairness.fairness_score} height="h-3" showLabel={false} />
              {fairness.score_explanation && (
                <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  {fairness.score_explanation}
                </p>
              )}
              {fairness.confidence != null && (
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  AI Confidence: {formatPct(fairness.confidence)}
                </p>
              )}
            </>
          )}
        </Section>

        {/* AI Recommendation */}
        <Section title="AI Recommendation" icon={AlertTriangle}>
          {rec.available === false ? (
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {rec.message || 'Not yet available'}
            </p>
          ) : (
            <>
              <div className="text-sm font-semibold mb-2" style={{ color: 'var(--color-navy-700)' }}>
                {formatOutcome(rec.recommended_outcome)}
              </div>
              <StatusBadge
                label={rec.recommendation_status || 'pending'}
                colorClass={recommendationStatusColor(rec.recommendation_status)}
              />
              {rec.rationale && (
                <p className="text-xs mt-3 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  {rec.rationale}
                </p>
              )}
              {rec.human_review_required && (
                <p
                  className="text-xs mt-2 flex items-center gap-1"
                  style={{ color: 'var(--color-amber-700)' }}
                >
                  <AlertTriangle className="w-3 h-3" />
                  Human review required
                </p>
              )}
            </>
          )}
        </Section>

        {/* Evidence Completeness */}
        <Section title="Evidence Completeness" icon={Clock}>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--color-text-muted)' }}>Completeness</span>
              <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {completeness.completeness_pct != null
                  ? `${completeness.completeness_pct.toFixed(1)}%`
                  : '—'}
              </span>
            </div>
            <ScoreBar score={completeness.completeness_pct} />
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--color-text-muted)' }}>Total Evidence</span>
              <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {completeness.total_evidence ?? 0}
              </span>
            </div>
            {completeness.missing_evidence?.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-red-600)' }}>
                  Missing:
                </p>
                <ul className="space-y-0.5">
                  {completeness.missing_evidence.slice(0, 5).map((m, i) => (
                    <li key={i} className="text-xs flex items-start gap-1"
                      style={{ color: 'var(--color-text-secondary)' }}>
                      <span style={{ color: 'var(--color-red-400)' }} className="mt-0.5">•</span> {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {completeness.critical_gaps?.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-amber-700)' }}>
                  Critical Gaps:
                </p>
                <ul className="space-y-0.5">
                  {completeness.critical_gaps.slice(0, 3).map((g, i) => (
                    <li key={i} className="text-xs flex items-start gap-1"
                      style={{ color: 'var(--color-text-secondary)' }}>
                      <span style={{ color: 'var(--color-amber-500)' }} className="mt-0.5">•</span> {g}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>

        {/* Final Decision (if made) */}
        {decision && (
          <Section title="Final Decision" icon={CheckCircle}>
            <div className="space-y-1">
              <div className="text-sm font-semibold" style={{ color: 'var(--color-green-700)' }}>
                {formatOutcome(decision.outcome)}
              </div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                <span className="capitalize">{decision.decision_type}</span>
                {' · '}{formatDateTime(decision.created_at)}
              </div>
              {decision.rationale && (
                <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  {decision.rationale}
                </p>
              )}
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}
