import React, { useState, useEffect } from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
  useLocation,
} from 'react-router-dom'
import {
  Shield, LogOut, BarChart3, FileText, Scale, Activity,
} from 'lucide-react'
import axios from 'axios'

// ── Module 3 pages & components ──────────────────────────────────────────────
import ResolutionDashboard from './pages/resolution/ResolutionDashboard'
import ResolutionCaseList from './pages/resolution/ResolutionCaseList'
import ResolutionOverview from './pages/resolution/ResolutionOverview'
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

// ── NavLink component ─────────────────────────────────────────────────────────
function NavItem({ to, icon: Icon, label }) {
  const location = useLocation()
  const path = location.pathname

  let isActive
  if (to === '/dashboard') {
    isActive = path === '/dashboard'
  } else if (to === '/resolution/cases') {
    // Cases tab: active on /resolution/cases only
    isActive = path === '/resolution/cases'
  } else if (to === '/resolution') {
    // Resolution tab: active on /resolution and any /resolution/:caseId/... workspace
    // but NOT on /resolution/cases
    isActive =
      path === '/resolution' ||
      (path.startsWith('/resolution/') && path !== '/resolution/cases')
  } else {
    isActive = path === to || path.startsWith(to + '/')
  }

  return (
    <Link
      to={to}
      className={`diq-nav-link ${isActive ? 'active' : ''}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </Link>
  )
}

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
      <div className="min-h-screen flex" style={{ background: 'var(--color-navy-950)' }}>
        {/* Left branding panel */}
        <div className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 p-10"
          style={{ background: 'linear-gradient(160deg, var(--color-navy-900) 0%, var(--color-navy-800) 100%)' }}>
          <div>
            <div className="flex items-center gap-3 mb-12">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--color-navy-600)' }}>
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-white font-bold text-xl tracking-tight">DisputeIQ</div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>Resolution Platform</div>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white leading-tight mb-4">
              AI-Powered Dispute<br/>Resolution
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Before deciding who is right, we make sure both sides had a fair chance to prove it.
            </p>
            <div className="mt-10 space-y-4">
              {[
                { icon: '⚖️', title: 'Fairness-First', desc: 'Equal representation for all parties' },
                { icon: '🤖', title: 'Explainable AI', desc: 'Transparent reasoning at every step' },
                { icon: '👤', title: 'Human-in-the-Loop', desc: 'Investigators always make final calls' },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <span className="text-lg">{item.icon}</span>
                  <div>
                    <div className="text-sm font-semibold text-white">{item.title}</div>
                    <div className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Module 3 — Resolution & Collaboration
          </div>
        </div>

        {/* Right login panel */}
        <div className="flex-1 flex items-center justify-center p-6"
          style={{ background: 'var(--color-surface-app)' }}>
          <div className="w-full max-w-sm">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--color-navy-800)' }}>
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-lg" style={{ color: 'var(--color-navy-900)' }}>DisputeIQ</div>
                <div className="text-xs text-gray-400">Resolution Platform</div>
              </div>
            </div>

            <div className="mb-7">
              <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Sign in
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                Access the Resolution Dashboard
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                  style={{ color: 'var(--color-text-secondary)' }}>
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  className="diq-input"
                  placeholder="Enter your username"
                  required
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                  style={{ color: 'var(--color-text-secondary)' }}>
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  className="diq-input"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
              </div>
              <button
                type="submit"
                className="diq-btn diq-btn-primary w-full py-2.5 text-sm font-semibold mt-2"
                style={{ borderRadius: 'var(--radius-md)' }}
              >
                Sign In to DisputeIQ
              </button>
            </form>

            {/* API status */}
            <div className="mt-6 flex items-center justify-between text-xs"
              style={{ color: 'var(--color-text-muted)' }}>
              <div className="flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${
                  apiStatus === 'online' ? 'bg-green-500' :
                  apiStatus === 'loading' ? 'bg-amber-400' : 'bg-red-500'
                }`} />
                API {apiStatus === 'online' ? 'Connected' : apiStatus === 'loading' ? 'Checking…' : 'Disconnected'}
              </div>
              {responseTime && <span>{responseTime}ms</span>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Authenticated App ─────────────────────────────────────────────────────
  return (
    <Router>
      <div className="min-h-screen" style={{ background: 'var(--color-surface-app)' }}>
        {/* Navigation */}
        <nav className="diq-nav">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14 gap-4">
              {/* Brand */}
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.12)' }}>
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-white text-base tracking-tight">DisputeIQ</span>
              </div>

              {/* Nav links */}
              <div className="flex items-center gap-0.5 flex-1">
                <NavItem to="/dashboard" icon={BarChart3} label="Dashboard" />
                <NavItem to="/resolution/cases" icon={FileText} label="Cases" />
                <NavItem to="/resolution" icon={Scale} label="Resolution" />
              </div>

              {/* Right */}
              <div className="flex items-center gap-2">
                {user && (
                  <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md"
                    style={{ background: 'rgba(255,255,255,0.07)' }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: 'var(--color-navy-500)' }}>
                      {user.username?.[0]?.toUpperCase()}
                    </div>
                    <span className="text-xs text-white/70 font-medium">{user.username}</span>
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="diq-nav-link hover:text-red-400 hover:bg-red-500/10"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
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

            {/* Dashboard — high-level overview */}
            <Route path="/dashboard" element={<ResolutionDashboard />} />

            {/* Cases — dedicated case browser */}
            <Route path="/resolution/cases" element={<ResolutionCaseList />} />

            {/* Resolution — resolution workflow queue (actionable overview) */}
            <Route path="/resolution" element={<ResolutionOverview />} />

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
