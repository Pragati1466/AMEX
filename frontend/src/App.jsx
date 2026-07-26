import React, { useState, useEffect } from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
} from 'react-router-dom'
import {
  Shield, LogOut, BarChart3, FileText, Scale,
} from 'lucide-react'
import axios from 'axios'

// ── Module 3 pages & components ──────────────────────────────────────────────
import ResolutionDashboard from './pages/resolution/ResolutionDashboard'
import ResolutionCaseList from './pages/resolution/ResolutionCaseList'
import CaseWorkspace from './pages/resolution/CaseWorkspace'
import CaseOverview from './components/resolution/CaseOverview'
import LiveFairnessDashboard from './components/resolution/LiveFairnessDashboard'
import CollaborationWorkspace from './components/resolution/CollaborationWorkspace'
import RescorePanel from './components/resolution/RescorePanel'
import FinalResolutionWorkspace from './components/resolution/FinalResolutionWorkspace'
import DecisionFlow from './components/resolution/DecisionFlow'
import ReportCenter from './components/resolution/ReportCenter'
import NotificationCenter from './components/resolution/NotificationCenter'
import AuditLogs from './components/resolution/AuditLogs'

const API_BASE =
  import.meta.env.VITE_API_URL || 'https://disputiq-api.onrender.com/api/v1'

// ─────────────────────────────────────────────────────────────────────────────
function App() {
  const [apiStatus, setApiStatus] = useState('loading')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [responseTime, setResponseTime] = useState(null)

  useEffect(() => {
    checkApiStatus()
    checkAuth()
  }, [])

  const checkApiStatus = async () => {
    const t0 = Date.now()
    try {
      await axios.get(`${API_BASE.replace('/api/v1', '')}/health`)
      setResponseTime(Date.now() - t0)
      setApiStatus('online')
    } catch {
      setApiStatus('offline')
      setResponseTime(null)
    }
  }

  const checkAuth = () => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    if (token && userData) {
      setIsAuthenticated(true)
      setUser(JSON.parse(userData))
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    const username = e.target.username.value
    const password = e.target.password.value
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, { username, password })
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('user', JSON.stringify({ username, role: 'investigator' }))
      setIsAuthenticated(true)
      setUser({ username, role: 'investigator' })
    } catch {
      alert('Login failed. Please check your credentials.')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setIsAuthenticated(false)
    setUser(null)
  }

  // ── Login Screen ─────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <Shield className="w-16 h-16 mx-auto mb-4 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-800">DisputeIQ</h1>
            <p className="text-gray-600 mt-2">AI-Powered Dispute Resolution</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                name="username"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter your username"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter your password"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Sign In
            </button>
          </form>
          <div className="mt-6 text-center">
            <div className="flex items-center justify-center gap-2 text-sm">
              <span
                className={`w-3 h-3 rounded-full ${
                  apiStatus === 'online'
                    ? 'bg-green-500'
                    : apiStatus === 'loading'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
              />
              <span className="text-gray-600">
                API:{' '}
                {apiStatus === 'online'
                  ? 'Connected'
                  : apiStatus === 'loading'
                  ? 'Checking...'
                  : 'Disconnected'}
              </span>
            </div>
            {responseTime && (
              <p className="text-xs text-gray-500 mt-1">
                Response time: {responseTime}ms
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Authenticated App ─────────────────────────────────────────────────────
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center gap-2">
                <Shield className="w-8 h-8 text-indigo-600" />
                <span className="text-xl font-bold text-gray-800">DisputeIQ</span>
              </div>
              <div className="flex items-center space-x-1">
                <Link
                  to="/dashboard"
                  className="text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-lg flex items-center gap-1 text-sm"
                >
                  <BarChart3 className="w-4 h-4" />
                  Dashboard
                </Link>
                <Link
                  to="/resolution/cases"
                  className="text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-lg flex items-center gap-1 text-sm"
                >
                  <FileText className="w-4 h-4" />
                  Cases
                </Link>
                <Link
                  to="/resolution"
                  className="text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-lg flex items-center gap-1 text-sm"
                >
                  <Scale className="w-4 h-4" />
                  Resolution
                </Link>
                {user && (
                  <span className="text-xs text-gray-400 px-2 hidden sm:block">
                    {user.username}
                  </span>
                )}
                <button
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg flex items-center gap-1 text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Routes>
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Resolution Dashboard (replaces old mock Dashboard) */}
            <Route path="/dashboard" element={<ResolutionDashboard />} />

            {/* Resolution Case List (replaces old mock Cases) */}
            <Route path="/cases" element={<ResolutionCaseList />} />
            <Route path="/resolution" element={<ResolutionDashboard />} />
            <Route path="/resolution/cases" element={<ResolutionCaseList />} />

            {/* Case Workspace with nested tabs */}
            <Route path="/resolution/:caseId" element={<CaseWorkspace />}>
              {/* Default tab: overview */}
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<CaseOverview />} />
              <Route path="fairness" element={<LiveFairnessDashboard />} />
              <Route path="collaboration" element={<CollaborationWorkspace />} />
              <Route path="rescore" element={<RescorePanel />} />
              <Route path="workspace" element={<FinalResolutionWorkspace />} />
              <Route path="decision" element={<DecisionFlow />} />
              <Route path="report" element={<ReportCenter />} />
              <Route path="notifications" element={<NotificationCenter />} />
              <Route path="audit" element={<AuditLogs />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
