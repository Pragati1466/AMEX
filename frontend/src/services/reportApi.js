import apiClient from './apiClient'

export const generateReport = (caseId) =>
  apiClient.post(`/resolution/${caseId}/report`).then((r) => r.data)

export const getReport = (caseId) =>
  apiClient.get(`/resolution/${caseId}/report`).then((r) => r.data)
