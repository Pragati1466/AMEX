import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import {
  Upload, FileText, Image as ImageIcon, File, X, CheckCircle,
  AlertTriangle, RefreshCw, Eye, Download, Trash2, Search,
  Filter, ChevronDown, Info, Zap, FolderKanban, Clock,
  Shield, BarChart3, Target, PieChart, MoreHorizontal,
} from 'lucide-react'
import { uploadEvidence, getEvidenceList, deleteEvidence } from '../../../services/investigatorApi'
import { formatDate } from '../../../utils/formatters'
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import IconBox from '../../shared/IconBox'
import ProgressRing from '../../shared/ProgressRing'
import { COLORS, EVIDENCE_TYPES as EVIDENCE_TYPE_CONFIG } from '../../../constants/theme'

const EVIDENCE_TYPES = ['All Evidence Types', 'Document', 'Image', 'Email', 'Other']
const STATUS_TYPES = ['All Status', 'Validated', 'Processed', 'Processing', 'Pending']

const cardStyle = {
  background: '#fff', borderRadius: 18, padding: 24,
  border: '1px solid #EEF2F7', boxShadow: '0 8px 24px rgba(15,23,42,0.05)',
}

const gradientBtn = {
  height: 36, padding: '0 18px', borderRadius: 12,
  background: `linear-gradient(135deg, ${COLORS.primary}, #4338CA)`,
  color: '#fff', fontSize: 13, fontWeight: 600, border: 'none',
  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
  transition: 'all 0.25s ease',
  boxShadow: `0 4px 10px rgba(79,70,229,0.18)`,
}

const outlineBtn = {
  height: 34, padding: '0 14px', borderRadius: 10,
  border: `1px solid ${COLORS.border}`, background: '#fff',
  fontSize: 12, fontWeight: 600, color: COLORS.body,
  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
  transition: 'all 0.2s',
}

function Toast({ message, type = 'success', visible, onClose }) {
  useEffect(() => {
    if (visible) { const t = setTimeout(() => { if (onClose) onClose() }, 3000); return () => clearTimeout(t) }
  }, [visible, onClose])
  if (!visible) return null
  const bgMap = { success: '#F0FDF4', error: '#FEF2F2', default: '#FFFBEB' }
  const borderMap = { success: '#BBF7D0', error: '#FECACA', default: '#FDE68A' }
  const iconMap = { success: CheckCircle, error: AlertTriangle, default: Info }
  const Icon = iconMap[type] || Info
  const bg = bgMap[type] || bgMap.default
  const border = borderMap[type] || borderMap.default
  const iconColor = type === 'success' ? COLORS.success : type === 'error' ? COLORS.danger : COLORS.warning
  return (
    <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, padding: '14px 20px', borderRadius: 14, background: bg, border: `1px solid ${border}`, boxShadow: '0 12px 32px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: 12, animation: 'slideIn 0.3s ease', maxWidth: 400 }}>
      <Icon className="w-5 h-5" style={{ color: iconColor, flexShrink: 0 }} />
      <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{message}</div>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted, padding: 0, flexShrink: 0 }}><X className="w-4 h-4" /></button>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    validated: { bg: '#F0FDF4', color: '#16A34A' }, processed: { bg: '#EFF6FF', color: '#2563EB' },
    processing: { bg: '#FFFBEB', color: '#D97706' }, pending: { bg: '#F3F4F6', color: COLORS.body },
  }
  const s = map[status] || map.pending
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', fontSize: 11, fontWeight: 600, borderRadius: 999, background: s.bg, color: s.color }}>
    <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
    {status.charAt(0).toUpperCase() + status.slice(1)}
  </span>
}

function PriorityBadge({ level }) {
  const map = { required: { bg: '#FEF2F2', color: '#DC2626', label: 'Required' }, recommended: { bg: '#FFFBEB', color: '#D97706', label: 'Recommended' } }
  const s = map[level] || map.recommended
  return <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>{s.label}</span>
}

function ImpactBadge({ level }) {
  const map = { high: { bg: '#FEF2F2', color: '#DC2626', label: 'High Impact' }, medium: { bg: '#FFFBEB', color: '#D97706', label: 'Medium Impact' }, low: { bg: '#F0FDF4', color: '#16A34A', label: 'Low Impact' } }
  const s = map[level] || map.medium
  return <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>{s.label}</span>
}

