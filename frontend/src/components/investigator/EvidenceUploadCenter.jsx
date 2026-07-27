import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import {
  Upload, FileText, Image as ImageIcon, File, X, CheckCircle,
  AlertTriangle, RefreshCw, Eye, Download, Trash2, Search,
  Filter, ChevronDown, Info, Zap, FolderKanban, Clock,
  Shield, BarChart3, Target, Calendar, ChevronRight,
  MoreHorizontal, Star, PieChart, ArrowUp,
} from 'lucide-react'
import { uploadEvidence, getEvidenceList, deleteEvidence } from '../../services/investigatorApi'
import { formatDate } from '../../utils/formatters'
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

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
  blue: '#3B82F6',
  purple: '#8B5CF6',
  heading: '#111827',
  secondaryText: '#6B7280',
  mutedText: '#9CA3AF',
  lightBg: '#F8FAFC',
  cardBorder: '#EEF2F7',
}

const EVIDENCE_TYPES = ['All Evidence Types', 'Document', 'Image', 'Email', 'Other']
const STATUS_TYPES = ['All Status', 'Validated', 'Processed', 'Processing', 'Pending']

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
// CIRCULAR PROGRESS COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

function CircularProgress({ value = 0, size = 100, strokeWidth = 8, color = '#4F46E5' }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="#F1F5F9" strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
      />
    </svg>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PROGRESS RING
// ══════════════════════════════════════════════════════════════════════════════

function ProgressRing({ value = 0, size = 48, color = '#4F46E5', children }) {
  const r = (size - 8) / 2
  const c = 2 * Math.PI * r
  const offset = c - (value / 100) * c

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={6} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={c} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
        />
      </svg>
      {children && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════════════════════════════════════════

function Toast({ message, type = 'success', visible, onClose }) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => { if (onClose) onClose() }, 3000)
      return () => clearTimeout(timer)
    }
  }, [visible, onClose])

  if (!visible) return null

  const bg = type === 'success' ? '#F0FDF4' : type === 'error' ? '#FEF2F2' : '#FFFBEB'
  const border = type === 'success' ? '#BBF7D0' : type === 'error' ? '#FECACA' : '#FDE68A'
  const iconColor = type === 'success' ? '#22C55E' : type === 'error' ? '#EF4444' : '#F59E0B'
  const Icon = type === 'success' ? CheckCircle : type === 'error' ? AlertTriangle : Info

  return (
    <div style={{
      position: 'fixed', top: 24, right: 24, zIndex: 9999,
      padding: '14px 20px', borderRadius: 14,
      background: bg, border: `1px solid ${border}`,
      boxShadow: '0 12px 32px rgba(0,0,0,0.1)',
      display: 'flex', alignItems: 'center', gap: 12,
      animation: 'slideIn 0.3s ease',
      maxWidth: 400,
    }}>
      <Icon className="w-5 h-5" style={{ color: iconColor, flexShrink: 0 }} />
      <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{message}</div>
      <button onClick={onClose} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: '#9CA3AF', padding: 0, flexShrink: 0,
      }}>
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// STATUS BADGE
// ══════════════════════════════════════════════════════════════════════════════

