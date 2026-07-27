import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'https://disputiq-api.onrender.com/api/v1'

// In development mode, use a mock API client that returns errors but doesn't try to connect to real backend
const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 3000, // Shorter timeout for dev mode
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT on every request (only in production)
apiClient.interceptors.request.use((config) => {
  if (!import.meta.env.DEV) {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle errors - in development mode, let them propagate for mock data handling
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    // In development mode, don't handle 401 specially - let components use mock data
    if (import.meta.env.DEV) {
      return Promise.reject(err)
    }
    
    // In production, handle 401 by redirecting to login
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/'
    }
    return Promise.reject(err)
  }
)

export default apiClient
export { API_BASE }
