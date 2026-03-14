import React from 'react'

const AlertFeed = ({ alerts }) => {
  const items = alerts || []

  if (!items.length) {
    return (
      <div className="card flex items-center justify-center"
        style={{ height: 80, fontSize: 12, color: 'var(--healthy)' }}>
        ● All devices nominal
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: 12, maxHeight: 240, overflowY: 'auto' }}>
      <div style={{
        fontSize: 10, fontFamily: 'var(--font-mono)',
        letterSpacing: '1.5px', textTransform: 'uppercase',
        color: '#ffffff', marginBottom: 8,
      }}>
        Alerts
      </div>
      {items.map((a) => (
        <div key={a.id} style={{
          display: 'flex', flexDirection: 'column',
          marginBottom: 5, padding: '7px 10px',
          borderRadius: '0 6px 6px 0',
          borderLeft: `3px solid ${severityColor(a.severity)}`,
          background: severityDim(a.severity),
          animation: 'slide-in 0.25s ease',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#ffffff' }}>
              {a.device_name}{' '}
              <span style={{ fontSize: 10, color: '#cccccc', fontWeight: 400 }}>{a.alert_type}</span>
            </div>
            <div style={{ fontSize: 10, color: '#aaaaaa' }}>{relTime(a.timestamp)}</div>
          </div>
          <div style={{ fontSize: 11, color: '#dddddd', marginTop: 2 }}>{a.message}</div>
        </div>
      ))}
    </div>
  )
}

const severityColor = (s) => ({ HEALTHY:'var(--healthy)', DRIFTING:'var(--drifting)', SUSPICIOUS:'var(--suspicious)', CRITICAL:'var(--critical)' }[s] || '#888')
const severityDim   = (s) => ({ HEALTHY:'var(--healthy-dim)', DRIFTING:'var(--drifting-dim)', SUSPICIOUS:'var(--suspicious-dim)', CRITICAL:'var(--critical-dim)' }[s] || 'transparent')
const relTime = (ts) => {
  if (!ts) return ''
  const diff = Math.max(0, Date.now() / 1000 - ts)
  if (diff < 60) return `${Math.round(diff)}s ago`
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`
  return `${Math.round(diff / 3600)}h ago`
}

export default AlertFeed
