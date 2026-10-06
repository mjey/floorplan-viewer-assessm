/**
 * Demo knobs read from the page URL so the slow, failing and recovering states can be
 * exercised by hand without editing code:
 *
 *   ?failEvery=3          reject every 3rd poll (0 disables)
 *   ?latency=2000-3000    simulated latency range in ms (a single number fixes it)
 *
 * Anything missing or malformed falls back to the defaults.
 */

export interface DemoOptions {
  readonly failEvery: number
  readonly latencyMs: { readonly min: number; readonly max: number }
}

export function demoOptionsFromSearch(search: string, defaults: DemoOptions): DemoOptions {
  const params = new URLSearchParams(search)
  return {
    failEvery: parseFailEvery(params.get('failEvery')) ?? defaults.failEvery,
    latencyMs: parseLatency(params.get('latency')) ?? defaults.latencyMs,
  }
}

function parseFailEvery(value: string | null): number | undefined {
  if (value === null) return undefined
  const n = Number(value)
  return Number.isInteger(n) && n >= 0 ? n : undefined
}

const LATENCY_PATTERN = /^(\d+(?:\.\d+)?)(?:-(\d+(?:\.\d+)?))?$/

function parseLatency(value: string | null): DemoOptions['latencyMs'] | undefined {
  if (value === null) return undefined
  const match = LATENCY_PATTERN.exec(value.trim())
  if (!match) return undefined
  const min = Number(match[1])
  const max = match[2] === undefined ? min : Number(match[2])
  return max >= min ? { min, max } : undefined
}
