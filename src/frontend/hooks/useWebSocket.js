import { useEffect, useRef, useState, useCallback } from 'react'

export function useWebSocket() {
  const wsRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState(null)
  const reconnectTimer = useRef(null)

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${protocol}://${window.location.host}/ws`)

    ws.onopen = () => {
      setConnected(true)
      console.log('[ws] Connected')
    }

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        setLastEvent(msg)
      } catch { /* ignore */ }
    }

    ws.onclose = () => {
      setConnected(false)
      reconnectTimer.current = setTimeout(connect, 3000)
    }

    ws.onerror = () => ws.close()

    wsRef.current = ws
  }, [])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  return { connected, lastEvent }
}
