import React from 'react'

const BlockchainAudit = ({ logs, status }) => {
  const items     = logs?.slice(0, 20) || []
  const connected = status?.connected
  const addr      = status?.contract_address

  return (
    <div className="card" style={{ padding: '16px 20px', marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#ffffff', fontFamily: 'var(--font-mono)', letterSpacing: '1px', textTransform: 'uppercase' }}>
          Blockchain Audit Trail
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: connected ? 'var(--healthy)' : '#aaaaaa', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{
              display: 'inline-block', width: 6, height: 6, borderRadius: '999px',
              background: connected ? 'var(--healthy)' : '#555',
            }} />
            {connected ? 'On-chain' : 'Local fallback'}
          </span>
          {addr && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#aaaaaa' }}>
              {truncateAddr(addr)}
            </span>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 12, color: '#aaaaaa' }}>
          No anomalies logged — all devices nominal
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ color: '#ffffff', fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.5px' }}>
              {['Time','Device','Severity','Trust','Feature','Action','Hash','Source'].map(h => (
                <th key={h} className="text-left pb-1" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 6, textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((l) => (
              <tr key={`${l.id}-${l.timestamp}`} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '7px 4px', color: '#cccccc' }}>{formatTime(l.timestamp)}</td>
                <td style={{ padding: '7px 4px', color: '#ffffff', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{l.device_id}</td>
                <td style={{ padding: '7px 4px' }}>
                  <span className="badge" style={{
                    borderRadius: 4,
                    background: severityDim(l.severity_label),
                    borderColor: severityColor(l.severity_label) + '66',
                    color: severityColor(l.severity_label),
                  }}>
                    {l.severity_label}
                  </span>
                </td>
                <td style={{ padding: '7px 4px', color: '#ffffff' }}>{l.trust_score}</td>
                <td style={{ padding: '7px 4px', color: '#dddddd' }}>{l.top_feature}</td>
                <td style={{ padding: '7px 4px', color: '#dddddd' }}>{l.action_taken}</td>
                <td style={{ padding: '7px 4px', fontFamily: 'var(--font-mono)', fontSize: 10, color: '#aaaaaa' }}>
                  {truncateHash(l.data_hash)}
                </td>
                <td style={{ padding: '7px 4px' }}>
                  <span className="badge" style={{
                    borderRadius: 4,
                    borderColor: l.source === 'blockchain' ? 'var(--healthy)' : 'var(--border)',
                    color: l.source === 'blockchain' ? 'var(--healthy)' : '#aaaaaa',
                    fontSize: 10,
                  }}>
                    {l.source === 'blockchain' ? '✓ Chain' : 'Local'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {status?.total_logs != null && (
        <div style={{ marginTop: 8, fontSize: 11, color: '#aaaaaa', fontFamily: 'var(--font-mono)' }}>
          Showing last {items.length} of {status.total_logs} logs
        </div>
      )}
    </div>
  )
}

const truncateAddr = (a) => a?.length > 10 ? `${a.slice(0,6)}...${a.slice(-4)}` : a
const truncateHash = (h) => h?.length > 18 ? `${h.slice(0,10)}...${h.slice(-4)}` : h
const formatTime   = (ts) => ts ? new Date(ts * 1000).toISOString().split('T')[1].split('.')[0] : ''

const severityColor = (l) => ({ HEALTHY:'var(--healthy)', DRIFTING:'var(--drifting)', SUSPICIOUS:'var(--suspicious)', CRITICAL:'var(--critical)' }[l] || '#888')
const severityDim   = (l) => ({ HEALTHY:'var(--healthy-dim)', DRIFTING:'var(--drifting-dim)', SUSPICIOUS:'var(--suspicious-dim)', CRITICAL:'var(--critical-dim)' }[l] || 'transparent')

export default BlockchainAudit
