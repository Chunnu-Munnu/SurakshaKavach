import React from 'react'

const SimulationControls = ({ stats, onTriggerAttack, onReset, onSpeedChange }) => {
  const speed = stats?.speed || '1x'

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{
        fontSize: 10, fontFamily: 'var(--font-mono)',
        letterSpacing: '1.5px', textTransform: 'uppercase',
        color: '#ffffff', marginBottom: 10,
      }}>
        Simulation
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => onTriggerAttack(null)}
          style={{
            width: '100%', padding: '10px 0', borderRadius: 7,
            border: '1px solid var(--critical)',
            background: 'var(--critical-dim)',
            color: '#ffffff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          ⚡ Trigger Attack
        </button>
        <button
          onClick={onReset}
          style={{
            width: '100%', padding: '10px 0', borderRadius: 7,
            border: '1px solid var(--border)',
            background: 'transparent',
            color: '#ffffff', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}
        >
          ↺ Reset All
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: '#ffffff' }}>Speed:</span>
        {[1, 2, 5].map((mult) => {
          const active = speed === `${mult}x`
          return (
            <button
              key={mult}
              onClick={() => onSpeedChange(mult)}
              style={{
                padding: '4px 10px', borderRadius: 5,
                border: `1px solid ${active ? 'var(--healthy)' : 'var(--border)'}`,
                background: active ? 'var(--healthy-dim)' : 'transparent',
                color: active ? 'var(--healthy)' : '#ffffff',
                fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer',
              }}
            >
              {mult}x
            </button>
          )
        })}
      </div>

      <div style={{ fontSize: 11, color: '#aaaaaa', fontFamily: 'var(--font-mono)' }}>
        Tick {stats?.tick_count ?? 0} · {stats?.uptime_seconds ?? 0}s · {speed}
      </div>
    </div>
  )
}

export default SimulationControls
