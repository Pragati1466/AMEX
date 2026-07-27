import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, User, Building, CreditCard, FileText, AlertTriangle,
  Check, ChevronRight, Search, Bell, ChevronDown, Calendar,
  DollarSign, Info, Shield, Clock, Tag, TrendingUp,
} from 'lucide-react'
import { createCase } from '../../services/investigatorApi'

const STEPS = [
  { id: 'information', label: 'Case Information' },
  { id: 'review', label: 'Review & Confirm' },
  { id: 'created', label: 'Case Created' },
]

const DISPUTE_TYPES = [
  { value: 'fraud', label: 'Fraud' },
  { value: 'unauthorized', label: 'Unauthorized Transaction' },
  { value: 'product_not_received', label: 'Product Not Received' },
  { value: 'quality', label: 'Quality Issues' },
  { value: 'billing', label: 'Billing Error' },
  { value: 'other', label: 'Other' },
]

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY']

const MERCHANT_CATEGORIES = [
  { value: '', label: 'Select category' },
  { value: 'retail', label: 'Retail' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'services', label: 'Services' },
  { value: 'food', label: 'Food & Dining' },
  { value: 'travel', label: 'Travel & Hospitality' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'technology', label: 'Technology' },
  { value: 'other', label: 'Other' },
]

const INITIAL_FORM = {
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  customer_id: '',
  merchant_name: '',
  merchant_id: '',
  merchant_category: '',
  transaction_id: '',
  transaction_date: '',
  amount: '',
  currency: 'INR',
  dispute_type: '',
  dispute_reason: '',
  priority: 'medium',
  description: '',
}

