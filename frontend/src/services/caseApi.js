import apiClient from './apiClient'

// Fetch disputes list from Module 1 evidence endpoint
export const listDisputes = () =>
  apiClient.get('/evidence/cases').then((r) => r.data).catch(() => ({ cases: [], total: 0 }))

// Get case file for a dispute (Module 1)
export const getCaseFileByDispute = (disputeId) =>
  apiClient.get(`/case-file/dispute/${disputeId}`).then((r) => r.data)

export const getCaseFilePackage = (disputeId) =>
  apiClient.get(`/case-file/dispute/${disputeId}/package`).then((r) => r.data)

export const listCaseFiles = (params = {}) => {
  const query = new URLSearchParams(params).toString()
  return apiClient.get(`/case-file/${query ? '?' + query : ''}`).then((r) => r.data)
}
