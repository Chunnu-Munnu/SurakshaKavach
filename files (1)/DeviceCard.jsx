import React, { memo, useEffect, useRef } from 'react'

const SEV_COLOR = { HEALTHY:'var(--healthy)', DRIFTING:'var(--drifting)', SUSPICIOUS:'var(--suspicious)', CRITICAL:'var(--critical)' }
const SEV_DIM   = { HEALTHY:'var(--healthy-dim)', DRIFTING:'var(--drifting-dim)', SUSPICIOUS:'var(--suspicious-dim)', CRITICAL:'var(--critical-dim)' }

const DeviceCard = memo(function DeviceCard({ device, onSelect }) {
  const ref = useRef(null)
  const prevSeverity = useRef(device.severity)

  useEffect(() => {
    if (prevSeverity.current !== device.severity && ref.current) {
      ref.current.classList.add('flash')
      const t = setTimeout(() => ref.current?.classList.remove('flash'), 600)
      return () => clearTimeout(t)
    }
    prevSeverity.current = device.severity
  }, [device.severity])

  const sevColor   = SEV_COLOR[device.severity] || '#888'
  const isCritical = device.severity === 'CRITICAL'
  const score      = device.trust_score ?? 100
  const predicted  = device.predicted_trust_5_windows ?? score
  const delta      = Math.round(predicted - score)
  const scores     = device.anomaly_scores || {}

  return (
    <div
      ref={ref}
      className="card"
      onClick={() => onSelect(device)}
      style={{
        padding: 14, cursor: 'pointer',
        borderColor: device.severity !== 'HEALTHY' ? sevColor + '99' : 'var(--border)',
        borderLeftWidth: isCritical ? 3 : 1,
        borderLeftColor: isCritical ? 'var(--critical)' : undefined,
        transition: 'all 200ms ease',
        animation: isCritical ? 'glow-critical 2s ease-in-out infinite' : undefined,
        background: isCritical
          ? 'linear-gradient(135deg, var(--bg-secondary) 0%, rgba(239,68,68,0.06) 100%)'
          : 'var(--bg-secondary)',
      }}
    >
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 8 }}>
        <div style={{ display:'flex', alignItems:'center', gap: 7 }}>
          <span style={{ fontSize: 15 }}>{device.emoji}</span>
          <span style={{ fontSize: 12, fontFamily:'var(--font-mono)', fontWeight:700, color:'#ffffff' }}>
            {device.name}
          </span>
        </div>
        <span className="badge" style={{
          backgroundColor: SEV_DIM[device.severity],
          borderColor: sevColor + '55', color: sevColor,
          animation: isCritical ? 'blink-dot 1.5s ease-in-out infinite' : undefined,
        }}>
          {device.severity}
        </span>
      </div>

      {/* Score */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 34, fontWeight:700, fontFamily:'var(--font-mono)', color: sevColor, lineHeight:1 }}>
          {score.toFixed(1)}
        </div>
        <div style={{ fontSize: 9, color:'#aaaaaa', textTransform:'uppercase', letterSpacing:'1px', marginTop:2, fontFamily:'var(--font-mono)' }}>
          Trust Score
        </div>
      </div>

      {/* Bar */}
      <div style={{ height:3, borderRadius:2, background:'var(--bg-tertiary)', overflow:'hidden', marginBottom:10 }}>
        <div style={{ width:`${Math.max(0,Math.min(100,score))}%`, height:'100%', background:sevColor, transition:'width 0.8s ease' }} />
      </div>

      {/* ML bars */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:4, marginBottom:8 }}>
        <TinyBar label="IF"   value={scores.isolation_forest} color="#3b82f6" />
        <TinyBar label="Tmp"  value={scores.temporal}         color="#8b5cf6" />
        <TinyBar label="Stat" value={scores.statistical}      color="#f59e0b" />
        <TinyBar label="Peer" value={scores.peer}             color="#ef4444" max={0.2} />
      </div>

      {/* Footer */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span className="badge" style={{ fontSize:9, color:'#cccccc', borderColor:'var(--border)' }}>
          {device.state}
        </span>
        <span style={{ fontSize:10, color:'#aaaaaa', fontFamily:'var(--font-mono)' }}>
          pred {predicted.toFixed(1)}{' '}
          <span style={{ color: delta >= 0 ? 'var(--healthy)' : 'var(--critical)' }}>
            {delta >= 0 ? '↑' : '↓'}{Math.abs(delta)}
          </span>
        </span>
      </div>
    </div>
  )
})

const TinyBar = ({ label, value=0, color, max=1 }) => {
  const pct = Math.max(0, Math.min(1, value / max)) * 100
  return (
    <div>
      <div style={{ fontSize:8, color:'#aaaaaa', marginBottom:2, fontFamily:'var(--font-mono)' }}>{label}</div>
      <div style={{ height:5, borderRadius:2, background:'var(--bg-tertiary)', overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:color }} />
      </div>
    </div>
  )
}

export default DeviceCard
