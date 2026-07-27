import { CreditCard, DollarSign, Clock, CheckCircle, TrendingUp, ArrowUp, ArrowDown, ChevronRight } from 'lucide-react'
import IconBox from '../../shared/IconBox'
import { COLORS } from '../../../constants/theme'
import { formatDate } from '../../../utils/formatters'

function TxKPI({ icon: Icon, label, value, sublabel, color, bg }) {
  return (
    <div style={{ padding: '14px 12px', borderRadius: 14, background: bg || '#F8FAFC', textAlign: 'center', border: `1px solid ${color || '#E5E7EB'}20` }}>
      <IconBox icon={Icon} size={32} borderRadius={8} color={color} bg={bg || '#EEF2FF'} iconSize={16} margin="0 auto 8px" />
      <div style={{ fontSize: 10, fontWeight: 500, color: '#9CA3AF', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: '#9CA3AF' }}>{sublabel}</div>
    </div>
  )
}

export default function TransactionsTab({ caseData }) {
  const payments = [
    { date: '2025-06-15', description: 'Payment to Shopify Merchants', method: 'Credit Card', amount: '\u20B915,499', status: 'Completed' },
    { date: '2025-06-10', description: 'Payment to Amazon India', method: 'UPI', amount: '\u20B92,499', status: 'Completed' },
    { date: '2025-06-05', description: 'Payment to Netflix', method: 'Credit Card', amount: '\u20B9499', status: 'Completed' },
    { date: '2025-06-02', description: 'Payment to Flipkart', method: 'Net Banking', amount: '\u20B91,000', status: 'Completed' },
    { date: '2025-05-28', description: 'Payment to Zomato', method: 'UPI', amount: '\u20B9850', status: 'Completed' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Transaction KPIs */}
      <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 24px rgba(15,23,42,0.05)', border: '1px solid #EEF2F7', padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <TxKPI icon={CreditCard} label="Total Transactions" value="24" sublabel="All Time" color={COLORS.primary} bg={COLORS.primaryLight} />
          <TxKPI icon={DollarSign} label="Total Volume" value={'\u20B93,42,500'} sublabel="Lifetime" color={COLORS.success} bg={COLORS.successBg} />
          <TxKPI icon={TrendingUp} label="Avg. Transaction" value={'\u20B914,271'} sublabel="Per Transaction" color={COLORS.warning} bg={COLORS.warningBg} />
          <TxKPI icon={Clock} label="Last Transaction" value="2 days ago" sublabel="Jun 15, 2025" color={COLORS.purple} bg={COLORS.purpleBg} />
        </div>
      </div>

      {/* Payment History Table */}
      <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 24px rgba(15,23,42,0.05)', border: '1px solid #EEF2F7', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #F1F5F9' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111827' }}>Payment History</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="diq-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Payment Method</th>
                <th>Amount</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((pmt, i) => (
                <tr key={i} style={{ cursor: 'pointer' }}>
                  <td style={{ color: '#6B7280', fontSize: 13 }}>{formatDate(pmt.date)}</td>
                  <td style={{ fontWeight: 500, fontSize: 13 }}>{pmt.description}</td>
                  <td><span className="diq-badge diq-badge-gray" style={{ fontSize: 11 }}>{pmt.method}</span></td>
                  <td style={{ fontWeight: 600, fontSize: 13 }}>{pmt.amount}</td>
                  <td><span className="diq-badge diq-badge-green">{pmt.status}</span></td>
                  <td className="text-right">
                    <button style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.primary }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB' }}
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
  )
}