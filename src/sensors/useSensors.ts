import { useCallback } from 'react'

import { useAsyncLoad, type AsyncLoad } from '@/lib/useAsyncLoad'

import type { SensorApi } from './api'
import type { Sensor } from './types'

/** Loads the sensor list once per `api` instance (and again on `reload`). */
export function useSensors(api: SensorApi): AsyncLoad<readonly Sensor[]> {
  const loader = useCallback((signal: AbortSignal) => api.listSensors(signal), [api])
  return useAsyncLoad(loader)
}
