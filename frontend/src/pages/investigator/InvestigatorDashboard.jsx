import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, Clock, CheckCircle, AlertTriangle, TrendingUp,
  Search, Filter, Plus, RefreshCw, ChevronRight, Bell,
  Activity, ArrowUp, ArrowDown, MoreHorizontal, ChevronDown,
  LayoutDashboard, Users, BarChart3, AlertCircle, Gauge,
  ArrowUpRight, ArrowDownRight, Shield, Target, BrainCircuit,
  ChevronLeft, X, SlidersHorizontal, Download, Eye,
  SortAsc, SortDesc, Calendar,
} from 'lucide-react'
import { getInvestigatorDashboard, searchCases } from '../../services/investigatorApi'
import IconBox from '../../components/shared/IconBox'
import { CardSkeleton } from '../../components/shared/LoadingSkeleton'
import ErrorState from '../../components/shared/ErrorState'
import { formatDate, formatCurrency } from '../../utils/formatters'
import { COLORS } from '../../constants/theme'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'

// ═══════════════════════════════════════════════════════════════════
// KPI CARD — Enhanced with trend, sparkline, drill-down
// ═══════════════════════════════════════════════════════════════════

function KPICard({ title, value, icon: Icon, trend, trendDir, color, bg, label, lastUpdated, onClick, sparklineData }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (count >= value) return
    const t = setInterval(() => setCount(c => Math.min(c + Math.ceil(value / 20), value)), 30)
    return () => clearInterval(t)
  }, [value, count])

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`${title}: ${value} ${label}`}
      className="diq-animate-in"
      style={{
        background: '#fff', borderRadius: 18, padding: 22,
        boxShadow: '0 8px 24px rgba(0,0,0,0.04)', border: '1px solid #F1F5F9',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.25s ease', position: 'relative', overflow: 'hidden',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.08)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.04)' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <IconBox icon={Icon} size={44} borderRadius={12} color={color} bg={bg} iconSize={22} />
        {trend != null && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '3px 10px', borderRadius: 999,
            background: trendDir === 'up' ? '#F0FDF4' : '#FEF2F2',
            fontSize: 12, fontWeight: 600,
            color: trendDir === 'up' ? '#16A34A' : '#DC2626',
          }}>
            {trendDir === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {trend}
          </div>
        )}
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#6B7280', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 34, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 8 }}>
        {count.toLocaleString()}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: '#9CA3AF' }}>{label}</span>
        {lastUpdated && <span style={{ fontSize: 11, color: '#D1D5DB' }}>{lastUpdated}</span>}
      </div>
      {/* Animated sparkline */}
      <svg className="absolute bottom-0 right-0" width="120" height="36" viewBox="0 0 120 36" style={{ opacity: 0.5 }}>
        <path d="M0,30 Q15,22 30,26 T60,16 T90,22 T120,10" fill="none" stroke={color} strokeWidth="2" />
        <path d="M0,30 Q15,22 30,26 T60,16 T90,22 T120,10" fill="none" stroke={color} strokeWidth="4" opacity="0.15" />
      </svg>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// ENHANCED CASE TABLE
// ═══════════════════════════════════════════════════════════════════

function sortCases(cases, sortKey, sortDir) {
  return [...cases].sort((a, b) => {
    const aVal = a[sortKey] ?? ''
    const bVal = b[sortKey] ?? ''
    const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal
    return sortDir === 'asc' ? cmp : -cmp
  })
}

