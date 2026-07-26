import { useState, useCallback, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { FileText, Download, RefreshCw, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'
import { generateReport, getReport } from '../../services/reportApi'
import LoadingSkeleton from '../shared/LoadingSkeleton'
import ErrorState from '../shared/ErrorState'
import EmptyState from '../shared/EmptyState'
import { formatDateTime, formatOutcome } from '../../utils/formatters'

function JsonSection({ title, data, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  if (!data) return null
  return (
    <div className="diq-card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors"
        style={{
          background: 'var(--color-surface-muted)',
          color: 'var(--color-text-secondary)',
          borderBottom: open ? '1px solid var(--color-border)' : 'none',
        }}
      >
        {title}
        {open
          ? <ChevronDown className="w-4 h-4" />
          : <ChevronRight className="w-4 h-4" />
        }
      </button>
      {open && (
        <pre
          className="px-4 py-3 text-xs leading-relaxed overflow-x-auto max-h-96 overflow-y-auto"
          style={{ color: 'var(--color-text-secondary)', background: 'var(--color-surface-card)' }}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  )
}

function ReportSection({ title, children }) {
  return (
    <div className="diq-card">
      <div className="diq-card-header">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </h3>
      </div>
      <div className="diq-card-body">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="diq-info-row">
      <span className="diq-info-label">{label}</span>
      <span className="diq-info-value">{value ?? '—'}</span>
    </div>
  )
}

export default function ReportCenter() {
  const { caseId } = useOutletContext()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState(null)
  const [generated, setGenerated] = useState(false)

  const fetchExisting = useCallback(async () => {
    setFetching(true)
    setError(null)
    try {
      const data = await getReport(caseId)
      setReport(data)
      setGenerated(false)
    } catch (e) {
      if (e?.response?.status === 404) {
        setReport(null)
      } else {
        setError(e?.response?.data?.detail || e.message || 'Failed to fetch report')
      }
    } finally {
      setFetching(false)
    }
  }, [caseId])

  useEffect(() => { fetchExisting() }, [fetchExisting])

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await generateReport(caseId)
      setReport(data)
      setGenerated(true)
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'Report generation failed')
    } finally {
      setLoading(false)
    }
  }

  const handleExportJson = () => {
    if (!report) return
    const blob = new Blob([JSON.stringify(report.report_content, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report-${report.report_id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    window.print()
  }

  const rc = report?.report_content || {}
  const dashboard = rc.dashboard_summary || {}
  const rec = rc.recommendation || {}
  const finalDecision = rc.final_decision

  return (
    <div className="space-y-5 p-1">
      {/* Header + actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-base font-semibold flex items-center gap-2"
          style={{ color: 'var(--color-text-primary)' }}>
          <FileText className="w-5 h-5" style={{ color: 'var(--color-navy-500)' }} />
          Report Center
        </h2>
        <div className="flex gap-2">
          <button
            onClick={fetchExisting}
            disabled={fetching}
            className="diq-btn diq-btn-outline diq-btn-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${fetching ? 'animate-spin' : ''}`} />
            Load Latest
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="diq-btn diq-btn-primary diq-btn-sm"
          >
            <FileText className="w-3.5 h-3.5" />
            {loading ? 'Generating…' : 'Generate Report'}
          </button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="diq-alert diq-alert-danger">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Success alert */}
      {generated && (
        <div className="diq-alert diq-alert-success">
          <span>
            Report generated successfully: <strong>{report?.report_id}</strong>
          </span>
        </div>
      )}

      {/* Loading skeleton */}
      {fetching && (
        <div className="diq-card diq-card-body">
          <LoadingSkeleton rows={4} />
        </div>
      )}

      {/* Empty state */}
      {!fetching && !report && (
        <div className="diq-card">
          <EmptyState
            message="No report generated yet. Click 'Generate Report' to create one."
            icon={<FileText className="w-6 h-6" style={{ color: 'var(--color-text-muted)' }} />}
          />
        </div>
      )}

      {/* Report content */}
      {report && !fetching && (
        <>
          {/* Report metadata */}
          <ReportSection title="Report Info">
            <div className="space-y-1 mb-4">
              <InfoRow label="Report ID" value={report.report_id} />
              <InfoRow label="Case ID" value={report.case_id} />
              <InfoRow label="Generated At" value={formatDateTime(report.generated_at)} />
            </div>
            <div className="flex gap-2 flex-wrap mb-4">
              <button onClick={handleExportJson} className="diq-btn diq-btn-outline diq-btn-sm">
                <Download className="w-3.5 h-3.5" /> Export JSON
              </button>
              <button onClick={handlePrint} className="diq-btn diq-btn-outline diq-btn-sm">
                <Download className="w-3.5 h-3.5" /> Print / PDF
              </button>
            </div>
            <div className="diq-alert diq-alert-warning">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              PDF export is client-side only (browser print). The backend stores the report as JSON.
            </div>
          </ReportSection>

          {/* Case summary */}
          {dashboard.case_header && (
            <ReportSection title="Case Summary">
              <InfoRow label="Dispute ID" value={dashboard.case_header.dispute_external_id} />
              <InfoRow
                label="Reason"
                value={String(dashboard.case_header.dispute_reason || '').replace(/_/g, ' ')}
              />
              <InfoRow label="Amount" value={dashboard.case_header.amount} />
              <InfoRow label="Filed At" value={formatDateTime(dashboard.case_header.filed_at)} />
              <InfoRow label="Status" value={dashboard.case_header.dispute_status} />
            </ReportSection>
          )}

          {/* AI Recommendation */}
          {rec.recommended_outcome && (
            <ReportSection title="AI Recommendation">
              <InfoRow label="Outcome" value={formatOutcome(rec.recommended_outcome)} />
              <InfoRow
                label="Fairness Score"
                value={rec.fairness_score != null ? `${rec.fairness_score.toFixed(1)}%` : null}
              />
              <InfoRow
                label="Confidence"
                value={rec.confidence != null
                  ? `${(rec.confidence > 1 ? rec.confidence : rec.confidence * 100).toFixed(1)}%`
                  : null}
              />
              {rec.recommendation_rationale && (
                <p className="text-xs mt-3 leading-relaxed"
                  style={{ color: 'var(--color-text-secondary)' }}>
                  {rec.recommendation_rationale}
                </p>
              )}
              {rec.unresolved_issues?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-amber-700)' }}>
                    Unresolved Issues:
                  </p>
                  <ul className="space-y-0.5">
                    {rec.unresolved_issues.map((u, i) => (
                      <li key={i} className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        • {u}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </ReportSection>
          )}

          {/* Final Decision */}
          {finalDecision && (
            <ReportSection title="Final Decision">
              <InfoRow label="Outcome" value={formatOutcome(finalDecision.outcome)} />
              <InfoRow label="Decision Type" value={finalDecision.decision_type} />
              <InfoRow label="Recorded At" value={formatDateTime(finalDecision.created_at)} />
              <InfoRow
                label="AI Rec at Decision"
                value={formatOutcome(finalDecision.ai_recommendation_at_decision)}
              />
              {finalDecision.rationale && (
                <p className="text-xs mt-3 leading-relaxed"
                  style={{ color: 'var(--color-text-secondary)' }}>
                  {finalDecision.rationale}
                </p>
              )}
            </ReportSection>
          )}

          {/* Rescoring summary */}
          {rc.rescoring_history_count != null && (
            <ReportSection title="Re-Scoring Summary">
              <InfoRow label="Re-scoring events" value={rc.rescoring_history_count} />
            </ReportSection>
          )}

          {/* Full JSON viewer */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
              Full Report Data
            </h3>
            <JsonSection title="Dashboard Summary" data={rc.dashboard_summary} />
            <JsonSection title="Recommendation" data={rc.recommendation} />
            <JsonSection title="Final Decision" data={rc.final_decision} />
          </div>
        </>
      )}
    </div>
  )
}
