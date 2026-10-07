import { useCallback, useEffect, useReducer } from 'react'

import { toError } from '@/lib/loadState'

import type { SensorApi } from './api'
import { markAllStale, mergeSnapshot, NO_READINGS, type SensorReadings } from './readingsState'
import type { ReadingsSnapshot } from './types'

export interface PolledReadings {
  /**
   * - `loading`: no readings yet, first poll in flight
   * - `live`: the latest poll succeeded
   * - `stale`: the latest poll failed but earlier readings are still shown
   * - `error`: polling has failed and there is nothing to show
   */
  readonly status: 'loading' | 'live' | 'stale' | 'error'
  /**
   * Last known reading per sensor. Each entry carries its own `stale` flag, so a sensor
   * that drops out of the feed stays on the map, marked, instead of disappearing.
   */
  readonly readings: SensorReadings
  /** Sequence number of the most recent successful poll, for debugging and tests. */
  readonly sequence: number | null
  /** Wall-clock time (ms since epoch) of the most recent successful poll. */
  readonly updatedAt: number | null
  /** The most recent failure, cleared by the next success. */
  readonly error: Error | null
  /** True while a poll is in flight. */
  readonly isFetching: boolean
  /** Polls immediately instead of waiting for the next tick. */
  readonly refresh: () => void
}

export interface UsePolledReadingsOptions {
  readonly intervalMs: number
  /** Pause polling (e.g. while the tab is hidden) without losing the known readings. */
  readonly enabled?: boolean
}

interface State {
  readonly readings: SensorReadings
  readonly sequence: number | null
  readonly updatedAt: number | null
  readonly error: Error | null
  readonly isFetching: boolean
}

type Action =
  | { type: 'poll-started' }
  | { type: 'poll-succeeded'; snapshot: ReadingsSnapshot; at: number }
  | { type: 'poll-failed'; error: Error }
  | { type: 'poll-cancelled' }

const initialState: State = {
  readings: NO_READINGS,
  sequence: null,
  updatedAt: null,
  error: null,
  isFetching: false,
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'poll-started':
      return { ...state, isFetching: true }
    case 'poll-succeeded':
      return {
        readings: mergeSnapshot(state.readings, action.snapshot, action.at),
        sequence: action.snapshot.sequence,
        updatedAt: action.at,
        error: null,
        isFetching: false,
      }
    case 'poll-failed':
      return {
        ...state,
        readings: markAllStale(state.readings),
        error: action.error,
        isFetching: false,
      }
    case 'poll-cancelled':
      return state.isFetching ? { ...state, isFetching: false } : state
  }
}

function deriveStatus(state: State): PolledReadings['status'] {
  if (state.updatedAt === null) return state.error ? 'error' : 'loading'
  return state.error ? 'stale' : 'live'
}

/**
 * Polls `api.getLatestReadings()` on a fixed interval and exposes the result with
 * explicit loading, live, stale and error states.
 *
 * The schedule is a `setTimeout` chain rather than `setInterval`: the next poll is
 * armed only after the previous one settles, so a slow response never overlaps the
 * next request. A failed poll keeps every known reading and marks it stale, which is
 * what an operator wants to see: the last known values, clearly flagged as old.
 */
export function usePolledReadings(
  api: SensorApi,
  { intervalMs, enabled = true }: UsePolledReadingsOptions,
): PolledReadings {
  const [state, dispatch] = useReducer(reducer, initialState)
  // Bumping this re-runs the effect, which aborts the current loop and starts a fresh one.
  const [restartCount, forceRestart] = useReducer((n: number) => n + 1, 0)

  useEffect(() => {
    if (!enabled) return

    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined

    const isCurrent = () => !controller.signal.aborted

    const poll = async () => {
      dispatch({ type: 'poll-started' })
      try {
        const snapshot = await api.getLatestReadings(controller.signal)
        if (!isCurrent()) return
        dispatch({ type: 'poll-succeeded', snapshot, at: Date.now() })
      } catch (cause) {
        // Only our own abort is silent; a foreign AbortError is a failure like any other.
        if (!isCurrent()) return
        dispatch({ type: 'poll-failed', error: toError(cause) })
      }
      if (isCurrent()) timer = setTimeout(poll, intervalMs)
    }

    void poll()

    return () => {
      controller.abort()
      if (timer !== undefined) clearTimeout(timer)
      // An in-flight poll that we abort (pause, restart, unmount) settles nowhere else.
      dispatch({ type: 'poll-cancelled' })
    }
  }, [api, intervalMs, enabled, restartCount])

  const refresh = useCallback(() => forceRestart(), [])

  return {
    status: deriveStatus(state),
    readings: state.readings,
    sequence: state.sequence,
    updatedAt: state.updatedAt,
    error: state.error,
    isFetching: state.isFetching,
    refresh,
  }
}
