import { useCallback, useEffect, useState } from 'react'

import { toError, type LoadState } from './loadState'

export interface AsyncLoad<T> {
  readonly state: LoadState<T>
  /** Runs the loader again; used by retry buttons. */
  readonly reload: () => void
}

/** A settled load, tagged with the request it answered so stale results are ignored. */
interface Settled<T> {
  readonly attempt: number
  readonly state: Exclude<LoadState<T>, { status: 'loading' }>
}

const LOADING = { status: 'loading' } as const

/**
 * Runs an abortable async `loader` whenever its identity changes (and again on
 * `reload`). Callers memoise the loader with `useCallback` over its real inputs, which
 * keeps the dependency explicit and statically checkable.
 *
 * The public `state` is *derived*: it is `loading` until a result has settled for the
 * current attempt. That keeps the effect free of synchronous `setState` calls.
 */
export function useAsyncLoad<T>(loader: (signal: AbortSignal) => Promise<T>): AsyncLoad<T> {
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled<T> | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    // Once this attempt is aborted (unmount, reload, loader change) its outcome no longer
    // matters, success or failure. Checking the signal rather than the error type means a
    // foreign AbortError thrown by the loader is still reported as the error it is.
    loader(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return
        setSettled({ attempt, state: { status: 'success', data } })
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        setSettled({ attempt, state: { status: 'error', error: toError(cause) } })
      })

    return () => controller.abort()
  }, [attempt, loader])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])

  const isCurrent = settled !== null && settled.attempt === attempt
  return { state: isCurrent ? settled.state : LOADING, reload }
}
