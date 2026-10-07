import type { Reading, ReadingsSnapshot, SensorId } from './types'

/**
 * The last known reading of one sensor, with its own freshness flag.
 *
 * Staleness is per sensor, not per snapshot: a sensor that drops out of the feed
 * keeps showing its last value, marked stale, instead of vanishing from the map.
 */
export interface SensorReading {
  readonly reading: Reading
  /** Wall-clock time (ms since epoch) at which this value was last received. */
  readonly receivedAt: number
  /** True when this value did not come from the latest successful poll. */
  readonly stale: boolean
}

export type SensorReadings = ReadonlyMap<SensorId, SensorReading>

export const NO_READINGS: SensorReadings = new Map()

/**
 * Folds a successful poll into the known readings. Sensors present in the snapshot
 * become fresh; sensors known from before but absent now are kept and marked stale.
 */
export function mergeSnapshot(
  previous: SensorReadings,
  snapshot: ReadingsSnapshot,
  receivedAt: number,
): SensorReadings {
  const next = new Map<SensorId, SensorReading>()
  for (const [id, reading] of snapshot.readings) {
    next.set(id, { reading, receivedAt, stale: false })
  }
  for (const [id, entry] of previous) {
    if (!next.has(id)) next.set(id, entry.stale ? entry : { ...entry, stale: true })
  }
  return next
}

/** After a failed poll nothing is fresh any more. Returns the same map if already so. */
export function markAllStale(readings: SensorReadings): SensorReadings {
  let changed = false
  const next = new Map<SensorId, SensorReading>()
  for (const [id, entry] of readings) {
    if (entry.stale) {
      next.set(id, entry)
    } else {
      changed = true
      next.set(id, { ...entry, stale: true })
    }
  }
  return changed ? next : readings
}
