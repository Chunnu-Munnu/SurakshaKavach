import React from 'react'

const SimulationControls = ({ stats, onTriggerAttack, onReset, onSpeedChange }) => {
  const speed = stats?.speed || '1x'

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
        Simulation
      </div>
      <div className="flex flex-col gap-2 mb-3">
        <button
          onClick={() => onTriggerAttack(null)}
          style={{
            width: '100%',
            padding: 8,
            borderRadius: 6,
            border: '1px solid var(--suspicious)',
            background: 'var(--suspicious-dim)',
            color: 'var(--suspicious)',
            fontSize: 13,
            fontWeight: 500
          }}
        >
          ⚡ Trigger Attack
        </button>
        <button
          onClick={onReset}
          style={{
            width: '100%',
            padding: 8,
            borderRadius: 6,
            border: '1px solid #ffffff',
            background: 'transparent',
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 500
          }}
        >
          ↺ Reset All
        </button>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Speed:</span>
        {[1, 2, 5].map((mult) => {
          const active = speed === `${mult}x`
          return (
            <button
              key={mult}
              onClick={() => onSpeedChange(mult)}
              style={{
                padding: '4px 8px',
                borderRadius: 4,
                border: '1px solid ' + (active ? '#ffffff' : 'var(--border)'),
                background: active ? '#ffffff' : 'transparent',
                color: active ? '#000000' : 'var(--text-secondary)',
                fontSize: 11
              }}
            >
              {mult}x
            </button>
          )
        })}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
        Tick {stats?.tick_count ?? 0} · {stats?.uptime_seconds ?? 0}s · {speed}
      </div>
    </div>
  )
}

export default SimulationControls

