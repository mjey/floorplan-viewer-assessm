import type { Point } from '@/geometry'

import type { ArcSegment, CircleSegment, DrawingLayer, DrawingSegment } from './types'

/**
 * Converts drawing segments to SVG path data **in model coordinates**.
 *
 * The output is meant to be rendered inside a `<g>` carrying the viewport transform
 * (see `toSvgTransform`), which applies the scale and the Y flip. Because that flip is a
 * reflection, an arc that is counter-clockwise in model space is drawn with
 * `sweep-flag = 1` here and comes out visually correct on screen.
 *
 * Coordinates are rounded to a thousandth of a millimetre to keep the DOM small.
 */

const TWO_PI = 2 * Math.PI

export function segmentToPath(segment: DrawingSegment): string {
  switch (segment.kind) {
    case 'line':
      return `M${fmt(segment.from)}L${fmt(segment.to)}`
    case 'arc':
      return arcToPath(segment)
    case 'circle':
      return circleToPath(segment)
    case 'polyline':
      return polylineToPath(segment.points, segment.closed)
  }
}

/** One path string for a whole layer; cheaper for the DOM than one element per segment. */
export function layerToPath(layer: DrawingLayer): string {
  return layer.segments.map(segmentToPath).join('')
}

/**
 * Angular distance travelled counter-clockwise from `startAngle` to `endAngle`,
 * normalised into (0, 2π]. DXF arcs may be written with end < start (crossing 0°).
 */
export function arcSweep(startAngle: number, endAngle: number): number {
  const sweep = (((endAngle - startAngle) % TWO_PI) + TWO_PI) % TWO_PI
  return sweep === 0 ? TWO_PI : sweep
}

export function pointOnCircle(center: Point, radius: number, angle: number): Point {
  return { x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) }
}

function arcToPath({ center, radius, startAngle, endAngle }: ArcSegment): string {
  const sweep = arcSweep(startAngle, endAngle)
  if (sweep >= TWO_PI) return circleToPath({ kind: 'circle', center, radius })

  const start = pointOnCircle(center, radius, startAngle)
  const end = pointOnCircle(center, radius, endAngle)
  const largeArc = sweep > Math.PI ? 1 : 0
  return `M${fmt(start)}A${num(radius)} ${num(radius)} 0 ${largeArc} 1 ${fmt(end)}`
}

function circleToPath({ center, radius }: CircleSegment): string {
  const left = { x: center.x - radius, y: center.y }
  const right = { x: center.x + radius, y: center.y }
  const r = num(radius)
  return `M${fmt(left)}A${r} ${r} 0 1 1 ${fmt(right)}A${r} ${r} 0 1 1 ${fmt(left)}`
}

function polylineToPath(points: readonly Point[], closed: boolean): string {
  const [first, ...rest] = points
  if (!first) return ''
  const body = rest.map((p) => `L${fmt(p)}`).join('')
  return `M${fmt(first)}${body}${closed ? 'Z' : ''}`
}

function fmt(p: Point): string {
  return `${num(p.x)} ${num(p.y)}`
}

function num(value: number): string {
  return String(Math.round(value * 1000) / 1000)
}
