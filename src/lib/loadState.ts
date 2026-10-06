/**
 * Discriminated union for one-shot async loads (fetch a file, fetch a list).
 * Narrow on `status` and the payload is typed for free; no `data?: T` ambiguity.
 */
export type LoadState<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'success'; readonly data: T }
  | { readonly status: 'error'; readonly error: Error }

export function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value))
}

export function isAbortError(value: unknown): boolean {
  return value instanceof DOMException && value.name === 'AbortError'
}
