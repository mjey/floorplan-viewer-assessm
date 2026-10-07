import { markAllStale, mergeSnapshot, NO_READINGS, type SensorReadings } from './readingsState'
import type { Reading, ReadingsSnapshot } from './types'

function reading(temperatureC: number): Reading {
  return { timestamp: `t${temperatureC}`, temperatureC, humidityPct: 40 }
}

function snapshot(entries: Record<string, number>, sequence = 1): ReadingsSnapshot {
  return {
    readings: new Map(Object.entries(entries).map(([id, t]) => [id, reading(t)])),
    sequence,
  }
}

describe('mergeSnapshot', () => {
  it('marks every sensor in the snapshot fresh with the receive time', () => {
    const merged = mergeSnapshot(NO_READINGS, snapshot({ a: 20, b: 21 }), 1000)

    expect(merged.get('a')).toEqual({ reading: reading(20), receivedAt: 1000, stale: false })
    expect(merged.get('b')).toEqual({ reading: reading(21), receivedAt: 1000, stale: false })
  })

  it('keeps a sensor that dropped out of the feed, flagged stale with its old receive time', () => {
    const first = mergeSnapshot(NO_READINGS, snapshot({ a: 20, b: 21 }), 1000)
    const second = mergeSnapshot(first, snapshot({ a: 22 }, 2), 6000)

    expect(second.get('a')).toEqual({ reading: reading(22), receivedAt: 6000, stale: false })
    expect(second.get('b')).toEqual({ reading: reading(21), receivedAt: 1000, stale: true })
  })

  it('un-stales a sensor when it reappears', () => {
    const first = mergeSnapshot(NO_READINGS, snapshot({ a: 20, b: 21 }), 1000)
    const gone = mergeSnapshot(first, snapshot({ a: 22 }, 2), 6000)
    const back = mergeSnapshot(gone, snapshot({ a: 23, b: 24 }, 3), 11_000)

    expect(back.get('b')).toEqual({ reading: reading(24), receivedAt: 11_000, stale: false })
  })
})

describe('markAllStale', () => {
  it('flags every entry stale but keeps the values and receive times', () => {
    const live = mergeSnapshot(NO_READINGS, snapshot({ a: 20, b: 21 }), 1000)
    const stale = markAllStale(live)

    expect([...stale.values()].every((e) => e.stale)).toBe(true)
    expect(stale.get('a')?.reading).toEqual(reading(20))
    expect(stale.get('a')?.receivedAt).toBe(1000)
  })

  it('returns the same map when nothing was fresh, so React sees no change', () => {
    const alreadyStale: SensorReadings = new Map([
      ['a', { reading: reading(20), receivedAt: 1, stale: true }],
    ])

    expect(markAllStale(alreadyStale)).toBe(alreadyStale)
    expect(markAllStale(NO_READINGS)).toBe(NO_READINGS)
  })
})
