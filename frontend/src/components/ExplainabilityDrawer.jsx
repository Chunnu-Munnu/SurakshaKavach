import React from 'react'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'

const ExplainabilityDrawer = ({ device, onClose }) => {
  if (!device) return null

  const sevColor = severityColor(device.severity)
  const history = device.history || []
  const chartData = history.map((h, idx) => ({
    idx,
    trust: h.trust_score
  }))

  const scores = device.anomaly_scores || {}

  return (
    <div
      style={{
        position: 'fixed',
        top: 56,
        right: 0,
        bottom: 0,
        width: 400,
        background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border)',
        transform: 'translateX(0)',
        transition: 'transform 250ms ease',
        zIndex: 100,
        overflowY: 'auto'
      }}
    >
      <div className="flex justify-between items-center" style={{ padding: 16 }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 22 }}>{device.emoji}</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{device.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {device.device_class}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            border: 'none',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: 18,
            cursor: 'pointer'
          }}
        >
          ×
        </button>
      </div>
      <div style={{ padding: '0 16px 16px' }}>
        <div className="flex items-center gap-3 mb-3">
          <div style={{ fontSize: 32, fontWeight: 600, color: sevColor }}>
            {device.trust_score?.toFixed(1)}
          </div>
          <span
            className="badge"
            style={{
              background: severityDim(device.severity),
              borderColor: sevColor + '66',
              color: sevColor
            }}
          >
            {device.severity}
          </span>
          <span
            className="badge"
            style={{
              borderRadius: 4,
              fontSize: 10,
              color: 'var(--text-secondary)'
            }}
          >
            {device.state}
          </span>
        </div>

        {/* Trust trajectory */}
        <SectionTitle>Trust History</SectionTitle>
        <div style={{ height: 140, marginBottom: 16 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="trustArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={sevColor} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={sevColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="idx" hide />
              <YAxis domain={[0, 100]} hide />
              <Tooltip
                contentStyle={{ background: 'var(--bg-tertiary)', border: 'none' }}
                labelStyle={{ color: 'var(--text-secondary)' }}
              />
              <Area
                type="monotone"
                dataKey="trust"
                stroke={sevColor}
                fill="url(#trustArea)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Evidence layers */}
        <SectionTitle>Evidence Layers</SectionTitle>
        <LayerRow label="Isolation Forest" value={scores.isolation_forest} color="#3b82f6" />
        <LayerRow label="Temporal" value={scores.temporal} color="#8b5cf6" />
        <LayerRow label="Statistical" value={scores.statistical} color="#f59e0b" />
        <LayerRow label="Peer Correlation" value={scores.peer} max={0.2} color="#ef4444" />

        {/* Explanation */}
        <SectionTitle>Explanation</SectionTitle>
        <div
          style={{
            background: 'var(--bg-tertiary)',
            borderRadius: 6,
            padding: 12,
            marginBottom: 12,
            fontSize: 13
          }}
        >
          {device.explanation}
        </div>
        {device.recommended_action && (
          <span
            className="badge"
            style={{
              borderRadius: 6,
              borderColor: actionColor(device.recommended_action),
              color: actionColor(device.recommended_action),
              background: actionDim(device.recommended_action),
              fontSize: 11
            }}
          >
            {device.recommended_action}
          </span>
        )}
      </div>
    </div>
  )
}

const SectionTitle = ({ children }) => (
  <div
    style={{
      fontSize: 12,
      color: 'var(--text-secondary)',
      textTransform: 'uppercase',
      marginBottom: 6,
      marginTop: 8
    }}
  >
    {children}
  </div>
)

const LayerRow = ({ label, value = 0, max = 1, color }) => {
  const pct = Math.max(0, Math.min(1, value / max)) * 100
  return (
    <div className="flex items-center gap-2 mb-1">
      <div style={{ width: 120, fontSize: 12 }}>{label}</div>
      <div
        style={{
          flex: 1,
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
      <div style={{ width: 40, fontSize: 12, textAlign: 'right' }}>
        {(value || 0).toFixed(2)}
      </div>
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

const actionColor = (action) => {
  switch (action) {
    case 'ISOLATE':
      return 'var(--critical)'
    case 'MONITOR':
      return 'var(--drifting)'
    default:
      return 'var(--info)'
  }
}

const actionDim = (action) => {
  switch (action) {
    case 'ISOLATE':
      return 'var(--critical-dim)'
    case 'MONITOR':
      return 'var(--drifting-dim)'
    default:
      return 'var(--info-dim)'
  }
}

export default ExplainabilityDrawer

