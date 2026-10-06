/** Static asset locations and tunables, kept in one place so the README can point here. */

const base = import.meta.env.BASE_URL

export const FLOORPLAN_URL = `${base}floorplan.dxf`
export const SENSORS_URL = `${base}sensors.json`

/** The brief specifies readings at 5-second intervals. */
export const POLL_INTERVAL_MS = 5_000

/** Pixels of empty margin around the floorplan when it is fitted to the viewer. */
export const FIT_PADDING_PX = 32
