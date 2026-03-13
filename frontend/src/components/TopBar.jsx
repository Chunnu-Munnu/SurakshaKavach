import React from 'react'

const severityColor = (value) => {
  if (value >= 80) return 'var(--healthy)'
  if (value >= 50) return 'var(--drifting)'
  if (value >= 20) return 'var(--suspicious)'
  return 'var(--critical)'
}

const TopBar = ({ networkStatus, onSpeedChange, currentSpeed }) => {
  const trust = networkStatus?.network_trust_index ?? 100
  const counts = networkStatus || {}

  const speedButtons = [1, 2, 5]

  return (
    <header
      className="w-full flex items-center justify-between"
      style={{
        height: 56,
        padding: '0 24px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-secondary)'
      }}
    >
      <div>
        <div
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontWeight: 600,
            fontSize: 16
          }}
        >
          GhostPrint MLE
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          IoT Security Intelligence
        </div>
      </div>

      <div className="flex flex-col items-center">
        <div
          style={{
            fontSize: 32,
            fontWeight: 600,
            color: severityColor(trust),
            lineHeight: 1
          }}
        >
          {trust.toFixed(1)}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          Network Trust Index
        </div>
        <div
          style={{
            marginTop: 2,
            fontSize: 11,
            color: 'var(--healthy)',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '999px',
              background: 'var(--healthy)',
              animation: 'pulse-live 1.5s ease-in-out infinite'
            }}
          />
          LIVE
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex gap-2">
          <CountPill
            label="Healthy"
            value={counts.healthy_count ?? 0}
            color="var(--healthy)"
            bg="var(--healthy-dim)"
          />
          <CountPill
            label="Drifting"
            value={counts.drifting_count ?? 0}
            color="var(--drifting)"
            bg="var(--drifting-dim)"
          />
          <CountPill
            label="Suspicious"
            value={counts.suspicious_count ?? 0}
            color="var(--suspicious)"
            bg="var(--suspicious-dim)"
          />
          <CountPill
            label="Critical"
            value={counts.critical_count ?? 0}
            color="var(--critical)"
            bg="var(--critical-dim)"
          />
        </div>
        <div className="flex items-center gap-1">
          {speedButtons.map((mult) => {
            const active = currentSpeed === mult
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
      </div>
    </header>
  )
}

const CountPill = ({ label, value, color, bg }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 8px',
        borderRadius: 999,
        border: `1px solid ${color}33`,
        background: bg,
        fontSize: 11,
        color: 'var(--text-primary)'
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '999px',
          background: color
        }}
      />
      <span style={{ fontWeight: 500 }}>{value}</span>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
    </div>
  )
}

export default TopBar

