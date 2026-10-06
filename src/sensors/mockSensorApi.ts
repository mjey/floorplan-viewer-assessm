import type { SensorApi } from './api'
import type { Reading, ReadingsSnapshot, Sensor, SensorFeed, SensorId } from './types'

export interface MockSensorApiOptions {
  /** Where the feed comes from; loaded lazily on first use and cached. */
  readonly source: (signal?: AbortSignal) => Promise<readonly SensorFeed[]>
  /** Simulated network latency range in milliseconds. */
  readonly latencyMs?: { readonly min: number; readonly max: number }
  /** Reject every Nth `getLatestReadings` call (0 or undefined: never fail). */
  readonly failEvery?: number
  /** Random source, injectable for deterministic tests. */
  readonly random?: () => number
}

const DEFAULT_LATENCY_MS = { min: 150, max: 600 } as const

/**
 * A `SensorApi` backed by the recorded series in `sensors.json`.
 *
 * Each `getLatestReadings` call behaves like one poll of a live endpoint: it answers
 * with the *next* reading of every sensor and advances. When a series runs out it
 * wraps around, because the demo data holds only 30 seconds of readings and a feed
 * that stops after six polls would hide the live behaviour this exists to show.
 * Latency is randomised and a periodic failure can be injected so the loading, slow
 * and error states of the UI are exercised without a real backend.
 */
export function createMockSensorApi(options: MockSensorApiOptions): SensorApi {
  const latency = options.latencyMs ?? DEFAULT_LATENCY_MS
  const random = options.random ?? Math.random
  const failEvery = options.failEvery ?? 0

  let feedPromise: Promise<readonly SensorFeed[]> | null = null
  let sequence = 0

  const loadFeed = (signal?: AbortSignal): Promise<readonly SensorFeed[]> => {
    feedPromise ??= options.source(signal).catch((error: unknown) => {
      feedPromise = null // allow a retry after a failed load
      throw error
    })
    return feedPromise
  }

  return {
    async listSensors(signal) {
      const feed = await loadFeed(signal)
      await simulateLatency(latency, random, signal)
      return feed.map(toSensor)
    },

    async getLatestReadings(signal) {
      const feed = await loadFeed(signal)
      await simulateLatency(latency, random, signal)

      sequence += 1
      if (failEvery > 0 && sequence % failEvery === 0) {
        throw new Error(`Simulated sensor API failure (poll #${sequence})`)
      }

      const readings = new Map<SensorId, Reading>()
      for (const sensor of feed) {
        const reading = readingAt(sensor.readings, sequence - 1)
        if (reading) readings.set(sensor.id, reading)
      }
      return { readings, sequence } satisfies ReadingsSnapshot
    },
  }
}

function toSensor({ id, label, position }: SensorFeed): Sensor {
  return { id, label, position }
}

/** The reading for the Nth poll, cycling through the series. */
function readingAt(series: readonly Reading[], poll: number): Reading | undefined {
  if (series.length === 0) return undefined
  return series[poll % series.length]
}

function simulateLatency(
  range: { readonly min: number; readonly max: number },
  random: () => number,
  signal?: AbortSignal,
): Promise<void> {
  const delay = range.min + random() * (range.max - range.min)
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError())
      return
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, delay)
    const onAbort = () => {
      clearTimeout(timer)
      reject(abortError())
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function abortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError')
}
