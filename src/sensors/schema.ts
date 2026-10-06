import type { Reading, SensorFeed } from './types'

/**
 * Runtime validation for `sensors.json`.
 *
 * Data from outside the type system is checked before it is trusted, with error
 * messages that name the offending path so a broken feed is diagnosable from the UI.
 * Hand-written rather than a schema library: the shape is tiny and stable.
 */

export class SensorDataError extends Error {
  override readonly name = 'SensorDataError'
}

export function parseSensorFeed(input: unknown): SensorFeed[] {
  if (!Array.isArray(input)) {
    throw new SensorDataError('Sensor feed must be an array of sensors.')
  }
  const feeds = input.map((item, index) => parseFeed(item, `[${index}]`))
  assertUniqueIds(feeds)
  return feeds
}

function parseFeed(value: unknown, path: string): SensorFeed {
  const record = asRecord(value, path)
  const position = asRecord(record.position, `${path}.position`)
  const readings = record.readings
  if (!Array.isArray(readings)) {
    throw new SensorDataError(`${path}.readings must be an array.`)
  }
  return {
    id: asString(record.id, `${path}.id`),
    label: asString(record.label, `${path}.label`),
    position: {
      x: asNumber(position.x, `${path}.position.x`),
      y: asNumber(position.y, `${path}.position.y`),
    },
    readings: readings.map((reading, index) => parseReading(reading, `${path}.readings[${index}]`)),
  }
}

function parseReading(value: unknown, path: string): Reading {
  const record = asRecord(value, path)
  return {
    timestamp: asString(record.timestamp, `${path}.timestamp`),
    temperatureC: asNumber(record.temperatureC, `${path}.temperatureC`),
    humidityPct: asNumber(record.humidityPct, `${path}.humidityPct`),
  }
}

function assertUniqueIds(feeds: readonly SensorFeed[]): void {
  const seen = new Set<string>()
  for (const feed of feeds) {
    if (seen.has(feed.id)) {
      throw new SensorDataError(`Duplicate sensor id "${feed.id}".`)
    }
    seen.add(feed.id)
  }
}

function asRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new SensorDataError(`${path} must be an object.`)
  }
  return value as Record<string, unknown>
}

function asString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new SensorDataError(`${path} must be a non-empty string.`)
  }
  return value
}

function asNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new SensorDataError(`${path} must be a finite number.`)
  }
  return value
}
