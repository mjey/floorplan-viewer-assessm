import { useCallback, useEffect, useState } from 'react'

import { isAbortError, toError, type LoadState } from '@/lib/loadState'

import { loadDrawing } from './loadDrawing'
import type { Drawing } from './types'

export interface UseDrawingResult {
  readonly state: LoadState<Drawing>
  /** Re-fetches the file; used by the error state's retry button. */
  readonly reload: () => void
}

/** A settled load, tagged with the request it answered so stale results are ignored. */
interface Settled {
  readonly url: string
  readonly attempt: number
  readonly state: Exclude<LoadState<Drawing>, { status: 'loading' }>
}

const LOADING: LoadState<Drawing> = { status: 'loading' }

/**
 * Loads a DXF floorplan once per `url` (and again on `reload`), aborting on unmount.
 *
 * The public `state` is *derived*: it is `loading` until a settled result exists for
 * the current `(url, attempt)` pair. That keeps the effect free of synchronous
 * `setState` calls and makes a response from a superseded request harmless.
 */
export function useDrawing(url: string): UseDrawingResult {
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    loadDrawing(url, { signal: controller.signal })
      .then((drawing) => setSettled({ url, attempt, state: { status: 'success', data: drawing } }))
      .catch((cause: unknown) => {
        if (isAbortError(cause)) return
        setSettled({ url, attempt, state: { status: 'error', error: toError(cause) } })
      })

    return () => controller.abort()
  }, [url, attempt])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])

  const isCurrent = settled !== null && settled.url === url && settled.attempt === attempt
  return { state: isCurrent ? settled.state : LOADING, reload }
}
