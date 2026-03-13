import React, { useMemo } from 'react'

const SpreadGraph = ({ devices }) => {
  const nodes = useMemo(() => {
    if (!devices || !devices.length) return []
    const clusters = {
      camera: { cx: 120, cy: 80 },
      thermostat: { cx: 360, cy: 80 },
      smart_lock: { cx: 120, cy: 220 },
      router: { cx: 360, cy: 220 }
    }
    const grouped = { camera: [], thermostat: [], smart_lock: [], router: [] }
    devices.forEach((d) => grouped[d.device_class]?.push(d))

    const result = []
    Object.entries(grouped).forEach(([cls, arr]) => {
      const { cx, cy } = clusters[cls]
      const angleStep = (Math.PI * 2) / Math.max(arr.length, 1)
      arr.forEach((d, idx) => {
        const angle = idx * angleStep
        const r = 40
        result.push({
          ...d,
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle)
        })
      })
    })
    return result
  }, [devices])

  const edges = useMemo(() => {
    const list = []
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]
        const b = nodes[j]
        if (a.device_class === b.device_class || Math.abs(i - j) <= 2) {
          list.push({ a, b })
        }
      }
    }
    return list
  }, [nodes])

  return (
    <div className="card" style={{ padding: 16 }}>
      <div
        style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          marginBottom: 8
        }}
      >
        Attack Propagation Map
      </div>
      <svg width="100%" height="280" viewBox="0 0 480 280">
        {edges.map((e, idx) => {
          const compromised =
            e.a.severity === 'CRITICAL' || e.b.severity === 'CRITICAL'
          return (
            <line
              key={idx}
              x1={e.a.x}
              y1={e.a.y}
              x2={e.b.x}
              y2={e.b.y}
              stroke={compromised ? 'var(--critical)' : 'var(--border)'}
              strokeWidth={compromised ? 1 : 0.5}
              strokeDasharray={compromised ? '4 2' : '0'}
            />
          )
        })}
        {nodes.map((n) => {
          const sevColor = severityColor(n.severity)
          const sevDim = severityDim(n.severity)
          const isComp = n.severity === 'CRITICAL'
          const isPredTarget = (n.spread_risk || 0) > 0.3
          return (
            <g key={n.id}>
              {isComp && (
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={24}
                  fill="none"
                  stroke="var(--critical)"
                  strokeWidth="1.5"
                  style={{ opacity: 0.4 }}
                />
              )}
              {isPredTarget && (
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={20}
                  fill="none"
                  stroke="var(--drifting)"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                />
              )}
              <circle
                cx={n.x}
                cy={n.y}
                r={14}
                fill={sevDim}
                stroke={sevColor}
                strokeWidth="1.5"
              />
              <text
                x={n.x}
                y={n.y + 22}
                textAnchor="middle"
                style={{ fontSize: 9, fill: 'var(--text-secondary)' }}
              >
                {n.id}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

const severityColor = (sev) => {
  switch (sev) {
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

const severityDim = (sev) => {
  switch (sev) {
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

export default SpreadGraph

