import React, { useMemo, useState } from 'react'
import TopBar from './components/TopBar.jsx'
import NetworkOverview from './components/NetworkOverview.jsx'
import DeviceGrid from "./components/DeviceGrid.jsx";
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
    setSpeed
  } = useWebSocket()
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [chainStatus, setChainStatus] = useState(null)

  useMemo(() => {
    // Fetch blockchain status periodically (not via WS)
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/blockchain/status')
        const data = await res.json()
        setChainStatus(data)
      } catch (e) {
        // ignore
      }
    }
    fetchStatus()
  }, [lastUpdate])

  const stats = networkStatus?.simulation_stats

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateRows: '56px 1fr',
        gridTemplateColumns: '320px 1fr',
        color: 'var(--text-primary)'
      }}
    >
      <div style={{ gridColumn: '1 / span 2' }}>
        <TopBar
          networkStatus={networkStatus}
          onSpeedChange={setSpeed}
          currentSpeed={stats ? parseInt(stats.speed) : 1}
        />
      </div>

      <aside
        style={{
          borderRight: '1px solid var(--border)',
          padding: 16,
          background: 'var(--bg-primary)'
        }}
      >
        <NetworkOverview networkStatus={networkStatus} blockchainStatus={chainStatus} />
        <AlertFeed alerts={networkStatus?.active_alerts || []} />
        <div style={{ marginTop: 8 }}>
          <SimulationControls
            stats={stats}
            onTriggerAttack={triggerAttack}
            onReset={resetSimulation}
            onSpeedChange={setSpeed}
          />
        </div>
      </aside>

      <main
        style={{
          padding: 16,
          overflow: 'auto',
          background: 'var(--bg-primary)'
        }}
      >
        <DeviceGrid devices={devices} onSelectDevice={setSelectedDevice} />
        <SpreadGraph devices={devices} />
        <BlockchainAudit logs={blockchainLogs} status={chainStatus} />
      </main>

      <ExplainabilityDrawer device={selectedDevice} onClose={() => setSelectedDevice(null)} />
    </div>
  )
}

export default App

