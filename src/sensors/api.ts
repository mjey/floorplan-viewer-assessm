import type { ReadingsSnapshot, Sensor } from './types'

/**
 * The contract the UI depends on. Nothing above this interface knows whether readings
 * come from a JSON file, a REST endpoint or a WebSocket; swapping the transport means
 * providing another implementation of these two methods.
 */
export interface SensorApi {
  /** The sensors that exist and where they are. */
  listSensors(signal?: AbortSignal): Promise<readonly Sensor[]>
  /** The most recent reading for every sensor. Called on each poll. */
  getLatestReadings(signal?: AbortSignal): Promise<ReadingsSnapshot>
}
