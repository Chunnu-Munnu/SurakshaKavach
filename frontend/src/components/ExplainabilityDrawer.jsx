import React, { useState, useEffect } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { generateAIExplanation } from '../services/geminiService'

const ExplainabilityDrawer = ({ device, onClose }) => {
  const [aiExplanation, setAiExplanation] = useState(null)
  const [loading, setLoading] = useState(false)

  // Reset AI explanation when device changes
  useEffect(() => {
    if (device) {
      setAiExplanation(null)
    }
  }, [device?.id])

  if (!device) return null

  const handleGenerateAI = async () => {
    setLoading(true)
    const context = `
    GhostPrint-MLE: Advanced IoT Cyber Defense Platform.
    Technical Architecture:
    - Evidence Collection: Distributed agents capturing network flow metrics, protocol entropy, and system calls.
    - Multi-Layer Evidence Fusion: Uses Dempster-Shafer theory to resolve uncertainty across 5 specialized ML layers:
        1. Statistical Drift: ADWIN detects non-stationary distribution shifts in traffic patterns.
        2. Behavioral Embedding: UMAP reduces feature space for HDBSCAN density-based clustering of "Behavioral DNA".
        3. Temporal Anomaly: LSTM Autoencoders identify sequences that deviate from historical device baselines.
        4. Point Anomaly: Isolation Forests flag extreme outliers in individual feature dimensions.
        5. Peer Correlation: Graph Attention Networks (GAT) identify coordinated attacks across similar device clusters.
    - Trust Engine: Dynamic recalculation of device trust scores based on fused evidence uncertainty.
    - Security Philosophy: Moves beyond signature-based detection to behavioral drift profiling.
    `;
    const result = await generateAIExplanation(device, context)
    setAiExplanation(result)
    setLoading(false)
  }

  const sevColor  = SEV_COLOR[device.severity] || '#888'
  const chartData = (device.history || []).map((h, idx) => ({ idx, trust: h.trust_score }))
  const scores    = device.anomaly_scores || {}

  return (
    <div style={{
      position: 'fixed', top: 72, right: 0, bottom: 0, width: 440,
      background: 'var(--bg-secondary)',
      borderLeft: '1px solid var(--border)',
      transform: 'translateX(0)',
      transition: 'transform 250ms ease',
      zIndex: 1000, overflowY: 'auto',
      display: 'flex', flexDirection: 'column',
      boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
      paddingBottom: 40
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

        {/* ── AI Explainability ── */}
        <div className="mt-4 pt-4 border-t border-[var(--border)]">
          <SectionTitle>
            <div className="flex items-center gap-2">
              <span>✨</span>
              <span>GhostPrint Cognitive Audit</span>
            </div>
          </SectionTitle>
          
          {!aiExplanation && !loading && (
            <button
              onClick={handleGenerateAI}
              className="w-full py-3 px-4 rounded-lg border-2 border-[var(--info)] text-[#ffffff] bg-[var(--info)] hover:bg-[#3b82f6dd] transition-all text-sm font-bold mb-4 shadow-[0_0_15px_rgba(59,130,246,0.3)] animate-pulse"
            >
              🚀 Run Neural Security Audit
            </button>
          )}

          {loading && (
            <div className="p-4 bg-[var(--bg-tertiary)] rounded-md mb-3 flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-[var(--info)] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-[var(--text-secondary)]">Consulting Neural Evidence Fusion...</span>
            </div>
          )}

          {aiExplanation && (
            <div
              style={{
                background: 'linear-gradient(135deg, var(--bg-tertiary) 0%, #151921 100%)',
                borderRadius: 8,
                padding: 16,
                marginBottom: 12,
                fontSize: 13,
                lineHeight: 1.6,
                border: '1px solid rgba(59, 130, 246, 0.3)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                position: 'relative',
                overflow: 'hidden',
                animation: 'slide-in 0.3s ease'
              }}
            >
               <div style={{
                position: 'absolute', top: 0, left: 0, width: '4px', height: '100%',
                background: 'var(--info)'
              }} />
              <div className="markdown-content text-blue-50/90 whitespace-pre-wrap text-white">
                {aiExplanation}
              </div>
            </div>
          )}
        </div>

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

// ── Helpers ─────────────────────────────────────────────────────────────────
const SEV_COLOR = { HEALTHY:'var(--healthy)', DRIFTING:'var(--drifting)', SUSPICIOUS:'var(--suspicious)', CRITICAL:'var(--critical)' }
const SEV_DIM   = { HEALTHY:'var(--healthy-dim)', DRIFTING:'var(--drifting-dim)', SUSPICIOUS:'var(--suspicious-dim)', CRITICAL:'var(--critical-dim)' }
const actionColor = (a) => ({ ISOLATE:'var(--critical)', MONITOR:'var(--drifting)' }[a] || 'var(--info)')
const actionDim   = (a) => ({ ISOLATE:'var(--critical-dim)', MONITOR:'var(--drifting-dim)' }[a] || 'var(--info-dim)')

export default ExplainabilityDrawer
