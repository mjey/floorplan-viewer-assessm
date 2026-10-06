import { act, renderHook } from '@testing-library/react'

import { useAsyncLoad } from './useAsyncLoad'

function deferred<T>() {
  let resolve: (value: T) => void = () => {}
  let reject: (reason: unknown) => void = () => {}
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useAsyncLoad', () => {
  it('is loading until the loader resolves, then success', async () => {
    const load = deferred<string>()
    const loader = vi.fn(() => load.promise)
    const { result } = renderHook(() => useAsyncLoad(loader))

    expect(result.current.state).toEqual({ status: 'loading' })

    await act(async () => {
      load.resolve('hello')
      await load.promise
    })
    expect(result.current.state).toEqual({ status: 'success', data: 'hello' })
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('reports an error and recovers on reload', async () => {
    const loader = vi
      .fn<(signal: AbortSignal) => Promise<string>>()
      .mockRejectedValueOnce(new Error('nope'))
      .mockResolvedValue('ok')
    const { result } = renderHook(() => useAsyncLoad(loader))

    await act(async () => {})
    expect(result.current.state).toMatchObject({ status: 'error', error: new Error('nope') })

    act(() => result.current.reload())
    expect(result.current.state).toEqual({ status: 'loading' })
    await act(async () => {})
    expect(result.current.state).toEqual({ status: 'success', data: 'ok' })
  })

  it('treats an AbortError it did not cause as an error, not as its own cancellation', async () => {
    const loader = vi.fn(async () => {
      throw new DOMException('aborted upstream', 'AbortError')
    })
    const { result } = renderHook(() => useAsyncLoad(loader))

    await act(async () => {})
    expect(result.current.state).toMatchObject({ status: 'error' })
  })

  it('ignores a late response from a superseded attempt', async () => {
    const slow = deferred<string>()
    const loader = vi
      .fn<(signal: AbortSignal) => Promise<string>>()
      .mockReturnValueOnce(slow.promise)
      .mockResolvedValue('fresh')
    const { result } = renderHook(() => useAsyncLoad(loader))

    act(() => result.current.reload())
    await act(async () => {})
    expect(result.current.state).toEqual({ status: 'success', data: 'fresh' })

    await act(async () => {
      slow.resolve('stale')
      await slow.promise
    })
    expect(result.current.state).toEqual({ status: 'success', data: 'fresh' })
  })

  it('aborts the in-flight request on unmount', () => {
    let seen: AbortSignal | undefined
    const loader = (signal: AbortSignal) => {
      seen = signal
      return new Promise<never>(() => {})
    }
    const { unmount } = renderHook(() => useAsyncLoad(loader))

    expect(seen?.aborted).toBe(false)
    unmount()
    expect(seen?.aborted).toBe(true)
  })
})
