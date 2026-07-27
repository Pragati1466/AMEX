import { Mail, Phone, MapPin, Calendar, CheckCircle, CreditCard, DollarSign, AlertTriangle, Shield, ChevronRight, ShoppingCart, Star, TrendingUp, TrendingDown } from 'lucide-react'
import IconBox from '../../shared/IconBox'
import { COLORS } from '../../../constants/theme'
import { formatDate } from '../../../utils/formatters'

function ContactChip({ icon: Icon, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <Icon className="w-3.5 h-3.5" style={{ color: '#9CA3AF', flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: '#374151' }}>{text}</span>
    </div>
  )
}

function SummaryMetric({ icon: Icon, label, value, sublabel, color, bg }) {
  return (
    <div style={{
      padding: '16px 14px', borderRadius: 14,
      background: bg || '#F8FAFC', textAlign: 'center',
      border: `2px solid ${color || '#E5E7EB'}30`,
      transition: 'all 0.2s',
    }}>
      <IconBox icon={Icon} size={44} borderRadius={12} color={color || '#fff'} bg={bg || color || '#6366F1'} iconSize={22} margin="0 auto 12px" />
      <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 2 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>{sublabel}</div>
    </div>
  )
}

export default function CustomerTab({ caseData }) {
  const transactions = [
    { date: '2025-06-15', tid: 'TXN-2025-0088421', merchant: 'Shopify Merchants', amt: '\u20B915,499', status: 'completed' },
    { date: '2025-06-10', tid: 'TXN-2025-0088001', merchant: 'Amazon India', amt: '\u20B92,499', status: 'completed' },
    { date: '2025-06-05', tid: 'TXN-2025-0087500', merchant: 'Netflix', amt: '\u20B9499', status: 'completed' },
    { date: '2025-06-02', tid: 'TXN-2025-0087200', merchant: 'Flipkart', amt: '\u20B91,000', status: 'completed' },
    { date: '2025-05-28', tid: 'TXN-2025-0086900', merchant: 'Zomato', amt: '\u20B9850', status: 'completed' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.2fr', gap: 24, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Customer Profile Card */}
        <div style={{ background: '#fff', borderRadius: 18, padding: 28, boxShadow: '0 8px 24px rgba(15,23,42,0.05)', border: '1px solid #EEF2F7' }}>
          <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flex: 1 }}>
              <div style={{
                width: 72, height: 72, borderRadius: 18,
                background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 28, fontWeight: 700, flexShrink: 0,
              }}>
                RV
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
                    {caseData.customer_name}
                  </h2>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', fontSize: 11, fontWeight: 600, borderRadius: 999, background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}>
                    <CheckCircle className="w-3 h-3" />
                    Verified
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#6B7280' }}>
                  <span>ID: {caseData.customer_id}</span>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#D1D5DB' }} />
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
                    Active
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 24, marginTop: 14 }}>
                  <ContactChip icon={Mail} text={caseData.customer_email} />
                  <ContactChip icon={Phone} text={caseData.customer_phone} />
                  <ContactChip icon={MapPin} text="Mumbai, India" />
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 20px', borderRadius: 14, background: '#F8FAFC', border: '1px solid #F1F5F9', textAlign: 'center', flexShrink: 0, minWidth: 160 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 6 }}>
                <Calendar className="w-4 h-4" style={{ color: COLORS.primary }} />
                <span style={{ fontSize: 12, fontWeight: 500, color: '#6B7280' }}>Customer Since</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 2 }}>Jan 15, 2023</div>
              <div style={{ fontSize: 12, color: '#9CA3AF' }}>2 Years 4 Months</div>
            </div>
          </div>
        </div>

        {/* KPI Summary */}
        <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 24px rgba(15,23,42,0.05)', border: '1px solid #EEF2F7', padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <SummaryMetric icon={ShoppingCart} label="Total Orders" value="1,284" sublabel={<><TrendingUp className="w-3 h-3" style={{ color: '#16A34A', display: 'inline', verticalAlign: 'middle', marginRight: 2 }} />+12.5% This Quarter</>} color="#6366F1" bg="#EEF2FF" />
            <SummaryMetric icon={DollarSign} label="Revenue" value={'\u20B945.2L'} sublabel={<><TrendingUp className="w-3 h-3" style={{ color: '#16A34A', display: 'inline', verticalAlign: 'middle', marginRight: 2 }} />+8.3% This Quarter</>} color="#F59E0B" bg="#FFFBEB" />
            <SummaryMetric icon={Star} label="Avg. Rating" value="4.2" sublabel={<><TrendingUp className="w-3 h-3" style={{ color: '#16A34A', display: 'inline', verticalAlign: 'middle', marginRight: 2 }} />+0.3 Out of 5</>} color="#10B981" bg="#F0FDF4" />
            <SummaryMetric icon={AlertTriangle} label="Dispute Rate" value="2.1%" sublabel={<><TrendingDown className="w-3 h-3" style={{ color: '#EF4444', display: 'inline', verticalAlign: 'middle', marginRight: 2 }} />-0.4% vs Last Quarter</>} color="#EF4444" bg="#FEF2F2" />
          </div>
        </div>

        {/* Transaction History */}
        <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 24px rgba(15,23,42,0.05)', border: '1px solid #EEF2F7', overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #F1F5F9' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111827' }}>Transaction History</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="diq-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Transaction ID</th>
                  <th>Merchant</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, i) => (
                  <tr key={i} style={{ cursor: 'pointer' }}>
                    <td style={{ color: '#6B7280', fontSize: 13 }}>{formatDate(tx.date)}</td>
                    <td><span style={{ fontWeight: 600, fontSize: 13, color: COLORS.primary }}>{tx.tid}</span></td>
                    <td style={{ fontSize: 13 }}>{tx.merchant}</td>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{tx.amt}</td>
                    <td><span className="diq-badge diq-badge-green">Completed</span></td>
                    <td className="text-right">
                      <button style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.primary; e.currentTarget.style.color = COLORS.primary }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#6B7280' }}
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'sticky', top: 0 }}>
        <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 24px rgba(15,23,42,0.05)', border: '1px solid #EEF2F7', padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: '#111827' }}>Risk Assessment</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: '12px 14px', borderRadius: 12, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#16A34A', marginBottom: 2 }}>Low Risk</div>
              <div style={{ fontSize: 11, color: '#6B7280' }}>Customer has good standing history</div>
            </div>
            <div style={{ padding: '12px 14px', borderRadius: 12, background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 2 }}>Previous Disputes</div>
              <div style={{ fontSize: 11, color: '#6B7280' }}>2 previous disputes, 1 resolved in favor</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}