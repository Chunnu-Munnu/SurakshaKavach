import React, { useMemo } from 'react'

const SpreadGraph = ({ devices }) => {
  const nodes = useMemo(() => {
    if (!devices || !devices.length) return []
    const clusters = {
      camera:     { cx: 120, cy: 90 },
      thermostat: { cx: 360, cy: 90 },
      smart_lock: { cx: 120, cy: 230 },
      router:     { cx: 360, cy: 230 },
    }
    const grouped = { camera: [], thermostat: [], smart_lock: [], router: [] }
    devices.forEach((d) => grouped[d.device_class]?.push(d))

    const result = []
    Object.entries(grouped).forEach(([cls, arr]) => {
      const { cx, cy } = clusters[cls]
      const angleStep = (Math.PI * 2) / Math.max(arr.length, 1)
      arr.forEach((d, idx) => {
        const angle = idx * angleStep
        result.push({ ...d, x: cx + 42 * Math.cos(angle), y: cy + 42 * Math.sin(angle) })
      })
    })
    return result
  }, [devices])

  const edges = useMemo(() => {
    const list = []
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j]
        if (a.device_class === b.device_class || Math.abs(i - j) <= 2)
          list.push({ a, b })
      }
    return list
  }, [nodes])

  const hasCritical = nodes.some(n => n.severity === 'CRITICAL')

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{
        fontSize: 10, fontFamily: 'var(--font-mono)',
        letterSpacing: '1.5px', textTransform: 'uppercase',
        color: '#ffffff', marginBottom: 10,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {hasCritical && (
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--critical)',
            animation: 'blink-dot 1s ease-in-out infinite',
            display: 'inline-block',
          }} />
        )}
        Attack Propagation Map
        <span style={{ flex: 1, height: 1, background: 'var(--border)', display: 'inline-block' }} />
        <span style={{ fontSize: 10, color: '#aaaaaa' }}>{nodes.length} nodes</span>
      </div>

      <svg width="100%" height="300" viewBox="0 0 480 300">
        {edges.map((e, idx) => {
          const compromised = e.a.severity === 'CRITICAL' || e.b.severity === 'CRITICAL'
          return (
            <line key={idx}
              x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y}
              stroke={compromised ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.07)'}
              strokeWidth={compromised ? 1.5 : 0.7}
              strokeDasharray={compromised ? '4 2' : '0'}
            />
          )
        })}
        {nodes.map((n) => {
          const sc = severityColor(n.severity)
          const sd = severityDim(n.severity)
          const isCrit = n.severity === 'CRITICAL'
          const isPred = (n.spread_risk || 0) > 0.3
          return (
            <g key={n.id}>
              {isCrit && (
                <circle cx={n.x} cy={n.y} r={26} fill="none"
                  stroke="var(--critical)" strokeWidth="1.5" opacity="0.4" />
              )}
              {isPred && (
                <circle cx={n.x} cy={n.y} r={21} fill="none"
                  stroke="var(--drifting)" strokeWidth="1.5" strokeDasharray="4 2" />
              )}
              <circle cx={n.x} cy={n.y} r={14} fill={sd} stroke={sc} strokeWidth="1.5" />
              <text x={n.x} y={n.y + 24} textAnchor="middle"
                style={{ fontSize: 9, fill: '#ffffff' }}>
                {n.id}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

const severityColor = (s) => ({ HEALTHY:'var(--healthy)', DRIFTING:'var(--drifting)', SUSPICIOUS:'var(--suspicious)', CRITICAL:'var(--critical)' }[s] || '#888')
const severityDim   = (s) => ({ HEALTHY:'var(--healthy-dim)', DRIFTING:'var(--drifting-dim)', SUSPICIOUS:'var(--suspicious-dim)', CRITICAL:'var(--critical-dim)' }[s] || 'transparent')

export default SpreadGraph
