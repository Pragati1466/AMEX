/**
 * DisputeIQ Theme Constants
 * Centralized color palette and design tokens for Module 1
 */

export const COLORS = {
  // Brand
  primary: '#4F46E5',
  primaryHover: '#4338CA',
  primaryLight: '#EEF2FF',
  primary100: '#E0E7FF',

  // Status
  success: '#22C55E',
  successBg: '#F0FDF4',
  successBorder: '#BBF7D0',
  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  warningBorder: '#FDE68A',
  danger: '#EF4444',
  dangerBg: '#FEF2F2',
  dangerBorder: '#FECACA',
  purple: '#8B5CF6',
  purpleBg: '#F5F3FF',
  blue: '#3B82F6',
  blueBg: '#EFF6FF',
  teal: '#14B8A6',
  tealBg: '#F0FDFA',

  // Text
  heading: '#111827',
  body: '#6B7280',
  muted: '#9CA3AF',
  disabled: '#D1D5DB',

  // Surfaces
  cardBg: '#FFFFFF',
  appBg: '#F8FAFC',
  border: '#E5E7EB',
  borderSoft: '#F1F5F9',
  mutedBg: '#F3F4F6',

  // Sidebar
  sidebar: '#08152F',
  sidebarTop: '#0A1635',
  sidebarBottom: '#071126',
}

export const STATUS_MAP = {
  under_investigation: { cls: 'diq-badge-purple', label: 'Under Investigation', color: COLORS.purple },
  awaiting_evidence: { cls: 'diq-badge-orange', label: 'Awaiting Evidence', color: COLORS.warning },
  ai_review: { cls: 'diq-badge-blue', label: 'AI Review', color: COLORS.blue },
  completed: { cls: 'diq-badge-green', label: 'Completed', color: COLORS.success },
}

export const PRIORITY_MAP = {
  high: { cls: 'diq-pill-high', label: 'High', color: COLORS.danger, bg: COLORS.dangerBg },
  medium: { cls: 'diq-pill-medium', label: 'Medium', color: COLORS.warning, bg: COLORS.warningBg },
  low: { cls: 'diq-pill-low', label: 'Low', color: COLORS.success, bg: COLORS.successBg },
}

export const DISPUTE_TYPES = [
  { value: 'fraud', label: 'Fraud', icon: 'AlertTriangle' },
  { value: 'unauthorized', label: 'Unauthorized Transaction', icon: 'Shield' },
  { value: 'product_not_received', label: 'Product Not Received', icon: 'Package' },
  { value: 'quality', label: 'Quality Issues', icon: 'FileX' },
  { value: 'billing', label: 'Billing Error', icon: 'DollarSign' },
  { value: 'other', label: 'Other', icon: 'HelpCircle' },
]

export const EVIDENCE_TYPES = [
  { value: 'document', label: 'Document', icon: 'FileText' },
  { value: 'image', label: 'Image', icon: 'Image' },
  { value: 'email', label: 'Email', icon: 'Mail' },
  { value: 'other', label: 'Other', icon: 'File' },
]

export const TIMELINE_EVENT_TYPES = [
  { value: 'purchase', label: 'Purchase', color: COLORS.success, bg: COLORS.successBg },
  { value: 'payment', label: 'Payment', color: COLORS.blue, bg: COLORS.blueBg },
  { value: 'communication', label: 'Communication', color: COLORS.purple, bg: COLORS.purpleBg },
  { value: 'shipment', label: 'Shipment', color: COLORS.warning, bg: COLORS.warningBg },
  { value: 'dispute', label: 'Dispute', color: COLORS.danger, bg: COLORS.dangerBg },
  { value: 'evidence', label: 'Evidence', color: COLORS.warning, bg: COLORS.warningBg },
  { value: 'refund', label: 'Refund', color: COLORS.teal, bg: COLORS.tealBg },
  { value: 'investigation', label: 'Investigation', color: COLORS.primary, bg: COLORS.primaryLight },
]