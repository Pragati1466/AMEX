import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, User, Building, CreditCard, MessageSquare,
  FileText, Clock, CheckCircle, AlertTriangle, Info, Zap,
  Upload, BookOpen,
} from 'lucide-react'
import IconBox from '../../components/shared/IconBox'
import { formatDate, formatCurrency } from '../../utils/formatters'
import TopNavBar from '../../components/investigator/TopNavBar'
import EvidenceUploadCenter from '../../components/investigator/EvidenceUploadCenter'
import TimelineView from '../../components/investigator/TimelineView'
import PolicyMapping from '../../components/investigator/PolicyMapping'
import OverviewTab from '../../components/investigator/workspace/OverviewTab'
import CustomerTab from '../../components/investigator/workspace/CustomerTab'
import MerchantTab from '../../components/investigator/workspace/MerchantTab'
import TransactionsTab from '../../components/investigator/workspace/TransactionsTab'
import CommunicationsTab from '../../components/investigator/workspace/CommunicationsTab'

const TABS = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'customer', label: 'Customer', icon: User },
  { id: 'merchant', label: 'Merchant', icon: Building },
  { id: 'transactions', label: 'Transactions', icon: CreditCard },
  { id: 'communications', label: 'Communications', icon: MessageSquare },
  { id: 'evidence', label: 'Evidence', icon: Upload },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'policy', label: 'Policy & Summary', icon: BookOpen },
]

