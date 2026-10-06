import { act, renderHook } from '@testing-library/react'

import type { SensorApi } from './api'
import type { Reading, ReadingsSnapshot } from './types'
import { usePolledReadings } from './usePolledReadings'

const INTERVAL = 5000

function reading(temperatureC: number): Reading {
  return { timestamp: `t${temperatureC}`, temperatureC, humidityPct: 40 }
}

function snapshot(sequence: number): ReadingsSnapshot {
  return { readings: new Map([['s1', reading(20 + sequence)]]), sequence }
}

/** A scriptable API: each call resolves/rejects with the next scripted outcome. */
function scriptedApi(outcomes: Array<ReadingsSnapshot | Error>): SensorApi & { calls: number } {
  let index = 0
  const api = {
    calls: 0,
    listSensors: async () => [],
    getLatestReadings: () => {
      api.calls += 1
      const outcome = outcomes[Math.min(index, outcomes.length - 1)]
      index += 1
      // Classify by shape: under jsdom a DOMException is not an instance of the outer Error.
      return outcome && 'readings' in outcome ? Promise.resolve(outcome) : Promise.reject(outcome)
    },
  }
  return api
}

describe('usePolledReadings', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-24T08:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts loading, then goes live with the first snapshot', async () => {
    const api = scriptedApi([snapshot(1)])
    const { result } = renderHook(() => usePolledReadings(api, { intervalMs: INTERVAL }))

    expect(result.current.status).toBe('loading')
    expect(result.current.isFetching).toBe(true)

    await act(() => vi.advanceTimersByTimeAsync(0))

    expect(result.current.status).toBe('live')
    expect(result.current.snapshot?.sequence).toBe(1)
    expect(result.current.updatedAt).toBe(Date.parse('2026-08-24T08:00:00Z'))
    expect(result.current.isFetching).toBe(false)
  })

  it('polls again after the interval and replaces the snapshot', async () => {
    const api = scriptedApi([snapshot(1), snapshot(2), snapshot(3)])
    const { result } = renderHook(() => usePolledReadings(api, { intervalMs: INTERVAL }))

    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(result.current.snapshot?.sequence).toBe(1)

    await act(() => vi.advanceTimersByTimeAsync(INTERVAL - 1))
    expect(api.calls).toBe(1)

    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(api.calls).toBe(2)
    expect(result.current.snapshot?.sequence).toBe(2)
    expect(result.current.snapshot?.readings.get('s1')?.temperatureC).toBe(22)
  })

  it('keeps the last good snapshot and reports stale when a poll fails, then recovers', async () => {
    const api = scriptedApi([snapshot(1), new Error('network down'), snapshot(3)])
    const { result } = renderHook(() => usePolledReadings(api, { intervalMs: INTERVAL }))

    await act(() => vi.advanceTimersByTimeAsync(0))
    const firstUpdate = result.current.updatedAt

    await act(() => vi.advanceTimersByTimeAsync(INTERVAL))
    expect(result.current.status).toBe('stale')
    expect(result.current.snapshot?.sequence).toBe(1)
    expect(result.current.updatedAt).toBe(firstUpdate)
    expect(result.current.error?.message).toBe('network down')

    await act(() => vi.advanceTimersByTimeAsync(INTERVAL))
    expect(result.current.status).toBe('live')
    expect(result.current.snapshot?.sequence).toBe(3)
    expect(result.current.error).toBeNull()
  })

  it('reports error (not stale) when the very first poll fails, and keeps retrying', async () => {
    const api = scriptedApi([new Error('boom'), snapshot(2)])
    const { result } = renderHook(() => usePolledReadings(api, { intervalMs: INTERVAL }))

    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(result.current.status).toBe('error')
    expect(result.current.snapshot).toBeNull()

    await act(() => vi.advanceTimersByTimeAsync(INTERVAL))
    expect(result.current.status).toBe('live')
  })

  it('does not overlap polls: the next tick is armed only after a slow response settles', async () => {
    let resolveSlow: (value: ReadingsSnapshot) => void = () => {}
    const api: SensorApi & { calls: number } = {
      calls: 0,
      listSensors: async () => [],
      getLatestReadings: () => {
        api.calls += 1
        return new Promise<ReadingsSnapshot>((resolve) => {
          resolveSlow = resolve
        })
      },
    }
    renderHook(() => usePolledReadings(api, { intervalMs: INTERVAL }))

    // Two whole intervals pass while the first request is still pending.
    await act(() => vi.advanceTimersByTimeAsync(INTERVAL * 2))
    expect(api.calls).toBe(1)

    await act(async () => {
      resolveSlow(snapshot(1))
      await vi.advanceTimersByTimeAsync(0)
    })
    await act(() => vi.advanceTimersByTimeAsync(INTERVAL))
    expect(api.calls).toBe(2)
  })

  it('stops polling on unmount', async () => {
    const api = scriptedApi([snapshot(1)])
    const { unmount } = renderHook(() => usePolledReadings(api, { intervalMs: INTERVAL }))

    await act(() => vi.advanceTimersByTimeAsync(0))
    unmount()
    await act(() => vi.advanceTimersByTimeAsync(INTERVAL * 3))

    expect(api.calls).toBe(1)
  })

  it('pauses while disabled and resumes with a fresh poll when re-enabled', async () => {
    const api = scriptedApi([snapshot(1), snapshot(2)])
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        usePolledReadings(api, { intervalMs: INTERVAL, enabled }),
      { initialProps: { enabled: true } },
    )

    await act(() => vi.advanceTimersByTimeAsync(0))
    rerender({ enabled: false })
    await act(() => vi.advanceTimersByTimeAsync(INTERVAL * 3))
    expect(api.calls).toBe(1)
    expect(result.current.snapshot?.sequence).toBe(1)

    rerender({ enabled: true })
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(api.calls).toBe(2)
    expect(result.current.snapshot?.sequence).toBe(2)
  })

  it('refresh() polls immediately', async () => {
    const api = scriptedApi([snapshot(1), snapshot(2)])
    const { result } = renderHook(() => usePolledReadings(api, { intervalMs: INTERVAL }))

    await act(() => vi.advanceTimersByTimeAsync(0))
    await act(async () => {
      result.current.refresh()
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(api.calls).toBe(2)
    expect(result.current.snapshot?.sequence).toBe(2)
  })
})

describe('usePolledReadings: abort handling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('treats an AbortError it did not cause as a failed poll and keeps polling', async () => {
    const api = scriptedApi([new DOMException('aborted upstream', 'AbortError'), snapshot(2)])
    const { result } = renderHook(() => usePolledReadings(api, { intervalMs: INTERVAL }))

    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(result.current.status).toBe('error')

    await act(() => vi.advanceTimersByTimeAsync(INTERVAL))
    expect(result.current.status).toBe('live')
    expect(api.calls).toBe(2)
  })
})
