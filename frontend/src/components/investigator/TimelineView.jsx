import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import {
  Clock, RefreshCw, Calendar, Package, CreditCard, MessageSquare,
  CheckCircle, AlertTriangle, Info, ChevronRight, ChevronDown,
  Filter, Truck, DollarSign, FileText, Shield, Eye,
  Search, X, BarChart3, Target, Zap, ArrowUp,
} from 'lucide-react'
import { generateTimeline, getTimeline } from '../../services/investigatorApi'
import { formatDate, formatDateTime } from '../../utils/formatters'

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
  purple: '#8B5CF6',
  blue: '#3B82F6',
  teal: '#14B8A6',
  heading: '#111827',
  secondaryText: '#6B7280',
  mutedText: '#9CA3AF',
  cardBorder: '#EEF2F7',
}

// ══════════════════════════════════════════════════════════════════════════════
// EVENT TYPE DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════════

const EVENT_TYPES = [
  { value: 'purchase',     label: 'Purchase',     color: '#22C55E', bg: '#F0FDF4', icon: Package },
  { value: 'payment',      label: 'Payment',      color: '#3B82F6', bg: '#EFF6FF', icon: CreditCard },
  { value: 'communication',label: 'Communication', color: '#8B5CF6', bg: '#F5F3FF', icon: MessageSquare },
  { value: 'shipment',     label: 'Shipment',      color: '#F59E0B', bg: '#FFFBEB', icon: Truck },
  { value: 'dispute',      label: 'Dispute',       color: '#EF4444', bg: '#FEF2F2', icon: AlertTriangle },
  { value: 'evidence',     label: 'Evidence',      color: '#F59E0B', bg: '#FFFBEB', icon: FileText },
  { value: 'refund',       label: 'Refund',        color: '#14B8A6', bg: '#F0FDFA', icon: DollarSign },
  { value: 'investigation',label: 'Investigation', color: '#4F46E5', bg: '#EEF2FF', icon: Shield },
]

