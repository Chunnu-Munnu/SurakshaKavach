import React, { useState, useEffect } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

// ── Fetch AI explanation from GhostPrint backend (Gemini-powered) ──────────
const fetchAIExplanation = async (deviceId) => {
  const res = await fetch(`/api/ai/explain/${deviceId}`, { method: 'POST' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Server error ${res.status}`)
  }
  const data = await res.json()
  return data.explanation
}

// ── Main Component ──────────────────────────────────────────────────────────
const ExplainabilityDrawer = ({ device, onClose }) => {
  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [aiLoading,  setAiLoading]  = useState(false)
  const [aiError,    setAiError]    = useState(null)

  // Reset AI state whenever selected device changes — useEffect avoids render-loop
  useEffect(() => {
    setAiAnalysis(null)
    setAiError(null)
    setAiLoading(false)
  }, [device?.id])

  if (!device) return null

  const sevColor  = SEV_COLOR[device.severity] || '#888'
  const chartData = (device.history || []).map((h, idx) => ({ idx, trust: h.trust_score }))
  const scores    = device.anomaly_scores || {}

  const handleAnalyze = async () => {
    setAiLoading(true)
    setAiError(null)
    try {
      const result = await fetchAIExplanation(device.id)
      setAiAnalysis(result)
    } catch (e) {
      setAiError(e.message || 'Analysis failed. Check GEMINI_API_KEY in your .env file.')
    } finally {
      setAiLoading(false)
    }
  }

  const confidenceColor = { HIGH: 'var(--critical)', MEDIUM: 'var(--drifting)', LOW: '#aaaaaa' }

  return (
    <div style={{
      position: 'fixed', top: 72, right: 0, bottom: 0, width: 430,
      background: 'var(--bg-secondary)',
      borderLeft: '1px solid var(--border)',
      zIndex: 100, overflowY: 'auto',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 16px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-tertiary)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>{device.emoji}</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
              {device.name}
            </div>
            <div style={{ fontSize: 10, color: '#aaaaaa', marginTop: 1, textTransform: 'uppercase', letterSpacing: '1px' }}>
              {device.device_class}
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{
          border: 'none', background: 'transparent', color: '#ffffff',
          fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '2px 6px',
        }}>×</button>
      </div>

      <div style={{ padding: 16, flex: 1 }}>

        {/* ── Score + badges ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ fontSize: 38, fontWeight: 700, fontFamily: 'var(--font-mono)', color: sevColor, lineHeight: 1 }}>
            {device.trust_score?.toFixed(1)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="badge" style={{ background: SEV_DIM[device.severity], borderColor: sevColor + '55', color: sevColor }}>
              {device.severity}
            </span>
            <span className="badge" style={{ fontSize: 9, color: '#cccccc', borderColor: 'var(--border)' }}>
              {device.state}
            </span>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#aaaaaa' }}>Predicted</div>
            <div style={{ fontSize: 16, fontFamily: 'var(--font-mono)', color: sevColor, fontWeight: 700 }}>
              {device.predicted_trust_5_windows?.toFixed(1) ?? '—'}
            </div>
          </div>
        </div>

        {/* ── Trust history chart ── */}
        <SectionTitle>Trust History</SectionTitle>
        <div style={{ height: 110, marginBottom: 14 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="trustGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={sevColor} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={sevColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="idx" hide />
              <YAxis domain={[0, 100]} hide />
              <Tooltip contentStyle={{ background: 'var(--bg-tertiary)', border: 'none', color: '#fff', fontSize: 11 }} />
              <Area type="monotone" dataKey="trust" stroke={sevColor} fill="url(#trustGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ── ML Evidence layers ── */}
        <SectionTitle>ML Evidence Layers</SectionTitle>
        <div style={{ marginBottom: 14 }}>
          <LayerRow label="Isolation Forest" value={scores.isolation_forest} color="#3b82f6" />
          <LayerRow label="Temporal (LSTM)"  value={scores.temporal}         color="#8b5cf6" />
          <LayerRow label="Statistical Drift"value={scores.statistical}      color="#f59e0b" />
          <LayerRow label="Peer Correlation" value={scores.peer} max={0.2}   color="#ef4444" />
        </div>

        {/* ── System note from backend rule engine ── */}
        {device.explanation && (
          <>
            <SectionTitle>System Note</SectionTitle>
            <div style={{
              background: 'var(--bg-tertiary)', borderRadius: 8,
              padding: '10px 12px', marginBottom: 14,
              fontSize: 12, color: '#cccccc', lineHeight: 1.6,
              borderLeft: '3px solid var(--border)',
            }}>
              {device.explanation}
            </div>
          </>
        )}

        {/* ── AI Analyse button ── */}
        {!aiAnalysis && (
          <>
            <button
              onClick={handleAnalyze}
              disabled={aiLoading}
              style={{
                width: '100%', padding: '13px 0',
                borderRadius: 8, cursor: aiLoading ? 'wait' : 'pointer',
                border: `1px solid ${device.severity === 'CRITICAL'
                  ? 'rgba(239,68,68,0.5)'
                  : 'rgba(99,179,237,0.4)'}`,
                background: device.severity === 'CRITICAL'
                  ? 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.04))'
                  : 'linear-gradient(135deg, rgba(99,179,237,0.1), rgba(99,179,237,0.03))',
                color: '#ffffff', fontSize: 13, fontWeight: 600,
                fontFamily: 'var(--font-mono)', letterSpacing: '0.5px',
                transition: 'all 0.2s', marginBottom: 10,
              }}
            >
              {aiLoading
                ? <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                    <SpinnerDots /> Gemini is analysing…
                  </span>
                : '✦  Explain with Gemini AI'}
            </button>

            {aiError && (
              <div style={{
                padding: '10px 12px', borderRadius: 8, marginBottom: 10,
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.3)',
                fontSize: 12, color: 'var(--critical)', lineHeight: 1.5,
              }}>
                ⚠ {aiError}
              </div>
            )}
          </>
        )}

        {/* ── AI Analysis result ── */}
        {aiAnalysis && (
          <div style={{ animation: 'slide-in 0.3s ease' }}>

            {/* AI header bar */}
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
              <div style={{
                fontSize: 10, fontFamily: 'var(--font-mono)',
                letterSpacing: '1.5px', textTransform: 'uppercase',
                color: '#63b3ed',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', background: '#63b3ed',
                  animation: 'blink-dot 2s ease-in-out infinite', display: 'inline-block',
                }} />
                Gemini AI Analysis
              </div>
              <div style={{ flex:1, height:1, background:'rgba(99,179,237,0.25)' }} />
              <span style={{
                fontSize: 9, fontFamily: 'var(--font-mono)',
                padding: '2px 8px', borderRadius: 4,
                background: (confidenceColor[aiAnalysis.confidence] || '#555') + '22',
                border: `1px solid ${(confidenceColor[aiAnalysis.confidence] || '#555')}55`,
                color: confidenceColor[aiAnalysis.confidence] || '#aaa',
              }}>
                {aiAnalysis.confidence} CONFIDENCE
              </span>
              <button
                onClick={() => { setAiAnalysis(null); setAiError(null) }}
                style={{ background:'transparent', border:'none', color:'#555', cursor:'pointer', fontSize:13, padding:'0 2px' }}
                title="Clear"
              >↺</button>
            </div>

            {/* Headline */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.03))',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8, padding: '12px 14px', marginBottom: 10,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', lineHeight: 1.5 }}>
                {aiAnalysis.headline}
              </div>
            </div>

            {/* Structured blocks */}
            <AIBlock icon="◈" label="What Happened"       color="#63b3ed">
              {aiAnalysis.what_happened}
            </AIBlock>
            <AIBlock icon="⟁" label="Attack Vector"       color="var(--suspicious)">
              {aiAnalysis.attack_vector}
            </AIBlock>
            <AIBlock icon="⚠" label="Risk & Impact"       color="var(--critical)">
              {aiAnalysis.risk_impact}
            </AIBlock>
            <AIBlock icon="◎" label="Strongest ML Signal" color="#8b5cf6">
              {aiAnalysis.primary_signal}
            </AIBlock>
            <AIBlock icon="≋" label="Feature Insight"     color="#f59e0b">
              {aiAnalysis.feature_insight}
            </AIBlock>

            {/* Recommended steps */}
            {aiAnalysis.recommended_steps?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <SectionTitle>Recommended Steps</SectionTitle>
                {aiAnalysis.recommended_steps.map((step, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    padding: '8px 10px', marginBottom: 5,
                    background: 'var(--bg-tertiary)', borderRadius: 6,
                    fontSize: 12, color: '#dddddd', lineHeight: 1.5,
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 10,
                      color: 'var(--healthy)', fontWeight: 700,
                      minWidth: 20, marginTop: 1,
                    }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {step}
                  </div>
                ))}
              </div>
            )}

            {/* Re-analyse */}
            <button
              onClick={handleAnalyze}
              disabled={aiLoading}
              style={{
                width: '100%', padding: '8px 0', borderRadius: 6,
                border: '1px solid var(--border)', background: 'transparent',
                color: '#aaaaaa', fontSize: 11, cursor: 'pointer',
                fontFamily: 'var(--font-mono)', letterSpacing: '0.5px',
                marginBottom: 12,
              }}
            >
              ↺ Re-analyse
            </button>
          </div>
        )}

        {/* Recommended action badge */}
        {device.recommended_action && (
          <div style={{ marginTop: 4 }}>
            <span className="badge" style={{
              borderRadius: 6, fontSize: 11,
              borderColor: actionColor(device.recommended_action),
              color: actionColor(device.recommended_action),
              background: actionDim(device.recommended_action),
            }}>
              {device.recommended_action}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────
const SectionTitle = ({ children }) => (
  <div style={{
    fontSize: 10, fontFamily: 'var(--font-mono)',
    color: '#ffffff', textTransform: 'uppercase',
    letterSpacing: '1.5px', marginBottom: 8, marginTop: 4,
    display: 'flex', alignItems: 'center', gap: 8,
  }}>
    {children}
    <span style={{ flex: 1, height: 1, background: 'var(--border)', display: 'inline-block' }} />
  </div>
)

const LayerRow = ({ label, value = 0, max = 1, color }) => {
  const pct = Math.max(0, Math.min(1, value / max)) * 100
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
      <div style={{ width: 130, fontSize: 12, color: '#dddddd' }}>{label}</div>
      <div style={{ flex:1, height:6, borderRadius:3, background:'var(--bg-tertiary)', overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:color, transition:'width 0.8s ease' }} />
      </div>
      <div style={{ width:38, fontSize:11, textAlign:'right', color:'#ffffff', fontFamily:'var(--font-mono)' }}>
        {(value || 0).toFixed(2)}
      </div>
    </div>
  )
}

const AIBlock = ({ icon, label, color, children }) => (
  <div style={{
    marginBottom: 8, padding: '10px 12px',
    background: 'var(--bg-tertiary)', borderRadius: 8,
    borderLeft: `3px solid ${color}`,
  }}>
    <div style={{
      fontSize: 9, fontFamily: 'var(--font-mono)',
      letterSpacing: '1px', textTransform: 'uppercase',
      color, marginBottom: 5,
      display: 'flex', alignItems: 'center', gap: 5,
    }}>
      <span>{icon}</span> {label}
    </div>
    <div style={{ fontSize: 12, color: '#dddddd', lineHeight: 1.6 }}>
      {children}
    </div>
  </div>
)

const SpinnerDots = () => (
  <span style={{ display:'inline-flex', gap:4 }}>
    {[0,1,2].map(i => (
      <span key={i} style={{
        width:5, height:5, borderRadius:'50%', background:'#ffffff',
        animation:`blink-dot 1s ease-in-out ${i*0.2}s infinite`,
        display:'inline-block',
      }} />
    ))}
  </span>
)

// ── Helpers ─────────────────────────────────────────────────────────────────
const SEV_COLOR = {
  HEALTHY:'var(--healthy)', DRIFTING:'var(--drifting)',
  SUSPICIOUS:'var(--suspicious)', CRITICAL:'var(--critical)'
}
const SEV_DIM = {
  HEALTHY:'var(--healthy-dim)', DRIFTING:'var(--drifting-dim)',
  SUSPICIOUS:'var(--suspicious-dim)', CRITICAL:'var(--critical-dim)'
}
const actionColor = (a) => ({ ISOLATE:'var(--critical)', MONITOR:'var(--drifting)' }[a] || 'var(--info)')
const actionDim   = (a) => ({ ISOLATE:'var(--critical-dim)', MONITOR:'var(--drifting-dim)' }[a] || 'var(--info-dim)')

export default ExplainabilityDrawer
