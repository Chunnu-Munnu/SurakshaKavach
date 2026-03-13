import React from 'react'

const Card = ({ label, value, delta }) => (
  <div className="card flex flex-col justify-between" style={{ padding: 16 }}>
    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</div>
    <div style={{ fontSize: 28, fontWeight: 600 }}>{value}</div>
    {delta != null && (
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
        {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)} from last
      </div>
    )}
  </div>
)

const NetworkOverview = ({ networkStatus, blockchainStatus }) => {
  const totalDevices = networkStatus?.total_devices ?? 0
  const avgTrust = networkStatus?.network_trust_index ?? 100
  const alerts = (networkStatus?.active_alerts ?? []).length
  const chainLogs = blockchainStatus?.total_logs ?? 0

  return (
    <div className="grid grid-cols-2 gap-3 mb-3">
      <Card label="Total Devices" value={totalDevices} delta={0} />
      <Card label="Network Trust Index" value={avgTrust.toFixed(1)} delta={0} />
      <Card label="Active Alerts" value={alerts} delta={0} />
      <Card label="Blockchain Logs" value={chainLogs} delta={0} />
    </div>
  )
}

export default NetworkOverview