export default function CaseWorkspace() {
  const { caseId } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)

  const caseData = useMemo(() => ({
    id: parseInt(caseId) || 1,
    case_id: `DISP-2025-${String(10000 + (parseInt(caseId) || 1)).slice(1)}`,
    customer_name: 'Rahul Verma',
    customer_email: 'rahul.verma@email.com',
    customer_phone: '+91 98765 43210',
    customer_id: 'CUST-10482',
    merchant_name: 'Shopify Merchants Inc.',
    merchant_email: 'support@shopify-merchants.com',
    merchant_phone: '+1 (415) 555-0192',
    merchant_id: 'MER-88231',
    transaction_id: 'TXN-2025-0088421',
    transaction_date: '2025-06-15',
    dispute_type: 'fraud',
    dispute_reason: 'Unauthorized credit card transaction',
    priority: 'high',
    status: 'under_investigation',
    description: 'Customer claims an unauthorized transaction of \u20B915,499 was made using their credit card.',
    amount: 15499.00,
    currency: 'INR',
    submitted_date: '2025-06-16',
    submitted_time: '10:23 AM',
    evidence_completion: 72,
    ai_confidence: 84,
    case_health: 68,
    estimated_resolution_days: '2\u20133 Days',
  }), [caseId])

  const evidenceStats = useMemo(() => ({ uploaded: 18, pending: 5, missing: 2, total: 25 }), [])

  const progressTimeline = useMemo(() => [
    { label: 'Case Created', date: 'Jun 16, 2025', completed: true },
    { label: 'Evidence Uploaded', date: 'Jun 18, 2025', completed: true },
    { label: 'Timeline Generated', date: 'Jun 19, 2025', completed: true },
    { label: 'Evidence Validated', date: null, completed: false, current: true },
    { label: 'AI Analysis', date: null, completed: false },
    { label: 'Investigator Decision', date: null, completed: false },
  ], [])

  const recentActivity = useMemo(() => [
    { icon: FileText, title: 'Invoice uploaded', subtitle: 'Payment receipt from merchant', time: '2 min ago', color: '#4F46E5', bg: '#EEF2FF' },
    { icon: Zap, title: 'OCR completed', subtitle: 'Text extracted from invoice', time: '1 min ago', color: '#8B5CF6', bg: '#F5F3FF' },
    { icon: Clock, title: 'Timeline generated', subtitle: 'Transaction timeline ready', time: '5 min ago', color: '#F59E0B', bg: '#FFFBEB' },
    { icon: CheckCircle, title: 'Validation completed', subtitle: 'Evidence check passed', time: '10 min ago', color: '#22C55E', bg: '#F0FDF4' },
  ], [])

  const keyInsights = useMemo(() => [
    { icon: CheckCircle, title: 'Payment proof verified', subtitle: 'Transaction receipt matches claim', color: '#22C55E', bg: '#F0FDF4' },
    { icon: AlertTriangle, title: 'Merchant invoice missing', subtitle: 'Required for full validation', color: '#F59E0B', bg: '#FFFBEB' },
    { icon: Info, title: 'Delivery confirmation pending', subtitle: 'Awaiting POD from merchant', color: '#3B82F6', bg: '#EFF6FF' },
  ], [])

  const missingEvidence = useMemo(() => ['Merchant Invoice', 'Delivery Proof', 'Proof of Delivery (POD)'], [])

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600)
    return () => clearTimeout(timer)
  }, [])

  const getStatusBadge = (status) => {
    const map = {
      under_investigation: { cls: 'diq-badge-purple', label: 'Under Investigation' },
      awaiting_evidence: { cls: 'diq-badge-orange', label: 'Awaiting Evidence' },
      ai_review: { cls: 'diq-badge-blue', label: 'AI Review' },
      completed: { cls: 'diq-badge-green', label: 'Completed' },
    }
    return map[status] || { cls: 'diq-badge-blue', label: status?.replace(/_/g, ' ') || 'Assigned' }
  }

  const formatAmount = (val, cur) => {
    const num = parseFloat(val) || 0
    return `${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur || 'INR'}`
  }

  if (loading) {
    return (
      <div style={{ padding: 32, background: '#F8FAFC', minHeight: '100vh' }}>
        <div className="diq-skeleton" style={{ height: 24, width: 300, marginBottom: 24 }} />
        <div className="diq-skeleton" style={{ height: 100, width: '100%', marginBottom: 24 }} />
        <div className="diq-skeleton" style={{ height: 48, width: '100%', marginBottom: 32 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr', gap: 24 }}>
          {[1, 2, 3].map(i => <div key={i} className="diq-skeleton" style={{ height: 400 }} />)}
        </div>
      </div>
    )
  }

  const status = getStatusBadge(caseData.status)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F8FAFC' }}>
      <TopNavBar caseId={caseId} caseData={caseData} />

      {/* Main Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
        {/* Case Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <button onClick={() => navigate('/investigator/dashboard')}
                style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6B7280', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#4F46E5'; e.currentTarget.style.color = '#4F46E5' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#6B7280' }}>
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em', margin: 0 }}>{caseData.case_id}</h1>
              <span className={status.cls} style={{ fontSize: 12, padding: '4px 12px' }}>{status.label}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', fontSize: 12, fontWeight: 600, borderRadius: 999, background: '#FEF3C7', color: '#D97706' }}>
                <AlertTriangle className="w-3 h-3" /> High Priority
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Created {caseData.submitted_date} at {caseData.submitted_time}</span>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#D1D5DB' }} />
              <span>{caseData.dispute_type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#D1D5DB' }} />
              <span>{formatAmount(caseData.amount, caseData.currency)}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #E5E7EB', paddingBottom: 0 }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id
            const Icon = tab.icon
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', fontSize: 13, fontWeight: isActive ? 600 : 500, color: isActive ? '#4F46E5' : '#6B7280', border: 'none', borderBottom: isActive ? '2px solid #4F46E5' : '2px solid transparent', background: isActive ? '#fff' : 'transparent', cursor: 'pointer', transition: 'all 0.2s', borderRadius: '10px 10px 0 0', marginBottom: -1, whiteSpace: 'nowrap' }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.color = '#374151' } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6B7280' } }}>
                <IconBox icon={Icon} size={24} borderRadius={6} color={isActive ? '#4F46E5' : '#9CA3AF'} bg={isActive ? '#EEF2FF' : '#F3F4F6'} iconSize={14} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <OverviewTab
            caseData={caseData}
            evidenceStats={evidenceStats}
            progressTimeline={progressTimeline}
            recentActivity={recentActivity}
            keyInsights={keyInsights}
            missingEvidence={missingEvidence}
            onTabChange={setActiveTab}
          />
        )}
        {activeTab === 'customer' && <CustomerTab caseData={caseData} />}
        {activeTab === 'merchant' && <MerchantTab caseData={caseData} />}
        {activeTab === 'transactions' && <TransactionsTab caseData={caseData} />}
        {activeTab === 'communications' && <CommunicationsTab />}
        {activeTab === 'evidence' && <EvidenceUploadCenter caseId={caseId} />}
        {activeTab === 'timeline' && <TimelineView caseId={caseId} />}
        {activeTab === 'policy' && <PolicyMapping caseId={caseId} />}
      </div>
    </div>
  )
}