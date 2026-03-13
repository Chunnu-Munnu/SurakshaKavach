import { useMemo } from 'react'

const useDevices = (devices) => {
  return useMemo(() => {
    if (!Array.isArray(devices)) return []
    return devices.slice().sort((a, b) => a.id.localeCompare(b.id))
  }, [devices])
}

export default useDevices

