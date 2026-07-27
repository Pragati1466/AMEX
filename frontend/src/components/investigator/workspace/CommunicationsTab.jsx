import { MessageSquare, Mail, Phone, Clock, CheckCircle, AlertTriangle, ChevronRight, Download, Eye, Archive } from 'lucide-react'
import IconBox from '../../shared/IconBox'
import { COLORS } from '../../../constants/theme'
import { formatDate } from '../../../utils/formatters'

function CommKPI({ icon: Icon, label, value, sublabel, color, bg }) {
  return (
    <div style={{ padding: '14px 12px', borderRadius: 14, background: bg || '#F8FAFC', textAlign: 'center', border: `1px solid ${color || '#E5E7EB'}20` }}>
      <IconBox icon={Icon} size={32} borderRadius={8} color={color} bg={bg || '#EEF2FF'} iconSize={16} margin="0 auto 8px" />
      <div style={{ fontSize: 10, fontWeight: 500, color: '#9CA3AF', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: '#9CA3AF' }}>{sublabel}</div>
    </div>
  )
}

function CommItem({ icon: Icon, from, subject, date, preview, type, color, bg }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderRadius: 12, transition: 'background 0.2s', cursor: 'pointer' }}
      onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <IconBox icon={Icon} size={36} borderRadius={10} color={color} bg={bg} iconSize={18} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{from}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="diq-badge diq-badge-gray" style={{ fontSize: 10, padding: '2px 8px' }}>{type}</span>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>{date}</span>
          </div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 2 }}>{subject}</div>
        <div style={{ fontSize: 12, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview}</div>
      </div>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.color = '#374151' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9CA3AF' }}
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
        <button style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.color = '#374151' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9CA3AF' }}
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

export default function CommunicationsTab() {
  const comms = [
    { icon: Mail, from: 'Rahul Verma (Customer)', subject: 'Dispute Follow-up: Order not received', date: 'Jun 18, 2025', preview: 'I have not received the product I ordered on June 15th...', type: 'Email', color: COLORS.primary, bg: COLORS.primaryLight },
    { icon: MessageSquare, from: 'Shopify Support (Merchant)', subject: 'Re: Order #ORD-88421 Status', date: 'Jun 17, 2025', preview: 'The order was shipped on June 16th via BlueDart...', type: 'Chat', color: COLORS.purple, bg: COLORS.purpleBg },
    { icon: Phone, from: 'Customer Support Call', subject: 'Phone Conversation Summary', date: 'Jun 16, 2025', preview: 'Customer called to report unauthorized transaction...', type: 'Call Log', color: COLORS.success, bg: COLORS.successBg },
    { icon: Mail, from: 'Rahul Verma (Customer)', subject: 'Initial Complaint - Unauthorized Charge', date: 'Jun 15, 2025', preview: 'I noticed a charge of ₹15,499 on my credit card...', type: 'Email', color: COLORS.primary, bg: COLORS.primaryLight },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Communications KPIs */}
      <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 24px rgba(15,23,42,0.05)', border: '1px solid #EEF2F7', padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <CommKPI icon={MessageSquare} label="Total Messages" value="12" sublabel="All Communications" color={COLORS.primary} bg={COLORS.primaryLight} />
          <CommKPI icon={Mail} label="Emails" value="8" sublabel="Exchanged" color={COLORS.purple} bg={COLORS.purpleBg} />
          <CommKPI icon={Phone} label="Calls" value="3" sublabel="Logged" color={COLORS.success} bg={COLORS.successBg} />
          <CommKPI icon={Clock} label="Last Activity" value="2 days ago" sublabel="Jun 18, 2025" color={COLORS.warning} bg={COLORS.warningBg} />
        </div>
      </div>

      {/* Communication Thread */}
      <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 24px rgba(15,23,42,0.05)', border: '1px solid #EEF2F7', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111827' }}>Communication Log</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <select style={{ height: 32, padding: '0 24px 0 10px', borderRadius: 8, fontSize: 12, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', cursor: 'pointer', outline: 'none', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}>
              <option>All Types</option>
              <option>Email</option>
              <option>Chat</option>
              <option>Call Log</option>
            </select>
          </div>
        </div>
        <div style={{ padding: '8px 16px' }}>
          {comms.map((item, i) => (
            <CommItem key={i} {...item} />
          ))}
        </div>
      </div>
    </div>
  )
}