import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Bell, HelpCircle, RefreshCw, BookOpen, MoreHorizontal, Search, X,
  ChevronDown, ChevronRight, Check, Clock, AlertTriangle, Info,
  FileText, Download, Printer, Share2, Copy, Archive, Eye,
  Settings, LogOut, User, Sun, Moon, Keyboard, LifeBuoy,
  FileDown, FileJson, FilePlus2, ExternalLink, Trash2,
  MessageSquare, Star, Pin, Edit3, PinOff, Plus,
  ArrowUp, ArrowDown, CheckCheck, Filter,
} from 'lucide-react'
import IconBox from '../shared/IconBox'
import { COLORS } from '../../constants/theme'

// ═══════════════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════════════

function useClickOutside(ref, handler) {
  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) handler() }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [ref, handler])
}

function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => { const t = setTimeout(() => setDebounced(value), delay); return () => clearTimeout(t) }, [value, delay])
  return debounced
}

// ═══════════════════════════════════════════════════════════════════
// DROPDOWN WRAPPER
// ═══════════════════════════════════════════════════════════════════

function Dropdown({ trigger, children, align = 'right', width = 320 }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useClickOutside(ref, () => setOpen(false))

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={() => setOpen(!open)} style={{ cursor: 'pointer' }}>
        {trigger}
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', zIndex: 1000,
          [align]: 0, width, maxHeight: 480, overflow: 'hidden',
          background: '#fff', borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
          border: '1px solid #E5E7EB', animation: 'fadeInUp 0.2s ease',
        }}>
          {children}
        </div>
      )}
    </div>
  )
}

