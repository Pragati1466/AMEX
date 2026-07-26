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
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700"
      >
        {title}
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {open && (
        <pre className="px-4 py-3 text-xs text-gray-600 bg-white overflow-x-auto leading-relaxed max-h-96 overflow-y-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  )
}

function ReportSection({ title, children }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-5 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-medium text-gray-800 text-right max-w-[60%]">{value ?? '—'}</span>
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

  // Load on first render
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

  // Client-side JSON export
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

  // Client-side text/print export (PDF via browser print dialog)
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
        <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-500" /> Report Center
        </h2>
        <div className="flex gap-2">
          <button
            onClick={fetchExisting}
            disabled={fetching}
            className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${fetching ? 'animate-spin' : ''}`} />
            Load Latest
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5" />
            {loading ? 'Generating…' : 'Generate Report'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {generated && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-center gap-2">
          Report generated successfully: <strong>{report?.report_id}</strong>
        </div>
      )}

      {fetching && <div className="bg-white rounded-lg border border-gray-200 p-6"><LoadingSkeleton rows={4} /></div>}

      {!fetching && !report && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <EmptyState
            message="No report generated yet. Click 'Generate Report' to create one."
            icon={<FileText className="w-12 h-12 opacity-30 mb-3" />}
          />
        </div>
      )}

      {report && !fetching && (
        <>
          {/* Report metadata */}
          <ReportSection title="Report Info">
            <div className="flex items-center justify-between mb-3">
              <div className="space-y-1">
                <InfoRow label="Report ID" value={report.report_id} />
                <InfoRow label="Case ID" value={report.case_id} />
                <InfoRow label="Generated At" value={formatDateTime(report.generated_at)} />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleExportJson}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
                >
                  <Download className="w-3.5 h-3.5" /> Export JSON
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
                >
                  <Download className="w-3.5 h-3.5" /> Print / PDF
                </button>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              PDF export is client-side only (browser print). The backend stores the report as JSON.
            </div>
          </ReportSection>

          {/* Case summary */}
          {dashboard.case_header && (
            <ReportSection title="Case Summary">
              <InfoRow label="Dispute ID" value={dashboard.case_header.dispute_external_id} />
              <InfoRow label="Reason" value={String(dashboard.case_header.dispute_reason || '').replace(/_/g, ' ')} />
              <InfoRow label="Amount" value={dashboard.case_header.amount} />
              <InfoRow label="Filed At" value={formatDateTime(dashboard.case_header.filed_at)} />
              <InfoRow label="Status" value={dashboard.case_header.dispute_status} />
            </ReportSection>
          )}

          {/* AI Recommendation */}
          {rec.recommended_outcome && (
            <ReportSection title="AI Recommendation">
              <InfoRow label="Outcome" value={formatOutcome(rec.recommended_outcome)} />
              <InfoRow label="Fairness Score" value={rec.fairness_score != null ? `${rec.fairness_score.toFixed(1)}%` : null} />
              <InfoRow label="Confidence" value={rec.confidence != null ? `${(rec.confidence > 1 ? rec.confidence : rec.confidence * 100).toFixed(1)}%` : null} />
              {rec.recommendation_rationale && (
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">{rec.recommendation_rationale}</p>
              )}
              {rec.unresolved_issues?.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-orange-600 mb-1">Unresolved Issues:</p>
                  <ul className="space-y-0.5">
                    {rec.unresolved_issues.map((u, i) => (
                      <li key={i} className="text-xs text-gray-600">• {u}</li>
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
              <InfoRow label="AI Rec at Decision" value={formatOutcome(finalDecision.ai_recommendation_at_decision)} />
              {finalDecision.rationale && (
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">{finalDecision.rationale}</p>
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
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Full Report Data</h3>
            <JsonSection title="Dashboard Summary" data={rc.dashboard_summary} />
            <JsonSection title="Recommendation" data={rc.recommendation} />
            <JsonSection title="Final Decision" data={rc.final_decision} />
          </div>
        </>
      )}
    </div>
  )
}
