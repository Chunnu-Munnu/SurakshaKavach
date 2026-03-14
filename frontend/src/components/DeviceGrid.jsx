import React, { useMemo } from 'react'
import DeviceCard from './DeviceCard.jsx'

const DeviceGrid = ({ devices, onSelectDevice }) => {
  const grouped = useMemo(() => {
    if (!Array.isArray(devices)) return { critical: [], monitoring: [], healthy: [] }
    
    return {
      critical: devices.filter(d => d.severity === 'CRITICAL'),
      monitoring: devices.filter(d => d.severity === 'SUSPICIOUS' || d.severity === 'DRIFTING'),
      healthy: devices.filter(d => d.severity === 'HEALTHY')
    }
  }, [devices])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      
      {/* 1. Critical Threats */}
      {grouped.critical.length > 0 && (
        <section>
          <div className="critical-section-header">Critical Threats</div>
          <div className="grid grid-cols-4 gap-3">
            {grouped.critical.map((d) => (
              <DeviceCard key={d.id} device={d} onSelect={onSelectDevice} />
            ))}
          </div>
        </section>
      )}

      {/* 2. Active Monitoring */}
      {grouped.monitoring.length > 0 && (
        <section>
          <div className="section-label">Active Monitoring</div>
          <div className="grid grid-cols-4 gap-3">
            {grouped.monitoring.map((d) => (
              <DeviceCard key={d.id} device={d} onSelect={onSelectDevice} />
            ))}
          </div>
        </section>
      )}

      {/* 3. Healthy / Nominal Nodes */}
      {grouped.healthy.length > 0 && (
        <section>
          <div className="section-label">Nominal Operations</div>
          <div className="grid grid-cols-4 gap-3">
            {grouped.healthy.map((d) => (
              <DeviceCard key={d.id} device={d} onSelect={onSelectDevice} />
            ))}
          </div>
        </section>
      )}

    </div>
  )
}

export default DeviceGrid
