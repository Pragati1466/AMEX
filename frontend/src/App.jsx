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
  LayoutDashboard, FolderKanban, PlusCircle,
  Bell, ChevronDown,
} from 'lucide-react'
import axios from 'axios'

// ── Module 1 pages ──────────────────────────────────────────────────────────
import InvestigatorDashboard from './pages/investigator/InvestigatorDashboard'
import CaseWorkspace from './pages/investigator/CaseWorkspace'
import NewCaseForm from './pages/investigator/NewCaseForm'

// ── Module 3 pages & components ──────────────────────────────────────────────
import ResolutionDashboard from './pages/resolution/ResolutionDashboard'
import ResolutionCaseList from './pages/resolution/ResolutionCaseList'
import ResolutionOverview from './pages/resolution/ResolutionOverview'
import ResolutionCaseWorkspace from './pages/resolution/CaseWorkspace'
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
  // Use exact matching to prevent multiple items from being active
  if (to === '/investigator/dashboard') {
    isActive = path === '/investigator/dashboard'
  } else if (to === '/dashboard') {
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
      // In development mode, don't show API as offline if backend isn't running
      if (import.meta.env.DEV) {
        setApiStatus('dev_mode')
        setResponseTime(null)
      } else {
        setApiStatus('offline')
        setResponseTime(null)
      }
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
    
    // Development mode: allow any login for testing
    if (import.meta.env.DEV) {
      localStorage.setItem('token', 'dev-token-' + Date.now())
      localStorage.setItem('user', JSON.stringify({ username, role: 'investigator' }))
      setIsAuthenticated(true)
      setUser({ username, role: 'investigator' })
      return
    }
    
    // Production mode: authenticate with real API
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
      <div className="min-h-screen flex" style={{ background: '#08152F' }}>
        {/* Left branding panel */}
        <div className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 p-10"
          style={{ background: 'linear-gradient(160deg, #0A1635 0%, #071126 100%)' }}>
          <div>
            <div className="flex items-center gap-3 mb-12">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--color-primary)' }}>
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
            Module 1 — Investigation & Evidence Intelligence
          </div>
        </div>

        {/* Right login panel */}
        <div className="flex-1 flex items-center justify-center p-6"
          style={{ background: 'var(--color-bg-app)' }}>
          <div className="w-full max-w-sm">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--color-primary)' }}>
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-lg" style={{ color: 'var(--color-text-heading)' }}>DisputeIQ</div>
                <div className="text-xs text-gray-400">Resolution Platform</div>
              </div>
            </div>

            <div className="mb-7">
              <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-heading)' }}>
                Sign in
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-body)' }}>
                Access the Investigation Dashboard
              </p>
              {import.meta.env.DEV && (
                <div className="mt-2 p-2 rounded text-xs" style={{ background: '#EEF2FF', color: 'var(--color-primary)' }}>
                  🔵 Development Mode: Any login credentials will work
                </div>
              )}
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                  style={{ color: 'var(--color-text-body)' }}>
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
                  style={{ color: 'var(--color-text-body)' }}>
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
                className="diq-btn diq-btn-primary w-full"
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
                  apiStatus === 'loading' ? 'bg-amber-400' :
                  apiStatus === 'dev_mode' ? 'bg-blue-500' : 'bg-red-500'
                }`} />
                API {apiStatus === 'online' ? 'Connected' : 
                    apiStatus === 'loading' ? 'Checking…' :
                    apiStatus === 'dev_mode' ? 'Dev Mode (No Backend)' : 'Disconnected'}
              </div>
              {responseTime && <span>{responseTime}ms</span>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Sidebar Navigation Item ──────────────────────────────────────────────
  function SidebarItem({ to, icon: Icon, label }) {
    const loc = useLocation()
    const path = loc.pathname
    let isActive = false
    
    // Use exact matching to prevent multiple items from being active
    if (to === '/investigator/dashboard') {
      isActive = path === '/investigator/dashboard'
    } else if (to === '/investigator/cases/new') {
      isActive = path === '/investigator/cases/new'
    } else if (to === '/investigator/cases/1') {
      // Cases item: active when path matches /investigator/cases/:caseId
      isActive = /^\/investigator\/cases\/\d+$/.test(path)
    } else if (to === '/resolution/cases') {
      isActive = path === '/resolution/cases'
    } else if (to === '/resolution') {
      // Resolution tab: active on /resolution and any /resolution/:caseId/... workspace
      // but NOT on /resolution/cases
      isActive = path === '/resolution' || (path.startsWith('/resolution/') && path !== '/resolution/cases')
    } else if (to === '/dashboard') {
      isActive = path === '/dashboard'
    } else {
      isActive = path === to || path.startsWith(to + '/')
    }
    
    return (
      <Link to={to} className={`diq-nav-item ${isActive ? 'active' : ''}`}>
        <Icon className="nav-icon" />
        {label}
      </Link>
    )
  }

  // ── Sidebar Component ────────────────────────────────────────────────────
  function Sidebar() {
    return (
      <aside className="diq-sidebar">
        <div className="diq-logo">
          <div className="diq-logo-icon"><Shield className="w-5 h-5" /></div>
          <div>
            <div className="diq-logo-text">DisputeIQ</div>
            <div className="diq-logo-sub">AI Powered Dispute Resolution</div>
          </div>
        </div>

        <div className="diq-nav-section">Investigation</div>
        <SidebarItem to="/investigator/dashboard" icon={LayoutDashboard} label="Dashboard" />
        <SidebarItem to="/investigator/cases/new" icon={PlusCircle} label="New Case" />
        <SidebarItem to="/investigator/cases/1" icon={FolderKanban} label="Cases" />

        <div className="diq-nav-section">Insights</div>
        <SidebarItem to="/dashboard" icon={BarChart3} label="Analytics" />
        <SidebarItem to="/resolution/cases" icon={FileText} label="Reports" />
        <SidebarItem to="/resolution" icon={Scale} label="Resolution" />

        <div style={{ flex: 1 }} />

        <div className="diq-sidebar-profile">
          <div className="diq-sidebar-avatar">
            {user?.username?.[0]?.toUpperCase() || 'I'}
            <div className="diq-online-dot" />
          </div>
          <div>
            <div className="diq-profile-name">{user?.username || 'Investigator'}</div>
            <div className="diq-profile-role">Lead Investigator</div>
          </div>
        </div>
      </aside>
    )
  }

  // ── Authenticated App ─────────────────────────────────────────────────────
  return (
    <Router>
      <div className="diq-layout">
        <Sidebar />
        <main className="diq-main">
          <Routes>
            <Route path="/" element={<Navigate to="/investigator/dashboard" replace />} />
            <Route path="/investigator/dashboard" element={<InvestigatorDashboard />} />
            <Route path="/investigator/cases/new" element={<NewCaseForm />} />
            <Route path="/investigator/cases/:caseId" element={<CaseWorkspace />} />
            <Route path="/dashboard" element={<ResolutionDashboard />} />
            <Route path="/resolution/cases" element={<ResolutionCaseList />} />
            <Route path="/resolution" element={<ResolutionOverview />} />
            <Route path="/resolution/:caseId" element={<ResolutionCaseWorkspace />}>
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
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
