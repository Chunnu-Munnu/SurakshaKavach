import React, { memo, useEffect, useRef } from 'react'

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

const DeviceCard = memo(function DeviceCard({ device, onSelect }) {
  const ref = useRef(null)
  const prevSeverity = useRef(device.severity)

  useEffect(() => {
    if (prevSeverity.current !== device.severity && ref.current) {
      ref.current.classList.add('flash')
      const t = setTimeout(() => {
        ref.current && ref.current.classList.remove('flash')
      }, 600)
      return () => clearTimeout(t)
    }
    prevSeverity.current = device.severity
  }, [device.severity])

  const sevColor = severityColor(device.severity)

  const score = device.trust_score ?? 100
  const predicted = device.predicted_trust_5_windows ?? score
  const delta = Math.round(predicted - score)

  const scores = device.anomaly_scores || {}

  return (
    <div
      ref={ref}
      className="card"
      onClick={() => onSelect(device)}
      style={{
        padding: 14,
        cursor: 'pointer',
        borderColor: device.severity !== 'HEALTHY' ? sevColor : 'var(--border)',
        borderLeftWidth: device.severity === 'CRITICAL' ? 4 : 1,
        borderLeftColor:
          device.severity === 'CRITICAL' ? 'var(--critical)' : undefined,
        transition: 'border-color 150ms ease'
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 18 }}>{device.emoji}</span>
          <span style={{ fontSize: 13 }}>{device.name}</span>
        </div>
        <span
          className="badge"
          style={{
            backgroundColor: severityDim(device.severity),
            borderColor: sevColor + '66',
            color: sevColor,
            fontSize: 10,
            fontWeight: 500
          }}
        >
          {device.severity}
        </span>
      </div>
      <div className="flex flex-col items-center mb-2">
        <div style={{ fontSize: 32, fontWeight: 600 }}>{score.toFixed(1)}</div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Trust Score</div>
      </div>
      <div
        className="w-full mb-2"
        style={{
          height: 4,
          borderRadius: 2,
          background: 'var(--bg-tertiary)',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            width: `${Math.max(0, Math.min(100, score))}%`,
            height: '100%',
            background: sevColor
          }}
        />
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
        ML Evidence Layers
      </div>
      <div className="grid grid-cols-4 gap-1 mb-2">
        <TinyBar label="IF" value={scores.isolation_forest} color="#3b82f6" />
        <TinyBar label="Tmp" value={scores.temporal} color="#8b5cf6" />
        <TinyBar label="Stat" value={scores.statistical} color="#f59e0b" />
        <TinyBar label="Peer" value={scores.peer} color="#ef4444" max={0.2} />
      </div>
      <div className="flex items-center justify-between">
        <span
          className="badge"
          style={{
            borderRadius: 4,
            borderColor: 'var(--border)',
            fontSize: 10,
            color: 'var(--text-secondary)'
          }}
        >
          {device.state}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          pred: {predicted.toFixed(1)} ({delta >= 0 ? '↑' : '↓'}
          {Math.abs(delta)})
        </span>
      </div>
    </div>
  )
})

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

const TinyBar = ({ label, value = 0, color, max = 1 }) => {
  const pct = Math.max(0, Math.min(1, value / max)) * 100
  return (
    <div>
      <div
        style={{
          fontSize: 9,
          color: 'var(--text-secondary)',
          marginBottom: 2
        }}
      >
        {label}
      </div>
      <div
        style={{
          height: 8,
          borderRadius: 4,
          background: 'var(--bg-tertiary)',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: color
          }}
        />
      </div>
    </div>
  )
}

export default DeviceCard

