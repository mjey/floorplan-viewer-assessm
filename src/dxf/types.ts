import type { Bounds, Point } from '@/geometry'

/**
 * A `Drawing` is the renderer-friendly, unit-normalised form of a DXF file.
 *
 * The DXF format is large and messy; a floorplan viewer only needs a handful of
 * primitives. `normaliseDrawing` reduces whatever the parser produced to these
 * segments, groups them by layer, scales everything to **millimetres**, and records
 * anything it had to skip or guess in `warnings` so the UI and README can be honest.
 */

/** A straight segment between two model-space points. */
export interface LineSegment {
  readonly kind: 'line'
  readonly from: Point
  readonly to: Point
}

/**
 * A circular arc. Angles are radians measured counter-clockwise from +X in model
 * space (Y-up), exactly as DXF defines them. The arc runs from `startAngle` to
 * `endAngle` counter-clockwise.
 */
export interface ArcSegment {
  readonly kind: 'arc'
  readonly center: Point
  readonly radius: number
  readonly startAngle: number
  readonly endAngle: number
}

export interface CircleSegment {
  readonly kind: 'circle'
  readonly center: Point
  readonly radius: number
}

/** A chain of straight edges, optionally closed back to the first point. */
export interface PolylineSegment {
  readonly kind: 'polyline'
  readonly points: readonly Point[]
  readonly closed: boolean
}

export type DrawingSegment = LineSegment | ArcSegment | CircleSegment | PolylineSegment

export interface DrawingLayer {
  readonly name: string
  readonly segments: readonly DrawingSegment[]
  readonly bounds: Bounds
}

export type UnitSource = 'header' | 'heuristic' | 'override'

/** How the drawing's native units were mapped to millimetres, and why. */
export interface UnitResolution {
  /** Multiply native coordinates by this to get millimetres. */
  readonly factor: number
  readonly source: UnitSource
  /** Human-readable name of the unit the header declared (e.g. "millimetres", "unitless"). */
  readonly declared: string
  /** One sentence explaining the decision, for display and for the README. */
  readonly note: string
}

export interface Drawing {
  readonly layers: readonly DrawingLayer[]
  /** Overall extent in millimetres. */
  readonly bounds: Bounds
  readonly units: UnitResolution
  readonly warnings: readonly string[]
  /** Number of entities in the source, before any were skipped. */
  readonly entityCount: number
}
