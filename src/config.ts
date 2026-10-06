/** Static asset locations and tunables, kept in one place so the README can point here. */

const base = import.meta.env.BASE_URL

export const FLOORPLAN_URL = `${base}floorplan.dxf`
export const SENSORS_URL = `${base}sensors.json`

/** The brief specifies readings at 5-second intervals. */
export const POLL_INTERVAL_MS = 5_000

/**
 * The mock feed rejects every Nth poll so the stale state is visible during a demo.
 * Set to 0 to disable. Overridable per page load with `?failEvery=N`.
 */
export const MOCK_FAIL_EVERY = 7

/** Simulated network latency for the mock feed. Overridable with `?latency=MIN-MAX`. */
export const MOCK_LATENCY_MS = { min: 150, max: 600 } as const

/** Pixels of empty margin around the floorplan when it is fitted to the viewer. */
export const FIT_PADDING_PX = 32
