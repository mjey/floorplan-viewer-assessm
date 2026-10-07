import { createContext, useContext } from 'react'

import type { Size, Viewport } from '@/geometry'

import type { ViewportControls } from './useViewportControls'

export interface ViewportContextValue {
  /** The current model-to-screen mapping. Changes on every pan/zoom frame. */
  readonly viewport: Viewport
  /** Size of the viewer surface in CSS pixels. */
  readonly size: Size
  /** Camera controls, for overlays that need to move the view (zoom to a marker, ...). */
  readonly controls: ViewportControls
}

export const ViewportContext = createContext<ViewportContextValue | null>(null)

/**
 * The hook every overlay uses to place itself. An overlay converts its model-space
 * positions with `modelToScreen(point, viewport)` and renders in screen pixels, so it
 * stays crisp and constant-sized at any zoom while remaining exactly aligned with the
 * floorplan. Adding a new overlay means adding a new child of `FloorplanViewer`.
 */
export function useViewport(): ViewportContextValue {
  const value = useContext(ViewportContext)
  if (!value) {
    throw new Error('useViewport must be used inside <FloorplanViewer>')
  }
  return value
}
