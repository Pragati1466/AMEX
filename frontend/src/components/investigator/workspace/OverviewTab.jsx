import { FileText, CheckCircle, AlertTriangle, Zap, Upload, Clock, Shield, Target, Calendar, BarChart3, RefreshCw, TrendingUp, User, Building, ChevronRight, Mail, Phone, Tag, AlertCircle } from 'lucide-react'
import IconBox from '../../shared/IconBox'
import { CircularProgress } from '../../shared/ProgressRing'
import { COLORS } from '../../../constants/theme'

function MetricCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 16px', borderRadius: 12,
      background: bg || '#F8FAFC',
      flex: 1, minWidth: 0,
      minHeight: 72,
    }}>
      <IconBox icon={Icon} size={36} borderRadius={10} color={color} bg={bg || '#EEF2FF'} iconSize={18} />
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <div style={{
          fontSize: 11, fontWeight: 500, color: '#9CA3AF',
          marginBottom: 2, textTransform: 'uppercase',
          letterSpacing: '0.03em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {label}
        </div>
        <div style={{
          fontSize: 15, fontWeight: 700, color: '#111827',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {value}
        </div>
      </div>
    </div>
  )
}

function PartyCard({ initial, name, email, phone, id, bg, color, onViewDetails }) {
  return (
    <div style={{
      padding: 16, borderRadius: 14, flex: 1,
      background: bg || '#F8FAFC',
      border: `1px solid ${color || '#E5E7EB'}20`,
      display: 'flex', flexDirection: 'column',
      minHeight: 210,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: color || '#4F46E5', display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: '#fff',
          fontSize: 16, fontWeight: 700, flexShrink: 0,
        }}>
          {initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{name}</div>
          <div style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Mail className="w-3 h-3 flex-shrink-0" />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <div style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Phone className="w-3 h-3 flex-shrink-0" />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{phone || '\u2014'}</span>
        </div>
        <div style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Tag className="w-3 h-3 flex-shrink-0" />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{id || '\u2014'}</span>
        </div>
      </div>
      <button
        onClick={onViewDetails}
        style={{
          marginTop: 12, width: '100%', height: 34, borderRadius: 10,
          border: `1px solid ${color || '#E5E7EB'}40`, background: '#fff',
          fontSize: 12, fontWeight: 600, color: color || '#4F46E5',
          cursor: 'pointer', transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = (color || '#4F46E5') + '10' }}
        onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
      >
        View Details <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  )
}

function QuickActionBtn({ icon: Icon, label, sublabel, color, borderColor, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', borderRadius: 12,
        border: `1px solid ${borderColor || '#E5E7EB'}`,
        background: '#fff', cursor: 'pointer',
        transition: 'all 0.2s', width: '100%', textAlign: 'left',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.borderColor = color || '#4F46E5' }}
      onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = borderColor || '#E5E7EB' }}
    >
      <IconBox icon={Icon} size={36} borderRadius={10} color={color} bg={`${color}15`} iconSize={18} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{label}</div>
        <div style={{ fontSize: 11, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sublabel}</div>
      </div>
      <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: '#9CA3AF' }} />
    </button>
  )
}

function LegendRow({ color, label, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: '#6B7280', flex: 1 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#111827', flexShrink: 0 }}>{count}</span>
    </div>
  )
}

