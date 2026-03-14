import React, { useMemo, useState } from 'react'
import TopBar from './components/TopBar.jsx'
import NetworkOverview from './components/NetworkOverview.jsx'
import DeviceGrid from './components/DeviceGrid.jsx'
import SpreadGraph from './components/SpreadGraph.jsx'
import AlertFeed from './components/AlertFeed.jsx'
import BlockchainAudit from './components/BlockchainAudit.jsx'
import SimulationControls from './components/SimulationControls.jsx'
import ExplainabilityDrawer from './components/ExplainabilityDrawer.jsx'
import useWebSocket from './hooks/useWebSocket.js'

const App = () => {
  const {
    devices,
    networkStatus,
    blockchainLogs,
    connected,
    lastUpdate,
    triggerAttack,
    resetSimulation,
    setSpeed,
  } = useWebSocket()

  const [selectedDevice, setSelectedDevice] = useState(null)
  const [chainStatus, setChainStatus] = useState(null)

  useMemo(() => {
    const fetchStatus = async () => {
      try {
        const res  = await fetch('/api/blockchain/status')
        const data = await res.json()
        setChainStatus(data)
      } catch (_) {}
    }
    fetchStatus()
  }, [lastUpdate])

  const stats = networkStatus?.simulation_stats

  const criticalDevices = devices.filter(d => d.severity === 'CRITICAL')
  const driftingDevices = devices.filter(d => d.severity === 'DRIFTING' || d.severity === 'SUSPICIOUS')
  const hasCritical     = criticalDevices.length > 0
  const hasDrifting     = driftingDevices.length > 0

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      gridTemplateRows: '72px 1fr',
      gridTemplateColumns: '300px 1fr',
      color: 'var(--text-primary)',
    }}>

      {/* Top bar — full width */}
      <div style={{ gridColumn: '1 / span 2' }}>
        <TopBar
          networkStatus={networkStatus}
          onSpeedChange={setSpeed}
          currentSpeed={stats ? parseInt(stats.speed) : 1}
        />
      </div>

      {/* Sidebar */}
      <aside style={{
        borderRight: '1px solid var(--border)',
        padding: 14,
        background: 'var(--bg-primary)',
        overflowY: 'auto',
      }}>
        <NetworkOverview networkStatus={networkStatus} blockchainStatus={chainStatus} />
        <AlertFeed alerts={networkStatus?.active_alerts || []} />
        <div style={{ marginTop: 10 }}>
          <SimulationControls
            stats={stats}
            onTriggerAttack={triggerAttack}
            onReset={resetSimulation}
            onSpeedChange={setSpeed}
          />
        </div>
      </aside>

      {/* Main */}
      <main style={{ padding: 16, overflow: 'auto', background: 'var(--bg-primary)' }}>

        {/* 1. Alert banner */}
        {hasCritical && (
          <div className="alert-banner critical">
            <span>⚠</span>
            <span>
              <strong>CRITICAL ATTACK DETECTED</strong>
              {' — '}
              {criticalDevices.map(d => d.name || d.id).join(', ')} compromised
            </span>
          </div>
        )}
        {!hasCritical && hasDrifting && (
          <div className="alert-banner warning">
            <span>◉</span>
            <span>
              <strong>{driftingDevices.length} device{driftingDevices.length > 1 ? 's' : ''} drifting</strong>
              {' — monitor closely'}
            </span>
          </div>
        )}

        {/* 2. Attack Propagation Map — FIRST */}
        <div style={{ marginBottom: 16 }}>
          <SpreadGraph devices={devices} />
        </div>

        {/* 3. Device grid — critical on top, then healthy */}
        <DeviceGrid devices={devices} onSelectDevice={setSelectedDevice} />

        {/* 4. Blockchain audit — last */}
        <BlockchainAudit logs={blockchainLogs} status={chainStatus} />
      </main>

      <ExplainabilityDrawer device={selectedDevice} onClose={() => setSelectedDevice(null)} />
    </div>
  )
}

export default App
