import React from 'react'

const KpiCard = ({ label, value, sub, accent }) => (
  <div className="card" style={{
    padding: '18px 20px',
    borderTop: `2px solid ${accent}`,
    position: 'relative',
    overflow: 'hidden',
  }}>
    <div style={{
      fontSize: 10, fontFamily: 'var(--font-mono)',
      letterSpacing: '1.5px', textTransform: 'uppercase',
      color: '#ffffff', marginBottom: 8,
    }}>
      {label}
    </div>
    <div style={{
      fontSize: 42, fontWeight: 700, lineHeight: 1,
      color: accent, fontFamily: 'var(--font-mono)', marginBottom: 6,
    }}>
      {value}
    </div>
    {sub && <div style={{ fontSize: 11, color: '#cccccc' }}>{sub}</div>}
  </div>
)

const NetworkOverview = ({ networkStatus, blockchainStatus }) => {
  const totalDevices    = networkStatus?.total_devices ?? 0
  const avgTrust        = networkStatus?.network_trust_index ?? 100
  const alerts          = (networkStatus?.active_alerts ?? []).length
  const criticalCount   = networkStatus?.critical_count ?? 0
  const suspiciousCount = networkStatus?.suspicious_count ?? 0
  const atRisk          = criticalCount + suspiciousCount

  const trustAccent =
    avgTrust >= 90 ? 'var(--healthy)' :
    avgTrust >= 70 ? 'var(--drifting)' : 'var(--critical)'

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
      <KpiCard label="Total Devices"    value={totalDevices}        sub="Active on network"                            accent="var(--healthy)" />
      <KpiCard label="Network Trust"    value={avgTrust.toFixed(1)} sub="Index score"                                  accent={trustAccent} />
      <KpiCard label="Devices at Risk"  value={atRisk}              sub={`${criticalCount} critical · ${suspiciousCount} suspicious`} accent={atRisk > 0 ? 'var(--critical)' : '#555'} />
      <KpiCard label="Active Alerts"    value={alerts}              sub={alerts > 0 ? 'Needs attention' : 'All nominal'} accent={alerts > 0 ? 'var(--drifting)' : '#555'} />
    </div>
  )
}

export default NetworkOverview
