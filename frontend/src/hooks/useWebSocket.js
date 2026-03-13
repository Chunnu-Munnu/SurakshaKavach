import { useCallback, useEffect, useRef, useState } from 'react'

const useWebSocket = (url = 'ws://localhost:8000/ws/live-feed') => {
  const [devices, setDevices] = useState([])
  const [networkStatus, setNetworkStatus] = useState(null)
  const [blockchainLogs, setBlockchainLogs] = useState([])
  const [connected, setConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)

  const wsRef = useRef(null)
  const reconnectRef = useRef(null)
  const reconnectDelay = useRef(1000)

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      reconnectDelay.current = 1000
    }

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type === 'state_update') {
        setDevices(msg.data.devices || [])
        setNetworkStatus(msg.data.network || null)
        setLastUpdate(new Date())
      }
      if (msg.type === 'blockchain_log') {
        setBlockchainLogs(prev => [msg.log, ...prev].slice(0, 100))
      }
    }

    ws.onclose = () => {
      setConnected(false)
      reconnectRef.current = setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 1.5, 5000)
        connect()
      }, reconnectDelay.current)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [url])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectRef.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [connect])

  const triggerAttack = async (deviceId = null) => {
    await fetch('/api/simulation/trigger-attack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId })
    })
  }

  const resetSimulation = async () => {
    await fetch('/api/simulation/reset', { method: 'POST' })
  }

  const setSpeed = async (multiplier) => {
    await fetch('/api/simulation/speed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ multiplier })
    })
  }

  return {
    devices,
    networkStatus,
    blockchainLogs,
    connected,
    lastUpdate,
    triggerAttack,
    resetSimulation,
    setSpeed
  }
}

export default useWebSocket

