import { useCallback, useMemo, useState } from 'react'

import {
  DEFAULT_ZOOM_LIMITS,
  fitBounds,
  zoomAt,
  type Bounds,
  type ModelPoint,
  type ScreenPoint,
  type Size,
  type Viewport,
} from '@/geometry'

export interface ViewportControls {
  readonly viewport: Viewport
  /** True while the viewport is the automatic fit (the user has not panned or zoomed). */
  readonly isFitted: boolean
  /** Applies a pure transformation to the current viewport (pan, zoom, ...). */
  readonly update: (transform: (current: Viewport) => Viewport) => void
  /** Zooms by `factor` about `anchor`, or about the viewer centre when omitted. */
  readonly zoomBy: (factor: number, anchor?: ScreenPoint) => void
  /** Puts a model-space point at the centre of the viewer, keeping or setting the scale. */
  readonly centerOn: (point: ModelPoint, scale?: number) => void
  /** Returns to the automatic fit. */
  readonly fit: () => void
}

/** A user-set viewport, remembered against the content it was set for. */
interface UserViewport {
  readonly key: Bounds
  readonly viewport: Viewport
}

/**
 * Owns the viewer's viewport state.
 *
 * The viewport is *derived* from `fitBounds` until the user interacts; after that the
 * user's viewport is kept for as long as the same content is shown. Switching to
 * different `bounds` (a new drawing) falls back to the fit automatically, with no
 * effect and no explicit reset.
 */
export function useViewportControls(bounds: Bounds, size: Size, padding: number): ViewportControls {
  const [user, setUser] = useState<UserViewport | null>(null)

  const fitted = useMemo(() => fitBounds(bounds, size, padding), [bounds, size, padding])
  const isFitted = user === null || user.key !== bounds
  const viewport = isFitted ? fitted : user.viewport

  const update = useCallback(
    (transform: (current: Viewport) => Viewport) => {
      setUser((previous) => {
        const current = previous && previous.key === bounds ? previous.viewport : fitted
        const next = transform(current)
        const unchanged = next === current && previous !== null && previous.key === bounds
        return unchanged ? previous : { key: bounds, viewport: next }
      })
    },
    [bounds, fitted],
  )

  const zoomBy = useCallback(
    (factor: number, anchor?: ScreenPoint) => {
      const point = anchor ?? { x: size.width / 2, y: size.height / 2 }
      update((current) => zoomAt(current, point, factor))
    },
    [size.width, size.height, update],
  )

  const centerOn = useCallback(
    (point: ModelPoint, scale?: number) => {
      update((current) => {
        const s = clampScale(scale ?? current.scale)
        return {
          scale: s,
          tx: size.width / 2 - point.x * s,
          ty: size.height / 2 + point.y * s,
        }
      })
    },
    [size.width, size.height, update],
  )

  const fit = useCallback(() => setUser(null), [])

  return { viewport, isFitted, update, zoomBy, centerOn, fit }
}

function clampScale(scale: number): number {
  return Math.min(Math.max(scale, DEFAULT_ZOOM_LIMITS.minScale), DEFAULT_ZOOM_LIMITS.maxScale)
}
