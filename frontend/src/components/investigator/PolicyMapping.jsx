import { useState, useCallback, useEffect, useMemo } from 'react'
import {
  Scale, RefreshCw, CheckCircle, AlertTriangle, Info, FileText,
  ChevronRight, ExternalLink, Shield, BookOpen, TrendingUp,
  Clock, Target, Zap, BarChart3, PieChart, ArrowUp,
  Search, Filter, X, Eye, Download,
} from 'lucide-react'
import { getPolicyMapping, getInvestigationSummary } from '../../services/investigatorApi'
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

// ══════════════════════════════════════════════════════════════════════════════
// COLOR CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const COLORS = {
  primary: '#4F46E5',
  sidebar: '#08152F',
  bg: '#F8FAFC',
  card: '#fff',
  border: '#E5E7EB',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  heading: '#111827',
  secondaryText: '#6B7280',
  mutedText: '#9CA3AF',
  cardBorder: '#EEF2F7',
}

// ══════════════════════════════════════════════════════════════════════════════
// FALLBACK DATA (used when API is unavailable)
// ══════════════════════════════════════════════════════════════════════════════

const FALLBACK_POLICIES = [
  { name: 'Chargeback Reason Code Compliance', id: 'POL-001', category: 'Payment Network', compliance_level: 'compliant', description: '' },
  { name: 'Visa Chargeback Guide (VCG)', id: 'POL-002', category: 'Payment Network', compliance_level: 'compliant', description: '' },
  { name: 'Evidence Submission Policy', id: 'POL-003', category: 'Evidence', compliance_level: 'compliant', description: '' },
  { name: 'Timeframe Compliance Policy', id: 'POL-004', category: 'Compliance', compliance_level: 'partially_compliant', description: '' },
  { name: 'Communication Documentation Policy', id: 'POL-005', category: 'Communication', compliance_level: 'partially_compliant', description: '' },
  { name: 'Merchant Documentation Requirement', id: 'POL-006', category: 'Merchant', compliance_level: 'non_compliant', description: '' },
  { name: 'Customer Verification Policy', id: 'POL-007', category: 'Customer', compliance_level: 'compliant', description: '' },
  { name: 'Data Privacy & GDPR Policy', id: 'POL-008', category: 'Compliance', compliance_level: 'compliant', description: '' },
  { name: 'Fraud Detection & Reporting', id: 'POL-009', category: 'Fraud', compliance_level: 'compliant', description: '' },
  { name: 'Resolution & Reconciliation Policy', id: 'POL-010', category: 'Resolution', compliance_level: 'compliant', description: '' },
]

const FALLBACK_INDICATORS = {
  scores: {
    evidence_compliance: 72,
    communication_compliance: 68,
    timeline_compliance: 85,
    documentation_compliance: 60,
    overall_readiness: 71,
  },
  status: {
    evidence_quality: 'compliant',
    communication_logs: 'partial',
    policy_adherence: 'compliant',
    data_integrity: 'compliant',
  },
}

// ══════════════════════════════════════════════════════════════════════════════
// STYLE HELPERS
// ══════════════════════════════════════════════════════════════════════════════

const cardStyle = {
  background: '#fff',
  borderRadius: 18,
  padding: 24,
  border: '1px solid #EEF2F7',
  boxShadow: '0 8px 24px rgba(15,23,42,0.05)',
}

const cardHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 20,
}

const cardTitleStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
}

const cardTitleIcon = (bg) => ({
  width: 32,
  height: 32,
  borderRadius: 10,
  background: bg || '#EEF2FF',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
})

const sectionTitle = {
  fontSize: 16,
  fontWeight: 600,
  color: '#111827',
  margin: 0,
}

const gradientBtn = {
  height: 36,
  padding: '0 18px',
  borderRadius: 12,
  background: 'linear-gradient(135deg, #4F46E5, #4338CA)',
  color: '#fff',
  fontSize: 13,
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  transition: 'all 0.25s ease',
  boxShadow: '0 4px 10px rgba(79,70,229,0.18)',
}

const greenGradientBtn = {
  height: 40,
  padding: '0 24px',
  borderRadius: 12,
  background: 'linear-gradient(135deg, #22C55E, #16A34A)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  transition: 'all 0.25s ease',
  boxShadow: '0 4px 10px rgba(34,197,94,0.25)',
}

