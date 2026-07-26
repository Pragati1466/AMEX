import { useEffect, useRef, useCallback } from 'react'

const WS_BASE = (() => {
  const apiUrl = import.meta.env.VITE_API_URL || 'https://disputiq-api.onrender.com/api/v1'
  const base = apiUrl.replace('/api/v1', '').replace(/^https/, 'wss').replace(/^http/, 'ws')
  return base
})()

/**
 * useResolutionWebSocket — connects to /api/resolution/ws/{caseId}?token=...
 * Calls onEvent(eventType, data) for every message received.
 * Auto-reconnects up to maxRetries times on unexpected disconnect.
 */
export function useResolutionWebSocket({ caseId, onEvent, enabled = true, maxRetries = 5 }) {
  const wsRef = useRef(null)
  const retriesRef = useRef(0)
  const mountedRef = useRef(true)
  const timerRef = useRef(null)

  const connect = useCallback(() => {
    if (!caseId || !enabled) return
    const token = localStorage.getItem('token')
    if (!token) return

    const url = `${WS_BASE}/api/v1/resolution/ws/${caseId}?token=${encodeURIComponent(token)}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      retriesRef.current = 0
      if (onEvent) onEvent('connected', {})
    }

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data)
        // Backend sends { event: string, case_id: int, data: object }
        if (msg.event && onEvent) onEvent(msg.event, msg.data || {})
      } catch {
        // ignore malformed messages
      }
    }

    ws.onerror = () => {
      if (onEvent) onEvent('error', {})
    }

    ws.onclose = (e) => {
      if (!mountedRef.current) return
      if (onEvent) onEvent('disconnected', { code: e.code })
      // Reconnect with backoff unless deliberately closed
      if (e.code !== 1000 && retriesRef.current < maxRetries) {
        const delay = Math.min(1000 * 2 ** retriesRef.current, 30000)
        retriesRef.current += 1
        timerRef.current = setTimeout(connect, delay)
      }
    }
  }, [caseId, enabled, onEvent, maxRetries])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      clearTimeout(timerRef.current)
      if (wsRef.current) {
        wsRef.current.onclose = null // prevent reconnect on intentional unmount
        wsRef.current.close(1000, 'component unmounted')
      }
    }
  }, [connect])

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  return { send }
}
