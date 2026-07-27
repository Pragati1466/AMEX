import { Mail, Phone, Globe, MapPin, Calendar, CheckCircle, Shield, DollarSign, Star, Package, TrendingUp } from 'lucide-react'
import IconBox from '../../shared/IconBox'
import { COLORS } from '../../../constants/theme'

function MerchantInfoBlock({ icon: Icon, label, value }) {
  return (
    <div style={{ padding: '12px 14px', borderRadius: 12, background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Icon className="w-3.5 h-3.5" style={{ color: '#9CA3AF' }} />
        <span style={{ fontSize: 11, fontWeight: 500, color: '#9CA3AF' }}>{label}</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{value}</div>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, growth, sublabel, color, bg }) {
  const isPositive = growth.startsWith('+')
  return (
    <div style={{ padding: '14px 12px', borderRadius: 14, background: bg || '#F8FAFC', textAlign: 'center', border: `1px solid ${color || '#E5E7EB'}20` }}>
      <IconBox icon={Icon} size={32} borderRadius={8} color={color} bg={bg || '#EEF2FF'} iconSize={16} margin="0 auto 8px" />
      <div style={{ fontSize: 10, fontWeight: 500, color: '#9CA3AF', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 2 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: isPositive ? COLORS.success : COLORS.danger }}>{growth}</div>
      <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 1 }}>{sublabel}</div>
    </div>
  )
}

export default function MerchantTab({ caseData }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.2fr', gap: 24, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Merchant Profile */}
        <div style={{ background: '#fff', borderRadius: 18, padding: 28, boxShadow: '0 8px 24px rgba(15,23,42,0.05)', border: '1px solid #EEF2F7' }}>
          <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flex: 1 }}>
              <div style={{
                width: 72, height: 72, borderRadius: 18,
                background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 28, fontWeight: 700, flexShrink: 0,
              }}>
                S
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
                    {caseData.merchant_name}
                  </h2>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', fontSize: 11, fontWeight: 600, borderRadius: 999, background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}>
                    <CheckCircle className="w-3 h-3" />
                    Verified
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#6B7280' }}>
                  <span>ID: {caseData.merchant_id}</span>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#D1D5DB' }} />
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
                    Active Merchant
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 24, marginTop: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Mail className="w-3.5 h-3.5" style={{ color: '#9CA3AF' }} />
                    <span style={{ fontSize: 13, color: '#374151' }}>{caseData.merchant_email}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Phone className="w-3.5 h-3.5" style={{ color: '#9CA3AF' }} />
                    <span style={{ fontSize: 13, color: '#374151' }}>{caseData.merchant_phone}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Globe className="w-3.5 h-3.5" style={{ color: '#9CA3AF' }} />
                    <span style={{ fontSize: 13, color: '#374151' }}>shopify-merchants.com</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Merchant KPIs */}
        <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 24px rgba(15,23,42,0.05)', border: '1px solid #EEF2F7', padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <KpiCard icon={Package} label="Total Orders" value="1,284" growth="+12.5%" sublabel="This Quarter" color={COLORS.primary} bg={COLORS.primaryLight} />
            <KpiCard icon={DollarSign} label="Revenue" value={'\u20B945.2L'} growth="+8.3%" sublabel="This Quarter" color={COLORS.success} bg={COLORS.successBg} />
            <KpiCard icon={Star} label="Avg. Rating" value="4.2" growth="+0.3" sublabel="Out of 5" color={COLORS.warning} bg={COLORS.warningBg} />
            <KpiCard icon={Shield} label="Dispute Rate" value="2.1%" growth="-0.4%" sublabel="vs Last Quarter" color={COLORS.purple} bg={COLORS.purpleBg} />
          </div>
        </div>

        {/* Merchant Details Grid */}
        <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 24px rgba(15,23,42,0.05)', border: '1px solid #EEF2F7', padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: '#111827' }}>Business Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <MerchantInfoBlock icon={Globe} label="Website" value="https://shopify-merchants.com" />
            <MerchantInfoBlock icon={MapPin} label="Address" value="San Francisco, CA 94105" />
            <MerchantInfoBlock icon={Calendar} label="Member Since" value="January 2020" />
            <MerchantInfoBlock icon={Package} label=" Product Categories" value="E-commerce, Retail" />
            <MerchantInfoBlock icon={TrendingUp} label="Monthly Volume" value={'\u20B915.2L'} />
            <MerchantInfoBlock icon={Shield} label="Verification Status" value="Tier 3 - Verified" />
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'sticky', top: 0 }}>
        <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 24px rgba(15,23,42,0.05)', border: '1px solid #EEF2F7', padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: '#111827' }}>Merchant Risk</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: '12px 14px', borderRadius: 12, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#16A34A', marginBottom: 2 }}>Low Risk Profile</div>
              <div style={{ fontSize: 11, color: '#6B7280' }}>High transaction volume, low dispute rate</div>
            </div>
            <div style={{ padding: '12px 14px', borderRadius: 12, background: '#EFF6FF', border: '1px solid #DBEAFE' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#2563EB', marginBottom: 2 }}>Previous Interactions</div>
              <div style={{ fontSize: 11, color: '#6B7280' }}>3 previous disputes resolved amicably</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}