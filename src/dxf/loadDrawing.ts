import { normaliseDrawing, type NormaliseOptions } from './normalise'
import { parseDxf } from './parseDxf'
import type { Drawing } from './types'

export interface LoadDrawingOptions extends NormaliseOptions {
  readonly signal?: AbortSignal | undefined
}

/** Fetches a DXF file and returns it as a unit-normalised `Drawing`. */
export async function loadDrawing(url: string, options: LoadDrawingOptions = {}): Promise<Drawing> {
  const response = await fetch(url, { signal: options.signal ?? null })
  if (!response.ok) {
    throw new Error(`Failed to fetch floorplan: ${response.status} ${response.statusText}`)
  }
  const source = await response.text()
  return normaliseDrawing(parseDxf(source), { unitScale: options.unitScale })
}
