import React from 'react'

const AlertFeed = ({ alerts }) => {
  const items = alerts || []

  if (!items.length) {
    return (
      <div
        className="card flex items-center justify-center"
        style={{ height: 120, fontSize: 12, color: 'var(--healthy)' }}
      >
        ● All devices nominal
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: 12, maxHeight: 260, overflowY: 'auto' }}>
      <div
        style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          marginBottom: 8
        }}
      >
        Alerts
      </div>
      {items.map((a) => (
        <div
          key={a.id}
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginBottom: 4,
            padding: '6px 10px',
            borderRadius: '0 6px 6px 0',
            borderLeft: `3px solid ${severityColor(a.severity)}`,
            background: severityDim(a.severity),
            animation: 'slide-in 0.25s ease'
          }}
        >
          <div className="flex justify-between">
            <div style={{ fontSize: 13 }}>
              {a.device_name}{' '}
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                {a.alert_type}
              </span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {relTime(a.timestamp)}
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{a.message}</div>
        </div>
      ))}
    </div>
  )
}

const severityColor = (severity) => {
  switch (severity) {
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

const severityDim = (severity) => {
  switch (severity) {
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

const relTime = (ts) => {
  if (!ts) return ''
  const diff = Math.max(0, Date.now() / 1000 - ts)
  if (diff < 60) return `${Math.round(diff)}s ago`
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`
  return `${Math.round(diff / 3600)}h ago`
}

export default AlertFeed

