/**
 * Core geometric primitives shared by the DXF pipeline, the viewport and every overlay.
 *
 * Two coordinate spaces exist in this app:
 *
 * - **Model space**: the floorplan's own coordinates in millimetres, Y pointing up
 *   (CAD convention). The DXF geometry and `sensors.json` positions both live here.
 * - **Screen space**: CSS pixels relative to the top-left of the viewer element,
 *   Y pointing down (browser convention).
 *
 * Both spaces use the same `Point` shape; the type aliases below exist purely to make
 * function signatures self-documenting about which space they expect.
 */

export interface Point {
  readonly x: number
  readonly y: number
}

/** A point in model space (mm, Y-up). */
export type ModelPoint = Point

/** A point in screen space (px, Y-down). */
export type ScreenPoint = Point

export interface Size {
  readonly width: number
  readonly height: number
}

/** Axis-aligned bounding box in model space. */
export interface Bounds {
  readonly minX: number
  readonly minY: number
  readonly maxX: number
  readonly maxY: number
}