function DropdownItem({ icon: Icon, label, sublabel, onClick, danger, divider, disabled }) {
  return (
    <>
      <button
        onClick={disabled ? null : onClick}
        disabled={disabled}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, width: '100%',
          padding: '10px 16px', border: 'none', background: 'transparent',
          cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'left',
          fontSize: 13, color: danger ? COLORS.danger : '#374151',
          fontWeight: 500, transition: 'background 0.15s', opacity: disabled ? 0.4 : 1,
        }}
        onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = '#F9FAFB' }}
        onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = 'transparent' }}
      >
        {Icon && <Icon size={16} style={{ flexShrink: 0, color: danger ? COLORS.danger : '#6B7280' }} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
          {sublabel && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{sublabel}</div>}
        </div>
      </button>
      {divider && <div style={{ height: 1, background: '#F1F5F9', margin: '4px 0' }} />}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════
// NOTIFICATION CENTER
// ═══════════════════════════════════════════════════════════════════

const MOCK_NOTIFICATIONS = [
  { id: 1, type: 'evidence', title: 'Evidence Uploaded', message: 'John uploaded Payment Receipt.pdf', time: '2 min ago', read: false, caseId: 1 },
  { id: 2, type: 'timeline', title: 'Timeline Generated', message: 'AI generated case timeline for DISP-2025-0001', time: '5 min ago', read: false, caseId: 1 },
  { id: 3, type: 'validation', title: 'Validation Complete', message: 'Evidence validation passed for recent upload', time: '10 min ago', read: false, caseId: 1 },
  { id: 4, type: 'ai', title: 'AI Analysis Ready', message: 'AI reasoning pipeline completed for Case #2', time: '1 hour ago', read: true, caseId: 2 },
  { id: 5, type: 'system', title: 'Case Assigned', message: 'Case DISP-2025-0003 assigned to you', time: '3 hours ago', read: true, caseId: 3 },
]

const NOTIF_ICONS = { evidence: FileText, timeline: Clock, validation: Check, ai: Info, system: Bell }
const NOTIF_COLORS = { evidence: COLORS.primary, timeline: COLORS.purple, validation: COLORS.success, ai: COLORS.blue, system: COLORS.warning }

function NotificationCenter({ caseId }) {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS)
  const [filter, setFilter] = useState('all')
  const navigate = useNavigate()

  const filtered = filter === 'all' ? notifications : filter === 'unread' ? notifications.filter(n => !n.read) : notifications
  const unreadCount = notifications.filter(n => !n.read).length

  const markRead = (id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 480 }}>
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #F1F5F9' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>Notifications</h3>
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              style={{ fontSize: 12, color: COLORS.primary, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCheck size={14} /> Mark all read
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'unread'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                border: `1px solid ${filter === f ? COLORS.primary : '#E5E7EB'}`,
                background: filter === f ? COLORS.primaryLight : '#fff',
                color: filter === f ? COLORS.primary : '#6B7280', cursor: 'pointer',
              }}>
              {f === 'all' ? `All (${notifications.length})` : `Unread (${unreadCount})`}
            </button>
          ))}
        </div>
      </div>
      <div style={{ overflow: 'auto', flex: 1 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF' }}>
            <Bell size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
            <div style={{ fontSize: 13, fontWeight: 500 }}>No notifications</div>
            <div style={{ fontSize: 12, marginTop: 2 }}>You're all caught up!</div>
          </div>
        ) : filtered.map(n => {
          const Icon = NOTIF_ICONS[n.type] || Bell
          const color = NOTIF_COLORS[n.type] || COLORS.body
          return (
            <div key={n.id}
              onClick={() => { markRead(n.id); navigate(`/investigator/cases/${n.caseId}`) }}
              style={{
                display: 'flex', gap: 12, padding: '12px 16px', cursor: 'pointer',
                background: n.read ? '#fff' : '#F5F3FF',
                borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
              onMouseLeave={e => e.currentTarget.style.background = n.read ? '#fff' : '#F5F3FF'}
            >
              <IconBox icon={Icon} size={32} borderRadius={8} color={color} bg={`${color}15`} iconSize={16} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: n.read ? 500 : 600, color: '#111827', marginBottom: 1 }}>{n.title}</div>
                <div style={{ fontSize: 12, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{n.time}</div>
              </div>
              {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.primary, flexShrink: 0, marginTop: 6 }} />}
            </div>
          )
        })}
      </div>
      <div style={{ padding: '10px 16px', borderTop: '1px solid #F1F5F9', textAlign: 'center' }}>
        <button style={{ fontSize: 12, color: COLORS.primary, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>View All Notifications</button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// GLOBAL SEARCH
// ═══════════════════════════════════════════════════════════════════

const MOCK_SEARCH_DATA = [
  { id: 1, type: 'case', label: 'DISP-2025-0001', sublabel: 'Rahul Verma vs Shopify Merchants', icon: FileText },
  { id: 2, type: 'case', label: 'DISP-2025-0002', sublabel: 'Sarah Johnson vs Apple Store', icon: FileText },
  { id: 3, type: 'case', label: 'DISP-2025-0003', sublabel: 'Michael Brown vs Best Buy', icon: FileText },
  { id: 4, type: 'customer', label: 'Rahul Verma', sublabel: 'rahul.verma@email.com · +91 98765 43210', icon: User },
  { id: 5, type: 'customer', label: 'Sarah Johnson', sublabel: 'sarah.j@email.com', icon: User },
  { id: 6, type: 'merchant', label: 'Shopify Merchants Inc.', sublabel: 'support@shopify-merchants.com', icon: User },
  { id: 7, type: 'merchant', label: 'Apple Store', sublabel: 'support@apple.com', icon: User },
  { id: 8, type: 'transaction', label: 'TXN-2025-0088421', sublabel: '\u20B915,499 · Jun 15, 2025', icon: FileText },
  { id: 9, type: 'transaction', label: 'TXN-2025-0088001', sublabel: '\u20B92,499 · Jun 10, 2025', icon: FileText },
]

function highlightText(text, query) {
  if (!query) return text
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <span key={i} style={{ background: '#EEF2FF', fontWeight: 600, borderRadius: 2 }}>{part}</span>
      : part
  )
}

function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [focused, setFocused] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const [recentSearches, setRecentSearches] = useState(['DISP-2025-0001', 'Rahul Verma'])
  const inputRef = useRef(null)
  const debouncedQuery = useDebounce(query, 200)
  const navigate = useNavigate()

  useEffect(() => {
    if (!debouncedQuery) { setResults([]); return }
    const q = debouncedQuery.toLowerCase()
    setResults(MOCK_SEARCH_DATA.filter(item =>
      item.label.toLowerCase().includes(q) || item.sublabel.toLowerCase().includes(q)
    ))
    setSelectedIdx(-1)
  }, [debouncedQuery])

  const handleSelect = (item) => {
    setRecentSearches(prev => [item.label, ...prev.filter(s => s !== item.label)].slice(0, 5))
    setQuery('')
    setFocused(false)
    if (item.type === 'case') navigate(`/investigator/cases/${item.id}`)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && selectedIdx >= 0) handleSelect(results[selectedIdx])
    if (e.key === 'Escape') { setFocused(false); inputRef.current?.blur() }
  }

  const showResults = focused && (results.length > 0 || query.length > 0 || recentSearches.length > 0)

  return (
    <div style={{ position: 'relative', flex: 1, maxWidth: 420, minWidth: 200 }}>
      <div style={{ position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search cases, customers, transactions..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={(e) => { setFocused(true); e.currentTarget.style.borderColor = COLORS.primary; e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
          onKeyDown={handleKeyDown}
          aria-label="Global search"
          style={{
            width: '100%', height: 36, padding: `0 ${query ? 60 : 14}px 0 36px`,
            fontSize: 13, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
            background: focused ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.9)', outline: 'none', transition: 'all 0.2s',
          }}
        />
        {query && (
          <button onClick={() => { setQuery(''); inputRef.current?.focus() }}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 4 }}>
            <X size={14} />
          </button>
        )}
      </div>
      {showResults && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 1000,
          background: '#fff', borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
          border: '1px solid #E5E7EB', maxHeight: 360, overflow: 'auto',
        }}>
          {results.length > 0 ? (
            results.map((item, i) => (
              <div key={item.id}
                onClick={() => handleSelect(item)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                  cursor: 'pointer', background: i === selectedIdx ? '#F5F3FF' : 'transparent',
                  borderBottom: '1px solid #F1F5F9', transition: 'background 0.1s',
                }}
                onMouseEnter={() => setSelectedIdx(i)}
              >
                <IconBox icon={item.icon} size={28} borderRadius={6} color={COLORS.primary} bg={COLORS.primaryLight} iconSize={14} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{highlightText(item.label, query)}</div>
                  <div style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>{highlightText(item.sublabel, query)}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.03em', flexShrink: 0 }}>{item.type}</span>
              </div>
            ))
          ) : query ? (
            <div style={{ textAlign: 'center', padding: '24px 16px', color: '#9CA3AF' }}>
              <Search size={24} style={{ marginBottom: 8, opacity: 0.4 }} />
              <div style={{ fontSize: 13, fontWeight: 500 }}>No results found</div>
              <div style={{ fontSize: 12, marginTop: 2 }}>No matches for "{query}"</div>
            </div>
          ) : recentSearches.length > 0 && (
            <div>
              <div style={{ padding: '10px 14px 6px', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Recent Searches</div>
              {recentSearches.map((s, i) => (
                <div key={i} onClick={() => { setQuery(s); inputRef.current?.focus() }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, color: '#374151' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Clock size={14} style={{ color: '#9CA3AF' }} />
                  {s}
                </div>
              ))}
            </div>
          )}
          <div style={{ padding: '8px 14px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 12, fontSize: 11, color: '#9CA3AF' }}>
            <span><kbd style={kbdStyle}>\u2191</kbd><kbd style={kbdStyle}>\u2193</kbd> Navigate</span>
            <span><kbd style={kbdStyle}>\u23CE</kbd> Select</span>
            <span><kbd style={kbdStyle}>ESC</kbd> Close</span>
          </div>
        </div>
      )}
    </div>
  )
}

const kbdStyle = {
  padding: '1px 5px', fontSize: 10, fontWeight: 600, color: '#6B7280',
  background: '#F3F4F6', borderRadius: 4, border: '1px solid #E5E7EB',
  fontFamily: 'inherit', marginRight: 2,
}

// ═══════════════════════════════════════════════════════════════════
// HELP & SUPPORT PANEL
// ═══════════════════════════════════════════════════════════════════

function HelpPanel({ onClose }) {
  const sections = [
    { title: 'Keyboard Shortcuts', icon: Keyboard, items: ['Ctrl+K - Search', 'Ctrl+N - New Case', 'Ctrl+E - Evidence', 'Ctrl+T - Timeline', 'Ctrl+S - Save'] },
    { title: 'Quick Links', icon: LifeBuoy, items: ['User Guide', 'FAQ', 'Contact Support', 'Report an Issue'] },
    { title: 'About', icon: Info, items: ['DisputeIQ v1.0.0', 'AI-Powered Dispute Resolution', 'Module 1 - Investigation'] },
  ]
  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>Help & Support</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}><X size={16} /></button>
      </div>
      {sections.map(section => (
        <div key={section.title} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <section.icon size={16} style={{ color: COLORS.primary }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{section.title}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {section.items.map(item => (
              <div key={item} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, color: '#6B7280', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >{item}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// NOTES PANEL
// ═══════════════════════════════════════════════════════════════════

function NotesPanel({ onClose }) {
  const [notes, setNotes] = useState([
    { id: 1, text: 'Customer called to follow up on case status', pinned: true, author: 'John', time: '10 min ago' },
    { id: 2, text: 'Merchant provided shipping proof - verify with carrier', pinned: false, author: 'John', time: '1 hour ago' },
  ])
  const [newNote, setNewNote] = useState('')
  const [searchNotes, setSearchNotes] = useState('')
  const [filterPinned, setFilterPinned] = useState(false)

  const addNote = () => {
    if (!newNote.trim()) return
    setNotes(prev => [{ id: Date.now(), text: newNote, pinned: false, author: 'John', time: 'Just now' }, ...prev])
    setNewNote('')
  }

  const togglePin = (id) => setNotes(prev => prev.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n))
  const deleteNote = (id) => setNotes(prev => prev.filter(n => n.id !== id))

  const filtered = notes.filter(n => {
    if (filterPinned && !n.pinned) return false
    if (searchNotes && !n.text.toLowerCase().includes(searchNotes.toLowerCase())) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 480 }}>
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #F1F5F9' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>Notes</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input type="text" placeholder="Add a note..." value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addNote()}
            style={{ flex: 1, height: 32, padding: '0 10px', fontSize: 12, border: '1px solid #E5E7EB', borderRadius: 8, outline: 'none' }}
          />
          <button onClick={addNote}
            style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: COLORS.primary, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={14} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
            <input type="text" placeholder="Search notes..." value={searchNotes}
              onChange={(e) => setSearchNotes(e.target.value)}
              style={{ width: '100%', height: 28, padding: '0 8px 0 26px', fontSize: 11, border: '1px solid #E5E7EB', borderRadius: 6, outline: 'none' }}
            />
          </div>
          <button onClick={() => setFilterPinned(!filterPinned)}
            style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, border: `1px solid ${filterPinned ? COLORS.primary : '#E5E7EB'}`, background: filterPinned ? COLORS.primaryLight : '#fff', color: filterPinned ? COLORS.primary : '#6B7280', cursor: 'pointer' }}>
            <Pin size={12} style={{ marginRight: 4 }} />Pinned
          </button>
        </div>
      </div>
      <div style={{ overflow: 'auto', flex: 1, padding: '8px 0' }}>
        {sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 16px', color: '#9CA3AF', fontSize: 12 }}>No notes yet</div>
        ) : sorted.map(n => (
          <div key={n.id} style={{ padding: '10px 16px', borderBottom: '1px solid #F5F5F5', position: 'relative', background: n.pinned ? '#FFFBEB' : 'transparent' }}>
            <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5, marginBottom: 4, whiteSpace: 'pre-wrap' }}>{n.text}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: '#9CA3AF' }}>
              <span>{n.author} · {n.time}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => togglePin(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: n.pinned ? COLORS.warning : '#9CA3AF', padding: 2 }}>
                  <Pin size={12} />
                </button>
                <button onClick={() => deleteNote(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 2 }}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// MORE OPTIONS MENU
// ═══════════════════════════════════════════════════════════════════

function MoreOptionsMenu({ caseId }) {
  const navigate = useNavigate()
  const items = [
    { icon: FileDown, label: 'Download PDF', sublabel: 'Export case as PDF', onClick: () => alert('PDF export initiated') },
    { icon: FileJson, label: 'Download JSON', sublabel: 'Export raw case data', onClick: () => alert('JSON export initiated') },
    { icon: FilePlus2, label: 'Duplicate Case', sublabel: 'Create a copy of this case', onClick: () => alert('Case duplication started') },
    { icon: Printer, label: 'Print Case Summary', sublabel: 'Print investigation summary', onClick: () => window.print() },
    { icon: Share2, label: 'Share Case', sublabel: 'Share with team members', onClick: () => alert('Share dialog opened') },
    { icon: Copy, label: 'Copy Case ID', sublabel: `DISP-2025-${String(10000 + (parseInt(caseId) || 1)).slice(1)}`, onClick: () => navigator.clipboard?.writeText(`DISP-2025-${String(10000 + (parseInt(caseId) || 1)).slice(1)}`).then(() => alert('Case ID copied')) },
    { divider: true },
    { icon: Archive, label: 'Archive Case', sublabel: 'Move to archived cases', onClick: () => alert('TODO: Archive case API') },
    { icon: Trash2, label: 'Close Case', sublabel: 'Close and finalize', danger: true, onClick: () => alert('TODO: Close case API') },
    { divider: true },
    { icon: Eye, label: 'View Activity Log', onClick: () => alert('TODO: Open activity log') },
    { icon: Settings, label: 'Case Settings', onClick: () => alert('TODO: Open case settings') },
  ]

  return (
    <div style={{ padding: '6px 0', maxHeight: 420, overflow: 'auto' }}>
      {items.map((item, i) => item.divider ? (
        <div key={i} style={{ height: 1, background: '#F1F5F9', margin: '4px 12px' }} />
      ) : (
        <DropdownItem key={i} {...item} />
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// USER PROFILE DROPDOWN
// ═══════════════════════════════════════════════════════════════════

function UserProfileDropdown({ onLogout }) {
  const navigate = useNavigate()
  const user = { name: 'John', email: 'john@disputiq.com', role: 'Lead Investigator', online: true }
  const items = [
    { icon: User, label: 'View Profile', sublabel: user.email, onClick: () => alert('TODO: Profile page') },
    { icon: Settings, label: 'Account Settings', onClick: () => alert('TODO: Settings page') },
    { icon: Sun, label: 'Theme: Light', sublabel: 'Switch to dark mode', onClick: () => alert('TODO: Theme toggle') },
    { icon: Bell, label: 'Notification Settings', onClick: () => alert('TODO: Notification prefs') },
    { icon: Keyboard, label: 'Keyboard Shortcuts', onClick: () => alert('Ctrl+K: Search, Ctrl+N: New Case') },
    { icon: LifeBuoy, label: 'Help Center', onClick: () => navigate('/help') },
    { divider: true },
    { icon: LogOut, label: 'Sign Out', danger: true, onClick: () => { localStorage.clear(); window.location.reload() } },
  ]

  return (
    <div>
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ position: 'relative', width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
          {user.name[0]}
          {user.online && <div style={{ position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderRadius: '50%', background: '#22C55E', border: '2px solid #fff' }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{user.name}</div>
          <div style={{ fontSize: 12, color: '#6B7280' }}>{user.role}</div>
        </div>
      </div>
      <div style={{ padding: '6px 0' }}>
        {items.map((item, i) => item.divider ? (
          <div key={i} style={{ height: 1, background: '#F1F5F9', margin: '4px 12px' }} />
        ) : (
          <DropdownItem key={i} {...item} />
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// MAIN TOP NAVBAR
// ═══════════════════════════════════════════════════════════════════

export default function TopNavBar({ caseId, caseData, onRefresh }) {
  const navigate = useNavigate()
  const [refreshing, setRefreshing] = useState(false)
  const [toast, setToast] = useState(null)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      if (onRefresh) await onRefresh()
      setToast({ type: 'success', message: 'Data refreshed successfully' })
    } catch {
      setToast({ type: 'error', message: 'Failed to refresh data' })
    }
    setTimeout(() => setRefreshing(null), 2000)
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <>
      {toast && (
        <div style={{
          position: 'fixed', top: 16, right: 16, zIndex: 10000,
          padding: '10px 16px', borderRadius: 10,
          background: toast.type === 'success' ? '#F0FDF4' : '#FEF2F2',
          border: `1px solid ${toast.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 13, fontWeight: 500, color: toast.type === 'success' ? '#16A34A' : '#DC2626',
          animation: 'fadeInUp 0.2s ease',
        }}>
          {toast.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          {toast.message}
        </div>
      )}
      <header style={{
        height: 64, background: '#0F1A2E', display: 'flex',
        alignItems: 'center', padding: '0 24px', gap: 16, flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 500, flexShrink: 0 }}>
          <span
            onClick={() => navigate('/investigator/dashboard')}
            style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.6)', transition: 'color 0.2s', padding: '4px 6px', borderRadius: 6 }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
          >Workspace</span>
          <ChevronRight size={12} />
          <span
            onClick={() => navigate('/investigator/dashboard')}
            style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.6)', transition: 'color 0.2s', padding: '4px 6px', borderRadius: 6 }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
          >Cases</span>
          <ChevronRight size={12} />
          <span style={{ color: '#fff', fontWeight: 600, padding: '4px 6px', borderRadius: 6, background: 'rgba(79,70,229,0.2)' }}>
            {caseData?.case_id || `Case #${caseId}`}
          </span>
        </div>

        {/* Global Search */}
        <GlobalSearch />

        {/* Action Icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Dropdown trigger={<IconBtn icon={Bell} badge={3} tooltip="Notifications" />} width={380}>
            <NotificationCenter caseId={caseId} />
          </Dropdown>
          <Dropdown trigger={<IconBtn icon={HelpCircle} tooltip="Help & Support" />} width={320}>
            <HelpPanel onClose={() => {}} />
          </Dropdown>
          <IconBtn icon={RefreshCw} tooltip="Refresh" spinning={refreshing} onClick={handleRefresh} />
          <Dropdown trigger={<IconBtn icon={BookOpen} tooltip="Notes" />} width={360}>
            <NotesPanel onClose={() => {}} />
          </Dropdown>
          <Dropdown trigger={<IconBtn icon={MoreHorizontal} tooltip="More options" />} width={280}>
            <MoreOptionsMenu caseId={caseId} />
          </Dropdown>

          <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />

          <Dropdown trigger={<UserAvatar name="John" />} width={280} align="right">
            <UserProfileDropdown />
          </Dropdown>
        </div>
      </header>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function IconBtn({ icon: Icon, tooltip, badge, onClick, spinning }) {
  return (
    <button
      onClick={onClick}
      disabled={spinning}
      title={tooltip}
      aria-label={tooltip}
      style={{
        width: 34, height: 34, borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: spinning ? 'wait' : 'pointer', position: 'relative',
        transition: 'all 0.2s', color: 'rgba(255,255,255,0.6)',
        opacity: spinning ? 0.6 : 1,
      }}
      onMouseEnter={e => { if (!spinning) { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff' } }}
      onMouseLeave={e => { if (!spinning) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' } }}
    >
      <Icon size={16} className={spinning ? 'diq-spin' : ''} />
      {badge != null && badge > 0 && (
        <div style={{
          position: 'absolute', top: -4, right: -4,
          width: 16, height: 16, borderRadius: '50%', background: '#EF4444',
          color: '#fff', fontSize: 9, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {badge > 9 ? '9+' : badge}
        </div>
      )}
    </button>
  )
}

function UserAvatar({ name }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 8px 2px 2px', borderRadius: 8, cursor: 'pointer', transition: 'background 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ width: 28, height: 28, borderRadius: 6, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, position: 'relative' }}>
        {name?.[0] || 'U'}
        <div style={{ position: 'absolute', bottom: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: '#22C55E', border: '2px solid #0F1A2E' }} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', gap: 4 }}>
        {name}
        <ChevronDown size={12} style={{ color: 'rgba(255,255,255,0.4)' }} />
      </div>
    </div>
  )
}