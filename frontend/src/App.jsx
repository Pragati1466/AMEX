import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { Shield, Clock, CheckCircle, AlertTriangle, Activity, FileText, BarChart3, Settings, LogOut } from 'lucide-react'
import axios from 'axios'

const API_BASE = 'http://localhost:8000/api/v1'

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
    const startTime = Date.now()
    try {
      const response = await axios.get('http://localhost:8000/health')
      const endTime = Date.now()
      setResponseTime(endTime - startTime)
      setApiStatus('online')
    } catch (error) {
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
      const response = await axios.post(`${API_BASE}/auth/login`, {
        username,
        password
      })
      localStorage.setItem('token', response.data.access_token)
      localStorage.setItem('user', JSON.stringify({ username, role: 'investigator' }))
      setIsAuthenticated(true)
      setUser({ username, role: 'investigator' })
    } catch (error) {
      alert('Login failed. Please check your credentials.')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setIsAuthenticated(false)
    setUser(null)
  }

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
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <input
                type="text"
                name="username"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter your username"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
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
              <span className={`w-3 h-3 rounded-full ${apiStatus === 'online' ? 'bg-green-500' : apiStatus === 'loading' ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
              <span className="text-gray-600">
                API: {apiStatus === 'online' ? 'Connected' : apiStatus === 'loading' ? 'Checking...' : 'Disconnected'}
              </span>
            </div>
            {responseTime && (
              <p className="text-xs text-gray-500 mt-1">Response time: {responseTime}ms</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Shield className="w-8 h-8 text-indigo-600 mr-2" />
                <span className="text-xl font-bold text-gray-800">DisputeIQ</span>
              </div>
              <div className="flex items-center space-x-4">
                <Link to="/dashboard" className="text-gray-600 hover:text-indigo-600 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-1" />
                  Dashboard
                </Link>
                <Link to="/cases" className="text-gray-600 hover:text-indigo-600 flex items-center">
                  <FileText className="w-5 h-5 mr-1" />
                  Cases
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-red-600 flex items-center"
                >
                  <LogOut className="w-5 h-5 mr-1" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/cases" element={<Cases />} />
            <Route path="/" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

function Dashboard() {
  const [stats, setStats] = useState({
    totalCases: 0,
    pendingCases: 0,
    resolvedCases: 0,
    avgFairnessScore: 0
  })

  useEffect(() => {
    // Mock data for demonstration
    setStats({
      totalCases: 156,
      pendingCases: 43,
      resolvedCases: 113,
      avgFairnessScore: 72
    })
  }, [])

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Resolution Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<FileText className="w-8 h-8 text-blue-600" />}
          title="Total Cases"
          value={stats.totalCases}
          color="blue"
        />
        <StatCard
          icon={<Clock className="w-8 h-8 text-yellow-600" />}
          title="Pending Cases"
          value={stats.pendingCases}
          color="yellow"
        />
        <StatCard
          icon={<CheckCircle className="w-8 h-8 text-green-600" />}
          title="Resolved Cases"
          value={stats.resolvedCases}
          color="green"
        />
        <StatCard
          icon={<Activity className="w-8 h-8 text-purple-600" />}
          title="Avg Fairness Score"
          value={`${stats.avgFairnessScore}%`}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FeatureCard
          icon={<Shield className="w-12 h-12 text-indigo-600 mb-4" />}
          title="Evidence Collection"
          description="Automated evidence gathering from documents, emails, and transaction records with intelligent categorization."
        />
        <FeatureCard
          icon={<Clock className="w-12 h-12 text-indigo-600 mb-4" />}
          title="Timeline Reconstruction"
          description="AI-powered timeline generation that automatically sequences events and identifies critical milestones."
        />
        <FeatureCard
          icon={<CheckCircle className="w-12 h-12 text-indigo-600 mb-4" />}
          title="Evidence Validation"
          description="Automated validation of evidence completeness, authenticity, and relevance using machine learning."
        />
        <FeatureCard
          icon={<Activity className="w-12 h-12 text-indigo-600 mb-4" />}
          title="Real-Time Re-Scoring"
          description="Dynamic fairness score recalculation when new evidence is submitted during investigation."
        />
      </div>
    </div>
  )
}

function Cases() {
  const [cases, setCases] = useState([
    { id: 1, disputeId: 'DSP-001', reason: 'Product Not Received', status: 'Under Review', fairnessScore: 75 },
    { id: 2, disputeId: 'DSP-002', reason: 'Unauthorized Transaction', status: 'Pending', fairnessScore: 45 },
    { id: 3, disputeId: 'DSP-003', reason: 'Refund Not Processed', status: 'Resolved', fairnessScore: 90 },
  ])

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Dispute Cases</h1>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Case ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fairness Score</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {cases.map((caseItem) => (
              <tr key={caseItem.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{caseItem.disputeId}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{caseItem.reason}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    caseItem.status === 'Resolved' ? 'bg-green-100 text-green-800' :
                    caseItem.status === 'Under Review' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {caseItem.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                      <div 
                        className={`h-2 rounded-full ${
                          caseItem.fairnessScore >= 70 ? 'bg-green-500' :
                          caseItem.fairnessScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${caseItem.fairnessScore}%` }}
                      ></div>
                    </div>
                    <span>{caseItem.fairnessScore}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button className="text-indigo-600 hover:text-indigo-900 mr-3">View</button>
                  <button className="text-indigo-600 hover:text-indigo-900">Investigate</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatCard({ icon, title, value, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200'
  }

  return (
    <div className={`p-6 rounded-lg border ${colorClasses[color]} shadow-sm`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        {icon}
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      {icon}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  )
}

export default App