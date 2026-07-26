/** Format a datetime string as a short human-readable date */
export function formatDate(isoString) {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

/** Format a datetime string as date + time */
export function formatDateTime(isoString) {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/** Format a decimal as a percentage string, e.g. 0.75 → '75%' or 75 → '75%' */
export function formatPct(value) {
  if (value == null) return '—'
  const pct = value > 1 ? value : value * 100
  return `${pct.toFixed(1)}%`
}

/** Format a recommendation outcome enum value as a readable label */
export function formatOutcome(outcome) {
  const map = {
    approve_customer: 'Approve — Customer',
    approve_merchant: 'Approve — Merchant',
    partial_resolution: 'Partial Resolution',
    request_more_evidence: 'Request More Evidence',
    escalate_to_human: 'Escalate to Human',
  }
  return map[outcome] || outcome || '—'
}

/** Return Tailwind color class string for a fairness score (0–100) */
export function scoreColor(score) {
  if (score == null) return 'text-gray-400'
  if (score >= 70) return 'text-green-600'
  if (score >= 40) return 'text-yellow-600'
  return 'text-red-600'
}

/** Return Tailwind bg class for a fairness score bar */
export function scoreBgColor(score) {
  if (score == null) return 'bg-gray-300'
  if (score >= 70) return 'bg-green-500'
  if (score >= 40) return 'bg-yellow-500'
  return 'bg-red-500'
}

/** Priority badge colors */
export function priorityColor(priority) {
  const map = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-gray-100 text-gray-600',
  }
  return map[priority?.toLowerCase()] || 'bg-gray-100 text-gray-600'
}

/** Recommendation status badge color */
export function recommendationStatusColor(status) {
  const map = {
    pending: 'bg-gray-100 text-gray-600',
    active: 'bg-blue-100 text-blue-700',
    superseded: 'bg-purple-100 text-purple-700',
    rejected: 'bg-red-100 text-red-700',
    approved: 'bg-green-100 text-green-700',
  }
  return map[status?.toLowerCase()] || 'bg-gray-100 text-gray-600'
}

/** Resolution readiness label */
export function formatReadiness(readiness) {
  const map = {
    not_ready: 'Not Ready',
    partial: 'Partial',
    ready_for_review: 'Ready for Review',
    ready_for_decision: 'Ready for Decision',
    decision_recorded: 'Decision Recorded',
    completed: 'Completed',
  }
  return map[readiness] || readiness || '—'
}

/** Dispute status badge color */
export function disputeStatusColor(status) {
  const map = {
    open: 'bg-blue-100 text-blue-700',
    under_review: 'bg-yellow-100 text-yellow-700',
    evidence_requested: 'bg-orange-100 text-orange-700',
    resolved: 'bg-green-100 text-green-700',
    closed: 'bg-gray-100 text-gray-600',
    escalated: 'bg-red-100 text-red-700',
  }
  return map[status?.toLowerCase()] || 'bg-gray-100 text-gray-600'
}
