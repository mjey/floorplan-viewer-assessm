import { useCallback } from 'react'

import { useAsyncLoad, type AsyncLoad } from '@/lib/useAsyncLoad'

import { loadDrawing } from './loadDrawing'
import type { Drawing } from './types'

/** Loads a DXF floorplan once per `url` (and again on `reload`), aborting on unmount. */
export function useDrawing(url: string): AsyncLoad<Drawing> {
  const loader = useCallback((signal: AbortSignal) => loadDrawing(url, { signal }), [url])
  return useAsyncLoad(loader)
}
