import { useState, useEffect, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Users, Plus, Send, RefreshCw, CheckCircle, Clock, AlertTriangle, Zap } from 'lucide-react'
import {
  getCollaborationEvents,
  getEvidenceRecommendations,
  generateEvidenceRecommendations,
  requestEvidence,
  submitEvidence,
} from '../../services/resolutionApi'
import LoadingSkeleton from '../shared/LoadingSkeleton'
import ErrorState from '../shared/ErrorState'
import EmptyState from '../shared/EmptyState'
import StatusBadge from '../shared/StatusBadge'
import { formatDateTime, priorityColor } from '../../utils/formatters'

const STATUS_COLOR = {
  open: 'bg-blue-100 text-blue-700',
  requested: 'bg-yellow-100 text-yellow-700',
  submitted: 'bg-indigo-100 text-indigo-700',
  resolved: 'bg-green-100 text-green-700',
  dismissed: 'bg-gray-100 text-gray-500',
}

export default function CollaborationWorkspace() {
  const { caseId, reload: reloadDashboard } = useOutletContext()
  const [events, setEvents] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [requesting, setRequesting] = useState(null)
  const [showEvidenceForm, setShowEvidenceForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', file: null })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [evts, recs] = await Promise.all([
        getCollaborationEvents(caseId),
        getEvidenceRecommendations(caseId),
      ])
      setEvents(evts || [])
      setRecommendations(recs || [])
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'Failed to load collaboration data')
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => { load() }, [load])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await generateEvidenceRecommendations(caseId, true)
      await load()
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to generate recommendations')
    } finally {
      setGenerating(false)
    }
  }

  const handleRequest = async (recId) => {
    setRequesting(recId)
    try {
      await requestEvidence(caseId, recId)
      await load()
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to request evidence')
    } finally {
      setRequesting(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSubmitting(true)
    setSubmitMsg(null)
    try {
      const result = await submitEvidence(caseId, {
        title: form.title,
        description: form.description,
        file: form.file,
      })
      setSubmitMsg('Evidence submitted successfully. Re-scoring triggered automatically.')
      setForm({ title: '', description: '', file: null })
      setShowEvidenceForm(false)
      await load()
      reloadDashboard()
    } catch (e) {
      setSubmitMsg(e?.response?.data?.detail || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-6"><LoadingSkeleton rows={6} /></div>
  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-500" /> Collaboration Workspace
        </h2>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button
            onClick={() => setShowEvidenceForm((v) => !v)}
            className="flex items-center gap-1 text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700"
          >
            <Plus className="w-3.5 h-3.5" /> Submit Evidence
          </button>
        </div>
      </div>

      {submitMsg && (
        <div className={`text-sm px-4 py-3 rounded-lg border ${
          submitMsg.includes('success') || submitMsg.includes('triggered')
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {submitMsg}
        </div>
      )}

      {/* Evidence Submission Form */}
      {showEvidenceForm && (
        <div className="bg-white rounded-lg border border-indigo-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Send className="w-4 h-4 text-indigo-500" /> Submit Additional Evidence
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Shipping confirmation screenshot"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe the evidence…"
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">File (optional)</label>
              <input
                type="file"
                onChange={(e) => setForm((f) => ({ ...f, file: e.target.files[0] || null }))}
                className="text-sm text-gray-600"
              />
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" />
              Submitting evidence will automatically trigger re-scoring.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={submitting || !form.title.trim()}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit Evidence'}
              </button>
              <button
                type="button"
                onClick={() => setShowEvidenceForm(false)}
                className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Evidence Recommendations */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">
            Evidence Recommendations ({recommendations.length})
          </h3>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generating…' : 'Re-generate'}
          </button>
        </div>
        {recommendations.length === 0 ? (
          <div className="p-5">
            <EmptyState message="No evidence recommendations. Click 'Re-generate' to analyse gaps." />
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recommendations.map((rec) => (
              <div key={rec.id} className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-medium text-gray-900">{rec.evidence_type?.replace(/_/g, ' ')}</span>
                    <StatusBadge
                      label={rec.priority?.toUpperCase()}
                      colorClass={priorityColor(rec.priority)}
                    />
                    <StatusBadge
                      label={rec.status?.toUpperCase()}
                      colorClass={STATUS_COLOR[rec.status] || 'bg-gray-100 text-gray-600'}
                    />
                  </div>
                  <p className="text-xs text-gray-600">{rec.description}</p>
                  <p className="text-xs text-gray-400 mt-1">Reason: {rec.reason}</p>
                  <p className="text-xs text-gray-400">Requested from: {rec.requested_from}</p>
                </div>
                {rec.status === 'open' && (
                  <button
                    onClick={() => handleRequest(rec.recommendation_id)}
                    disabled={requesting === rec.recommendation_id}
                    className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex-shrink-0"
                  >
                    {requesting === rec.recommendation_id ? 'Requesting…' : 'Request'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Collaboration Event History */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">
            Collaboration Activity ({events.length})
          </h3>
        </div>
        {events.length === 0 ? (
          <div className="p-5">
            <EmptyState message="No collaboration activity yet." />
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {events.map((evt) => (
              <div key={evt.id} className="px-5 py-3 flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0">
                  {evt.event_type === 'evidence_submitted' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : evt.event_type === 'evidence_requested' ? (
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  ) : (
                    <Clock className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800">
                    {evt.event_type?.replace(/_/g, ' ')}
                  </p>
                  {evt.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{evt.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    By {evt.actor_role} · {formatDateTime(evt.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