function ActionBtn({ icon: Icon, onClick, danger }) {
  return (
    <button onClick={onClick} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid transparent', background: 'transparent', color: danger ? COLORS.danger : COLORS.muted, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.background = danger ? '#FEF2F2' : '#F3F4F6'; e.currentTarget.style.borderColor = danger ? '#FECACA' : COLORS.border; if (!danger) e.currentTarget.style.color = '#374151' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; if (!danger) e.currentTarget.style.color = COLORS.muted }}>
      <Icon className="w-3.5 h-3.5" />
    </button>
  )
}

function PagBtn({ label, active, disabled, onClick }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: active ? 700 : 500, background: active ? COLORS.primary : 'transparent', color: active ? '#fff' : disabled ? COLORS.disabled : COLORS.body, border: 'none', cursor: disabled ? 'default' : 'pointer', transition: 'all 0.2s' }}
      onMouseEnter={e => { if (!active && !disabled) { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.color = '#374151' } }}
      onMouseLeave={e => { if (!active && !disabled) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = COLORS.body } }}>
      {label}
    </button>
  )
}

export default function EvidenceUploadCenter({ caseId, onUploadComplete }) {
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

  const showToast = (message, type = 'success') => setToast({ visible: true, message, type })
  const loadEvidence = useCallback(async () => {
    try {
      const data = await getEvidenceList(caseId)
      setEvidence(data.evidence || [])
    } catch (e) {
      console.log('Using mock evidence data for development')
      setEvidence([
        { id: 1, title: 'Payment Receipt', filename: 'payment_receipt.pdf', type: 'document', source: 'Customer', status: 'validated', extraction_status: 'completed', uploaded_at: '2025-06-18T10:30:00Z' },
        { id: 2, title: 'Bank Statement', filename: 'bank_statement_jun2025.pdf', type: 'document', source: 'Customer', status: 'validated', extraction_status: 'completed', uploaded_at: '2025-06-19T14:00:00Z' },
        { id: 3, title: 'Order Confirmation', filename: 'order_confirmation.pdf', type: 'document', source: 'Merchant', status: 'processing', extraction_status: 'processing', uploaded_at: '2025-06-20T09:15:00Z' },
        { id: 4, title: 'Product Photo', filename: 'product_photo.jpg', type: 'image', source: 'Customer', status: 'validated', extraction_status: 'completed', uploaded_at: '2025-06-21T11:30:00Z' },
        { id: 5, title: 'Customer Email', filename: 'customer_email.eml', type: 'email', source: 'Customer', status: 'pending', extraction_status: 'pending', uploaded_at: '2025-06-22T08:00:00Z' },
        { id: 6, title: 'Merchant Invoice', filename: 'merchant_invoice.pdf', type: 'document', source: 'Merchant', status: 'processing', extraction_status: 'processing', uploaded_at: '2025-06-23T15:45:00Z' },
      ])
    }
  }, [caseId])

  useEffect(() => { loadEvidence() }, [loadEvidence])

  const handleDrag = useCallback((e) => { e.preventDefault(); e.stopPropagation(); if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true); else if (e.type === 'dragleave') setDragActive(false) }, [])
  const handleDrop = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); addFilesToQueue(Array.from(e.dataTransfer.files)) }, [])
  const handleFileSelect = (e) => { addFilesToQueue(Array.from(e.target.files)); e.target.value = '' }

  const addFilesToQueue = (files) => {
    setSelectedFiles(prev => [...prev, ...files.map(f => ({ id: Date.now() + Math.random(), file: f, name: f.name, size: f.size, type: getFileType(f.name), progress: 0, status: 'queued' }))])
  }

  const removeSelectedFile = (id) => setSelectedFiles(prev => prev.filter(f => f.id !== id))
  const getFileType = (filename) => {
    const ext = filename.split('.').pop().toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image'
    if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) return 'document'
    if (['eml', 'msg'].includes(ext)) return 'email'
    return 'other'
  }

  const getFileIcon = (type) => {
    const map = { image: <ImageIcon className="w-5 h-5" />, document: <FileText className="w-5 h-5" />, email: <File className="w-5 h-5" /> }
    return map[type] || <File className="w-5 h-5" />
  }

  const getCategoryIcon = (type) => {
    const map = { image: <ImageIcon className="w-4 h-4" />, document: <FileText className="w-4 h-4" />, email: <File className="w-4 h-4" /> }
    return map[type] || <File className="w-4 h-4" />
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return '\u2014'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return
    setUploading(true)
    const queue = [...selectedFiles]
    setUploadQueue(queue.map(f => ({ ...f, status: 'uploading', progress: 0 })))
    let completedCount = 0
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i]
      setUploadQueue(prev => prev.map((f, idx) => idx === i ? { ...f, progress: 45 } : f))
      try {
        const formData = new FormData()
        formData.append('file', item.file); formData.append('title', item.name); formData.append('type', item.type)
        await uploadEvidence(caseId, formData)
        completedCount++
        setUploadProgress(Math.round((completedCount / queue.length) * 100))
        setUploadQueue(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'completed', progress: 100 } : f))
        setProcessingFile(item.name)
        setTimeout(() => setProcessingFile(null), 2500)
      } catch (e) {
        setUploadQueue(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'failed' } : f))
        showToast(`Failed to upload ${item.name}`, 'error')
      }
    }
    setTimeout(() => {
      setSelectedFiles([]); setUploadQueue([]); setUploading(false); setUploadProgress(0)
      loadEvidence(); if (onUploadComplete) onUploadComplete()
      if (completedCount > 0) showToast(`${completedCount} file${completedCount > 1 ? 's' : ''} uploaded successfully`)
    }, 1500)
  }

  const handleDelete = async (evidenceId) => {
    if (!confirm('Are you sure you want to delete this evidence?')) return
    try { await deleteEvidence(evidenceId); await loadEvidence(); showToast('Evidence deleted successfully') }
    catch (e) { showToast('Failed to delete evidence', 'error') }
  }

  const evidenceStats = useMemo(() => {
    const total = evidence.length
    const validated = evidence.filter(e => e.status === 'validated').length
    const processing = evidence.filter(e => e.status === 'processing').length
    const pending = evidence.filter(e => e.status === 'pending').length
    return { total, validated, processing, pending, uploaded: total - validated - processing - pending }
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

  const doughnutData = useMemo(() => [
    { name: 'Uploaded', value: evidenceStats.uploaded, color: COLORS.success },
    { name: 'Processing', value: evidenceStats.processing, color: COLORS.warning },
    { name: 'Validated', value: evidenceStats.validated, color: COLORS.primary },
    { name: 'Pending', value: evidenceStats.pending, color: COLORS.danger },
  ], [evidenceStats])

  const validationScore = 78
  const validationItems = useMemo(() => [
    { label: 'Authenticity', score: 82, color: COLORS.success },
    { label: 'Completeness', score: 74, color: COLORS.warning },
    { label: 'Relevance', score: 80, color: COLORS.success },
    { label: 'Clarity', score: 76, color: COLORS.blue },
  ], [])

  const filteredEvidence = useMemo(() => {
    return evidence.filter(item => {
      if (searchQuery && !item.title?.toLowerCase().includes(searchQuery.toLowerCase()) && !item.filename?.toLowerCase().includes(searchQuery.toLowerCase())) return false
      if (filterType !== 'All Evidence Types') {
        const typeMap = { Document: 'document', Image: 'image', Email: 'email' }
        if (typeMap[filterType] !== item.type) return false
      }
      if (filterStatus !== 'All Status' && filterStatus.toLowerCase() !== item.status) return false
      return true
    })
  }, [evidence, searchQuery, filterType, filterStatus])

  const totalPages = Math.max(1, Math.ceil(filteredEvidence.length / pageSize))
  const paginatedEvidence = filteredEvidence.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const pipelineSteps = useMemo(() => [
    { id: 1, label: 'File Uploaded', status: 'completed' },
    { id: 2, label: 'OCR Processing', status: 'current' },
    { id: 3, label: 'Data Extraction', status: 'pending' },
    { id: 4, label: 'Validation', status: 'pending' },
    { id: 5, label: 'Analysis Ready', status: 'pending' },
  ], [])

  useEffect(() => { setCurrentPage(1) }, [searchQuery, filterType, filterStatus])

  return (
    <div>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />
      <div style={{ display: 'grid', gridTemplateColumns: '2.6fr 1.2fr', gap: 24, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Upload Center */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <IconBox icon={Upload} size={32} borderRadius={10} color={COLORS.primary} bg={COLORS.primaryLight} iconSize={16} />
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: 0 }}>Evidence Upload Center</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
              <div style={{ border: `2px dashed ${dragActive ? COLORS.primary : '#C7D2FE'}`, borderRadius: 16, background: dragActive ? '#F5F3FF' : '#F8FAFF', padding: 32, textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280 }}
                onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
                <IconBox icon={Upload} size={56} borderRadius={16} color={COLORS.primary} bg={COLORS.primaryLight} iconSize={24} margin="0 0 16px 0" />
                <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 6px' }}>Drag & drop files here or click to browse</p>
                <p style={{ fontSize: 12, color: COLORS.body, margin: '0 0 4px' }}>Supported formats: PDF, JPG, PNG, DOC, DOCX, XLS, EML, MSG</p>
                <p style={{ fontSize: 11, color: COLORS.muted, margin: '0 0 16px' }}>Maximum file size: 50 MB</p>
                <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.txt,.eml,.msg" />
                <button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }} style={gradientBtn}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(79,70,229,0.25)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(79,70,229,0.18)' }}>
                  <Upload className="w-4 h-4" /> Select Files
                </button>
              </div>
              <div style={{ borderRadius: 14, border: '1px solid #F1F5F9', background: '#FAFBFC', padding: 16, display: 'flex', flexDirection: 'column', minHeight: 280 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Upload Progress</div>
                  {selectedFiles.length > 0 && <button onClick={() => { setSelectedFiles([]); setUploadQueue([]); setUploading(false) }} style={{ fontSize: 12, color: COLORS.danger, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Cancel All</button>}
                </div>
                {selectedFiles.length > 0 && <div style={{ fontSize: 12, color: COLORS.body, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{uploadQueue.filter(f => f.status === 'completed').length} of {selectedFiles.length} files uploaded</span>
                  <span style={{ width: 3, height: 3, borderRadius: '50%', background: COLORS.disabled }} />
                  <span style={{ fontWeight: 600, color: COLORS.primary }}>{uploadProgress}%</span>
                </div>}
                <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {uploadQueue.length > 0 ? uploadQueue.map((item, idx) => (
                    <div key={item.id} style={{ padding: '10px 12px', borderRadius: 10, background: '#fff', border: '1px solid #F1F5F9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <IconBox icon={() => getFileIcon(item.type)} size={28} borderRadius={8} color={COLORS.body} bg={COLORS.mutedBg} iconSize={14} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                            <span style={{ fontSize: 11, color: COLORS.muted }}>{formatFileSize(item.size)}</span>
                            {item.status === 'completed' && <><CheckCircle className="w-3 h-3" style={{ color: COLORS.success }} /><span style={{ fontSize: 11, color: COLORS.success, fontWeight: 600 }}>Complete</span></>}
                            {item.status === 'uploading' && <span style={{ fontSize: 11, color: COLORS.primary, fontWeight: 600 }}>{item.progress}%</span>}
                            {item.status === 'failed' && <span style={{ fontSize: 11, color: COLORS.danger, fontWeight: 600 }}>Failed</span>}
                          </div>
                        </div>
                        {item.status === 'uploading' && <button onClick={() => removeSelectedFile(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted, padding: 0 }}><X className="w-3.5 h-3.5" /></button>}
                      </div>
                      {(item.status === 'uploading' || item.status === 'completed') && (
                        <div style={{ marginTop: 8, height: 4, borderRadius: 999, background: '#F1F5F9', overflow: 'hidden' }}>
                          <div style={{ width: `${item.progress}%`, height: '100%', borderRadius: 999, background: item.status === 'completed' ? COLORS.success : `linear-gradient(90deg, ${COLORS.primary}, #7C3AED)`, transition: 'width 0.5s ease' }} />
                        </div>
                      )}
                    </div>
                  )) : selectedFiles.length > 0 ? selectedFiles.map((item) => (
                    <div key={item.id} style={{ padding: '10px 12px', borderRadius: 10, background: '#fff', border: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <IconBox icon={() => getFileIcon(item.type)} size={28} borderRadius={8} color={COLORS.body} bg={COLORS.mutedBg} iconSize={14} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: COLORS.muted }}>{formatFileSize(item.size)}</div>
                      </div>
                      <button onClick={() => removeSelectedFile(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted, padding: 0 }}><X className="w-3.5 h-3.5" /></button>
                    </div>
                  )) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 0', color: COLORS.muted }}>
                      <FolderKanban className="w-8 h-8" style={{ marginBottom: 8, opacity: 0.4 }} />
                      <div style={{ fontSize: 12 }}>No files selected</div>
                      <div style={{ fontSize: 11, marginTop: 2 }}>Drop files or click browse</div>
                    </div>
                  )}
                </div>
                {selectedFiles.length > 0 && !uploading && (
                  <button onClick={handleUpload} style={{ ...gradientBtn, width: '100%', justifyContent: 'center', marginTop: 12 }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(79,70,229,0.25)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(79,70,229,0.18)' }}>
                    <Upload className="w-4 h-4" /> Upload {selectedFiles.length} File{selectedFiles.length !== 1 ? 's' : ''}
                  </button>
                )}
                {processingFile && (
                  <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: '#EFF6FF', border: '1px solid #DBEAFE', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <RefreshCw className="w-4 h-4" style={{ color: COLORS.blue, animation: 'spin 1s linear infinite' }} />
                    <div><div style={{ fontSize: 12, fontWeight: 600, color: '#1D4ED8' }}>Auto Processing (OCR & Extraction)</div><div style={{ fontSize: 11, color: '#60A5FA' }}>1 file processing</div></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Evidence Repository */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <IconBox icon={FolderKanban} size={32} borderRadius={10} color={COLORS.primary} bg={COLORS.primaryLight} iconSize={16} />
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: 0 }}>Evidence Repository</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                style={{ height: 36, padding: '0 32px 0 12px', borderRadius: 10, border: `1px solid ${COLORS.border}`, background: '#fff', fontSize: 12, fontWeight: 500, color: '#374151', cursor: 'pointer', outline: 'none', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}>
                {EVIDENCE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                style={{ height: 36, padding: '0 32px 0 12px', borderRadius: 10, border: `1px solid ${COLORS.border}`, background: '#fff', fontSize: 12, fontWeight: 500, color: '#374151', cursor: 'pointer', outline: 'none', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}>
                {STATUS_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <div style={{ position: 'relative', flex: 1, minWidth: 180, maxWidth: 260 }}>
                <Search className="w-4 h-4" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: COLORS.muted, pointerEvents: 'none' }} />
                <input type="text" placeholder="Search evidence..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', height: 36, padding: '0 14px 0 36px', fontSize: 12, border: `1px solid ${COLORS.border}`, borderRadius: 10, background: '#fff', color: '#111827', outline: 'none', transition: 'border-color 0.2s' }}
                  onFocus={e => e.currentTarget.style.borderColor = COLORS.primary} onBlur={e => e.currentTarget.style.borderColor = COLORS.border} />
              </div>
              <button style={{ ...outlineBtn, display: 'flex', alignItems: 'center', gap: 4 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.primary; e.currentTarget.style.color = COLORS.primary }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.body }}>
                <Filter className="w-3.5 h-3.5" /> Filter
              </button>
            </div>
            {paginatedEvidence.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <FolderKanban className="w-12 h-12" style={{ color: COLORS.disabled }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.body }}>No evidence files found</div>
                <div style={{ fontSize: 12, color: COLORS.muted }}>{searchQuery ? 'Try a different search term' : 'Upload evidence to get started'}</div>
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                        {['Document Name', 'Type', 'Source', 'Uploaded On', 'Status', 'OCR / Extraction', 'Actions'].map(h => (
                          <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: COLORS.body, textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedEvidence.map((item, idx) => {
                        const ocrPct = item.extraction_status === 'completed' ? 98 : item.extraction_status === 'processing' ? 45 : 0
                        const source = item.source || (idx % 3 === 0 ? 'Customer' : idx % 3 === 1 ? 'Merchant' : 'System')
                        return (
                          <tr key={item.id || idx} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                              <IconBox icon={() => getCategoryIcon(item.type)} size={32} borderRadius={8} color={COLORS.body} bg={COLORS.mutedBg} iconSize={16} />
                              <div style={{ fontWeight: 600, color: '#111827', fontSize: 13, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title || item.filename || 'Untitled'}</div>
                            </td>
                            <td style={{ padding: '14px', color: COLORS.body, fontSize: 12, whiteSpace: 'nowrap' }}>{item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : '\u2014'}</td>
                            <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                              <span style={{ padding: '2px 8px', fontSize: 11, fontWeight: 600, borderRadius: 999, background: source === 'Customer' ? '#EEF2FF' : source === 'Merchant' ? '#F0FDF4' : '#F3F4F6', color: source === 'Customer' ? COLORS.primary : source === 'Merchant' ? '#16A34A' : COLORS.body }}>{source}</span>
                            </td>
                            <td style={{ padding: '14px', color: COLORS.body, fontSize: 12, whiteSpace: 'nowrap' }}>{item.uploaded_at ? formatDate(item.uploaded_at) : '\u2014'}</td>
                            <td style={{ padding: '14px' }}><StatusBadge status={item.status || 'pending'} /></td>
                            <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {ocrPct > 0 ? (
                                  <ProgressRing value={ocrPct} size={32} color={ocrPct >= 98 ? COLORS.success : COLORS.primary}>
                                    {ocrPct >= 98 ? <CheckCircle className="w-3 h-3" style={{ color: COLORS.success }} /> : <span style={{ fontSize: 8, fontWeight: 700, color: COLORS.primary }}>{ocrPct}%</span>}
                                  </ProgressRing>
                                ) : <div style={{ width: 32, height: 32, borderRadius: '50%', background: COLORS.mutedBg }} />}
                                <div>
                                  <div style={{ fontSize: 11, fontWeight: 600, color: ocrPct >= 98 ? '#16A34A' : COLORS.primary }}>{ocrPct >= 98 ? 'Extracted' : ocrPct > 0 ? 'Processing' : 'Pending'}</div>
                                  <div style={{ fontSize: 10, color: COLORS.muted }}>{ocrPct > 0 ? `${ocrPct}%` : '\u2014'}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <ActionBtn icon={Eye} />
                                <ActionBtn icon={Download} />
                                <ActionBtn icon={Trash2} onClick={() => handleDelete(item.id)} danger />
                                <ActionBtn icon={MoreHorizontal} />
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
                  <div style={{ fontSize: 12, color: COLORS.body }}>Showing {((currentPage - 1) * pageSize) + 1}\u2013{Math.min(currentPage * pageSize, filteredEvidence.length)} of {filteredEvidence.length} evidence files</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <PagBtn label={'\u25C0'} disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} />
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => <PagBtn key={p} label={String(p)} active={p === currentPage} onClick={() => setCurrentPage(p)} />)}
                    <PagBtn label={'\u25B6'} disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Processing Pipeline */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <IconBox icon={Zap} size={32} borderRadius={10} color={COLORS.purple} bg={COLORS.purpleBg} iconSize={16} />
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: 0 }}>Evidence Processing Pipeline</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', position: 'relative' }}>
              <div style={{ position: 'absolute', left: '8%', right: '8%', top: '50%', height: 3, background: '#F1F5F9', borderRadius: 2, transform: 'translateY(-50%)', zIndex: 0 }} />
              <div style={{ position: 'absolute', left: '8%', width: '42%', top: '50%', height: 3, background: `linear-gradient(90deg, ${COLORS.success}, ${COLORS.primary})`, borderRadius: 2, transform: 'translateY(-50%)', zIndex: 0 }} />
              {pipelineSteps.map((step) => {
                const isCompleted = step.status === 'completed'
                const isCurrent = step.status === 'current'
                return (
                  <div key={step.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1, width: 100 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: isCompleted ? COLORS.success : isCurrent ? '#fff' : '#fff', border: isCompleted ? 'none' : isCurrent ? '3px solid #4F46E5' : '2px solid #D1D5DB', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isCurrent ? '0 0 0 6px rgba(79,70,229,0.12)' : 'none', transition: 'all 0.3s ease' }}>
                      {isCompleted ? <CheckCircle className="w-5 h-5" style={{ color: '#fff' }} /> : isCurrent ? <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#4F46E5', animation: 'pulse 2s infinite' }} /> : <div style={{ width: 12, height: 12, borderRadius: '50%', background: COLORS.disabled }} />}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: isCompleted || isCurrent ? 600 : 500, color: isCompleted ? COLORS.success : isCurrent ? COLORS.primary : COLORS.muted, whiteSpace: 'nowrap' }}>{step.label}</div>
                      <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 2 }}>{isCompleted ? 'Complete' : isCurrent ? 'In Progress' : 'Pending'}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, position: 'sticky', top: 0 }}>
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <IconBox icon={PieChart} size={32} borderRadius={10} color={COLORS.success} bg={COLORS.successBg} iconSize={16} />
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: 0 }}>Evidence Overview</h3>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 8 }}>
              <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
                <ResponsiveContainer width={120} height={120}>
                  <RePieChart><Pie data={doughnutData} cx={60} cy={60} innerRadius={38} outerRadius={56} dataKey="value" startAngle={90} endAngle={-270}>{doughnutData.map((entry, index) => <Cell key={index} fill={entry.color} />)}</Pie></RePieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 24, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{evidenceStats.total}</span>
                  <span style={{ fontSize: 11, color: COLORS.muted }}>Total</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                {doughnutData.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                    <div style={{ fontSize: 12, color: COLORS.body, flex: 1 }}>{item.name}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{item.value}</div>
                    <div style={{ fontSize: 11, color: COLORS.muted, width: 36, textAlign: 'right' }}>{evidenceStats.total > 0 ? `${Math.round((item.value / evidenceStats.total) * 100)}%` : '0%'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <IconBox icon={AlertTriangle} size={32} borderRadius={10} color={COLORS.danger} bg={COLORS.dangerBg} iconSize={16} />
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: 0 }}>Missing Evidence Alerts</h3>
              </div>
            </div>
            {missingEvidenceList.map((item, idx) => (
              <div key={idx} style={{ padding: '14px 16px', borderRadius: 14, background: idx === 2 ? '#FFFBEB' : '#FEF2F2', border: `1px solid ${idx === 2 ? '#FDE68A' : '#FECACA'}`, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{item.name}</div>
                  <PriorityBadge level={item.priority} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <ImpactBadge level={item.impact} />
                  <button style={{ fontSize: 11, fontWeight: 600, color: COLORS.primary, background: 'none', border: 'none', cursor: 'pointer' }}>Request \u2192</button>
                </div>
              </div>
            ))}
          </div>

          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <IconBox icon={Shield} size={32} borderRadius={10} color={COLORS.purple} bg={COLORS.purpleBg} iconSize={16} />
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: 0 }}>Evidence Validation</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
              <ProgressRing value={validationScore} size={96} color={validationScore >= 80 ? COLORS.success : validationScore >= 60 ? COLORS.warning : COLORS.danger}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{validationScore}%</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: validationScore >= 80 ? COLORS.success : validationScore >= 60 ? COLORS.warning : COLORS.danger }}>
                    {validationScore >= 80 ? 'Good' : validationScore >= 60 ? 'Fair' : 'Poor'}
                  </span>
                </div>
              </ProgressRing>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {validationItems.map((item) => {
                  const scoreColor = item.score >= 80 ? COLORS.success : item.score >= 60 ? COLORS.warning : COLORS.danger
                  return (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle className="w-3.5 h-3.5" style={{ color: scoreColor, flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: 12, color: COLORS.body }}>{item.label}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: scoreColor }}>{item.score}%</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <IconBox icon={Target} size={32} borderRadius={10} color={COLORS.blue} bg={COLORS.blueBg} iconSize={16} />
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: 0 }}>Recommendations</h3>
              </div>
            </div>
            {recommendations.map((rec, idx) => {
              const recColor = rec.priority === 'high' ? COLORS.danger : COLORS.warning
              const recBg = rec.priority === 'high' ? '#FEF2F2' : '#FFFBEB'
              const recBorder = rec.priority === 'high' ? '#FECACA' : '#FDE68A'
              const Icon = rec.priority === 'high' ? AlertTriangle : Info
              return (
                <div key={idx} style={{ padding: '12px 14px', borderRadius: 12, background: recBg, border: `1px solid ${recBorder}`, display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', marginBottom: 10 }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.boxShadow = 'none' }}>
                  <IconBox icon={Icon} size={28} borderRadius={8} color={recColor} bg={`${recColor}18`} iconSize={16} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', marginBottom: 2 }}>{rec.text.split('.')[0]}.</div>
                    <div style={{ fontSize: 11, color: COLORS.body, lineHeight: 1.5 }}>{rec.text.split('.').slice(1).join('.') || 'Recommended action to strengthen the case.'}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(100px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  )
}