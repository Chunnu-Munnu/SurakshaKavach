import React from 'react'

const severityColor = (value) => {
  if (value >= 80) return 'var(--healthy)'
  if (value >= 50) return 'var(--drifting)'
  if (value >= 20) return 'var(--suspicious)'
  return 'var(--critical)'
}

const TopBar = ({ networkStatus, onSpeedChange, currentSpeed }) => {
  const trust   = networkStatus?.network_trust_index ?? 100
  const counts  = networkStatus || {}
  const critical   = counts.critical_count   ?? 0
  const suspicious = counts.suspicious_count ?? 0
  const drifting   = counts.drifting_count   ?? 0
  const healthy    = counts.healthy_count    ?? 0
  const atRisk     = critical + suspicious

  return (
    <header
      style={{
        height: 72,
        padding: '0 28px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
      }}
    >
      {/* Brand */}
      <div style={{ minWidth: 160 }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          fontSize: 16,
          letterSpacing: '2px',
          color: 'var(--healthy)',
        }}>
          GhostPrint MLE
        </div>
        <div style={{ fontSize: 10, color: '#ffffff', letterSpacing: '1px', textTransform: 'uppercase', marginTop: 2 }}>
          IoT Security Intelligence
        </div>
      </div>

      {/* Centre — trust score LARGE */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          fontSize: 42,
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          color: severityColor(trust),
          lineHeight: 1,
        }}>
          {trust.toFixed(1)}
        </div>
        <div style={{ fontSize: 11, color: '#ffffff', marginTop: 2, letterSpacing: '1px', textTransform: 'uppercase' }}>
          Network Trust Index
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '999px',
            background: 'var(--healthy)',
            animation: 'pulse-live 1.5s ease-in-out infinite',
          }} />
          <span style={{ fontSize: 10, color: 'var(--healthy)', fontFamily: 'var(--font-mono)', letterSpacing: '1px' }}>
            LIVE
          </span>
        </div>
      </div>

      {/* Right — big stat pills + speed */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>

        {/* At-risk big stat */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '8px 16px',
          borderRadius: 10,
          background: atRisk > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.08)',
          border: `1px solid ${atRisk > 0 ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.2)'}`,
          minWidth: 80,
        }}>
          <div style={{
            fontSize: 30, fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            color: atRisk > 0 ? 'var(--critical)' : 'var(--healthy)',
            lineHeight: 1,
          }}>
            {atRisk}
          </div>
          <div style={{ fontSize: 9, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '1px', marginTop: 3 }}>
            At Risk
          </div>
        </div>

        {/* Critical big stat */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '8px 16px',
          borderRadius: 10,
          background: critical > 0 ? 'rgba(239,68,68,0.12)' : 'var(--bg-tertiary)',
          border: `1px solid ${critical > 0 ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
          minWidth: 80,
        }}>
          <div style={{
            fontSize: 30, fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            color: critical > 0 ? 'var(--critical)' : '#ffffff',
            lineHeight: 1,
            animation: critical > 0 ? 'blink-dot 1.5s ease-in-out infinite' : undefined,
          }}>
            {critical}
          </div>
          <div style={{ fontSize: 9, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '1px', marginTop: 3 }}>
            Critical
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 44, background: 'var(--border)' }} />

        {/* Status pills row */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <CountPill label="Healthy"    value={healthy}    color="var(--healthy)"    bg="var(--healthy-dim)" />
            <CountPill label="Drifting"   value={drifting}   color="var(--drifting)"   bg="var(--drifting-dim)" />
            <CountPill label="Suspicious" value={suspicious} color="var(--suspicious)" bg="var(--suspicious-dim)" />
          </div>
          {/* Speed controls below pills */}
          <div style={{ display: 'flex', gap: 5 }}>
            {[1, 2, 5].map((mult) => {
              const active = currentSpeed === mult
              return (
                <button
                  key={mult}
                  onClick={() => onSpeedChange(mult)}
                  style={{
                    flex: 1,
                    padding: '3px 0',
                    borderRadius: 5,
                    border: `1px solid ${active ? 'var(--healthy)' : 'var(--border)'}`,
                    background: active ? 'var(--healthy-dim)' : 'transparent',
                    color: active ? 'var(--healthy)' : '#ffffff',
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer',
                  }}
                >
                  {mult}x
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </header>
  )
}

const CountPill = ({ label, value, color, bg }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '4px 10px',
    borderRadius: 999,
    border: `1px solid ${color}33`,
    background: bg,
    fontSize: 11,
  }}>
    <span style={{ width: 6, height: 6, borderRadius: '999px', background: color }} />
    <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#ffffff' }}>{value}</span>
    <span style={{ color: '#ffffff' }}>{label}</span>
  </div>
)

export default TopBar