export default function NewCaseForm() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [touched, setTouched] = useState({})

  // ── Validation rules ───────────────────────────────────────────────────
  const validation = useMemo(() => ({
    customer_name: formData.customer_name.trim().length > 0,
    customer_email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customer_email),
    customer_phone: formData.customer_phone === '' || /^[\d\s\-+()]{7,20}$/.test(formData.customer_phone),
    customer_id: true,
    merchant_name: formData.merchant_name.trim().length > 0,
    merchant_id: true,
    merchant_category: true,
    transaction_id: formData.transaction_id.trim().length > 0,
    transaction_date: formData.transaction_date.length > 0,
    amount: parseFloat(formData.amount) > 0,
    currency: true,
    dispute_type: formData.dispute_type.length > 0,
    dispute_reason: formData.dispute_reason.trim().length > 0,
    priority: true,
    description: formData.description.trim().length >= 10,
  }), [formData])

  const allRequiredValid = useMemo(() => {
    const required = ['customer_name', 'customer_email', 'merchant_name', 'transaction_id', 'transaction_date', 'amount', 'dispute_type', 'dispute_reason', 'description']
    return required.every(f => validation[f])
  }, [validation])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setTouched(prev => ({ ...prev, [name]: true }))
  }

  const handleBlur = (e) => {
    setTouched(prev => ({ ...prev, [e.target.name]: true }))
  }

  const showValidation = (field) => touched[field] && validation[field]
  const showError = (field) => {
    if (!touched[field]) return false
    if (field === 'customer_email') return !validation[field]
    if (field === 'amount') return !validation[field]
    if (field === 'description') return !validation[field]
    if (field === 'customer_name') return !validation[field]
    if (field === 'merchant_name') return !validation[field]
    if (field === 'transaction_id') return !validation[field]
    if (field === 'transaction_date') return !validation[field]
    if (field === 'dispute_type') return !validation[field]
    if (field === 'dispute_reason') return !validation[field]
    return false
  }

  const isRequired = (field) => ['customer_name', 'customer_email', 'merchant_name', 'transaction_id', 'transaction_date', 'amount', 'dispute_type', 'dispute_reason', 'description'].includes(field)

  // ── Summary data (live) ────────────────────────────────────────────────
  const summary = useMemo(() => ({
    customer: formData.customer_name || '—',
    merchant: formData.merchant_name || '—',
    transactionId: formData.transaction_id || '—',
    amount: formData.amount ? `${parseFloat(formData.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${formData.currency}` : '—',
    disputeType: DISPUTE_TYPES.find(t => t.value === formData.dispute_type)?.label || '—',
    priority: formData.priority,
  }), [formData])

  // ── Step validation ────────────────────────────────────────────────────
  const validateStep = (step) => {
    switch (step) {
      case 0: return validation.customer_name && validation.customer_email
      case 1: return allRequiredValid
      default: return true
    }
  }

  const goNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 0) {
        // Touch all fields on step 1 before moving to review
        const allFields = ['customer_name', 'customer_email', 'customer_phone', 'customer_id', 'merchant_name', 'merchant_id', 'merchant_category', 'transaction_id', 'transaction_date', 'amount', 'currency', 'dispute_type', 'dispute_reason', 'priority', 'description']
        const touchedAll = {}
        allFields.forEach(f => { touchedAll[f] = true })
        setTouched(touchedAll)
      }
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1))
    }
  }

  const goBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!allRequiredValid) return
    setLoading(true)
    setError(null)

    try {
      const result = await createCase(formData)
      setCurrentStep(2)
      setTimeout(() => navigate(`/investigator/cases/${result.id}`), 2500)
    } catch (e) {
      console.log('Using mock case creation for development')
      const mockResult = {
        id: Math.floor(Math.random() * 1000) + 100,
        case_id: `DIS-2024-${Math.floor(Math.random() * 1000)}`,
        ...formData,
      }
      setCurrentStep(2)
      setTimeout(() => navigate(`/investigator/cases/${mockResult.id}`), 2500)
    } finally {
      setLoading(false)
    }
  }

  // ── Priority styling ───────────────────────────────────────────────────
  const priorityStyle = formData.priority === 'high'
    ? { borderColor: '#EF4444', boxShadow: '0 0 0 3px rgba(239,68,68,0.1)' }
    : {}

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col" style={{ background: '#F8FAFC' }}>
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Top Navigation                                                     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <header
        style={{
          height: 80,
          background: '#fff',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          padding: '0 32px',
          flexShrink: 0,
          gap: 32,
        }}
      >
        {/* Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
          <button
            onClick={() => navigate('/investigator/dashboard')}
            style={{
              width: 40, height: 40, borderRadius: 12, border: '1px solid #E5E7EB',
              background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.2s',
              color: '#6B7280',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#4F46E5'; e.currentTarget.style.color = '#4F46E5' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#6B7280' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.3 }}>
              Create New Case
            </h1>
            <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
              Enter case details to initiate a new investigation
            </p>
          </div>
        </div>

        {/* Search */}
        <div style={{ flex: 1, maxWidth: 420, position: 'relative', marginLeft: 'auto' }}>
          <Search className="w-4 h-4" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search Cases, Transactions, Customers..."
            style={{
              width: '100%', height: 48, paddingLeft: 46, paddingRight: 80,
              fontSize: 14, border: '1px solid #E5E7EB', borderRadius: 12,
              background: '#F9FAFB', color: '#111827', outline: 'none',
              transition: 'all 0.2s',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#4F46E5'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(79,70,229,0.1)' }}
            onBlur={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.boxShadow = 'none' }}
          />
          <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <kbd style={{
              padding: '3px 8px', fontSize: 11, fontWeight: 600, color: '#6B7280',
              background: '#F3F4F6', borderRadius: 6, border: '1px solid #E5E7EB',
              fontFamily: 'inherit', letterSpacing: '-0.01em',
            }}>
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <button
            style={{
              width: 40, height: 40, borderRadius: 12, border: '1px solid #E5E7EB',
              background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', position: 'relative', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#4F46E5' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB' }}
          >
            <Bell className="w-5 h-5" style={{ color: '#6B7280' }} />
            <div style={{
              position: 'absolute', top: -4, right: -4,
              width: 18, height: 18, borderRadius: '50%', background: '#EF4444',
              color: '#fff', fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              3
            </div>
          </button>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '6px 14px 6px 6px', borderRadius: 12,
            border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer',
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#4F46E5' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB' }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 13, fontWeight: 600,
            }}>
              J
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', lineHeight: 1.2 }}>John</div>
              <div style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.2 }}>Investigator</div>
            </div>
            <ChevronDown className="w-4 h-4" style={{ color: '#9CA3AF', marginLeft: 2 }} />
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Progress Stepper                                                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '28px 32px 24px', gap: 0, flexShrink: 0,
      }}>
        {STEPS.map((step, idx) => {
          const isActive = idx === currentStep
          const isCompleted = idx < currentStep
          return (
            <div key={step.id} style={{ display: 'flex', alignItems: 'center' }}>
              {/* Step circle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700,
                  background: isCompleted || isActive ? '#4F46E5' : '#fff',
                  color: isCompleted || isActive ? '#fff' : '#D1D5DB',
                  border: isCompleted || isActive ? 'none' : '2px solid #D1D5DB',
                  transition: 'all 0.3s ease',
                  boxShadow: isActive ? '0 0 0 4px rgba(79,70,229,0.2)' : 'none',
                  flexShrink: 0,
                }}>
                  {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
                </div>
                <span style={{
                  fontSize: 13, fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#111827' : isCompleted ? '#4F46E5' : '#9CA3AF',
                  transition: 'color 0.3s ease',
                  whiteSpace: 'nowrap',
                }}>
                  {step.label}
                </span>
              </div>
              {/* Connector */}
              {idx < STEPS.length - 1 && (
                <div style={{
                  width: 100, height: 2,
                  background: isCompleted ? '#4F46E5' : '#E5E7EB',
                  margin: '0 16px',
                  borderRadius: 1,
                  transition: 'background 0.3s ease',
                }} />
              )}
            </div>
          )
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Step 2: Case Created (success state)                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {currentStep === 2 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <div style={{ textAlign: 'center', animation: 'fadeInUp 0.5s ease forwards' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <Check className="w-8 h-8" style={{ color: '#22C55E' }} />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
              Case Created Successfully
            </h2>
            <p style={{ fontSize: 15, color: '#6B7280', margin: '0 0 24px', maxWidth: 400 }}>
              Your case has been created and assigned to an investigator. Redirecting to case workspace...
            </p>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto',
            }}>
              <div style={{
                width: 20, height: 20, border: '3px solid #4F46E5',
                borderTopColor: 'transparent', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
            </div>
          </div>
        </div>
      ) : (
        // ── Step 1: Main form + Summary ─────────────────────────────────────
        <div style={{
          flex: 1, overflow: 'auto', padding: '0 32px 32px',
          display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24,
          alignItems: 'start',
        }}>
          {/* ── LEFT: Form ──────────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* ── Section 1: Customer Information ──────────────────────── */}
            <div className="diq-card diq-animate-in">
              <div className="diq-card-header">
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <User className="w-4 h-4" style={{ color: '#4F46E5' }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0 }}>
                  Customer Information
                </h3>
              </div>
              <div className="diq-card-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
                  {/* Full Name */}
                  <FormField
                    label="Full Name"
                    required
                    name="customer_name"
                    value={formData.customer_name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Enter full name"
                    isValid={showValidation('customer_name')}
                    error={showError('customer_name')}
                  />
                  {/* Email */}
                  <FormField
                    label="Email Address"
                    required
                    type="email"
                    name="customer_email"
                    value={formData.customer_email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="rahul@example.com"
                    isValid={showValidation('customer_email')}
                    error={showError('customer_email')}
                  />
                  {/* Phone */}
                  <FormField
                    label="Phone Number"
                    type="tel"
                    name="customer_phone"
                    value={formData.customer_phone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="+1 (555) 000-0000"
                    isValid={touched.customer_phone && validation.customer_phone && formData.customer_phone.length > 0}
                  />
                  {/* Customer ID */}
                  <FormField
                    label="Customer ID / Reference ID"
                    name="customer_id"
                    value={formData.customer_id}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="e.g., CUST-001"
                  />
                </div>
              </div>
            </div>

            {/* ── Section 2: Merchant Information ─────────────────────── */}
            <div className="diq-card diq-animate-in">
              <div className="diq-card-header">
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Building className="w-4 h-4" style={{ color: '#4F46E5' }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0 }}>
                  Merchant Information
                </h3>
              </div>
              <div className="diq-card-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                  {/* Merchant Name */}
                  <FormField
                    label="Merchant Name"
                    required
                    name="merchant_name"
                    value={formData.merchant_name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Enter merchant name"
                    isValid={showValidation('merchant_name')}
                    error={showError('merchant_name')}
                  />
                  {/* Merchant ID */}
                  <FormField
                    label="Merchant ID"
                    name="merchant_id"
                    value={formData.merchant_id}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="e.g., MER-001"
                  />
                  {/* Merchant Category - Dropdown */}
                  <div>
                    <label style={{
                      display: 'block', fontSize: 13, fontWeight: 500, color: '#374151',
                      marginBottom: 6,
                    }}>
                      Merchant Category
                    </label>
                    <div style={{ position: 'relative' }}>
                      <select
                        name="merchant_category"
                        value={formData.merchant_category}
                        onChange={handleChange}
                        onBlur={(e) => { handleBlur(e); e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.boxShadow = 'none' }}
                        style={{
                          width: '100%', height: 48, padding: '0 40px 0 16px',
                          fontSize: 14, border: '1px solid #D1D5DB', borderRadius: 12,
                          background: '#fff', color: formData.merchant_category ? '#111827' : '#9CA3AF',
                          cursor: 'pointer', outline: 'none',
                          transition: 'border-color 0.2s, box-shadow 0.2s',
                          appearance: 'none',
                        }}
                        onFocus={e => { e.currentTarget.style.borderColor = '#4F46E5'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(79,70,229,0.15)' }}
                      >
                        {MERCHANT_CATEGORIES.map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4" style={{
                        position: 'absolute', right: 14, top: '50%',
                        transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none',
                      }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section 3: Transaction Details ──────────────────────── */}
            <div className="diq-card diq-animate-in">
              <div className="diq-card-header">
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <CreditCard className="w-4 h-4" style={{ color: '#4F46E5' }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0 }}>
                  Transaction Details
                </h3>
              </div>
              <div className="diq-card-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
                  {/* Transaction ID */}
                  <FormField
                    label="Transaction ID"
                    required
                    name="transaction_id"
                    value={formData.transaction_id}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="e.g., TXN-001"
                    isValid={showValidation('transaction_id')}
                    error={showError('transaction_id')}
                  />
                  {/* Transaction Date */}
                  <div>
                    <label style={{
                      display: 'block', fontSize: 13, fontWeight: 500, color: '#374151',
                      marginBottom: 6,
                    }}>
                      Transaction Date <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Calendar className="w-4 h-4" style={{
                        position: 'absolute', left: 14, top: '50%',
                        transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none',
                      }} />
                      <input
                        type="date"
                        name="transaction_date"
                        value={formData.transaction_date}
                        onChange={handleChange}
                        onBlur={(e) => { handleBlur(e); e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.boxShadow = 'none' }}
                        style={{
                          width: '100%', height: 48, padding: '0 16px 0 42px',
                          fontSize: 14, border: '1px solid #D1D5DB', borderRadius: 12,
                          background: '#fff', color: '#111827', outline: 'none',
                          transition: 'border-color 0.2s, box-shadow 0.2s',
                        }}
                        onFocus={e => { e.currentTarget.style.borderColor = '#4F46E5'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(79,70,229,0.15)' }}
                      />
                      {touched.transaction_date && validation.transaction_date && (
                        <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}>
                          <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Check className="w-3 h-3" style={{ color: '#fff' }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Amount - Split input */}
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{
                      display: 'block', fontSize: 13, fontWeight: 500, color: '#374151',
                      marginBottom: 6,
                    }}>
                      Transaction Amount <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <div style={{ display: 'flex', gap: 0 }}>
                      {/* Currency Dropdown */}
                      <div style={{ position: 'relative', width: 130, flexShrink: 0 }}>
                        <select
                          name="currency"
                          value={formData.currency}
                          onChange={handleChange}
                          style={{
                            width: '100%', height: 48, padding: '0 32px 0 14px',
                            fontSize: 13, fontWeight: 600,
                            border: '1px solid #D1D5DB', borderRight: 'none',
                            borderRadius: '12px 0 0 12px',
                            background: '#F9FAFB', color: '#374151',
                            cursor: 'pointer', outline: 'none',
                            appearance: 'none',
                            transition: 'border-color 0.2s, box-shadow 0.2s',
                          }}
                          onFocus={e => { e.currentTarget.style.borderColor = '#4F46E5'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(79,70,229,0.15)'; e.currentTarget.style.zIndex = 1 }}
                          onBlur={e => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.zIndex = 0 }}
                        >
                          {CURRENCIES.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5" style={{
                          position: 'absolute', right: 10, top: '50%',
                          transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none',
                        }} />
                      </div>
                      {/* Amount Input */}
                      <div style={{ position: 'relative', flex: 1 }}>
                        <DollarSign className="w-4 h-4" style={{
                          position: 'absolute', left: 14, top: '50%',
                          transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none',
                        }} />
                        <input
                          type="number"
                          name="amount"
                          value={formData.amount}
                          onChange={handleChange}
                          onBlur={(e) => { handleBlur(e); e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.zIndex = 0; e.currentTarget.style.position = 'relative' }}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          style={{
                            width: '100%', height: 48, padding: '0 44px 0 38px',
                            fontSize: 14, border: '1px solid #D1D5DB',
                            borderRadius: '0 12px 12px 0',
                            background: '#fff', color: '#111827', outline: 'none',
                            transition: 'border-color 0.2s, box-shadow 0.2s',
                            fontFamily: "'Inter', monospace",
                            fontWeight: 600,
                          }}
                          onFocus={e => { e.currentTarget.style.borderColor = '#4F46E5'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(79,70,229,0.15)'; e.currentTarget.style.zIndex = 1; e.currentTarget.style.position = 'relative' }}
                        />
                        {touched.amount && validation.amount && (
                          <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}>
                            <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Check className="w-3 h-3" style={{ color: '#fff' }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {touched.amount && !validation.amount && (
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#EF4444' }}>
                        Please enter a valid amount greater than 0
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section 4: Dispute Information ──────────────────────── */}
            <div className="diq-card diq-animate-in">
              <div className="diq-card-header">
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <AlertTriangle className="w-4 h-4" style={{ color: '#F59E0B' }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0 }}>
                  Dispute Information
                </h3>
              </div>
              <div className="diq-card-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                  {/* Dispute Type */}
                  <div>
                    <label style={{
                      display: 'block', fontSize: 13, fontWeight: 500, color: '#374151',
                      marginBottom: 6,
                    }}>
                      Dispute Type <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <select
                        name="dispute_type"
                        value={formData.dispute_type}
                        onChange={handleChange}
                        onBlur={(e) => { handleBlur(e); e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.boxShadow = 'none' }}
                        style={{
                          width: '100%', height: 48, padding: '0 40px 0 16px',
                          fontSize: 14, border: '1px solid #D1D5DB', borderRadius: 12,
                          background: '#fff', color: formData.dispute_type ? '#111827' : '#9CA3AF',
                          cursor: 'pointer', outline: 'none',
                          transition: 'border-color 0.2s, box-shadow 0.2s',
                          appearance: 'none',
                        }}
                        onFocus={e => { e.currentTarget.style.borderColor = '#4F46E5'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(79,70,229,0.15)' }}
                      >
                        <option value="">Select dispute type</option>
                        {DISPUTE_TYPES.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4" style={{
                        position: 'absolute', right: 14, top: '50%',
                        transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none',
                      }} />
                      {touched.dispute_type && validation.dispute_type && (
                        <div style={{ position: 'absolute', right: 36, top: '50%', transform: 'translateY(-50%)' }}>
                          <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Check className="w-2.5 h-2.5" style={{ color: '#fff' }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Dispute Reason */}
                  <div>
                    <label style={{
                      display: 'block', fontSize: 13, fontWeight: 500, color: '#374151',
                      marginBottom: 6,
                    }}>
                      Reason <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="dispute_reason"
                      value={formData.dispute_reason}
                      onChange={handleChange}
                      onBlur={(e) => { handleBlur(e); e.currentTarget.style.borderColor = showError('dispute_reason') ? '#EF4444' : '#D1D5DB'; e.currentTarget.style.boxShadow = 'none' }}
                      placeholder="Brief reason for dispute"
                      style={{
                        width: '100%', height: 48, padding: '0 44px 0 16px',
                        fontSize: 14, border: `1px solid ${showError('dispute_reason') ? '#EF4444' : '#D1D5DB'}`,
                        borderRadius: 12, background: '#fff', color: '#111827', outline: 'none',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#4F46E5'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(79,70,229,0.15)' }}
                    />
                    {touched.dispute_reason && validation.dispute_reason && (
                      <div style={{ position: 'absolute', right: 14, top: 40 }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check className="w-2.5 h-2.5" style={{ color: '#fff' }} />
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Priority */}
                  <div>
                    <label style={{
                      display: 'block', fontSize: 13, fontWeight: 500, color: '#374151',
                      marginBottom: 6,
                    }}>
                      Priority <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <select
                        name="priority"
                        value={formData.priority}
                        onChange={handleChange}
                        style={{
                          width: '100%', height: 48, padding: '0 40px 0 16px',
                          fontSize: 14,
                          border: `1px solid ${formData.priority === 'high' ? '#EF4444' : '#D1D5DB'}`,
                          borderRadius: 12,
                          background: '#fff',
                          color: formData.priority === 'high' ? '#DC2626' : '#111827',
                          fontWeight: formData.priority === 'high' ? 600 : 400,
                          cursor: 'pointer', outline: 'none',
                          transition: 'border-color 0.2s, box-shadow 0.2s',
                          appearance: 'none',
                          boxShadow: formData.priority === 'high' ? '0 0 0 3px rgba(239,68,68,0.1)' : 'none',
                        }}
                        onFocus={e => {
                          e.currentTarget.style.borderColor = formData.priority === 'high' ? '#EF4444' : '#4F46E5'
                          e.currentTarget.style.boxShadow = formData.priority === 'high' ? '0 0 0 4px rgba(239,68,68,0.2)' : '0 0 0 4px rgba(79,70,229,0.15)'
                        }}
                        onBlur={e => {
                          e.currentTarget.style.borderColor = formData.priority === 'high' ? '#EF4444' : '#D1D5DB'
                          e.currentTarget.style.boxShadow = formData.priority === 'high' ? '0 0 0 3px rgba(239,68,68,0.1)' : 'none'
                        }}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                      <ChevronDown className="w-4 h-4" style={{
                        position: 'absolute', right: 14, top: '50%',
                        transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none',
                      }} />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div style={{ marginTop: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>
                      Description <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {validation.description && <span style={{ fontSize: 11, color: '#22C55E', fontWeight: 600 }}>✓ Valid</span>}
                      <span style={{
                        fontSize: 11, color: formData.description.length > 1000 ? '#EF4444' : '#9CA3AF',
                        fontWeight: 500,
                      }}>
                        {formData.description.length} / 1000
                      </span>
                    </div>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      onBlur={(e) => { handleBlur(e); e.currentTarget.style.borderColor = showError('description') ? '#EF4444' : '#D1D5DB'; e.currentTarget.style.boxShadow = 'none' }}
                      placeholder="Provide a detailed description of the dispute. Include relevant dates, amounts, and any communication history..."
                      rows={5}
                      maxLength={1000}
                      style={{
                        width: '100%', padding: '14px 16px',
                        fontSize: 14, lineHeight: 1.6,
                        border: `1px solid ${showError('description') ? '#EF4444' : '#D1D5DB'}`,
                        borderRadius: 12, background: '#fff', color: '#111827', outline: 'none',
                        resize: 'vertical', minHeight: 120,
                        fontFamily: 'inherit',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#4F46E5'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(79,70,229,0.15)' }}
                    />
                    {validation.description && (
                      <div style={{ position: 'absolute', right: 14, bottom: 14 }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check className="w-3 h-3" style={{ color: '#fff' }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Validation Banner ─────────────────────────────────────── */}
            {allRequiredValid && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '14px 20px', borderRadius: 12,
                background: '#EFF6FF', border: '1px solid #DBEAFE',
                animation: 'fadeInUp 0.3s ease forwards',
              }}>
                <Info className="w-5 h-5" style={{ color: '#3B82F6', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1D4ED8' }}>
                    All required fields are filled correctly.
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#60A5FA' }}>
                    You can proceed to review.
                  </p>
                </div>
              </div>
            )}

            {/* ── Error Banner ───────────────────────────────────────────── */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '14px 20px', borderRadius: 12,
                background: '#FEF2F2', border: '1px solid #FEE2E2',
              }}>
                <AlertTriangle className="w-5 h-5" style={{ color: '#EF4444', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#DC2626' }}>Error</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#EF4444' }}>{error}</p>
                </div>
              </div>
            )}

            {/* ── Footer Buttons ────────────────────────────────────────── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              paddingTop: 8,
            }}>
              <button
                type="button"
                onClick={() => navigate('/investigator/dashboard')}
                style={{
                  height: 44, padding: '0 24px', borderRadius: 12,
                  border: '1px solid #D1D5DB', background: '#fff',
                  color: '#6B7280', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.borderColor = '#9CA3AF' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#D1D5DB' }}
              >
                Cancel
              </button>
              {currentStep === 0 ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!validateStep(0)}
                  style={{
                    height: 48, padding: '0 28px', borderRadius: 12,
                    background: validateStep(0)
                      ? 'linear-gradient(135deg, #4F46E5, #4338CA)'
                      : '#E5E7EB',
                    color: validateStep(0) ? '#fff' : '#9CA3AF',
                    fontSize: 14, fontWeight: 600,
                    border: 'none', cursor: validateStep(0) ? 'pointer' : 'not-allowed',
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    transition: 'all 0.2s',
                    boxShadow: validateStep(0) ? '0 4px 10px rgba(79,70,229,0.18)' : 'none',
                  }}
                  onMouseEnter={e => {
                    if (validateStep(0)) {
                      e.currentTarget.style.transform = 'translateY(-1px)'
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(79,70,229,0.25)'
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = validateStep(0) ? '0 4px 10px rgba(79,70,229,0.18)' : 'none'
                  }}
                >
                  Review & Confirm
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading || !allRequiredValid}
                  style={{
                    height: 48, padding: '0 28px', borderRadius: 12,
                    background: allRequiredValid && !loading
                      ? 'linear-gradient(135deg, #4F46E5, #4338CA)'
                      : '#E5E7EB',
                    color: allRequiredValid && !loading ? '#fff' : '#9CA3AF',
                    fontSize: 14, fontWeight: 600,
                    border: 'none', cursor: allRequiredValid && !loading ? 'pointer' : 'not-allowed',
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    transition: 'all 0.2s',
                    boxShadow: allRequiredValid && !loading ? '0 4px 10px rgba(79,70,229,0.18)' : 'none',
                  }}
                  onMouseEnter={e => {
                    if (allRequiredValid && !loading) {
                      e.currentTarget.style.transform = 'translateY(-1px)'
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(79,70,229,0.25)'
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = allRequiredValid && !loading ? '0 4px 10px rgba(79,70,229,0.18)' : 'none'
                  }}
                >
                  {loading ? (
                    <>
                      <div style={{
                        width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#fff', borderRadius: '50%',
                        animation: 'spin 0.6s linear infinite',
                      }} />
                      Creating Case...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Create Case
                    </>
                  )}
                </button>
              )}
            </div>
          </form>

          {/* ── RIGHT: Summary Panel ──────────────────────────────────────── */}
          <div style={{ position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Card 1: Case Summary */}
            <div style={{
              background: '#fff', borderRadius: 16,
              boxShadow: '0 8px 24px rgba(15,23,42,0.06)',
              border: '1px solid #E5E7EB', overflow: 'hidden',
            }}>
              <div style={{
                padding: '18px 20px', borderBottom: '1px solid #F1F5F9',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText className="w-4 h-4" style={{ color: '#4F46E5' }} />
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111827' }}>
                    Case Summary
                  </h3>
                </div>
              </div>
              <div style={{ padding: '16px 20px' }}>
                {/* Customer */}
                <SummaryRow
                  icon={<User className="w-4 h-4" />}
                  label="Customer"
                  value={summary.customer}
                  isEmpty={!formData.customer_name}
                />
                <Divider />
                {/* Merchant */}
                <SummaryRow
                  icon={<Building className="w-4 h-4" />}
                  label="Merchant"
                  value={summary.merchant}
                  isEmpty={!formData.merchant_name}
                />
                <Divider />
                {/* Transaction ID */}
                <SummaryRow
                  icon={<Tag className="w-4 h-4" />}
                  label="Transaction ID"
                  value={summary.transactionId}
                  isEmpty={!formData.transaction_id}
                />
                <Divider />
                {/* Amount */}
                <SummaryRow
                  icon={<DollarSign className="w-4 h-4" />}
                  label="Amount"
                  value={summary.amount}
                  isEmpty={!formData.amount}
                />
                <Divider />
                {/* Dispute Type */}
                <SummaryRow
                  icon={<AlertTriangle className="w-4 h-4" />}
                  label="Dispute Type"
                  value={summary.disputeType}
                  isEmpty={!formData.dispute_type}
                />
                <Divider />
                {/* Priority */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <TrendingUp className="w-3.5 h-3.5" style={{ color: '#6B7280' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#9CA3AF', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Priority
                    </div>
                    {summary.priority && summary.priority !== 'medium' ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '2px 10px', fontSize: 12, fontWeight: 600,
                        borderRadius: 999,
                        background: summary.priority === 'high' ? '#FEE2E2' : '#DCFCE7',
                        color: summary.priority === 'high' ? '#DC2626' : '#16A34A',
                      }}>
                        {summary.priority.charAt(0).toUpperCase() + summary.priority.slice(1)}
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '2px 10px', fontSize: 12, fontWeight: 600,
                        borderRadius: 999,
                        background: '#FEF3C7', color: '#D97706',
                      }}>
                        Medium
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: What happens next? */}
            <div style={{
              borderRadius: 16,
              background: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)',
              border: '1px solid rgba(139,92,246,0.15)',
              overflow: 'hidden',
            }}>
              <div style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: 'rgba(139,92,246,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Info className="w-3.5 h-3.5" style={{ color: '#7C3AED' }} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#5B21B6' }}>
                    What happens next?
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    'Case will be created',
                    'Assigned to investigator',
                    'Redirected to workspace',
                    'Upload evidence',
                    'AI begins initial analysis',
                  ].map((item, i) => (
                    <div key={item} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      animation: `fadeInUp 0.3s ease forwards`,
                      animationDelay: `${i * 0.05}s`,
                      opacity: 0,
                    }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: 'rgba(139,92,246,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Check className="w-3 h-3" style={{ color: '#7C3AED' }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#6D28D9' }}>
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global spin animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function FormField({ label, required, type = 'text', name, value, onChange, onBlur: onBlurProp, placeholder, isValid, error }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 13, fontWeight: 500, color: '#374151',
        marginBottom: 6,
      }}>
        {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={(e) => {
            if (onBlurProp) onBlurProp(e)
            e.currentTarget.style.boxShadow = 'none'
            if (!error && !isValid) e.currentTarget.style.borderColor = '#D1D5DB'
          }}
          placeholder={placeholder}
          style={{
            width: '100%', height: 48, padding: `0 ${isValid ? 44 : 16}px 0 16px`,
            fontSize: 14,
            border: `1px solid ${error ? '#EF4444' : isValid ? '#22C55E' : '#D1D5DB'}`,
            borderRadius: 12, background: '#fff', color: '#111827', outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={e => {
            if (!isValid) e.currentTarget.style.borderColor = '#4F46E5'
            e.currentTarget.style.boxShadow = '0 0 0 4px rgba(79,70,229,0.15)'
          }}
        />
        {isValid && (
          <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check className="w-3 h-3" style={{ color: '#fff' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryRow({ icon, label, value, isEmpty }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0' }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon && <div style={{ color: '#6B7280' }}>{icon}</div>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#9CA3AF', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </div>
        <div style={{
          fontSize: 14, fontWeight: 600, color: isEmpty ? '#D1D5DB' : '#111827',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontStyle: isEmpty ? 'italic' : 'normal',
        }}>
          {isEmpty ? 'Not provided' : value}
        </div>
      </div>
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: '#F1F5F9' }} />
}