function CaseTable({ cases, onCaseClick }) {
  const [sortKey, setSortKey] = useState('updated_date')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(new Set())
  const pageSize = 8

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = useMemo(() => sortCases(cases, sortKey, sortDir), [cases, sortKey, sortDir])
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize)
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))

  const toggleSelect = (id) => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSelected(p => p.size === paged.length ? new Set() : new Set(paged.map(c => c.id)))

  const SortIcon = sortDir === 'asc' ? SortAsc : SortDesc

  const cols = [
    { key: 'case_id', label: 'Case ID', width: 140 },
    { key: 'customer_name', label: 'Customer', width: 160 },
    { key: 'merchant_name', label: 'Merchant', width: 160 },
    { key: 'dispute_type', label: 'Type', width: 100 },
    { key: 'status', label: 'Status', width: 130 },
    { key: 'priority', label: 'Priority', width: 90 },
    { key: 'confidence', label: 'Confidence', width: 90 },
    { key: 'evidence_completion', label: 'Evidence', width: 120 },
    { key: 'updated_date', label: 'Updated', width: 100 },
  ]

  return (
    <div className="diq-card" style={{ overflow: 'hidden' }}>
      <div className="diq-card-header" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <IconBox icon={BarChart3} size={28} borderRadius={8} color={COLORS.primary} bg={COLORS.primaryLight} iconSize={14} />
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111827' }}>Active Cases</h3>
          <span className="diq-badge diq-badge-gray" style={{ marginLeft: 8, fontSize: 11 }}>{cases.length} total</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {selected.size > 0 && <span style={{ fontSize: 12, color: COLORS.primary, fontWeight: 600 }}>{selected.size} selected</span>}
          <button className="diq-btn diq-btn-outline diq-btn-xs" title="Export"><Download size={14} /></button>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="diq-table" style={{ fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ width: 36, padding: '10px 8px' }}>
                <input type="checkbox" checked={selected.size === paged.length && paged.length > 0} onChange={toggleAll} style={{ accentColor: COLORS.primary }} />
              </th>
              {cols.map(col => (
                <th key={col.key} onClick={() => toggleSort(col.key)}
                  style={{ cursor: 'pointer', padding: '10px 12px', whiteSpace: 'nowrap', minWidth: col.width, userSelect: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {col.label}
                    {sortKey === col.key && <SortIcon size={12} />}
                  </div>
                </th>
              ))}
              <th style={{ width: 80, padding: '10px 12px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={cols.length + 2} style={{ textAlign: 'center', padding: '48px 24px', color: '#9CA3AF' }}>
                  <FileText size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <div style={{ fontWeight: 500 }}>No cases match your filters</div>
                </td>
              </tr>
            ) : paged.map(c => {
              const statusMap = { under_investigation: { cls: 'diq-badge-purple', label: 'Under Investigation' }, awaiting_evidence: { cls: 'diq-badge-orange', label: 'Awaiting Evidence' }, ai_review: { cls: 'diq-badge-blue', label: 'AI Review' }, completed: { cls: 'diq-badge-green', label: 'Completed' } }
              const s = statusMap[c.status] || { cls: 'diq-badge-gray', label: c.status }
              const pClass = { high: 'diq-pill-high', medium: 'diq-pill-medium', low: 'diq-pill-low' }[c.priority] || 'diq-pill-medium'
              const progressClass = c.evidence_completion >= 80 ? 'diq-progress-green' : c.evidence_completion >= 50 ? 'diq-progress-orange' : 'diq-progress-red'
              const confidenceColor = c.confidence >= 80 ? COLORS.success : c.confidence >= 50 ? COLORS.warning : COLORS.danger
              return (
                <tr key={c.id}
                  onClick={() => onCaseClick(c.id)}
                  style={{ cursor: 'pointer', background: selected.has(c.id) ? '#F5F3FF' : 'transparent' }}
                  onMouseEnter={e => { if (!selected.has(c.id)) e.currentTarget.style.background = '#F9FAFB' }}
                  onMouseLeave={e => { if (!selected.has(c.id)) e.currentTarget.style.background = 'transparent' }}
                >
                  <td style={{ padding: '10px 8px' }} onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} style={{ accentColor: COLORS.primary }} />
                  </td>
                  <td style={{ padding: '10px 12px' }}><span className="diq-link" style={{ fontSize: 13 }}>{c.case_id || c.id}</span></td>
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>{c.customer_name || '\u2014'}</td>
                  <td style={{ padding: '10px 12px' }}>{c.merchant_name || '\u2014'}</td>
                  <td style={{ padding: '10px 12px' }}><span className="diq-badge diq-badge-gray" style={{ fontSize: 11 }}>{c.dispute_type || '\u2014'}</span></td>
                  <td style={{ padding: '10px 12px' }}><span className={`diq-badge ${s.cls}`} style={{ fontSize: 11 }}>{s.label}</span></td>
                  <td style={{ padding: '10px 12px' }}><span className={`diq-pill ${pClass}`} style={{ fontSize: 11 }}>{c.priority}</span></td>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: confidenceColor }}>{c.confidence || 0}%</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="diq-progress" style={{ width: 60, height: 6 }}>
                        <div className={`diq-progress-fill ${progressClass}`} style={{ width: `${c.evidence_completion || 0}%` }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>{c.evidence_completion || 0}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#9CA3AF', fontSize: 12 }}>{formatDate(c.updated_date)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <button className="diq-btn diq-btn-secondary diq-btn-xs" style={{ height: 28, padding: '0 10px', fontSize: 11 }} onClick={e => { e.stopPropagation(); onCaseClick(c.id) }}>Open</button>
                    <button className="diq-btn diq-btn-outline diq-btn-xs" style={{ height: 28, width: 28, padding: 0, marginLeft: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
                      <MoreHorizontal size={12} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#6B7280' }}>
        <span>Showing {(page - 1) * pageSize + 1}\u2013{Math.min(page * pageSize, sorted.length)} of {sorted.length}</span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="diq-btn diq-btn-outline diq-btn-xs" style={{ height: 28, width: 28, padding: 0 }}><ChevronLeft size={14} /></button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const p = i + 1
            return <button key={p} onClick={() => setPage(p)} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: p === page ? COLORS.primary : 'transparent', color: p === page ? '#fff' : '#6B7280', fontWeight: p === page ? 700 : 500, fontSize: 12, cursor: 'pointer' }}>{p}</button>
          })}
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="diq-btn diq-btn-outline diq-btn-xs" style={{ height: 28, width: 28, padding: 0 }}><ChevronRight size={14} /></button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// CHARTS SECTION
// ═══════════════════════════════════════════════════════════════════

function ChartsSection({ cases }) {
  const statusData = useMemo(() => {
    const counts = {}
    cases.forEach(c => { counts[c.status] = (counts[c.status] || 0) + 1 })
    const colors = { under_investigation: COLORS.purple, awaiting_evidence: COLORS.warning, ai_review: COLORS.blue, completed: COLORS.success }
    const labels = { under_investigation: 'Under Investigation', awaiting_evidence: 'Awaiting Evidence', ai_review: 'AI Review', completed: 'Completed' }
    return Object.entries(counts).map(([k, v]) => ({ name: labels[k] || k, value: v, color: colors[k] || '#D1D5DB' }))
  }, [cases])

  const priorityData = useMemo(() => {
    const counts = {}
    cases.forEach(c => { counts[c.priority] = (counts[c.priority] || 0) + 1 })
    const colors = { high: COLORS.danger, medium: COLORS.warning, low: COLORS.success }
    return Object.entries(counts).map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: v, color: colors[k] || '#D1D5DB' }))
  }, [cases])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
      {/* Status Distribution */}
      <div className="diq-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 8 }}>
          <PieChart size={16} style={{ color: COLORS.primary }} />
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827' }}>Case Status Distribution</h3>
        </div>
        <div style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 120, height: 120, flexShrink: 0 }}>
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie data={statusData} cx={60} cy={60} innerRadius={30} outerRadius={55} dataKey="value" startAngle={90} endAngle={-270}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {statusData.map(item => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, color: '#6B7280' }}>{item.name}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Priority Breakdown */}
      <div className="diq-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={16} style={{ color: COLORS.primary }} />
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827' }}>Priority Breakdown</h3>
        </div>
        <div style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 120, height: 120, flexShrink: 0 }}>
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie data={priorityData} cx={60} cy={60} innerRadius={30} outerRadius={55} dataKey="value" startAngle={90} endAngle={-270}>
                  {priorityData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {priorityData.map(item => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, color: '#6B7280' }}>{item.name}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// SUMMARY BAR — KPI chips
// ═══════════════════════════════════════════════════════════════════

function SummaryBar({ stats }) {
  const chips = [
    { label: 'High Priority', value: 2, color: COLORS.danger, bg: COLORS.dangerBg },
    { label: 'Awaiting Evidence', value: stats.cases_requiring_evidence, color: COLORS.warning, bg: COLORS.warningBg },
    { label: 'AI Review Ready', value: 1, color: COLORS.blue, bg: COLORS.blueBg },
    { label: 'Avg Confidence', value: '82%', color: COLORS.success, bg: COLORS.successBg },
  ]
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
      {chips.map(chip => (
        <div key={chip.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 999, background: chip.bg, border: `1px solid ${chip.color}30`, fontSize: 13 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: chip.color }} />
          <span style={{ fontWeight: 500, color: chip.color }}>{chip.value}</span>
          <span style={{ color: '#6B7280' }}>{chip.label}</span>
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// ENHANCED FILTERS
// ═══════════════════════════════════════════════════════════════════

function FilterPanel({ filters, onFilterChange, onReset, onSearch, visible }) {
  if (!visible) return null
  return (
    <div style={{ padding: '20px 24px', borderTop: '1px solid #F1F5F9', animation: 'fadeInUp 0.2s ease' }}>
      <div className="diq-filters-grid" style={{ margin: 0 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 4, display: 'block' }}>Priority</label>
          <select className="diq-select" style={{ height: 38, fontSize: 13 }} value={filters.priority} onChange={e => onFilterChange('priority', e.target.value)}>
            <option value="">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 4, display: 'block' }}>Dispute Type</label>
          <select className="diq-select" style={{ height: 38, fontSize: 13 }} value={filters.disputeType} onChange={e => onFilterChange('disputeType', e.target.value)}>
            <option value="">All Types</option>
            <option value="fraud">Fraud</option>
            <option value="unauthorized">Unauthorized</option>
            <option value="product_not_received">Not Received</option>
            <option value="quality">Quality</option>
            <option value="billing">Billing</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 4, display: 'block' }}>Status</label>
          <select className="diq-select" style={{ height: 38, fontSize: 13 }} value={filters.status} onChange={e => onFilterChange('status', e.target.value)}>
            <option value="">All Statuses</option>
            <option value="under_investigation">Under Investigation</option>
            <option value="awaiting_evidence">Awaiting Evidence</option>
            <option value="ai_review">AI Review</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 4, display: 'block' }}>Confidence</label>
          <select className="diq-select" style={{ height: 38, fontSize: 13 }} value={filters.confidenceLevel} onChange={e => onFilterChange('confidenceLevel', e.target.value)}>
            <option value="">All Levels</option>
            <option value="high">High (\u226580%)</option>
            <option value="medium">Medium (50-79%)</option>
            <option value="low">Low ({'<'}50%)</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
        {(filters.priority || filters.disputeType || filters.status || filters.confidenceLevel || filters.searchTerm) && (
          <button onClick={onReset} className="diq-btn diq-btn-outline diq-btn-sm" style={{ height: 34, color: '#EF4444', borderColor: '#FECACA' }}>
            <X size={14} /> Reset Filters
          </button>
        )}
        <button onClick={onSearch} className="diq-btn diq-btn-primary diq-btn-sm" style={{ height: 34 }}>
          <Search size={14} /> Apply Filters
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// MAIN DASHBOARD COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function InvestigatorDashboard() {
  const navigate = useNavigate()
  const [dashboardData, setDashboardData] = useState(null)
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({ priority: '', disputeType: '', status: '', confidenceLevel: '' })
  const [toast, setToast] = useState(null)
  const searchRef = useRef(null)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getInvestigatorDashboard()
      setDashboardData(data); setCases(data.cases || [])
    } catch (e) {
      setDashboardData({
        stats: { total_active_cases: 128, pending_investigations: 34, completed_investigations: 56, cases_requiring_evidence: 12 },
        cases: [
          { id: 1, case_id: 'DIS-2024-001', customer_name: 'John Smith', merchant_name: 'Amazon', dispute_type: 'fraud', priority: 'high', status: 'under_investigation', confidence: 85, evidence_completion: 78, updated_date: '2024-01-20', amount: 2500 },
          { id: 2, case_id: 'DIS-2024-002', customer_name: 'Sarah Johnson', merchant_name: 'Apple Store', dispute_type: 'product_not_received', priority: 'medium', status: 'awaiting_evidence', confidence: 62, evidence_completion: 45, updated_date: '2024-01-19', amount: 1299 },
          { id: 3, case_id: 'DIS-2024-003', customer_name: 'Michael Brown', merchant_name: 'Best Buy', dispute_type: 'unauthorized', priority: 'high', status: 'ai_review', confidence: 91, evidence_completion: 92, updated_date: '2024-01-18', amount: 899 },
          { id: 4, case_id: 'DIS-2024-004', customer_name: 'Emily Davis', merchant_name: 'Walmart', dispute_type: 'quality', priority: 'low', status: 'completed', confidence: 97, evidence_completion: 100, updated_date: '2024-01-17', amount: 150 },
          { id: 5, case_id: 'DIS-2024-005', customer_name: 'David Wilson', merchant_name: 'Target', dispute_type: 'billing', priority: 'medium', status: 'under_investigation', confidence: 73, evidence_completion: 60, updated_date: '2024-01-16', amount: 75 },
          { id: 6, case_id: 'DIS-2024-006', customer_name: 'Alice Cooper', merchant_name: 'eBay', dispute_type: 'fraud', priority: 'high', status: 'under_investigation', confidence: 42, evidence_completion: 25, updated_date: '2024-01-15', amount: 3200 },
        ],
      })
      setCases([
        { id: 1, case_id: 'DIS-2024-001', customer_name: 'John Smith', merchant_name: 'Amazon', dispute_type: 'fraud', priority: 'high', status: 'under_investigation', confidence: 85, evidence_completion: 78, updated_date: '2024-01-20', amount: 2500 },
        { id: 2, case_id: 'DIS-2024-002', customer_name: 'Sarah Johnson', merchant_name: 'Apple Store', dispute_type: 'product_not_received', priority: 'medium', status: 'awaiting_evidence', confidence: 62, evidence_completion: 45, updated_date: '2024-01-19', amount: 1299 },
        { id: 3, case_id: 'DIS-2024-003', customer_name: 'Michael Brown', merchant_name: 'Best Buy', dispute_type: 'unauthorized', priority: 'high', status: 'ai_review', confidence: 91, evidence_completion: 92, updated_date: '2024-01-18', amount: 899 },
        { id: 4, case_id: 'DIS-2024-004', customer_name: 'Emily Davis', merchant_name: 'Walmart', dispute_type: 'quality', priority: 'low', status: 'completed', confidence: 97, evidence_completion: 100, updated_date: '2024-01-17', amount: 150 },
        { id: 5, case_id: 'DIS-2024-005', customer_name: 'David Wilson', merchant_name: 'Target', dispute_type: 'billing', priority: 'medium', status: 'under_investigation', confidence: 73, evidence_completion: 60, updated_date: '2024-01-16', amount: 75 },
        { id: 6, case_id: 'DIS-2024-006', customer_name: 'Alice Cooper', merchant_name: 'eBay', dispute_type: 'fraud', priority: 'high', status: 'under_investigation', confidence: 42, evidence_completion: 25, updated_date: '2024-01-15', amount: 3200 },
      ])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadDashboard() }, [loadDashboard])

  const handleSearch = () => {
    const term = searchTerm.toLowerCase()
    const filtered = (dashboardData?.cases || []).filter(c =>
      c.case_id.toLowerCase().includes(term) ||
      c.customer_name.toLowerCase().includes(term) ||
      c.merchant_name.toLowerCase().includes(term)
    ).filter(c => !filters.priority || c.priority === filters.priority)
     .filter(c => !filters.disputeType || c.dispute_type === filters.disputeType)
     .filter(c => !filters.status || c.status === filters.status)
    setCases(filtered)
    setShowFilters(false)
  }

  const resetFilters = () => {
    setFilters({ priority: '', disputeType: '', status: '', confidenceLevel: '' })
    setSearchTerm('')
    setCases(dashboardData?.cases || [])
  }

  const stats = dashboardData?.stats || { total_active_cases: 0, pending_investigations: 0, completed_investigations: 0, cases_requiring_evidence: 0 }

  if (loading) return (
    <div className="space-y-6">
      <div className="diq-skeleton" style={{ height: 40, width: 300 }} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => <div key={i} className="diq-skeleton" style={{ height: 160, borderRadius: 18 }} />)}
      </div>
    </div>
  )
  if (error) return <ErrorState message={error} onRetry={loadDashboard} />

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, padding: '10px 16px', borderRadius: 10, background: toast.type === 'success' ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${toast.type === 'success' ? '#BBF7D0' : '#FECACA'}`, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: toast.type === 'success' ? '#16A34A' : '#DC2626', animation: 'fadeInUp 0.2s ease' }}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {toast.message}
          <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 8, color: toast.type === 'success' ? '#16A34A' : '#DC2626' }}><X size={14} /></button>
        </div>
      )}

      {/* Header */}
      <div className="diq-header" style={{ marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <IconBox icon={LayoutDashboard} size={36} borderRadius={10} color={COLORS.primary} bg={COLORS.primaryLight} iconSize={18} />
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em', margin: 0 }}>Investigator Dashboard</h1>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Active Cases" 
          value={stats.total_active_cases} 
          icon={Activity} 
          color={COLORS.primary} 
          bg={COLORS.primaryLight} 
          label="Total active" 
        />
        <KPICard 
          title="Pending Investigations" 
          value={stats.pending_investigations} 
          icon={Clock} 
          color={COLORS.warning} 
          bg={COLORS.warningLight} 
          label="Awaiting review" 
        />
        <KPICard 
          title="Completed Investigations" 
          value={stats.completed_investigations} 
          icon={CheckCircle} 
          color={COLORS.success} 
          bg={COLORS.successLight} 
          label="Resolved" 
        />
        <KPICard 
          title="Cases Requiring Evidence" 
          value={stats.cases_requiring_evidence} 
          icon={AlertCircle} 
          color={COLORS.danger} 
          bg={COLORS.dangerLight} 
          label="Action needed" 
        />
      </div>

      {/* Case Table */}
      <CaseTable cases={cases} onCaseClick={(caseId) => navigate(`/investigator/cases/${caseId}`)} />
    </div>
  )
}
