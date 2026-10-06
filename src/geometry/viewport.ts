import { boundsCenter, boundsHeight, boundsWidth, isEmptyBounds } from './bounds'
import type { Bounds, ModelPoint, ScreenPoint, Size } from './types'

/**
 * A `Viewport` is the single source of truth for how model space maps onto the screen.
 *
 * The mapping is a uniform scale, a Y-axis flip, and a translation:
 *
 *     screen.x =  model.x * scale + tx
 *     screen.y = -model.y * scale + ty
 *
 * Everything that draws in the viewer (the floorplan, the sensor markers, any future
 * overlay) derives its placement from a `Viewport` through the functions in this module,
 * so pan and zoom stay pixel-consistent across layers by construction.
 *
 * All functions here are pure: they return a new `Viewport` and never mutate the input.
 */
export interface Viewport {
  /** Screen pixels per model unit (mm). */
  readonly scale: number
  /** Screen x of the model-space origin. */
  readonly tx: number
  /** Screen y of the model-space origin. */
  readonly ty: number
}

export interface ZoomLimits {
  readonly minScale: number
  readonly maxScale: number
}

/**
 * Defaults chosen for a floorplan measured in millimetres: at `minScale` a 20 m hall is
 * ~100 px wide, at `maxScale` one millimetre is 2 px (plenty for door-hinge detail).
 */
export const DEFAULT_ZOOM_LIMITS: ZoomLimits = {
  minScale: 0.005,
  maxScale: 2,
}

export const IDENTITY_VIEWPORT: Viewport = { scale: 1, tx: 0, ty: 0 }

export function modelToScreen(p: ModelPoint, vp: Viewport): ScreenPoint {
  return {
    x: p.x * vp.scale + vp.tx,
    y: -p.y * vp.scale + vp.ty,
  }
}

export function screenToModel(p: ScreenPoint, vp: Viewport): ModelPoint {
  return {
    x: (p.x - vp.tx) / vp.scale,
    y: -(p.y - vp.ty) / vp.scale,
  }
}

/** Shifts the view by a screen-space delta (what a drag gesture produces). */
export function panBy(vp: Viewport, dx: number, dy: number): Viewport {
  return { scale: vp.scale, tx: vp.tx + dx, ty: vp.ty + dy }
}

/**
 * Scales the view by `factor` about a screen-space anchor, typically the cursor.
 * The model point under the anchor stays under the anchor after the zoom, which is
 * what makes wheel-zoom feel "attached" to the floorplan.
 */
export function zoomAt(
  vp: Viewport,
  anchor: ScreenPoint,
  factor: number,
  limits: ZoomLimits = DEFAULT_ZOOM_LIMITS,
): Viewport {
  const nextScale = clamp(vp.scale * factor, limits.minScale, limits.maxScale)
  if (nextScale === vp.scale) return vp

  const anchorInModel = screenToModel(anchor, vp)
  return {
    scale: nextScale,
    tx: anchor.x - anchorInModel.x * nextScale,
    ty: anchor.y + anchorInModel.y * nextScale,
  }
}

/**
 * Produces a viewport that shows the whole of `bounds` centred in a viewer of
 * `viewer` size, with `padding` pixels of breathing room on every side.
 *
 * Degenerate inputs (empty bounds, a zero-size viewer, a single point) fall back to a
 * sensible viewport rather than producing `Infinity` or `NaN`.
 */
export function fitBounds(
  bounds: Bounds,
  viewer: Size,
  padding = 0,
  limits: ZoomLimits = DEFAULT_ZOOM_LIMITS,
): Viewport {
  if (isEmptyBounds(bounds) || viewer.width <= 0 || viewer.height <= 0) {
    return IDENTITY_VIEWPORT
  }

  const availableWidth = Math.max(viewer.width - 2 * padding, 1)
  const availableHeight = Math.max(viewer.height - 2 * padding, 1)
  const contentWidth = boundsWidth(bounds)
  const contentHeight = boundsHeight(bounds)

  const scaleX = contentWidth > 0 ? availableWidth / contentWidth : Number.POSITIVE_INFINITY
  const scaleY = contentHeight > 0 ? availableHeight / contentHeight : Number.POSITIVE_INFINITY
  const rawScale = Math.min(scaleX, scaleY)
  const scale = clamp(
    Number.isFinite(rawScale) ? rawScale : limits.maxScale,
    limits.minScale,
    limits.maxScale,
  )

  const center = boundsCenter(bounds)
  return {
    scale,
    tx: viewer.width / 2 - center.x * scale,
    ty: viewer.height / 2 + center.y * scale,
  }
}

/**
 * The SVG `transform` attribute equivalent of `modelToScreen`, for drawing geometry
 * directly in model coordinates inside a `<g>`.
 */
export function toSvgTransform(vp: Viewport): string {
  return `matrix(${vp.scale} 0 0 ${-vp.scale} ${vp.tx} ${vp.ty})`
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