const eventTypeMap = Object.fromEntries(EVENT_TYPES.map(e => [e.value, e]))

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
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function TimelineView({ caseId }) {
  // ── State ─────────────────────────────────────────────────────────────────
  const [timeline, setTimeline] = useState(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [visibleCount, setVisibleCount] = useState(8)
  const [expandedEvents, setExpandedEvents] = useState(new Set())
  const [activeFilters, setActiveFilters] = useState(new Set())
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [showAllFilters, setShowAllFilters] = useState(false)
  const timelineRef = useRef(null)
  const [timelineLoaded, setTimelineLoaded] = useState(false)

  // ── Generate mock timeline events ──────────────────────────────────────────
  const getMockTimeline = useCallback(() => ({
    events: [
      { id: 1, type: 'purchase', title: 'Product Purchased', description: 'Customer purchased a laptop from Shopify Merchants for ₹15,499', timestamp: '2025-06-15T10:30:00Z', source: 'Customer', amount: '₹15,499', details: { 'Product': 'Laptop - Dell XPS 15', 'Payment Method': 'Credit Card' }, related_entities: ['Shopify Merchants'], evidence_references: [] },
      { id: 2, type: 'payment', title: 'Payment Processed', description: 'Payment of ₹15,499 was processed successfully', timestamp: '2025-06-15T10:31:00Z', source: 'System', amount: '₹15,499', details: { 'Transaction ID': 'TXN-2025-0088421', 'Status': 'Success' } },
      { id: 3, type: 'shipment', title: 'Order Shipped', description: 'Merchant confirmed shipment via BlueDart', timestamp: '2025-06-16T14:00:00Z', source: 'Merchant', details: { 'Tracking ID': 'BD-884215', 'Carrier': 'BlueDart' } },
      { id: 4, type: 'communication', title: 'Customer Contacted Support', description: 'Customer reported product not received', timestamp: '2025-06-18T09:15:00Z', source: 'Customer', details: { 'Channel': 'Email', 'Subject': 'Order Not Received' } },
      { id: 5, type: 'dispute', title: 'Dispute Filed', description: 'Customer filed dispute for unauthorized transaction', timestamp: '2025-06-20T10:23:00Z', source: 'System', details: { 'Dispute ID': caseId || 'DSP-001', 'Reason': 'Product Not Received' } },
      { id: 6, type: 'evidence', title: 'Invoice Uploaded', description: 'Customer uploaded payment receipt', timestamp: '2025-06-21T11:00:00Z', source: 'Customer', evidence_references: ['Payment_Receipt.pdf'] },
      { id: 7, type: 'investigation', title: 'Investigation Started', description: 'Case assigned to investigator for review', timestamp: '2025-06-22T08:00:00Z', source: 'System', details: { 'Investigator': 'John Doe', 'Priority': 'High' } },
      { id: 8, type: 'communication', title: 'Merchant Response', description: 'Merchant provided shipment proof and delivery confirmation', timestamp: '2025-06-23T15:30:00Z', source: 'Merchant', details: { 'Channel': 'Email', 'Proof': 'Delivery_Confirmation.pdf' } },
      { id: 9, type: 'refund', title: 'Refund Initiated', description: 'Merchant initiated refund for the transaction', timestamp: '2025-06-25T12:00:00Z', source: 'Merchant', amount: '₹15,499', details: { 'Refund ID': 'REF-2025-001', 'Status': 'Processing' } },
      { id: 10, type: 'evidence', title: 'Bank Statement Submitted', description: 'Customer provided bank statement showing the charge', timestamp: '2025-06-26T10:00:00Z', source: 'Customer', evidence_references: ['Bank_Statement_Jun2025.pdf'] },
    ],
    source: 'Mock Data',
  }), [caseId])

  // ── Load timeline ─────────────────────────────────────────────────────────
  const loadTimeline = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getTimeline(caseId)
      setTimeline(data)
      setTimelineLoaded(true)
    } catch (e) {
      console.log('Using mock timeline data for development')
      setTimeline(getMockTimeline())
      setTimelineLoaded(true)
      setError(null)
    } finally {
      setLoading(false)
    }
  }, [caseId, getMockTimeline])

  const handleGenerateTimeline = async () => {
    setGenerating(true)
    setError(null)
    try {
      const data = await generateTimeline(caseId)
      setTimeline(data)
      setTimelineLoaded(true)
      setVisibleCount(8)
    } catch (e) {
      console.log('Using mock timeline after generate failed')
      setTimeline(getMockTimeline())
      setTimelineLoaded(true)
      setVisibleCount(8)
      setError(null)
    } finally {
      setGenerating(false)
    }
  }

  useEffect(() => { loadTimeline() }, [loadTimeline])

  // ── Filter helpers ────────────────────────────────────────────────────────
  const toggleFilter = (type) => {
    setActiveFilters(prev => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
    setVisibleCount(8)
  }

  const clearFilters = () => {
    setActiveFilters(new Set())
    setDateRange({ start: '', end: '' })
    setVisibleCount(8)
  }

  // ── Filtered events ───────────────────────────────────────────────────────
  const filteredEvents = useMemo(() => {
    if (!timeline?.events) return []

    let events = [...timeline.events]

    // Filter by type
    if (activeFilters.size > 0) {
      events = events.filter(e => activeFilters.has(e.type))
    }

    // Filter by date range
    if (dateRange.start) {
      events = events.filter(e => new Date(e.timestamp) >= new Date(dateRange.start))
    }
    if (dateRange.end) {
      const endDate = new Date(dateRange.end)
      endDate.setHours(23, 59, 59, 999)
      events = events.filter(e => new Date(e.timestamp) <= endDate)
    }

    // Sort chronologically (newest first by default)
    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    return events
  }, [timeline, activeFilters, dateRange])

  const visibleEvents = filteredEvents.slice(0, visibleCount)
  const hasMore = visibleCount < filteredEvents.length

  // ── Timeline statistics ───────────────────────────────────────────────────
  const timelineStats = useMemo(() => {
    const total = filteredEvents.length
    const stats = EVENT_TYPES.map(et => ({
      ...et,
      count: filteredEvents.filter(e => e.type === et.value).length,
      pct: total > 0 ? Math.round((filteredEvents.filter(e => e.type === et.value).length / total) * 100) : 0,
    }))
    return { total, stats }
  }, [filteredEvents])

  // ── Key insights ──────────────────────────────────────────────────────────
  const keyInsights = useMemo(() => {
    if (!filteredEvents.length) return []
    const insights = []

    // Find first and last events
    const sorted = [...filteredEvents].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    const first = sorted[0]
    const last = sorted[sorted.length - 1]

    if (first && last) {
      const diffMs = new Date(last.timestamp) - new Date(first.timestamp)
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
      if (diffDays > 0) {
        insights.push({ text: `${diffDays} days spanned from first to last event`, icon: Clock })
      }
    }

    // Check for purchase-to-dispute gap
    const purchaseEvents = filteredEvents.filter(e => e.type === 'purchase')
    const disputeEvents = filteredEvents.filter(e => e.type === 'dispute')
    if (purchaseEvents.length > 0 && disputeEvents.length > 0) {
      const lastPurchase = purchaseEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
      const firstDispute = disputeEvents.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))[0]
      const gapMs = new Date(firstDispute.timestamp) - new Date(lastPurchase.timestamp)
      const gapDays = Math.round(gapMs / (1000 * 60 * 60 * 24))
      insights.push({ text: `${gapDays} days between purchase and dispute reported`, icon: AlertTriangle })
    }

    // Check communication count
    const commEvents = filteredEvents.filter(e => e.type === 'communication')
    if (commEvents.length > 0) {
      insights.push({ text: `${commEvents.length} communication event${commEvents.length > 1 ? 's' : ''} logged`, icon: MessageSquare })
    }

    // Evidence upload timing
    const evidenceEvents = filteredEvents.filter(e => e.type === 'evidence')
    if (evidenceEvents.length > 0 && disputeEvents.length > 0) {
      const firstEvidence = evidenceEvents.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))[0]
      const firstDispute = disputeEvents.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))[0]
      const gapMs = new Date(firstEvidence.timestamp) - new Date(firstDispute.timestamp)
      const gapDays = Math.round(gapMs / (1000 * 60 * 60 * 24))
      if (gapDays > 0) {
        insights.push({ text: `Evidence uploaded ${gapDays} day${gapDays > 1 ? 's' : ''} after dispute opened`, icon: FileText })
      } else {
        insights.push({ text: 'Evidence uploaded on the same day dispute was opened', icon: FileText })
      }
    }

    return insights.slice(0, 5)
  }, [filteredEvents])

  // ── Expand / collapse event ───────────────────────────────────────────────
  const toggleExpand = (eventId) => {
    setExpandedEvents(prev => {
      const next = new Set(prev)
      if (next.has(eventId)) {
        next.delete(eventId)
      } else {
        next.add(eventId)
      }
      return next
    })
  }

  // ── Get event type info ───────────────────────────────────────────────────
  const getEventTypeInfo = (type) => {
    return eventTypeMap[type] || { label: type, color: '#6B7280', bg: '#F3F4F6', icon: Info }
  }

  // ── Format date for timeline display ──────────────────────────────────────
  const formatEventDate = (timestamp) => {
    const d = new Date(timestamp)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = months[d.getMonth()]
    const day = d.getDate()
    const year = d.getFullYear()
    const hours = d.getHours().toString().padStart(2, '0')
    const minutes = d.getMinutes().toString().padStart(2, '0')
    return { date: `${month} ${day}, ${year}`, time: `${hours}:${minutes}` }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div>
      {/* Main Grid: Left (2.7fr) + Right (1.3fr) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2.7fr 1.3fr',
        gap: 24,
        alignItems: 'start',
      }}>
        {/* ════ LEFT COLUMN ════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ── Loading Skeleton ──────────────────────────────────────────── */}
          {loading && (
            <div style={cardStyle}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{
                  display: 'flex', gap: 16, padding: '16px 0',
                  borderBottom: i < 5 ? '1px solid #F1F5F9' : 'none',
                }}>
                  <div style={{ width: 60, textAlign: 'center', flexShrink: 0 }}>
                    <div className="diq-skeleton" style={{ width: 50, height: 14, margin: '0 auto 4px' }} />
                    <div className="diq-skeleton" style={{ width: 36, height: 12, margin: '0 auto' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 40 }}>
                    <div className="diq-skeleton" style={{ width: 36, height: 36, borderRadius: '50%' }} />
                    <div className="diq-skeleton" style={{ width: 2, height: 40, marginTop: 4 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="diq-skeleton" style={{ height: 90, borderRadius: 14 }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Error State ────────────────────────────────────────────────── */}
          {error && !loading && (
            <div style={{
              ...cardStyle, textAlign: 'center', padding: '40px 24px',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: '#FEF2F2', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <AlertTriangle className="w-6 h-6" style={{ color: '#EF4444' }} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 6 }}>Failed to Load Timeline</div>
              <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
                {error}
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={loadTimeline} style={outlineBtn}>
                  <RefreshCw className="w-3.5 h-3.5" /> Retry
                </button>
                <button onClick={handleGenerateTimeline} style={gradientBtn}>
                  <Clock className="w-4 h-4" /> Generate Timeline
                </button>
              </div>
            </div>
          )}

          {/* ── Empty State (no timeline) ──────────────────────────────────── */}
          {!timeline && !loading && !error && !generating && (
            <div style={cardStyle}>
              <div style={{
                textAlign: 'center', padding: '48px 24px',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
              }}>
                <div style={{
                  width: 80, height: 80, borderRadius: 20,
                  background: '#EEF2FF', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', marginBottom: 20,
                }}>
                  <Clock className="w-9 h-9" style={{ color: '#4F46E5' }} />
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
                  No Timeline Generated
                </div>
                <div style={{ fontSize: 13, color: '#6B7280', maxWidth: 400, lineHeight: 1.6, marginBottom: 24 }}>
                  Generate a chronological timeline to visualize all events related to this dispute, including purchases, payments, communications, and evidence submissions.
                </div>
                <button
                  onClick={handleGenerateTimeline}
                  disabled={generating}
                  style={gradientBtn}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(79,70,229,0.25)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(79,70,229,0.18)' }}
                >
                  {generating ? (
                    <><RefreshCw className="w-4 h-4" style={{ animation: 'spin 1s linear infinite' }} /> Generating...</>
                  ) : (
                    <><Clock className="w-4 h-4" /> Generate Timeline</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── Generating State ────────────────────────────────────────────── */}
          {generating && !timeline && (
            <div style={cardStyle}>
              <div style={{ textAlign: 'center', padding: '40px 24px' }}>
                <RefreshCw className="w-10 h-10" style={{
                  color: '#4F46E5', margin: '0 auto 16px',
                  animation: 'spin 1s linear infinite',
                }} />
                <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
                  Building Timeline
                </div>
                <div style={{ fontSize: 13, color: '#6B7280' }}>
                  AI is analyzing case events to construct a chronological timeline...
                </div>
              </div>
            </div>
          )}

          {/* ── CASE TIMELINE CARD ─────────────────────────────────────────── */}
          {timeline && !loading && (
            <div style={cardStyle} ref={timelineRef}>
              <div style={cardHeaderStyle}>
                <div>
                  <div style={cardTitleStyle}>
                    <div style={cardTitleIcon('#EEF2FF')}>
                      <Clock className="w-4 h-4" style={{ color: '#4F46E5' }} />
                    </div>
                    <h3 style={sectionTitle}>Case Timeline</h3>
                  </div>
                  <div style={{
                    fontSize: 12, color: '#6B7280', marginTop: 4, marginLeft: 42,
                  }}>
                    Complete chronological view of all case events
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <select style={{
                    height: 34, padding: '0 28px 0 10px', borderRadius: 10,
                    border: '1px solid #E5E7EB', background: '#fff',
                    fontSize: 12, fontWeight: 500, color: '#374151',
                    cursor: 'pointer', outline: 'none', appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
                  }}>
                    <option>Expand All</option>
                    <option>Collapse All</option>
                  </select>
                  <button
                    onClick={handleGenerateTimeline}
                    disabled={generating}
                    style={gradientBtn}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(79,70,229,0.25)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(79,70,229,0.18)' }}
                  >
                    {generating ? (
                      <><RefreshCw className="w-4 h-4" style={{ animation: 'spin 1s linear infinite' }} /> Generating...</>
                    ) : (
                      <><Zap className="w-4 h-4" /> Generate Timeline</>
                    )}
                  </button>
                </div>
              </div>

              {/* ── Active filter indicator ────────────────────────────────── */}
              {(activeFilters.size > 0 || dateRange.start || dateRange.end) && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  marginBottom: 16, padding: '8px 14px', borderRadius: 10,
                  background: '#EEF2FF', border: '1px solid #C7D2FE',
                  fontSize: 12, color: '#4F46E5', fontWeight: 500,
                }}>
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filters active</span>
                  <span style={{ width: 1, height: 14, background: '#C7D2FE' }} />
                  <span>{filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} found</span>
                  <button
                    onClick={clearFilters}
                    style={{
                      marginLeft: 'auto', background: 'none', border: 'none',
                      color: '#EF4444', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Clear All
                  </button>
                </div>
              )}

              {/* ── No events match filters ────────────────────────────────── */}
              {filteredEvents.length === 0 && timeline && (
                <div style={{
                  textAlign: 'center', padding: '40px 20px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                }}>
                  <Calendar className="w-12 h-12" style={{ color: '#D1D5DB' }} />
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#6B7280' }}>No events match current filters</div>
                  <button onClick={clearFilters} style={{ fontSize: 12, color: '#4F46E5', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                    Clear filters to see all events
                  </button>
                </div>
              )}

              {/* ── Timeline Events ────────────────────────────────────────── */}
              {filteredEvents.length > 0 && (
                <>
                  {/* Timeline container */}
                  <div style={{ position: 'relative', padding: '4px 0' }}>
                    {visibleEvents.map((event, index) => {
                      const typeInfo = getEventTypeInfo(event.type)
                      const EventIcon = typeInfo.icon
                      const { date, time } = formatEventDate(event.timestamp)
                      const isExpanded = expandedEvents.has(event.id || index)
                      const isLast = index === visibleEvents.length - 1

                      return (
                        <div
                          key={event.id || index}
                          style={{
                            display: 'flex', gap: 16,
                            opacity: 1,
                            animation: timelineLoaded ? `fadeInUp 0.5s ease ${index * 0.08}s both` : 'none',
                          }}
                        >
                          {/* Left: Date/Time */}
                          <div style={{
                            width: 70, textAlign: 'right', flexShrink: 0,
                            paddingTop: 10,
                          }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', lineHeight: 1.3 }}>
                              {date}
                            </div>
                            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>
                              {time}
                            </div>
                          </div>

                          {/* Center: Icon + Vertical line */}
                          <div style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            width: 40, flexShrink: 0,
                          }}>
                            <div style={{
                              width: 38, height: 38, borderRadius: '50%',
                              background: typeInfo.bg,
                              border: `2px solid ${typeInfo.color}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              position: 'relative', zIndex: 2,
                              animation: timelineLoaded ? `scaleIn 0.4s ease ${index * 0.08 + 0.15}s both` : 'none',
                              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                              cursor: 'pointer',
                            }}
                              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = `0 0 0 4px ${typeInfo.color}20` }}
                              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none' }}
                            >
                              <EventIcon className="w-4 h-4" style={{ color: typeInfo.color }} />
                            </div>
                            {!isLast && (
                              <div style={{
                                width: 2, flex: 1, minHeight: 24,
                                background: 'linear-gradient(to bottom, #E5E7EB, #F1F5F9)',
                                animation: timelineLoaded ? `lineGrow 0.6s ease ${index * 0.08 + 0.3}s both` : 'none',
                              }} />
                            )}
                          </div>

                          {/* Right: Event Card */}
                          <div style={{
                            flex: 1, marginBottom: isLast ? 0 : 12,
                            animation: timelineLoaded ? `fadeInRight 0.5s ease ${index * 0.08 + 0.1}s both` : 'none',
                          }}>
                            <div style={{
                              background: '#fff',
                              borderRadius: 14,
                              padding: '16px 18px',
                              border: '1px solid #F1F5F9',
                              transition: 'all 0.25s ease',
                              cursor: 'pointer',
                            }}
                              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(15,23,42,0.08)'; e.currentTarget.style.borderColor = '#E5E7EB' }}
                              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#F1F5F9' }}
                              onClick={() => toggleExpand(event.id || index)}
                            >
                              {/* Top row: Title, Badge, Amount */}
                              <div style={{
                                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                    padding: '2px 10px', fontSize: 11, fontWeight: 600,
                                    borderRadius: 999, background: typeInfo.bg, color: typeInfo.color,
                                    whiteSpace: 'nowrap',
                                  }}>
                                    <EventIcon className="w-3 h-3" />
                                    {typeInfo.label}
                                  </span>
                                  <span style={{
                                    fontSize: 13, fontWeight: 500, color: '#6B7280',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  }}>
                                    {event.source || ''}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                  {event.amount && (
                                    <span style={{
                                      fontSize: 13, fontWeight: 700, color: '#111827',
                                    }}>
                                      {event.amount}
                                    </span>
                                  )}
                                  <ChevronDown className="w-4 h-4" style={{
                                    color: '#9CA3AF',
                                    transition: 'transform 0.2s',
                                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                  }} />
                                </div>
                              </div>

                              {/* Title */}
                              <div style={{
                                fontSize: 15, fontWeight: 600, color: '#111827',
                                marginTop: 8, lineHeight: 1.3,
                              }}>
                                {event.title}
                              </div>

                              {/* Description */}
                              <div style={{
                                fontSize: 13, color: '#6B7280', lineHeight: 1.6,
                                marginTop: 4,
                              }}>
                                {event.description}
                              </div>

                              {/* Expanded Details */}
                              {isExpanded && (
                                <div style={{
                                  marginTop: 14, paddingTop: 14,
                                  borderTop: '1px solid #F1F5F9',
                                  animation: 'fadeIn 0.2s ease',
                                }}>
                                  {/* Details table */}
                                  {event.details && Object.keys(event.details).length > 0 && (
                                    <div style={{
                                      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
                                      marginBottom: 12,
                                    }}>
                                      {Object.entries(event.details).map(([key, value]) => (
                                        <div key={key} style={{
                                          padding: '8px 12px', borderRadius: 8,
                                          background: '#F8FAFC',
                                        }}>
                                          <div style={{ fontSize: 11, fontWeight: 500, color: '#9CA3AF', marginBottom: 2 }}>
                                            {key.charAt(0).toUpperCase() + key.slice(1)}
                                          </div>
                                          <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                                            {value}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Related entities */}
                                  {event.related_entities && event.related_entities.length > 0 && (
                                    <div style={{ marginBottom: 12 }}>
                                      <div style={{
                                        fontSize: 11, fontWeight: 600, color: '#9CA3AF',
                                        textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8,
                                      }}>
                                        Related Entities
                                      </div>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {event.related_entities.map((entity, idx) => (
                                          <span key={idx} style={{
                                            padding: '3px 10px', fontSize: 11, fontWeight: 600,
                                            borderRadius: 999, background: '#F3F4F6', color: '#374151',
                                          }}>
                                            {entity}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Evidence references */}
                                  {event.evidence_references && event.evidence_references.length > 0 && (
                                    <div>
                                      <div style={{
                                        fontSize: 11, fontWeight: 600, color: '#9CA3AF',
                                        textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8,
                                      }}>
                                        Related Evidence
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {event.evidence_references.map((ref, idx) => (
                                          <div key={idx} style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            padding: '6px 10px', borderRadius: 8,
                                            background: '#F0FDF4', fontSize: 12, color: '#16A34A',
                                          }}>
                                            <CheckCircle className="w-3.5 h-3.5" />
                                            <span>{ref}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* View details button */}
                                  <button style={{
                                    marginTop: 14, height: 34, padding: '0 14px', borderRadius: 10,
                                    border: '1px solid #E5E7EB', background: '#fff',
                                    fontSize: 12, fontWeight: 600, color: '#4F46E5',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                                    transition: 'all 0.2s',
                                  }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#EEF2FF'; e.currentTarget.style.borderColor = '#C7D2FE' }}
                                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#E5E7EB' }}
                                  >
                                    <Eye className="w-3.5 h-3.5" /> View Full Details
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* ── Load More ────────────────────────────────────────────── */}
                  {hasMore && (
                    <div style={{ textAlign: 'center', marginTop: 20 }}>
                      <button
                        onClick={() => setVisibleCount(prev => prev + 8)}
                        style={{
                          ...outlineBtn, height: 42, padding: '0 28px',
                          fontSize: 13, fontWeight: 600, color: '#4F46E5',
                          borderColor: '#C7D2FE', borderRadius: 12,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#EEF2FF'; e.currentTarget.style.borderColor = '#4F46E5' }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#C7D2FE' }}
                      >
                        <Clock className="w-4 h-4" />
                        Load More Events
                        <span style={{
                          padding: '2px 8px', borderRadius: 999,
                          background: '#EEF2FF', color: '#4F46E5',
                          fontSize: 11, fontWeight: 700,
                        }}>
                          +{filteredEvents.length - visibleCount}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Event count summary */}
                  <div style={{
                    marginTop: 16, paddingTop: 16, borderTop: '1px solid #F1F5F9',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    fontSize: 12, color: '#9CA3AF',
                  }}>
                    <span>Showing {Math.min(visibleCount, filteredEvents.length)} of {filteredEvents.length} events</span>
                    <span>{timeline?.source || 'Chronological order'}</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ════ RIGHT COLUMN (Sticky sidebar) ════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, position: 'sticky', top: 0 }}>

          {/* ── TIMELINE CONTROLS CARD ─────────────────────────────────────── */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <div style={cardTitleStyle}>
                <div style={cardTitleIcon('#EEF2FF')}>
                  <Filter className="w-4 h-4" style={{ color: '#4F46E5' }} />
                </div>
                <h3 style={sectionTitle}>Timeline Controls</h3>
              </div>
              {(activeFilters.size > 0 || dateRange.start || dateRange.end) && (
                <button onClick={clearFilters} style={{
                  ...outlineBtn, height: 28, padding: '0 10px', fontSize: 10, color: '#EF4444',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#FECACA'; e.currentTarget.style.background = '#FEF2F2' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.background = '#fff' }}
                >
                  Reset
                </button>
              )}
            </div>

            {/* Event Types Filter Grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6,
              marginBottom: 20,
            }}>
              {EVENT_TYPES.map((et) => {
                const isActive = activeFilters.has(et.value)
                const Icon = et.icon
                return (
                  <button
                    key={et.value}
                    onClick={() => toggleFilter(et.value)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      padding: '10px 4px', borderRadius: 10,
                      background: isActive ? et.color : '#fff',
                      border: isActive ? `1px solid ${et.color}` : '1px solid #E5E7EB',
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = et.bg
                        e.currentTarget.style.borderColor = et.color
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = '#fff'
                        e.currentTarget.style.borderColor = '#E5E7EB'
                      }
                    }}
                  >
                    <Icon className="w-4 h-4" style={{ color: isActive ? '#fff' : et.color }} />
                    <span style={{
                      fontSize: 9, fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#fff' : '#6B7280',
                      whiteSpace: 'nowrap',
                    }}>
                      {et.label}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Date Range */}
            <div>
              <div style={{
                fontSize: 11, fontWeight: 600, color: '#6B7280',
                textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8,
              }}>
                Date Range
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Calendar className="w-3.5 h-3.5" style={{
                    position: 'absolute', left: 10, top: '50%',
                    transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none',
                  }} />
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => { setDateRange(prev => ({ ...prev, start: e.target.value })); setVisibleCount(8) }}
                    style={{
                      width: '100%', height: 34, padding: '0 10px 0 30px',
                      fontSize: 11, borderRadius: 8,
                      border: '1px solid #E5E7EB', background: '#F9FAFB',
                      color: '#111827', outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = '#4F46E5'}
                    onBlur={e => e.currentTarget.style.borderColor = '#E5E7EB'}
                  />
                </div>
                <span style={{ fontSize: 11, color: '#D1D5DB' }}>→</span>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Calendar className="w-3.5 h-3.5" style={{
                    position: 'absolute', left: 10, top: '50%',
                    transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none',
                  }} />
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => { setDateRange(prev => ({ ...prev, end: e.target.value })); setVisibleCount(8) }}
                    style={{
                      width: '100%', height: 34, padding: '0 10px 0 30px',
                      fontSize: 11, borderRadius: 8,
                      border: '1px solid #E5E7EB', background: '#F9FAFB',
                      color: '#111827', outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = '#4F46E5'}
                    onBlur={e => e.currentTarget.style.borderColor = '#E5E7EB'}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── TIMELINE STATISTICS CARD ───────────────────────────────────── */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <div style={cardTitleStyle}>
                <div style={cardTitleIcon('#F0FDF4')}>
                  <BarChart3 className="w-4 h-4" style={{ color: '#22C55E' }} />
                </div>
                <h3 style={sectionTitle}>Timeline Statistics</h3>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {/* Total Events KPI */}
              <div style={{
                gridColumn: '1 / -1',
                padding: '14px 16px', borderRadius: 12,
                background: '#F8FAFC', border: '1px solid #F1F5F9',
                textAlign: 'center', marginBottom: 4,
              }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#4F46E5', lineHeight: 1.2 }}>
                  {timelineStats.total}
                </div>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#9CA3AF' }}>
                  Total Events
                </div>
              </div>

              {timelineStats.stats.map((stat) => (
                <div key={stat.value} style={{
                  padding: '10px 8px', borderRadius: 10,
                  background: stat.bg, border: `1px solid ${stat.color}20`,
                  textAlign: 'center',
                }}>
                  <stat.icon className="w-4 h-4" style={{ color: stat.color, margin: '0 auto 4px' }} />
                  <div style={{ fontSize: 16, fontWeight: 700, color: stat.color, lineHeight: 1.2 }}>
                    {stat.count}
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 500, color: '#6B7280', marginTop: 1 }}>
                    {stat.label}
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: stat.color, marginTop: 1 }}>
                    {stat.pct}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── KEY INSIGHTS CARD ───────────────────────────────────────────── */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <div style={cardTitleStyle}>
                <div style={cardTitleIcon('#F5F3FF')}>
                  <Target className="w-4 h-4" style={{ color: '#8B5CF6' }} />
                </div>
                <h3 style={sectionTitle}>Key Insights</h3>
                <span style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 999,
                  background: '#EEF2FF', color: '#4F46E5', fontWeight: 600,
                  marginLeft: 4,
                }}>
                  AI
                </span>
              </div>
            </div>

            {keyInsights.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '20px 0', color: '#9CA3AF', fontSize: 12,
              }}>
                No insights available yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {keyInsights.map((insight, idx) => {
                  const Icon = insight.icon
                  return (
                    <div key={idx} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '10px 12px', borderRadius: 10,
                      background: '#F8FAFC', border: '1px solid #F1F5F9',
                      transition: 'all 0.2s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#F3F4F6' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC' }}
                    >
                      <div style={{
                        width: 24, height: 24, borderRadius: 6,
                        background: '#EEF2FF', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
                      }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: '#4F46E5' }} />
                      </div>
                      <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>
                        {insight.text}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {keyInsights.length > 0 && (
              <div style={{ marginTop: 12, textAlign: 'right' }}>
                <button style={{
                  background: 'none', border: 'none', fontSize: 12, fontWeight: 600,
                  color: '#4F46E5', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                  View Full Insights <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.6); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes lineGrow {
          from { height: 0; }
          to { height: 100%; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}