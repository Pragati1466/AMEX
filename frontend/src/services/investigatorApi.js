import apiClient from './apiClient'

// -- Investigator Dashboard --
export const getInvestigatorDashboard = () =>
  apiClient.get('/investigator/dashboard').then((r) => r.data)

// -- Case Details --
export const getCaseDetails = (caseId) =>
  apiClient.get(`/cases/${caseId}`).then((r) => r.data)

export const createCase = (caseData) =>
  apiClient.post('/cases', caseData).then((r) => r.data)

export const searchCases = (searchParams) => {
  const query = new URLSearchParams(searchParams).toString()
  return apiClient.get(`/cases/search?${query}`).then((r) => r.data)
}

// -- Evidence Upload --
export const uploadEvidence = (caseId, formData) =>
  apiClient.post(`/evidence/upload/${caseId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data)

export const getEvidenceList = (caseId) =>
  apiClient.get(`/evidence/${caseId}`).then((r) => r.data)

export const deleteEvidence = (evidenceId) =>
  apiClient.delete(`/evidence/${evidenceId}`).then((r) => r.data)

// -- Timeline Generation --
export const generateTimeline = (caseId) =>
  apiClient.post(`/timeline/generate/${caseId}`).then((r) => r.data)

export const getTimeline = (caseId) =>
  apiClient.get(`/timeline/${caseId}`).then((r) => r.data)

// -- Evidence Validation --
export const validateEvidence = (caseId) =>
  apiClient.post(`/evidence/validate/${caseId}`).then((r) => r.data)

export const getValidationStatus = (caseId) =>
  apiClient.get(`/evidence/validate/${caseId}`).then((r) => r.data)

// -- Policy Mapping --
export const getPolicyMapping = (caseId) =>
  apiClient.get(`/policy/${caseId}`).then((r) => r.data)

export const getInvestigationSummary = (caseId) =>
  apiClient.get(`/cases/${caseId}/summary`).then((r) => r.data)

// -- Case Status Updates --
export const updateCaseStatus = (caseId, status) =>
  apiClient.patch(`/cases/${caseId}/status`, { status }).then((r) => r.data)

export const assignCase = (caseId, investigatorId) =>
  apiClient.post(`/cases/${caseId}/assign`, { investigator_id: investigatorId }).then((r) => r.data)

// -- Customer & Merchant Details --
export const getCustomerDetails = (customerId) =>
  apiClient.get(`/customers/${customerId}`).then((r) => r.data)

export const getMerchantDetails = (merchantId) =>
  apiClient.get(`/merchants/${merchantId}`).then((r) => r.data)

// -- Transaction History --
export const getTransactionHistory = (caseId) =>
  apiClient.get(`/cases/${caseId}/transactions`).then((r) => r.data)

// -- Communication Logs --
export const getCommunicationLogs = (caseId) =>
  apiClient.get(`/cases/${caseId}/communications`).then((r) => r.data)

export const addCommunicationLog = (caseId, logData) =>
  apiClient.post(`/cases/${caseId}/communications`, logData).then((r) => r.data)

// -- Refund History --
export const getRefundHistory = (caseId) =>
  apiClient.get(`/cases/${caseId}/refunds`).then((r) => r.data)
