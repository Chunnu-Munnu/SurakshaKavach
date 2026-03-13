import React, { useMemo } from 'react'
import DeviceCard from './DeviceCard.jsx'

const DeviceGrid = ({ devices, onSelectDevice }) => {
  const sorted = useMemo(() => {
    if (!Array.isArray(devices)) return []
    return devices.slice().sort((a, b) => a.id.localeCompare(b.id))
  }, [devices])

  return (
    <div className="grid grid-cols-4 gap-3 mb-3">
      {sorted.map((d) => (
        <DeviceCard key={d.id} device={d} onSelect={onSelectDevice} />
      ))}
    </div>
  )
}

export default DeviceGrid

