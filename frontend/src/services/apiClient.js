// Mock API client for Vercel deployment without backend
const apiClient = {
  get: (url) => Promise.reject(new Error('Mock API - no backend')),
  post: (url, data) => Promise.reject(new Error('Mock API - no backend')),
  put: (url, data) => Promise.reject(new Error('Mock API - no backend')),
  patch: (url, data) => Promise.reject(new Error('Mock API - no backend')),
  delete: (url) => Promise.reject(new Error('Mock API - no backend')),
}

export default apiClient
export const API_BASE = 'mock-api'
