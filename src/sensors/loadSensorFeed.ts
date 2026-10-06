import { parseSensorFeed } from './schema'
import type { SensorFeed } from './types'

/** Fetches and validates a `sensors.json` document. */
export async function loadSensorFeed(url: string, signal?: AbortSignal): Promise<SensorFeed[]> {
  const response = await fetch(url, { signal: signal ?? null })
  if (!response.ok) {
    throw new Error(`Failed to fetch sensors: ${response.status} ${response.statusText}`)
  }
  return parseSensorFeed(await response.json())
}
