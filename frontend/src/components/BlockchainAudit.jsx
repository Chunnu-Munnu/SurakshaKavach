import React from 'react'

const BlockchainAudit = ({ logs, status }) => {
  const items = logs?.slice(0, 20) || []
  const connected = status?.connected
  const addr = status?.contract_address

  return (
    <div className="card" style={{ padding: '16px 20px', marginTop: 12 }}>
      <div className="flex items-center justify-between mb-3">
        <div style={{ fontSize: 14, fontWeight: 500 }}>Blockchain Audit Trail</div>
        <div className="flex items-center gap-2">
          <span
            style={{
              fontSize: 12,
              color: connected ? 'var(--healthy)' : 'var(--text-secondary)'
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: '999px',
                marginRight: 4,
                background: connected ? 'var(--healthy)' : 'var(--text-muted)'
              }}
            />
            {connected ? 'On-chain' : 'Local fallback'}
          </span>
          {addr && (
            <span
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                fontSize: 11,
                color: 'var(--text-secondary)'
              }}
            >
              {truncateAddr(addr)}
            </span>
          )}
        </div>
      </div>
      {items.length === 0 ? (
        <div
          style={{
            padding: 24,
            textAlign: 'center',
            fontSize: 12,
            color: 'var(--text-secondary)'
          }}
        >
          No anomalies logged — all devices nominal
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
              <th className="text-left pb-1" style={{ borderBottom: '1px solid var(--border)' }}>Time</th>
              <th className="text-left pb-1" style={{ borderBottom: '1px solid var(--border)' }}>Device</th>
              <th className="text-left pb-1" style={{ borderBottom: '1px solid var(--border)' }}>Severity</th>
              <th className="text-left pb-1" style={{ borderBottom: '1px solid var(--border)' }}>Trust</th>
              <th className="text-left pb-1" style={{ borderBottom: '1px solid var(--border)' }}>Feature</th>
              <th className="text-left pb-1" style={{ borderBottom: '1px solid var(--border)' }}>Action</th>
              <th className="text-left pb-1" style={{ borderBottom: '1px solid var(--border)' }}>Hash</th>
              <th className="text-left pb-1" style={{ borderBottom: '1px solid var(--border)' }}>Source</th>
            </tr>
          </thead>
          <tbody>
            {items.map((l) => (
              <tr key={`${l.id}-${l.timestamp}`} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '6px 4px' }}>{formatTime(l.timestamp)}</td>
                <td style={{ padding: '6px 4px' }}>{l.device_id}</td>
                <td style={{ padding: '6px 4px' }}>
                  <span
                    className="badge"
                    style={{
                      borderRadius: 4,
                      background: severityDim(l.severity_label),
                      borderColor: severityColor(l.severity_label) + '66',
                      color: severityColor(l.severity_label)
                    }}
                  >
                    {l.severity_label}
                  </span>
                </td>
                <td style={{ padding: '6px 4px' }}>{l.trust_score}</td>
                <td style={{ padding: '6px 4px' }}>{l.top_feature}</td>
                <td style={{ padding: '6px 4px' }}>{l.action_taken}</td>
                <td
                  style={{
                    padding: '6px 4px',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                    fontSize: 10
                  }}
                >
                  {truncateHash(l.data_hash)}
                </td>
                <td style={{ padding: '6px 4px' }}>
                  <span
                    className="badge"
                    style={{
                      borderRadius: 4,
                      borderColor:
                        l.source === 'blockchain'
                          ? 'var(--healthy)'
                          : 'var(--text-secondary)',
                      color:
                        l.source === 'blockchain'
                          ? 'var(--healthy)'
                          : 'var(--text-secondary)',
                      fontSize: 10
                    }}
                  >
                    {l.source === 'blockchain' ? '✓ Chain' : 'Local'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {status?.total_logs != null && (
        <div
          style={{
            marginTop: 6,
            fontSize: 11,
            color: 'var(--text-muted)'
          }}
        >
          Showing last {items.length} of {status.total_logs} logs
        </div>
      )}
    </div>
  )
}

const truncateAddr = (addr) =>
  addr && addr.length > 10 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr

const truncateHash = (hash) =>
  hash && hash.length > 18 ? `${hash.slice(0, 10)}...${hash.slice(-4)}` : hash

const formatTime = (ts) => {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  return d.toISOString().split('T')[1].split('.')[0]
}

const severityColor = (label) => {
  switch (label) {
    case 'HEALTHY':
      return 'var(--healthy)'
    case 'DRIFTING':
      return 'var(--drifting)'
    case 'SUSPICIOUS':
      return 'var(--suspicious)'
    case 'CRITICAL':
      return 'var(--critical)'
    default:
      return 'var(--text-secondary)'
  }
}

const severityDim = (label) => {
  switch (label) {
    case 'HEALTHY':
      return 'var(--healthy-dim)'
    case 'DRIFTING':
      return 'var(--drifting-dim)'
    case 'SUSPICIOUS':
      return 'var(--suspicious-dim)'
    case 'CRITICAL':
      return 'var(--critical-dim)'
    default:
      return 'transparent'
  }
}

export default BlockchainAudit

