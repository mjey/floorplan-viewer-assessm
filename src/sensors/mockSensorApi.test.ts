import { createMockSensorApi } from './mockSensorApi'
import type { SensorFeed } from './types'

const feed: SensorFeed[] = [
  {
    id: 'a',
    label: 'A',
    position: { x: 0, y: 0 },
    readings: [
      { timestamp: 't0', temperatureC: 20, humidityPct: 40 },
      { timestamp: 't1', temperatureC: 21, humidityPct: 41 },
      { timestamp: 't2', temperatureC: 22, humidityPct: 42 },
    ],
  },
  {
    id: 'b',
    label: 'B',
    position: { x: 1, y: 1 },
    readings: [{ timestamp: 't0', temperatureC: 30, humidityPct: 30 }],
  },
  { id: 'empty', label: 'No data', position: { x: 2, y: 2 }, readings: [] },
]

const instant = { min: 0, max: 0 }

describe('createMockSensorApi', () => {
  it('lists sensors without their reading series', async () => {
    const api = createMockSensorApi({ source: async () => feed, latencyMs: instant })

    expect(await api.listSensors()).toEqual([
      { id: 'a', label: 'A', position: { x: 0, y: 0 } },
      { id: 'b', label: 'B', position: { x: 1, y: 1 } },
      { id: 'empty', label: 'No data', position: { x: 2, y: 2 } },
    ])
  })

  it('advances one reading per poll and wraps around when a series ends', async () => {
    const api = createMockSensorApi({ source: async () => feed, latencyMs: instant })

    const polls = []
    for (let i = 0; i < 4; i += 1) polls.push(await api.getLatestReadings())

    expect(polls.map((p) => p.sequence)).toEqual([1, 2, 3, 4])
    expect(polls.map((p) => p.readings.get('a')?.timestamp)).toEqual(['t0', 't1', 't2', 't0'])
    // A one-reading series repeats; an empty series yields no entry rather than crashing.
    expect(polls.map((p) => p.readings.get('b')?.temperatureC)).toEqual([30, 30, 30, 30])
    expect(polls.every((p) => !p.readings.has('empty'))).toBe(true)
  })

  it('loads the source once and shares it between calls', async () => {
    const source = vi.fn(async () => feed)
    const api = createMockSensorApi({ source, latencyMs: instant })

    await Promise.all([api.listSensors(), api.getLatestReadings(), api.getLatestReadings()])

    expect(source).toHaveBeenCalledTimes(1)
  })

  it('retries the source after a failed load', async () => {
    const source = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(feed)
    const api = createMockSensorApi({ source, latencyMs: instant })

    await expect(api.listSensors()).rejects.toThrow('boom')
    await expect(api.listSensors()).resolves.toHaveLength(3)
    expect(source).toHaveBeenCalledTimes(2)
  })

  it('fails every Nth poll when asked to, still counting the failed poll', async () => {
    const api = createMockSensorApi({ source: async () => feed, latencyMs: instant, failEvery: 3 })

    await expect(api.getLatestReadings()).resolves.toMatchObject({ sequence: 1 })
    await expect(api.getLatestReadings()).resolves.toMatchObject({ sequence: 2 })
    await expect(api.getLatestReadings()).rejects.toThrow(/poll #3/)
    await expect(api.getLatestReadings()).resolves.toMatchObject({ sequence: 4 })
  })

  it('waits a random latency within the configured range', async () => {
    vi.useFakeTimers()
    try {
      const api = createMockSensorApi({
        source: async () => feed,
        latencyMs: { min: 100, max: 300 },
        random: () => 0.5, // -> 200 ms
      })

      let settled = false
      const pending = api.getLatestReadings().then(() => {
        settled = true
      })

      await vi.advanceTimersByTimeAsync(199)
      expect(settled).toBe(false)
      await vi.advanceTimersByTimeAsync(1)
      await pending
      expect(settled).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('rejects with an AbortError when the signal is aborted mid-latency', async () => {
    vi.useFakeTimers()
    try {
      const api = createMockSensorApi({
        source: async () => feed,
        latencyMs: { min: 500, max: 500 },
      })
      const controller = new AbortController()

      const pending = api.getLatestReadings(controller.signal)
      await vi.advanceTimersByTimeAsync(100)
      controller.abort()

      await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    } finally {
      vi.useRealTimers()
    }
  })
})