export default function OverviewTab({ caseData, evidenceStats, progressTimeline, recentActivity, keyInsights, missingEvidence, onTabChange }) {
  return (
    <>
      {/* ═══ Top Row: 3-column grid ═══ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 24,
        marginBottom: 24,
        alignItems: 'stretch',
      }}>
        {/* ─── Card 1: Case Summary ─── */}
        <div className="diq-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <IconBox icon={FileText} size={32} borderRadius={10} color={COLORS.primary} bg={COLORS.primaryLight} iconSize={16} />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827' }}>Case Summary</h3>
            </div>
          </div>
          <div style={{ padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <p style={{
              fontSize: 14, lineHeight: 1.7, color: '#374151',
              margin: '0 0 20px',
              display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {caseData.description}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
              <MetricCard icon={AlertTriangle} label="Dispute Type" value={caseData.dispute_type?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())} color={COLORS.danger} bg={COLORS.dangerBg} />
              <MetricCard icon={TrendingUp} label="Priority" value="High" color={COLORS.warning} bg={COLORS.warningBg} />
              <MetricCard icon={Shield} label="AI Confidence" value={`${caseData.ai_confidence}%`} color={COLORS.purple} bg={COLORS.purpleBg} />
              <MetricCard icon={CheckCircle} label="Evidence" value={`${caseData.evidence_completion}%`} color={COLORS.success} bg={COLORS.successBg} />
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 'auto' }}>
              <PartyCard initial="RV" name={caseData.customer_name} email={caseData.customer_email} phone={caseData.customer_phone} id={caseData.customer_id} bg={COLORS.blueBg} color={COLORS.blue} onViewDetails={() => onTabChange('customer')} />
              <PartyCard initial="S" name={caseData.merchant_name} email={caseData.merchant_email} phone={caseData.merchant_phone} id={caseData.merchant_id} bg={COLORS.successBg} color={COLORS.success} onViewDetails={() => onTabChange('merchant')} />
            </div>
          </div>
        </div>

        {/* ─── Card 2: Evidence Completion ─── */}
        <div className="diq-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <IconBox icon={CheckCircle} size={32} borderRadius={10} color={COLORS.success} bg={COLORS.successBg} iconSize={16} />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827' }}>Evidence Completion</h3>
            </div>
          </div>
          <div style={{ padding: '24px 24px 20px', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 'auto' }}>
              <div style={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
                <CircularProgress value={caseData.evidence_completion} size={110} strokeWidth={10} color={COLORS.success} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 26, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{caseData.evidence_completion}%</span>
                  <span style={{ fontSize: 11, color: COLORS.success, fontWeight: 600 }}>Complete</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                <LegendRow color={COLORS.success} label="Uploaded" count={`${evidenceStats.uploaded} / ${evidenceStats.total}`} />
                <LegendRow color={COLORS.warning} label="Pending" count={`${evidenceStats.pending} / ${evidenceStats.total}`} />
                <LegendRow color={COLORS.danger} label="Missing" count={`${evidenceStats.missing} / ${evidenceStats.total}`} />
              </div>
            </div>
            <div style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid #FDE68A', background: '#FFFBEB', marginTop: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: COLORS.warning }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#92400E' }}>Missing Critical Evidence</span>
              </div>
              <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 12, color: '#B45309', lineHeight: 1.8 }}>
                {missingEvidence.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          </div>
        </div>

        {/* ─── Card 3: Quick Actions ─── */}
        <div className="diq-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <IconBox icon={Zap} size={32} borderRadius={10} color={COLORS.primary} bg={COLORS.primaryLight} iconSize={16} />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827' }}>Quick Actions</h3>
            </div>
          </div>
          <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <QuickActionBtn icon={Upload} label="Upload Evidence" sublabel="Add documents, images, emails" color={COLORS.primary} borderColor="#C7D2FE" onClick={() => onTabChange('evidence')} />
            <QuickActionBtn icon={Clock} label="Generate Timeline" sublabel="Auto-construct event sequence" color={COLORS.purple} borderColor="#DDD6FE" onClick={() => onTabChange('timeline')} />
            <QuickActionBtn icon={Shield} label="Validate Evidence" sublabel="Check completeness & consistency" color={COLORS.warning} borderColor="#FDE68A" onClick={() => {}} />
            <QuickActionBtn icon={Zap} label="Forward to AI" sublabel="Run AI reasoning pipeline" color={COLORS.success} borderColor="#BBF7D0" onClick={() => {}} />
          </div>
        </div>
      </div>

      {/* ═══ Bottom Row: 3-column grid ═══ */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 24, marginBottom: 24, alignItems: 'stretch',
      }}>
        {/* Case Progress */}
        <div className="diq-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock className="w-4 h-4 flex-shrink-0" style={{ color: COLORS.primary }} />
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111827' }}>Case Progress</h3>
            </div>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <div style={{ position: 'relative', paddingLeft: 28 }}>
              <div style={{ position: 'absolute', left: 11, top: 8, bottom: 8, width: 2, background: '#E5E7EB', borderRadius: 1 }} />
              {progressTimeline.map((item, i) => (
                <div key={i} style={{ position: 'relative', paddingBottom: i < progressTimeline.length - 1 ? 20 : 0 }}>
                  <div style={{
                    position: 'absolute', left: -22, top: 4,
                    width: item.completed ? 20 : item.current ? 22 : 18,
                    height: item.completed ? 20 : item.current ? 22 : 18,
                    borderRadius: '50%',
                    background: item.completed ? COLORS.success : item.current ? '#fff' : '#fff',
                    border: item.completed ? 'none' : item.current ? '2.5px solid #4F46E5' : '2px solid #D1D5DB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: item.current ? '0 0 0 4px rgba(79,70,229,0.15)' : 'none', zIndex: 1,
                  }}>
                    {item.completed && <CheckCircle className="w-4 h-4" style={{ color: '#fff' }} />}
                    {item.current && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4F46E5' }} />}
                  </div>
                  <div style={{ paddingLeft: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: item.completed || item.current ? 600 : 500, color: item.completed ? COLORS.success : item.current ? '#111827' : '#9CA3AF' }}>
                      {item.label}
                    </div>
                    {item.date && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{item.date}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="diq-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <RefreshCw className="w-4 h-4 flex-shrink-0" style={{ color: COLORS.primary }} />
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111827' }}>Recent Activity</h3>
            </div>
          </div>
          <div style={{ padding: '8px 16px' }}>
            {recentActivity.map((item, i) => {
              const Icon = item.icon
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 8px', borderRadius: 10, transition: 'background 0.2s', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <IconBox icon={Icon} size={28} borderRadius={8} color={item.color} bg={item.bg} iconSize={14} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.subtitle}</div>
                  </div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap', flexShrink: 0 }}>{item.time}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Key Insights */}
        <div className="diq-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChart3 className="w-4 h-4 flex-shrink-0" style={{ color: COLORS.primary }} />
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111827' }}>Key Insights</h3>
              <span style={{ marginLeft: 'auto', fontSize: 11, padding: '2px 8px', borderRadius: 999, background: '#EEF2FF', color: '#4F46E5', fontWeight: 600, flexShrink: 0 }}>AI</span>
            </div>
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {keyInsights.map((item, i) => {
              const Icon = item.icon
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 10, background: item.bg }}>
                  <IconBox icon={Icon} size={22} borderRadius={6} color={item.color} bg={`${item.color}20`} iconSize={12} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>{item.subtitle}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ═══ Bottom Recommendation Panel ═══ */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0,
        background: '#fff', borderRadius: 18,
        boxShadow: '0 8px 24px rgba(15,23,42,0.06)', border: '1px solid #EEF2F7',
      }}>
        <div style={{ textAlign: 'center', padding: '24px 20px' }}>
          <div style={{ position: 'relative', width: 110, height: 110, margin: '0 auto 12px' }}>
            <CircularProgress value={caseData.case_health} size={110} strokeWidth={10} color={caseData.case_health >= 70 ? COLORS.success : caseData.case_health >= 50 ? COLORS.warning : COLORS.danger} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 26, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{caseData.case_health}</span>
              <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 500 }}>/100</span>
            </div>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.success, marginBottom: 2 }}>Good</div>
          <div style={{ fontSize: 12, color: '#6B7280' }}>Investigation progressing well</div>
        </div>
        <div style={{ padding: '24px 20px', borderLeft: '1px solid #F1F5F9', borderRight: '1px solid #F1F5F9' }}>
          <IconBox icon={Target} size={40} borderRadius={12} color={COLORS.warning} bg={COLORS.warningBg} iconSize={20} margin="0 0 12px 0" />
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 4 }}>Request missing invoice from merchant</div>
          <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5, marginBottom: 14 }}>Contact the merchant to obtain the original invoice for transaction TXN-2025-0088421.</div>
          <button style={{
            height: 36, padding: '0 18px', borderRadius: 10,
            border: '1px solid #E5E7EB', background: '#fff', color: '#374151',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.borderColor = '#D1D5DB' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#E5E7EB' }}
          >Take Action</button>
        </div>
        <div style={{ textAlign: 'center', padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <IconBox icon={Calendar} size={48} borderRadius={12} color={COLORS.primary} bg={COLORS.primaryLight} iconSize={20} margin="0 0 12px 0" />
          <div style={{ fontSize: 24, fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', marginBottom: 2 }}>{caseData.estimated_resolution_days}</div>
          <div style={{ fontSize: 12, color: '#6B7280' }}>Based on current progress</div>
        </div>
      </div>
    </>
  )
}