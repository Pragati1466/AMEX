import apiClient from './apiClient'

export const getNotifications = (caseId) =>
  apiClient.get(`/resolution/${caseId}/notifications`).then((r) => r.data)

export const markNotificationRead = (caseId, notificationId) =>
  apiClient
    .post(`/resolution/${caseId}/notifications/${notificationId}/read`)
    .then((r) => r.data)
