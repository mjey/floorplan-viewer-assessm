import type { Bounds, Point } from './types'

/**
 * The identity element for `unionBounds`: a box that contains nothing, so that
 * unioning it with any real box yields that box unchanged.
 */
export const EMPTY_BOUNDS: Bounds = {
  minX: Number.POSITIVE_INFINITY,
  minY: Number.POSITIVE_INFINITY,
  maxX: Number.NEGATIVE_INFINITY,
  maxY: Number.NEGATIVE_INFINITY,
}

export function isEmptyBounds(bounds: Bounds): boolean {
  return bounds.minX > bounds.maxX || bounds.minY > bounds.maxY
}

export function boundsWidth(bounds: Bounds): number {
  return isEmptyBounds(bounds) ? 0 : bounds.maxX - bounds.minX
}

export function boundsHeight(bounds: Bounds): number {
  return isEmptyBounds(bounds) ? 0 : bounds.maxY - bounds.minY
}

export function boundsCenter(bounds: Bounds): Point {
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  }
}

export function boundsFromPoints(points: readonly Point[]): Bounds {
  return points.reduce<Bounds>(
    (acc, p) => ({
      minX: Math.min(acc.minX, p.x),
      minY: Math.min(acc.minY, p.y),
      maxX: Math.max(acc.maxX, p.x),
      maxY: Math.max(acc.maxY, p.y),
    }),
    EMPTY_BOUNDS,
  )
}

export function unionBounds(a: Bounds, b: Bounds): Bounds {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  }
}

/** Grows the box outwards by `amount` on every side. */
export function padBounds(bounds: Bounds, amount: number): Bounds {
  return {
    minX: bounds.minX - amount,
    minY: bounds.minY - amount,
    maxX: bounds.maxX + amount,
    maxY: bounds.maxY + amount,
  }
}

/** Multiplies every coordinate by `factor`. Used for unit conversion (e.g. metres to mm). */
export function scaleBounds(bounds: Bounds, factor: number): Bounds {
  if (isEmptyBounds(bounds)) return bounds
  return {
    minX: bounds.minX * factor,
    minY: bounds.minY * factor,
    maxX: bounds.maxX * factor,
    maxY: bounds.maxY * factor,
  }
}

export function containsPoint(bounds: Bounds, p: Point): boolean {
  return p.x >= bounds.minX && p.x <= bounds.maxX && p.y >= bounds.minY && p.y <= bounds.maxY
}