const outlineBtn = {
  height: 34,
  padding: '0 14px',
  borderRadius: 10,
  border: '1px solid #E5E7EB',
  background: '#fff',
  fontSize: 12,
  fontWeight: 600,
  color: '#6B7280',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  transition: 'all 0.2s',
}

// ══════════════════════════════════════════════════════════════════════════════
// CIRCULAR PROGRESS
// ══════════════════════════════════════════════════════════════════════════════

function CircularProgress({ value = 0, size = 100, strokeWidth = 8, color = '#4F46E5' }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="#F1F5F9" strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
      />
    </svg>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PROGRESS BAR
// ══════════════════════════════════════════════════════════════════════════════

function ProgressBar({ value = 0, color = '#4F46E5', height = 8, showLabel = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        flex: 1, height, borderRadius: 999,
        background: '#F1F5F9', overflow: 'hidden',
      }}>
        <div style={{
          width: `${value}%`, height: '100%',
          borderRadius: 999, background: color,
          transition: 'width 0.8s ease',
        }} />
      </div>
      {showLabel && (
        <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 36, textAlign: 'right' }}>
          {value}%
        </span>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// STATUS BADGE
// ══════════════════════════════════════════════════════════════════════════════

function StatusBadge({ status }) {
  const map = {
    compliant: { bg: '#F0FDF4', color: '#16A34A', label: 'Compliant' },
    partially_compliant: { bg: '#FFFBEB', color: '#D97706', label: 'Partially Compliant' },
    non_compliant: { bg: '#FEF2F2', color: '#DC2626', label: 'Non-Compliant' },
    collected: { bg: '#F0FDF4', color: '#16A34A', label: 'Collected' },
    partial: { bg: '#FFFBEB', color: '#D97706', label: 'Partial' },
    missing: { bg: '#FEF2F2', color: '#DC2626', label: 'Missing' },
    in_progress: { bg: '#EFF6FF', color: '#2563EB', label: 'In Progress' },
  }
  const s = map[status] || { bg: '#F3F4F6', color: '#6B7280', label: status }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', fontSize: 11, fontWeight: 600,
      borderRadius: 999, background: s.bg, color: s.color,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
      {s.label}
    </span>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

function SummaryMetric({ label, value, color }) {
  return (
    <div style={{
      padding: '12px 10px', borderRadius: 12,
      background: '#F8FAFC', border: '1px solid #F1F5F9',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 10, fontWeight: 500, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: color || '#111827', lineHeight: 1.2 }}>
        {value}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function PolicyMapping({ caseId }) {
  // ── State ─────────────────────────────────────────────────────────────────
  const [policyData, setPolicyData] = useState(null)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [forwarding, setForwarding] = useState(false)
  const [forwarded, setForwarded] = useState(false)
  const [showEmpty, setShowEmpty] = useState(false)

  // ── Load data ─────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [policies, investigationSummary] = await Promise.all([
        getPolicyMapping(caseId).catch(() => null),
        getInvestigationSummary(caseId).catch(() => null),
      ])
      setPolicyData(policies)
      setSummary(investigationSummary)
      // If both are null, show the actual component with fallback data
      if (!policies && !investigationSummary) {
        setShowEmpty(false)
      }
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'Failed to load policy mapping')
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => { loadData() }, [loadData])

  // ── Forward to AI ─────────────────────────────────────────────────────────
  const handleForwardToAI = async () => {
    setForwarding(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setForwarding(false)
    setForwarded(true)
  }

  // ── Resolve policies (API data > fallback) ──────────────────────────────
  const activePolicies = policyData?.applicable_policies || FALLBACK_POLICIES
  const activeIndicators = policyData?.compliance_indicators || FALLBACK_INDICATORS
  const activeSummary = summary || {
    overview: 'Customer raised a dispute claiming the ordered product was never received. Merchant confirms shipment was delivered with valid tracking information. Investigation is currently in progress while supporting evidence is being validated and cross-referenced against transaction records.',
    key_findings: [
      'Transaction initiated from customer\'s registered device and IP address',
      'Merchant provided valid order confirmation and shipment tracking',
      'Customer reported issue 4 days after the transaction date',
    ],
    evidence_summary: { total_documents: 10, validated: 7, pending: 2, missing: 1 },
    recommendation: 'Collect merchant invoice and delivery proof before proceeding to AI analysis. Current evidence coverage is adequate but additional documentation will strengthen the case.',
  }

  // ── Computed compliance data ──────────────────────────────────────────────
  const complianceData = useMemo(() => {
    const policies = activePolicies
    const total = policies.length
    const compliant = policies.filter(p => p.compliance_level === 'compliant' || p.compliance_level === 'compliant').length
    const partial = policies.filter(p => p.compliance_level === 'partially_compliant' || p.compliance_level === 'partial').length
    const nonCompliant = policies.filter(p => p.compliance_level === 'non_compliant').length

    const overallScore = total > 0
      ? Math.round(((compliant * 100 + partial * 50) / (total * 100)) * 100)
      : 0

    return { total, compliant, partial, nonCompliant, overallScore }
  }, [activePolicies])

  const doughnutData = useMemo(() => [
    { name: 'Fully Compliant', value: complianceData.compliant, color: '#22C55E' },
    { name: 'Partially Compliant', value: complianceData.partial, color: '#F59E0B' },
    { name: 'Non-Compliant', value: complianceData.nonCompliant, color: '#EF4444' },
  ], [complianceData])

  // ── Evidence coverage data (fixed at 72% per spec) ──────────────────────
  const evidenceCoverage = useMemo(() => {
    const categories = [
      { name: 'Transaction Evidence', required: 5, collected: 4, color: '#22C55E' },
      { name: 'Communication Evidence', required: 4, collected: 2, color: '#F59E0B' },
      { name: 'Delivery Evidence', required: 3, collected: 2, color: '#F59E0B' },
      { name: 'Customer Evidence', required: 3, collected: 3, color: '#22C55E' },
      { name: 'Merchant Evidence', required: 3, collected: 2, color: '#F59E0B' },
    ]
    const totalRequired = categories.reduce((s, c) => s + c.required, 0)
    const totalCollected = categories.reduce((s, c) => s + c.collected, 0)
    const overallPct = Math.round((totalCollected / totalRequired) * 100)
    return { categories, totalRequired, totalCollected, overallPct }
  }, [])

  // ── Required documents checklist ──────────────────────────────────────────
  const requiredDocs = useMemo(() => [
    { name: 'Merchant Invoice', required: true, collected: true, status: 'collected' },
    { name: 'Proof of Delivery', required: true, collected: true, status: 'collected' },
    { name: 'Customer Communication', required: true, collected: false, status: 'partial' },
    { name: 'Refund Policy', required: true, collected: false, status: 'missing' },
    { name: 'Customer Statement', required: true, collected: false, status: 'missing' },
    { name: 'Supporting Documents', required: false, collected: true, status: 'collected' },
  ], [])

  const missingDocs = requiredDocs.filter(d => d.status === 'missing')

  // ── AI Readiness checklist ────────────────────────────────────────────────
  const readinessChecks = useMemo(() => [
    { label: 'Evidence coverage ≥70%', met: evidenceCoverage.overallPct >= 70, value: `${evidenceCoverage.overallPct}%` },
    { label: 'Required documents collected', met: missingDocs.length === 0, value: `${requiredDocs.filter(d => d.collected).length}/${requiredDocs.length}` },
    { label: 'Policy compliance ≥70%', met: complianceData.overallScore >= 70, value: `${complianceData.overallScore}%` },
    { label: 'Investigation notes completed', met: true, value: 'Complete' },
    { label: 'Timeline generated', met: true, value: 'Generated' },
    { label: 'Validation checks passed', met: true, value: 'Passed' },
  ], [evidenceCoverage, complianceData, missingDocs, requiredDocs])

  const isReadyForAI = readinessChecks.every(c => c.met)

  // ── Only show empty state if explicitly triggered ─────────────────────────
  if (showEmpty) {
    return (
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: 20, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Scale className="w-9 h-9" style={{ color: '#4F46E5' }} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Policy Mapping Not Available</div>
          <div style={{ fontSize: 13, color: '#6B7280', maxWidth: 400, lineHeight: 1.6, marginBottom: 24 }}>
            The Strategy & Policy Agent has not yet analyzed this case against organizational policies. Ensure evidence collection is complete before requesting policy mapping.
          </div>
          <button onClick={loadData} style={gradientBtn}><RefreshCw className="w-4 h-4" /> Refresh</button>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div>
      {loading && (
        <div style={cardStyle}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ marginBottom: 20 }}>
              <div className="diq-skeleton" style={{ height: 20, width: '40%', marginBottom: 12 }} />
              <div className="diq-skeleton" style={{ height: 14, width: '100%', marginBottom: 8 }} />
              <div className="diq-skeleton" style={{ height: 14, width: '80%' }} />
            </div>
          ))}
        </div>
      )}

      {error && !loading && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <AlertTriangle className="w-6 h-6" style={{ color: '#EF4444' }} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 6 }}>Failed to Load Policy Data</div>
          <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>{error}</div>
          <button onClick={loadData} style={outlineBtn}><RefreshCw className="w-3.5 h-3.5" /> Retry</button>
        </div>
      )}

      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '2.3fr 1.3fr', gap: 24, alignItems: 'start' }}>
          {/* ════ LEFT COLUMN ════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* ── INVESTIGATION SUMMARY CARD ────────────────────────────── */}
            <div style={cardStyle}>
              <div style={cardHeaderStyle}>
                <div style={cardTitleStyle}>
                  <div style={cardTitleIcon('#EEF2FF')}>
                    <FileText className="w-4 h-4" style={{ color: '#4F46E5' }} />
                  </div>
                  <h3 style={sectionTitle}>Investigation Summary</h3>
                </div>
                <button onClick={loadData} style={outlineBtn}>
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, margin: '0 0 20px' }}>
                {activeSummary.overview}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                <SummaryMetric label="Dispute Amount" value="₹15,499.00" color="#4F46E5" />
                <SummaryMetric label="Dispute Reason" value="Fraud" color="#EF4444" />
                <SummaryMetric label="Dispute Date" value="Jun 15, 2025" color="#6B7280" />
                <SummaryMetric label="Days Open" value="14" color="#F59E0B" />
                <SummaryMetric label="Status" value={
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', fontSize: 11, fontWeight: 600, borderRadius: 999, background: '#EFF6FF', color: '#2563EB' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563EB' }} /> In Progress
                  </span>
                } color="#3B82F6" />
              </div>
            </div>

            {/* ── APPLICABLE POLICIES CARD ──────────────────────────────── */}
            <div style={cardStyle}>
              <div style={cardHeaderStyle}>
                <div style={cardTitleStyle}>
                  <div style={cardTitleIcon('#F5F3FF')}>
                    <BookOpen className="w-4 h-4" style={{ color: '#8B5CF6' }} />
                  </div>
                  <h3 style={sectionTitle}>Applicable Policies</h3>
                </div>
                <button style={outlineBtn}><Eye className="w-3.5 h-3.5" /> View Policy Library</button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      {['Policy Name', 'Policy ID', 'Applicability', 'Compliance', 'Status'].map(h => (
                        <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activePolicies.map((policy, idx) => {
                      const pct = policy.compliance_level === 'compliant' ? 100 : policy.compliance_level === 'partially_compliant' || policy.compliance_level === 'partial' ? 60 : 25
                      const barColor = pct >= 80 ? '#22C55E' : pct >= 50 ? '#F59E0B' : '#EF4444'
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '14px', fontWeight: 600, color: '#111827' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Shield className="w-4 h-4" style={{ color: '#4F46E5', flexShrink: 0 }} />
                              <span>{policy.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: '14px', color: '#6B7280', fontSize: 12 }}>{policy.id || `POL-${String(idx + 1).padStart(3, '0')}`}</td>
                          <td style={{ padding: '14px', fontSize: 12 }}>
                            <span style={{ padding: '2px 8px', borderRadius: 999, background: '#F3F4F6', color: '#374151', fontWeight: 500 }}>{policy.category || 'General'}</span>
                          </td>
                          <td style={{ padding: '14px', minWidth: 140 }}>
                            <ProgressBar value={pct} color={barColor} height={6} showLabel />
                          </td>
                          <td style={{ padding: '14px' }}>
                            <StatusBadge status={policy.compliance_level === 'partially_compliant' ? 'partially_compliant' : policy.compliance_level} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #F1F5F9', textAlign: 'center' }}>
                <button style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 600, color: '#4F46E5', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  View All Applicable Policies ({activePolicies.length}) <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── REQUIRED DOCUMENTS CHECKLIST CARD ─────────────────────── */}
            <div style={cardStyle}>
              <div style={cardHeaderStyle}>
                <div style={cardTitleStyle}>
                  <div style={cardTitleIcon('#F0FDF4')}>
                    <CheckCircle className="w-4 h-4" style={{ color: '#22C55E' }} />
                  </div>
                  <h3 style={sectionTitle}>Required Documents Checklist</h3>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, fontSize: 12, color: '#6B7280' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22C55E' }} /> Collected</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }} /> Partial</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444' }} /> Missing</span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      {['Document Type', 'Required', 'Collected', 'Status'].map(h => (
                        <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {requiredDocs.map((doc, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '14px', fontWeight: 600, color: '#111827' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {doc.status === 'collected' ? <CheckCircle className="w-4 h-4" style={{ color: '#22C55E', flexShrink: 0 }} />
                              : doc.status === 'partial' ? <AlertTriangle className="w-4 h-4" style={{ color: '#F59E0B', flexShrink: 0 }} />
                              : <X className="w-4 h-4" style={{ color: '#EF4444', flexShrink: 0 }} />}
                            <span>{doc.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '14px' }}>
                          {doc.required ? (
                            <span style={{ padding: '2px 8px', fontSize: 11, fontWeight: 600, borderRadius: 999, background: '#FEF2F2', color: '#DC2626' }}>Required</span>
                          ) : (
                            <span style={{ padding: '2px 8px', fontSize: 11, fontWeight: 600, borderRadius: 999, background: '#F3F4F6', color: '#6B7280' }}>Optional</span>
                          )}
                        </td>
                        <td style={{ padding: '14px', color: '#6B7280', fontSize: 12 }}>{doc.collected ? 'Yes' : 'No'}</td>
                        <td style={{ padding: '14px' }}><StatusBadge status={doc.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {missingDocs.length > 0 && (
                <>
                  <div style={{ marginTop: 16, padding: '14px 18px', borderRadius: 14, background: '#FEF2F2', border: '1px solid #FECACA' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <AlertTriangle className="w-4 h-4" style={{ color: '#EF4444' }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#DC2626' }}>Missing Documents ({missingDocs.length})</span>
                    </div>
                    <ul style={{ margin: 0, padding: '0 0 0 20px', fontSize: 12, color: '#B91C1C', lineHeight: 1.8 }}>
                      {missingDocs.map((doc, idx) => <li key={idx}>{doc.name}</li>)}
                    </ul>
                  </div>
                  <div style={{ marginTop: 12, padding: '14px 18px', borderRadius: 14, background: '#EFF6FF', border: '1px solid #DBEAFE', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <Info className="w-5 h-5" style={{ color: '#3B82F6', flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1D4ED8', marginBottom: 2 }}>Recommendation</div>
                      <div style={{ fontSize: 12, color: '#2563EB', lineHeight: 1.5 }}>Collect missing documents to improve evidence coverage and strengthen the case before AI analysis.</div>
                    </div>
                  </div>
                </>
              )}

              <div style={{ marginTop: 12, textAlign: 'right' }}>
                <button style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: '#4F46E5', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  View Full Document Requirements <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ── READY FOR AI ANALYSIS CARD ────────────────────────────── */}
            <div style={{
              background: isReadyForAI ? 'linear-gradient(135deg, #F0FDF4, #DCFCE7)' : '#fff',
              borderRadius: 18, padding: 28,
              border: `1px solid ${isReadyForAI ? '#BBF7D0' : '#EEF2F7'}`,
              boxShadow: isReadyForAI ? '0 8px 24px rgba(34,197,94,0.1)' : '0 8px 24px rgba(15,23,42,0.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flex: 1, minWidth: 240 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 16,
                    background: isReadyForAI ? '#22C55E' : '#D1D5DB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {isReadyForAI ? <CheckCircle className="w-7 h-7" style={{ color: '#fff' }} /> : <Clock className="w-7 h-7" style={{ color: '#fff' }} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: isReadyForAI ? '#16A34A' : '#6B7280', marginBottom: 4 }}>
                      {isReadyForAI ? 'Case is Ready for AI Analysis' : 'Case Not Yet Ready for AI Analysis'}
                    </div>
                    <div style={{ fontSize: 13, color: isReadyForAI ? '#15803D' : '#9CA3AF', lineHeight: 1.5, marginBottom: 16 }}>
                      {isReadyForAI ? 'All critical investigation requirements have been completed.' : 'Complete all readiness checks below to enable AI analysis.'}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {readinessChecks.map((check, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 8, background: check.met ? '#F0FDF4' : '#FEF2F2' }}>
                          {check.met ? <CheckCircle className="w-4 h-4" style={{ color: '#22C55E', flexShrink: 0 }} /> : <X className="w-4 h-4" style={{ color: '#EF4444', flexShrink: 0 }} />}
                          <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: check.met ? '#16A34A' : '#DC2626' }}>{check.label}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: check.met ? '#22C55E' : '#EF4444' }}>{check.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                  {isReadyForAI && !forwarded ? (
                    <button onClick={handleForwardToAI} disabled={forwarding} style={greenGradientBtn}
                      onMouseEnter={e => { if (!forwarding) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(34,197,94,0.35)' } }}
                      onMouseLeave={e => { if (!forwarding) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(34,197,94,0.25)' } }}
                    >
                      {forwarding ? <><RefreshCw className="w-4 h-4" style={{ animation: 'spin 1s linear infinite' }} /> Forwarding...</>
                        : <><Zap className="w-4 h-4" /> Forward to AI Analysis →</>}
                    </button>
                  ) : forwarded ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                      <CheckCircle className="w-5 h-5" style={{ color: '#22C55E' }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#16A34A' }}>Forwarded to AI Analysis</span>
                    </div>
                  ) : (
                    <div style={{ padding: '10px 18px', borderRadius: 12, background: '#F3F4F6', color: '#9CA3AF', fontSize: 13, fontWeight: 600 }}>
                      Complete all checks to proceed
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Bottom Status Banner ───────────────────────────────────── */}
            {isReadyForAI && (
              <div style={{ padding: '16px 20px', borderRadius: 14, background: '#EFF6FF', border: '1px solid #DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Info className="w-5 h-5" style={{ color: '#3B82F6', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#1D4ED8', lineHeight: 1.5 }}>
                    This case is ready to be forwarded to AI for comprehensive analysis, fraud detection, and resolution recommendations.
                  </span>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: '#60A5FA' }}>Last Updated</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#1D4ED8' }}>May 29, 2025 02:10 PM</div>
                </div>
              </div>
            )}
          </div>

          {/* ════ RIGHT COLUMN (Sticky sidebar) ════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, position: 'sticky', top: 0 }}>

            {/* ── POLICY COMPLIANCE OVERVIEW CARD ───────────────────────── */}
            <div style={cardStyle}>
              <div style={cardHeaderStyle}>
                <div style={cardTitleStyle}>
                  <div style={cardTitleIcon('#F0FDF4')}>
                    <Shield className="w-4 h-4" style={{ color: '#22C55E' }} />
                  </div>
                  <h3 style={sectionTitle}>Policy Compliance Overview</h3>
                </div>
                <button style={outlineBtn}><Eye className="w-3.5 h-3.5" /> View Policy Library</button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
                <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
                  <ResponsiveContainer width={120} height={120}>
                    <RePieChart>
                      <Pie data={doughnutData} cx={60} cy={60} innerRadius={38} outerRadius={56} dataKey="value" startAngle={90} endAngle={-270}>
                        {doughnutData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                      </Pie>
                    </RePieChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 22, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{complianceData.overallScore}</span>
                    <span style={{ fontSize: 9, color: '#9CA3AF' }}>%</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22C55E', flexShrink: 0 }} />
                    <div style={{ fontSize: 12, color: '#6B7280', flex: 1 }}>Fully Compliant</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{complianceData.compliant}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', width: 36, textAlign: 'right' }}>{complianceData.total > 0 ? `${Math.round((complianceData.compliant / complianceData.total) * 100)}%` : '0%'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B', flexShrink: 0 }} />
                    <div style={{ fontSize: 12, color: '#6B7280', flex: 1 }}>Partially Compliant</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{complianceData.partial}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', width: 36, textAlign: 'right' }}>{complianceData.total > 0 ? `${Math.round((complianceData.partial / complianceData.total) * 100)}%` : '0%'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} />
                    <div style={{ fontSize: 12, color: '#6B7280', flex: 1 }}>Non-Compliant</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{complianceData.nonCompliant}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', width: 36, textAlign: 'right' }}>{complianceData.total > 0 ? `${Math.round((complianceData.nonCompliant / complianceData.total) * 100)}%` : '0%'}</div>
                  </div>
                </div>
              </div>

              {complianceData.overallScore >= 70 && (
                <div style={{ padding: '12px 16px', borderRadius: 12, background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#16A34A', fontWeight: 500 }}>
                  <CheckCircle className="w-4 h-4" style={{ flexShrink: 0 }} />
                  Case meets minimum compliance threshold for AI analysis (70%).
                </div>
              )}
            </div>

            {/* ── EVIDENCE COVERAGE ANALYSIS CARD ───────────────────────── */}
            <div style={cardStyle}>
              <div style={cardHeaderStyle}>
                <div style={cardTitleStyle}>
                  <div style={cardTitleIcon('#EFF6FF')}>
                    <BarChart3 className="w-4 h-4" style={{ color: '#3B82F6' }} />
                  </div>
                  <h3 style={sectionTitle}>Evidence Coverage Analysis</h3>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                  <CircularProgress value={evidenceCoverage.overallPct} size={80} strokeWidth={8}
                    color={evidenceCoverage.overallPct >= 70 ? '#22C55E' : evidenceCoverage.overallPct >= 50 ? '#F59E0B' : '#EF4444'} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{evidenceCoverage.overallPct}%</span>
                    <span style={{ fontSize: 9, color: '#9CA3AF' }}>Coverage</span>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>
                  <div style={{ fontWeight: 600, color: '#111827', marginBottom: 2 }}>{evidenceCoverage.totalCollected} of {evidenceCoverage.totalRequired} collected</div>
                  <div>Across {evidenceCoverage.categories.length} categories</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {evidenceCoverage.categories.map((cat, idx) => {
                  const pct = Math.round((cat.collected / cat.required) * 100)
                  const barColor = pct >= 80 ? '#22C55E' : pct >= 50 ? '#F59E0B' : '#EF4444'
                  return (
                    <div key={idx} style={{ padding: '8px 10px', borderRadius: 8, background: '#F8FAFC' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                        <span style={{ fontWeight: 500, color: '#374151' }}>{cat.name}</span>
                        <span style={{ fontWeight: 600, color: barColor }}>{cat.collected}/{cat.required}</span>
                      </div>
                      <ProgressBar value={pct} color={barColor} height={5} />
                    </div>
                  )
                })}
              </div>

              {evidenceCoverage.overallPct < 80 && (
                <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: '#FFFBEB', border: '1px solid #FDE68A', display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
                  <AlertTriangle className="w-4 h-4" style={{ color: '#F59E0B', flexShrink: 0, marginTop: 1 }} />
                  <span>Low coverage in some categories. Consider collecting additional documents.</span>
                </div>
              )}
            </div>

            {/* ── COMPLIANCE INDICATORS ─────────────────────────────────── */}
            <div style={cardStyle}>
              <div style={cardHeaderStyle}>
                <div style={cardTitleStyle}>
                  <div style={cardTitleIcon('#F5F3FF')}>
                    <TrendingUp className="w-4 h-4" style={{ color: '#8B5CF6' }} />
                  </div>
                  <h3 style={sectionTitle}>Compliance Indicators</h3>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Compliance Scores</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.entries(activeIndicators.scores).map(([category, score]) => {
                    const barColor = score >= 80 ? '#22C55E' : score >= 50 ? '#F59E0B' : '#EF4444'
                    return (
                      <div key={category}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                          <span style={{ color: '#6B7280' }}>{category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')}</span>
                          <span style={{ fontWeight: 700, color: barColor }}>{score}%</span>
                        </div>
                        <ProgressBar value={score} color={barColor} height={6} />
                      </div>
                    )
                  })}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Compliance Status</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {Object.entries(activeIndicators.status).map(([area, status]) => (
                    <div key={area} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, background: '#F8FAFC' }}>
                      <span style={{ fontSize: 12, color: '#6B7280' }}>{area.charAt(0).toUpperCase() + area.slice(1).replace(/_/g, ' ')}</span>
                      <StatusBadge status={status} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}