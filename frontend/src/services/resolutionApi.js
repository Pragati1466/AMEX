import apiClient from './apiClient'

// -- State / Dashboard --
export const getResolutionState = (caseId) =>
  apiClient.get(`/resolution/${caseId}`).then((r) => r.data)

export const getResolutionDashboard = (caseId) =>
  apiClient.get(`/resolution/${caseId}/dashboard`).then((r) => r.data)

export const getRecommendation = (caseId) =>
  apiClient.get(`/resolution/${caseId}/recommendation`).then((r) => r.data)

// -- Evidence Recommendations --
export const getEvidenceRecommendations = (caseId) =>
  apiClient.get(`/resolution/${caseId}/evidence-recommendations`).then((r) => r.data)

export const generateEvidenceRecommendations = (caseId, refresh = false) =>
  apiClient
    .post(`/resolution/${caseId}/evidence-recommendations/generate?refresh=${refresh}`)
    .then((r) => r.data)

export const requestEvidence = (caseId, recommendationId) => {
  const formData = new FormData()
  formData.append('submitted_by_role', 'investigator')
  return apiClient
    .post(`/resolution/${caseId}/evidence-recommendations/${recommendationId}/request`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data)
}

// -- Evidence Submission --
export const submitEvidence = (caseId, { title, description, file }) => {
  const formData = new FormData()
  formData.append('title', title)
  if (description) formData.append('description', description)
  formData.append('submitted_by_role', 'investigator')
  if (file) formData.append('file', file)
  return apiClient
    .post(`/resolution/${caseId}/evidence`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data)
}

// -- Rescoring --
export const triggerRescore = (caseId, reason = 'manual_trigger', triggeringEvidenceId = null) =>
  apiClient
    .post(`/resolution/${caseId}/rescore`, {
      reason,
      triggering_evidence_id: triggeringEvidenceId,
    })
    .then((r) => r.data)

export const getRescoreHistory = (caseId) =>
  apiClient.get(`/resolution/${caseId}/rescore-history`).then((r) => r.data)

// -- Decisions --
export const approveDecision = (caseId, rationale = null) =>
  apiClient
    .post(`/resolution/${caseId}/decision/approve`, { rationale })
    .then((r) => r.data)

export const rejectDecision = (caseId, rationale) =>
  apiClient
    .post(`/resolution/${caseId}/decision/reject`, { rationale })
    .then((r) => r.data)

export const modifyDecision = (caseId, outcome, rationale) =>
  apiClient
    .post(`/resolution/${caseId}/decision/modify`, { outcome, rationale })
    .then((r) => r.data)

export const getFinalDecision = (caseId) =>
  apiClient.get(`/resolution/${caseId}/decision`).then((r) => r.data)

// -- Audit --
export const getAuditHistory = (caseId) =>
  apiClient.get(`/resolution/${caseId}/audit`).then((r) => r.data)

// -- Collaboration Events --
export const getCollaborationEvents = (caseId) =>
  apiClient.get(`/resolution/${caseId}/collaboration-events`).then((r) => r.data)