function StatusBadge({ status }) {
  const map = {
    validated: { bg: '#F0FDF4', color: '#16A34A' },
    processed: { bg: '#EFF6FF', color: '#2563EB' },
    processing: { bg: '#FFFBEB', color: '#D97706' },
    pending: { bg: '#F3F4F6', color: '#6B7280' },
  }
  const s = map[status] || map.pending
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', fontSize: 11, fontWeight: 600,
      borderRadius: 999, background: s.bg, color: s.color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PRIORITY BADGE
// ══════════════════════════════════════════════════════════════════════════════

function PriorityBadge({ level }) {
  const map = {
    required: { bg: '#FEF2F2', color: '#DC2626', label: 'Required' },
    recommended: { bg: '#FFFBEB', color: '#D97706', label: 'Recommended' },
  }
  const s = map[level] || map.recommended
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 8px',
      borderRadius: 999, background: s.bg, color: s.color,
      whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// IMPACT BADGE
// ══════════════════════════════════════════════════════════════════════════════

function ImpactBadge({ level }) {
  const map = {
    high: { bg: '#FEF2F2', color: '#DC2626', label: 'High Impact' },
    medium: { bg: '#FFFBEB', color: '#D97706', label: 'Medium Impact' },
    low: { bg: '#F0FDF4', color: '#16A34A', label: 'Low Impact' },
  }
  const s = map[level] || map.medium
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 8px',
      borderRadius: 999, background: s.bg, color: s.color,
      whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function EvidenceUploadCenter({ caseId, onUploadComplete }) {
  // ── State ─────────────────────────────────────────────────────────────────
  const [evidence, setEvidence] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadQueue, setUploadQueue] = useState([])
  const [dragActive, setDragActive] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' })
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('All Evidence Types')
  const [filterStatus, setFilterStatus] = useState('All Status')
  const [currentPage, setCurrentPage] = useState(1)
  const [processingFile, setProcessingFile] = useState(null)
  const fileInputRef = useRef(null)
  const pageSize = 6

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type })
  }

  // ── Load evidence ─────────────────────────────────────────────────────────
  const loadEvidence = useCallback(async () => {
    try {
      const data = await getEvidenceList(caseId)
      setEvidence(data.evidence || [])
    } catch (e) {
      console.error('Failed to load evidence:', e)
    }
  }, [caseId])

  useEffect(() => { loadEvidence() }, [loadEvidence])

  // ── Drag & Drop handlers ──────────────────────────────────────────────────
  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const files = Array.from(e.dataTransfer.files)
    addFilesToQueue(files)
  }, [])

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    addFilesToQueue(files)
    e.target.value = ''
  }

  // ── File helpers ──────────────────────────────────────────────────────────
  const addFilesToQueue = (files) => {
    const newFiles = files.map(f => ({
      id: Date.now() + Math.random(),
      file: f,
      name: f.name,
      size: f.size,
      type: getFileType(f.name),
      progress: 0,
      status: 'queued',
    }))
    setSelectedFiles(prev => [...prev, ...newFiles])
  }

  const removeSelectedFile = (id) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== id))
  }

  const getFileType = (filename) => {
    const ext = filename.split('.').pop().toLowerCase()
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp']
    const documentTypes = ['pdf', 'doc', 'docx', 'txt']
    const emailTypes = ['eml', 'msg']
    if (imageTypes.includes(ext)) return 'image'
    if (documentTypes.includes(ext)) return 'document'
    if (emailTypes.includes(ext)) return 'email'
    return 'other'
  }

  const getFileIcon = (type) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-5 h-5" />
      case 'document': return <FileText className="w-5 h-5" />
      case 'email': return <File className="w-5 h-5" />
      default: return <File className="w-5 h-5" />
    }
  }

  const getCategoryIcon = (type) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-4 h-4" />
      case 'document': return <FileText className="w-4 h-4" />
      case 'email': return <File className="w-4 h-4" />
      default: return <File className="w-4 h-4" />
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // ── Upload handler ────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    setUploading(true)
    const queue = [...selectedFiles]
    setUploadQueue(queue.map(f => ({ ...f, status: 'uploading', progress: 0 })))

    let completedCount = 0

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i]
      const file = item.file

      // Update local progress
      setUploadQueue(prev => prev.map((f, idx) =>
        idx === i ? { ...f, progress: 45 } : f
      ))

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('title', file.name)
        formData.append('type', item.type)

        await uploadEvidence(caseId, formData)

        completedCount++
        const pct = Math.round((completedCount / queue.length) * 100)
        setUploadProgress(pct)

        // Mark as completed
        setUploadQueue(prev => prev.map((f, idx) =>
          idx === i ? { ...f, status: 'completed', progress: 100 } : f
        ))

        // Simulate OCR processing starting
        setProcessingFile(file.name)
        setTimeout(() => setProcessingFile(null), 2500)
      } catch (e) {
        console.error('Upload failed:', e)
        setUploadQueue(prev => prev.map((f, idx) =>
          idx === i ? { ...f, status: 'failed' } : f
        ))
        showToast(`Failed to upload ${file.name}`, 'error')
      }
    }

    // Clear queue after 2s
    setTimeout(() => {
      setSelectedFiles([])
      setUploadQueue([])
      setUploading(false)
      setUploadProgress(0)
      loadEvidence()
      if (onUploadComplete) onUploadComplete()
      if (completedCount > 0) {
        showToast(`${completedCount} file${completedCount > 1 ? 's' : ''} uploaded successfully`)
      }
    }, 1500)
  }

  // ── Delete handler ────────────────────────────────────────────────────────
  const handleDelete = async (evidenceId) => {
    if (!confirm('Are you sure you want to delete this evidence?')) return
    try {
      await deleteEvidence(evidenceId)
      await loadEvidence()
      showToast('Evidence deleted successfully')
    } catch (e) {
      console.error('Delete failed:', e)
      showToast('Failed to delete evidence', 'error')
    }
  }

  // ── Computed stats ────────────────────────────────────────────────────────
  const evidenceStats = useMemo(() => {
    const total = evidence.length
    const validated = evidence.filter(e => e.status === 'validated').length
    const processing = evidence.filter(e => e.status === 'processing').length
    const pending = evidence.filter(e => e.status === 'pending').length
    const uploaded = total - validated - processing - pending
    return { total, validated, processing, pending, uploaded }
  }, [evidence])

  const missingEvidenceList = useMemo(() => [
    { name: 'Merchant Invoice', priority: 'required', impact: 'high' },
    { name: 'Delivery Proof / POD', priority: 'required', impact: 'high' },
    { name: 'Refund Proof', priority: 'recommended', impact: 'medium' },
  ], [])

  const recommendations = useMemo(() => [
    { priority: 'high', text: 'Upload merchant invoice to complete financial verification.' },
    { priority: 'medium', text: 'Delivery proof is recommended for stronger case validation.' },
    { priority: 'medium', text: 'Refund proof will help in faster resolution.' },
  ], [])

  // ── Doughnut data ─────────────────────────────────────────────────────────
  const doughnutData = useMemo(() => [
    { name: 'Uploaded', value: evidenceStats.uploaded, color: '#22C55E' },
    { name: 'Processing', value: evidenceStats.processing, color: '#F59E0B' },
    { name: 'Validated', value: evidenceStats.validated, color: '#4F46E5' },
    { name: 'Pending', value: evidenceStats.pending, color: '#EF4444' },
  ], [evidenceStats])

  // ── Validation score ──────────────────────────────────────────────────────
  const validationScore = 78
  const validationItems = useMemo(() => [
    { label: 'Authenticity', score: 82, color: '#22C55E' },
    { label: 'Completeness', score: 74, color: '#F59E0B' },
    { label: 'Relevance', score: 80, color: '#22C55E' },
    { label: 'Clarity', score: 76, color: '#3B82F6' },
  ], [])

  // ── Filtered evidence for repository table ────────────────────────────────
  const filteredEvidence = useMemo(() => {
    return evidence.filter(item => {
      if (searchQuery && !item.title?.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !item.filename?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      if (filterType !== 'All Evidence Types') {
        const typeMap = { Document: 'document', Image: 'image', Email: 'email' }
        if (typeMap[filterType] !== item.type) return false
      }
      if (filterStatus !== 'All Status') {
        if (filterStatus.toLowerCase() !== item.status) return false
      }
      return true
    })
  }, [evidence, searchQuery, filterType, filterStatus])

  const totalPages = Math.max(1, Math.ceil(filteredEvidence.length / pageSize))
  const paginatedEvidence = filteredEvidence.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  // ── Processing pipeline steps ─────────────────────────────────────────────
  const pipelineSteps = useMemo(() => [
    { id: 1, label: 'File Uploaded', status: 'completed' },
    { id: 2, label: 'OCR Processing', status: 'current' },
    { id: 3, label: 'Data Extraction', status: 'pending' },
    { id: 4, label: 'Validation', status: 'pending' },
    { id: 5, label: 'Analysis Ready', status: 'pending' },
  ], [])

  // ── Reset page on filter change ───────────────────────────────────────────
  useEffect(() => { setCurrentPage(1) }, [searchQuery, filterType, filterStatus])

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div>
      {/* Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onClose={() => setToast(prev => ({ ...prev, visible: false }))}
      />

      {/* Main Grid: Left (2.6fr) + Right (1.2fr) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2.6fr 1.2fr',
        gap: 24,
        alignItems: 'start',
      }}>
        {/* ════ LEFT COLUMN ════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ── EVIDENCE UPLOAD CENTER CARD ──────────────────────────────── */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <div style={cardTitleStyle}>
                <div style={cardTitleIcon('#EEF2FF')}>
                  <Upload className="w-4 h-4" style={{ color: '#4F46E5' }} />
                </div>
                <h3 style={sectionTitle}>Evidence Upload Center</h3>
              </div>
            </div>

            {/* Upload sections grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr',
              gap: 20,
            }}>
              {/* ── Drop Zone ───────────────────────────────────────────── */}
              <div
                style={{
                  border: `2px dashed ${dragActive ? '#4F46E5' : '#C7D2FE'}`,
                  borderRadius: 16,
                  background: dragActive ? '#F5F3FF' : '#F8FAFF',
                  padding: 32,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 280,
                }}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: '#EEF2FF', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  marginBottom: 16,
                }}>
                  <Upload className="w-6 h-6" style={{ color: '#4F46E5' }} />
                </div>
                <p style={{
                  fontSize: 14, fontWeight: 600, color: '#111827',
                  margin: '0 0 6px',
                }}>
                  Drag & drop files here or click to browse
                </p>
                <p style={{
                  fontSize: 12, color: '#6B7280',
                  margin: '0 0 4px',
                }}>
                  Supported formats: PDF, JPG, PNG, DOC, DOCX, XLS, EML, MSG
                </p>
                <p style={{
                  fontSize: 11, color: '#9CA3AF',
                  margin: '0 0 16px',
                }}>
                  Maximum file size: 50 MB
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.txt,.eml,.msg"
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                    style={gradientBtn}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(79,70,229,0.25)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(79,70,229,0.18)' }}
                  >
                    <Upload className="w-4 h-4" />
                    Select Files
                  </button>
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        ...outlineBtn, height: 36, width: 36,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#4F46E5'; e.currentTarget.style.color = '#4F46E5' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#6B7280' }}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Upload Progress Panel ────────────────────────────────── */}
              <div style={{
                borderRadius: 14,
                border: '1px solid #F1F5F9',
                background: '#FAFBFC',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 280,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 14,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                    Upload Progress
                  </div>
                  {selectedFiles.length > 0 && (
                    <button
                      onClick={() => { setSelectedFiles([]); setUploadQueue([]); setUploading(false) }}
                      style={{ fontSize: 12, color: '#EF4444', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      Cancel All
                    </button>
                  )}
                </div>

                {/* Upload stats */}
                {selectedFiles.length > 0 && (
                  <div style={{
                    fontSize: 12, color: '#6B7280', marginBottom: 12,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span>{uploadQueue.filter(f => f.status === 'completed').length} of {selectedFiles.length} files uploaded</span>
                    <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#D1D5DB' }} />
                    <span style={{ fontWeight: 600, color: '#4F46E5' }}>{uploadProgress}%</span>
                  </div>
                )}

                {/* File queue */}
                <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {uploadQueue.length > 0 ? (
                    uploadQueue.map((item, idx) => (
                      <div key={item.id} style={{
                        padding: '10px 12px', borderRadius: 10,
                        background: '#fff', border: '1px solid #F1F5F9',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: 8,
                            background: '#F3F4F6', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            {getFileIcon(item.type)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 12, fontWeight: 600, color: '#111827',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {item.name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                              <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                                {formatFileSize(item.size)}
                              </span>
                              {item.status === 'completed' && (
                                <>
                                  <CheckCircle className="w-3 h-3" style={{ color: '#22C55E' }} />
                                  <span style={{ fontSize: 11, color: '#22C55E', fontWeight: 600 }}>Complete</span>
                                </>
                              )}
                              {item.status === 'uploading' && (
                                <span style={{ fontSize: 11, color: '#4F46E5', fontWeight: 600 }}>
                                  {item.progress}%
                                </span>
                              )}
                              {item.status === 'failed' && (
                                <span style={{ fontSize: 11, color: '#EF4444', fontWeight: 600 }}>Failed</span>
                              )}
                            </div>
                          </div>
                          {item.status === 'uploading' && (
                            <button onClick={() => removeSelectedFile(item.id)} style={{
                              background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0,
                            }}>
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        {/* Progress bar */}
                        {(item.status === 'uploading' || item.status === 'completed') && (
                          <div style={{
                            marginTop: 8, height: 4, borderRadius: 999,
                            background: '#F1F5F9', overflow: 'hidden',
                          }}>
                            <div style={{
                              width: `${item.progress}%`, height: '100%',
                              borderRadius: 999,
                              background: item.status === 'completed' ? '#22C55E' : 'linear-gradient(90deg, #4F46E5, #7C3AED)',
                              transition: 'width 0.5s ease',
                            }} />
                          </div>
                        )}
                      </div>
                    ))
                  ) : selectedFiles.length > 0 ? (
                    selectedFiles.map((item, idx) => (
                      <div key={item.id} style={{
                        padding: '10px 12px', borderRadius: 10,
                        background: '#fff', border: '1px solid #F1F5F9',
                        display: 'flex', alignItems: 'center', gap: 10,
                      }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 8,
                          background: '#F3F4F6', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          {getFileIcon(item.type)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 12, fontWeight: 600, color: '#111827',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                            {formatFileSize(item.size)}
                          </div>
                        </div>
                        <button onClick={() => removeSelectedFile(item.id)} style={{
                          background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0,
                        }}>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div style={{
                      flex: 1, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      padding: '20px 0', color: '#9CA3AF',
                    }}>
                      <FolderKanban className="w-8 h-8" style={{ marginBottom: 8, opacity: 0.4 }} />
                      <div style={{ fontSize: 12 }}>No files selected</div>
                      <div style={{ fontSize: 11, marginTop: 2 }}>Drop files or click browse</div>
                    </div>
                  )}
                </div>

                {/* Upload button */}
                {selectedFiles.length > 0 && !uploading && (
                  <button
                    onClick={handleUpload}
                    style={{
                      ...gradientBtn, width: '100%', justifyContent: 'center',
                      marginTop: 12,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(79,70,229,0.25)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(79,70,229,0.18)' }}
                  >
                    <Upload className="w-4 h-4" />
                    Upload {selectedFiles.length} File{selectedFiles.length !== 1 ? 's' : ''}
                  </button>
                )}

                {/* Auto processing indicator */}
                {processingFile && (
                  <div style={{
                    marginTop: 12, padding: '10px 12px', borderRadius: 10,
                    background: '#EFF6FF', border: '1px solid #DBEAFE',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <RefreshCw className="w-4 h-4" style={{ color: '#3B82F6', animation: 'spin 1s linear infinite' }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#1D4ED8' }}>Auto Processing (OCR & Extraction)</div>
                      <div style={{ fontSize: 11, color: '#60A5FA' }}>1 file processing</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── EVIDENCE REPOSITORY CARD ─────────────────────────────────── */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <div style={cardTitleStyle}>
                <div style={cardTitleIcon('#EEF2FF')}>
                  <FolderKanban className="w-4 h-4" style={{ color: '#4F46E5' }} />
                </div>
                <h3 style={sectionTitle}>Evidence Repository</h3>
              </div>
            </div>

            {/* ── Filters bar ─────────────────────────────────────────────── */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              marginBottom: 20, flexWrap: 'wrap',
            }}>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{
                  height: 36, padding: '0 32px 0 12px', borderRadius: 10,
                  border: '1px solid #E5E7EB', background: '#fff',
                  fontSize: 12, fontWeight: 500, color: '#374151',
                  cursor: 'pointer', outline: 'none', appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
                }}
              >
                {EVIDENCE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  height: 36, padding: '0 32px 0 12px', borderRadius: 10,
                  border: '1px solid #E5E7EB', background: '#fff',
                  fontSize: 12, fontWeight: 500, color: '#374151',
                  cursor: 'pointer', outline: 'none', appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
                }}
              >
                {STATUS_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>

              <div style={{ position: 'relative', flex: 1, minWidth: 180, maxWidth: 260 }}>
                <Search className="w-4 h-4" style={{
                  position: 'absolute', left: 12, top: '50%',
                  transform: 'translateY(-50%)', color: '#9CA3AF',
                  pointerEvents: 'none',
                }} />
                <input
                  type="text"
                  placeholder="Search evidence..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%', height: 36, padding: '0 14px 0 36px',
                    fontSize: 12, border: '1px solid #E5E7EB', borderRadius: 10,
                    background: '#fff', color: '#111827', outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = '#4F46E5'}
                  onBlur={e => e.currentTarget.style.borderColor = '#E5E7EB'}
                />
              </div>

              <button style={{
                ...outlineBtn, display: 'flex', alignItems: 'center', gap: 4,
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#4F46E5'; e.currentTarget.style.color = '#4F46E5' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#6B7280' }}
              >
                <Filter className="w-3.5 h-3.5" /> Filter
              </button>
            </div>

            {/* ── Repository Table ────────────────────────────────────────── */}
            {paginatedEvidence.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '40px 20px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              }}>
                <FolderKanban className="w-12 h-12" style={{ color: '#D1D5DB' }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: '#6B7280' }}>No evidence files found</div>
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                  {searchQuery ? 'Try a different search term' : 'Upload evidence to get started'}
                </div>
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%', borderCollapse: 'collapse',
                    fontSize: 13,
                  }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                        {['Document Name', 'Type', 'Source', 'Uploaded On', 'Status', 'OCR / Extraction', 'Actions'].map(h => (
                          <th key={h} style={{
                            padding: '12px 14px', textAlign: 'left',
                            fontSize: 12, fontWeight: 600, color: '#6B7280',
                            textTransform: 'uppercase', letterSpacing: '0.03em',
                            whiteSpace: 'nowrap',
                          }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedEvidence.map((item, idx) => {
                        const ocrPct = item.extraction_status === 'completed'
                          ? 98 : item.extraction_status === 'processing'
                            ? 45 : 0
                        const source = item.source || (idx % 3 === 0 ? 'Customer' : idx % 3 === 1 ? 'Merchant' : 'System')
                        return (
                          <tr key={item.id || idx} style={{
                            borderBottom: '1px solid #F1F5F9',
                            transition: 'background 0.15s',
                          }}
                            onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 32, height: 32, borderRadius: 8,
                                background: '#F3F4F6', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                              }}>
                                {getCategoryIcon(item.type)}
                              </div>
                              <div>
                                <div style={{
                                  fontWeight: 600, color: '#111827', fontSize: 13,
                                  maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                  {item.title || item.filename || 'Untitled'}
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '14px', color: '#6B7280', fontSize: 12, whiteSpace: 'nowrap' }}>
                              {item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : '—'}
                            </td>
                            <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                              <span style={{
                                padding: '2px 8px', fontSize: 11, fontWeight: 600, borderRadius: 999,
                                background: source === 'Customer' ? '#EEF2FF' : source === 'Merchant' ? '#F0FDF4' : '#F3F4F6',
                                color: source === 'Customer' ? '#4F46E5' : source === 'Merchant' ? '#16A34A' : '#6B7280',
                              }}>
                                {source}
                              </span>
                            </td>
                            <td style={{ padding: '14px', color: '#6B7280', fontSize: 12, whiteSpace: 'nowrap' }}>
                              {item.uploaded_at ? formatDate(item.uploaded_at) : '—'}
                            </td>
                            <td style={{ padding: '14px' }}>
                              <StatusBadge status={item.status || 'pending'} />
                            </td>
                            <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {ocrPct > 0 ? (
                                  <ProgressRing value={ocrPct} size={32} color={ocrPct >= 98 ? '#22C55E' : '#4F46E5'}>
                                    {ocrPct >= 98 ? (
                                      <CheckCircle className="w-3 h-3" style={{ color: '#22C55E' }} />
                                    ) : (
                                      <span style={{ fontSize: 8, fontWeight: 700, color: '#4F46E5' }}>{ocrPct}%</span>
                                    )}
                                  </ProgressRing>
                                ) : (
                                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F3F4F6' }} />
                                )}
                                <div>
                                  <div style={{ fontSize: 11, fontWeight: 600, color: ocrPct >= 98 ? '#16A34A' : '#4F46E5' }}>
                                    {ocrPct >= 98 ? 'Extracted' : ocrPct > 0 ? 'Processing' : 'Pending'}
                                  </div>
                                  <div style={{ fontSize: 10, color: '#9CA3AF' }}>
                                    {ocrPct > 0 ? `${ocrPct}%` : '—'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <ActionBtn icon={Eye} tooltip="Preview" />
                                <ActionBtn icon={Download} tooltip="Download" />
                                <ActionBtn icon={Trash2} tooltip="Delete"
                                  onClick={() => handleDelete(item.id)} danger
                                />
                                <ActionBtn icon={MoreHorizontal} tooltip="More options" />
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* ── Pagination ──────────────────────────────────────────── */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginTop: 16, paddingTop: 16, borderTop: '1px solid #F1F5F9',
                }}>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>
                    Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, filteredEvidence.length)} of {filteredEvidence.length} evidence files
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <PagBtn label="◀" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} />
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <PagBtn key={p} label={String(p)} active={p === currentPage} onClick={() => setCurrentPage(p)} />
                    ))}
                    <PagBtn label="▶" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── EVIDENCE PROCESSING PIPELINE CARD ────────────────────────── */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <div style={cardTitleStyle}>
                <div style={cardTitleIcon('#F5F3FF')}>
                  <Zap className="w-4 h-4" style={{ color: '#8B5CF6' }} />
                </div>
                <h3 style={sectionTitle}>Evidence Processing Pipeline</h3>
              </div>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 0',
              position: 'relative',
            }}>
              {/* Progress connecting line */}
              <div style={{
                position: 'absolute', left: '8%', right: '8%', top: '50%',
                height: 3, background: '#F1F5F9', borderRadius: 2,
                transform: 'translateY(-50%)', zIndex: 0,
              }} />
              <div style={{
                position: 'absolute', left: '8%', width: '42%', top: '50%',
                height: 3, background: 'linear-gradient(90deg, #22C55E, #4F46E5)',
                borderRadius: 2, transform: 'translateY(-50%)', zIndex: 0,
              }} />

              {pipelineSteps.map((step, idx) => {
                const isCompleted = step.status === 'completed'
                const isCurrent = step.status === 'current'
                return (
                  <div key={step.id} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 10, position: 'relative', zIndex: 1,
                    width: 100,
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: isCompleted ? '#22C55E' : isCurrent ? '#fff' : '#fff',
                      border: isCompleted ? 'none' : isCurrent ? '3px solid #4F46E5' : '2px solid #D1D5DB',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: isCurrent ? '0 0 0 6px rgba(79,70,229,0.12)' : 'none',
                      transition: 'all 0.3s ease',
                    }}>
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5" style={{ color: '#fff' }} />
                      ) : isCurrent ? (
                        <div style={{
                          width: 12, height: 12, borderRadius: '50%',
                          background: '#4F46E5', animation: 'pulse 2s infinite',
                        }} />
                      ) : (
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#D1D5DB' }} />
                      )}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: 12, fontWeight: isCompleted || isCurrent ? 600 : 500,
                        color: isCompleted ? '#22C55E' : isCurrent ? '#4F46E5' : '#9CA3AF',
                        whiteSpace: 'nowrap',
                      }}>
                        {step.label}
                      </div>
                      <div style={{
                        fontSize: 10, color: '#9CA3AF', marginTop: 2,
                      }}>
                        {isCompleted ? 'Complete' : isCurrent ? 'In Progress' : 'Pending'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ════ RIGHT COLUMN (Sticky sidebar) ════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, position: 'sticky', top: 0 }}>

          {/* ── EVIDENCE OVERVIEW CARD ───────────────────────────────────── */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <div style={cardTitleStyle}>
                <div style={cardTitleIcon('#F0FDF4')}>
                  <PieChart className="w-4 h-4" style={{ color: '#22C55E' }} />
                </div>
                <h3 style={sectionTitle}>Evidence Overview</h3>
              </div>
              <button style={{
                ...outlineBtn, height: 30, padding: '0 10px', fontSize: 11,
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#4F46E5'; e.currentTarget.style.color = '#4F46E5' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#6B7280' }}
              >
                <BarChart3 className="w-3.5 h-3.5" /> View Analytics
              </button>
            </div>

            {/* Doughnut Chart */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 8 }}>
              <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
                <ResponsiveContainer width={120} height={120}>
                  <RePieChart>
                    <Pie
                      data={doughnutData}
                      cx={60} cy={60}
                      innerRadius={38}
                      outerRadius={56}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {doughnutData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                  </RePieChart>
                </ResponsiveContainer>
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex',
                  flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 24, fontWeight: 800, color: '#111827', lineHeight: 1 }}>
                    {evidenceStats.total}
                  </span>
                  <span style={{ fontSize: 11, color: '#9CA3AF' }}>Total</span>
                </div>
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                {doughnutData.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                    <div style={{ fontSize: 12, color: '#6B7280', flex: 1 }}>{item.name}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{item.value}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', width: 36, textAlign: 'right' }}>
                      {evidenceStats.total > 0 ? `${Math.round((item.value / evidenceStats.total) * 100)}%` : '0%'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── MISSING EVIDENCE ALERTS CARD ─────────────────────────────── */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <div style={cardTitleStyle}>
                <div style={cardTitleIcon('#FEF2F2')}>
                  <AlertTriangle className="w-4 h-4" style={{ color: '#EF4444' }} />
                </div>
                <h3 style={sectionTitle}>Missing Evidence Alerts</h3>
              </div>
              <button style={{
                ...outlineBtn, height: 30, padding: '0 10px', fontSize: 11,
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#4F46E5'; e.currentTarget.style.color = '#4F46E5' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#6B7280' }}
              >
                View All
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {missingEvidenceList.map((item, idx) => (
                <div key={idx} style={{
                  padding: '14px 16px', borderRadius: 14,
                  background: idx === 0 ? '#FEF2F2' : idx === 1 ? '#FEF2F2' : '#FFFBEB',
                  border: `1px solid ${idx === 2 ? '#FDE68A' : '#FECACA'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{item.name}</div>
                    <PriorityBadge level={item.priority} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <ImpactBadge level={item.impact} />
                    <button style={{
                      fontSize: 11, fontWeight: 600, color: '#4F46E5',
                      background: 'none', border: 'none', cursor: 'pointer',
                    }}>
                      Request →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── EVIDENCE VALIDATION CARD ─────────────────────────────────── */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <div style={cardTitleStyle}>
                <div style={cardTitleIcon('#F5F3FF')}>
                  <Shield className="w-4 h-4" style={{ color: '#8B5CF6' }} />
                </div>
                <h3 style={sectionTitle}>Evidence Validation</h3>
              </div>
            </div>

            {/* Circular score */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
              <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
                <CircularProgress value={validationScore} size={96} strokeWidth={9} color={
                  validationScore >= 80 ? '#22C55E' : validationScore >= 60 ? '#F59E0B' : '#EF4444'
                } />
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex',
                  flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: '#111827', lineHeight: 1 }}>
                    {validationScore}%
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: validationScore >= 80 ? '#22C55E' : validationScore >= 60 ? '#F59E0B' : '#EF4444',
                  }}>
                    {validationScore >= 80 ? 'Good' : validationScore >= 60 ? 'Fair' : 'Poor'}
                  </span>
                </div>
              </div>

              {/* Validation checklist */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {validationItems.map((item, idx) => {
                  const scoreColor = item.score >= 80 ? '#22C55E' : item.score >= 60 ? '#F59E0B' : '#EF4444'
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle className="w-3.5 h-3.5" style={{ color: scoreColor, flexShrink: 0 }} />
                      <div style={{
                        flex: 1, fontSize: 12, color: '#6B7280',
                      }}>
                        {item.label}
                      </div>
                      <div style={{
                        fontSize: 12, fontWeight: 700, color: scoreColor,
                      }}>
                        {item.score}%
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── RECOMMENDATIONS CARD ─────────────────────────────────────── */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <div style={cardTitleStyle}>
                <div style={cardTitleIcon('#EFF6FF')}>
                  <Target className="w-4 h-4" style={{ color: '#3B82F6' }} />
                </div>
                <h3 style={sectionTitle}>Recommendations</h3>
              </div>
              <button style={{
                ...outlineBtn, height: 30, padding: '0 10px', fontSize: 11,
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#4F46E5'; e.currentTarget.style.color = '#4F46E5' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#6B7280' }}
              >
                View All
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recommendations.map((rec, idx) => {
                const recColor = rec.priority === 'high' ? '#EF4444' : '#F59E0B'
                const recBg = rec.priority === 'high' ? '#FEF2F2' : '#FFFBEB'
                const recBorder = rec.priority === 'high' ? '#FECACA' : '#FDE68A'
                const Icon = rec.priority === 'high' ? AlertTriangle : Info
                return (
                  <div key={idx} style={{
                    padding: '12px 14px', borderRadius: 12,
                    background: recBg, border: `1px solid ${recBorder}`,
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.boxShadow = 'none' }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: recColor + '18', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
                    }}>
                      <Icon className="w-4 h-4" style={{ color: recColor }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', marginBottom: 2 }}>
                        {rec.text.split('.')[0]}.
                      </div>
                      <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.5 }}>
                        {rec.text.split('.').slice(1).join('.') || 'Recommended action to strengthen the case.'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(100px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

function ActionBtn({ icon: Icon, tooltip, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      style={{
        width: 30, height: 30, borderRadius: 8,
        border: '1px solid transparent',
        background: 'transparent', color: danger ? '#EF4444' : '#9CA3AF',
        cursor: 'pointer', display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = danger ? '#FEF2F2' : '#F3F4F6'
        e.currentTarget.style.borderColor = danger ? '#FECACA' : '#E5E7EB'
        if (!danger) e.currentTarget.style.color = '#374151'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.borderColor = 'transparent'
        if (!danger) e.currentTarget.style.color = '#9CA3AF'
      }}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  )
}

function PagBtn({ label, active, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 30, height: 30, borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: active ? 700 : 500,
        background: active ? '#4F46E5' : 'transparent',
        color: active ? '#fff' : disabled ? '#D1D5DB' : '#6B7280',
        border: 'none', cursor: disabled ? 'default' : 'pointer',
        transition: 'all 0.2s',
      }}
      onMouseEnter={e => {
        if (!active && !disabled) { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.color = '#374151' }
      }}
      onMouseLeave={e => {
        if (!active && !disabled) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6B7280' }
      }}
    >
      {label}
    </button>
  )
}