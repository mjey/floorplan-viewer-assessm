import type { ModelPoint } from '@/geometry'

export type SensorId = string

/**
 * Static facts about a sensor: where it is and what to call it. This is what an
 * overlay needs to *place* a marker, and it changes rarely (if ever).
 */
export interface Sensor {
  readonly id: SensorId
  readonly label: string
  /** Position in the floorplan's model space (millimetres, Y-up). */
  readonly position: ModelPoint
}

/** One measurement. This is what changes on every poll. */
export interface Reading {
  readonly timestamp: string
  readonly temperatureC: number
  readonly humidityPct: number
}

/**
 * A sensor with its full series of readings: the shape of `sensors.json`.
 * Only the data source sees this; the UI works with `Sensor` and `Reading`.
 */
export interface SensorFeed extends Sensor {
  readonly readings: readonly Reading[]
}

/** The latest reading per sensor, as a polled API would return it. */
export interface ReadingsSnapshot {
  readonly readings: ReadonlyMap<SensorId, Reading>
  /** Monotonic poll counter from the source; handy for debugging and tests. */
  readonly sequence: number
}
