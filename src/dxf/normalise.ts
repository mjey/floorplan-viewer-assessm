import type {
  IArcEntity,
  ICircleEntity,
  IDxf,
  IEntity,
  ILineEntity,
  ILwpolylineEntity,
  IPolylineEntity,
} from 'dxf-parser'

import {
  EMPTY_BOUNDS,
  boundsFromPoints,
  boundsHeight,
  boundsWidth,
  unionBounds,
  type Bounds,
  type Point,
} from '@/geometry'

import { arcSweep, pointOnCircle } from './svgPath'
import type { Drawing, DrawingLayer, DrawingSegment } from './types'
import { resolveUnitScale } from './units'

export interface NormaliseOptions {
  /** Force a specific native-unit to millimetre factor instead of detecting one. */
  readonly unitScale?: number | undefined
}

/**
 * Turns a parsed DXF into a `Drawing`: supported entities become segments grouped by
 * layer, coordinates are scaled to millimetres, and everything skipped or guessed is
 * reported in `warnings`.
 *
 * Only the ENTITIES section (model space) is read. Block definitions are ignored on
 * purpose: they only matter when an INSERT references them, and an INSERT is reported
 * as unsupported so the omission is visible rather than silent.
 */
export function normaliseDrawing(dxf: IDxf, options: NormaliseOptions = {}): Drawing {
  const skipped = new Map<string, number>()
  let flattenedBulges = 0

  const nativeLayers = new Map<string, DrawingSegment[]>()
  for (const entity of dxf.entities) {
    const converted = toSegment(entity)
    if (converted.kind === 'unsupported') {
      skipped.set(converted.type, (skipped.get(converted.type) ?? 0) + 1)
      continue
    }
    flattenedBulges += converted.flattenedBulges
    const layerName = entity.layer || '0'
    const bucket = nativeLayers.get(layerName) ?? []
    bucket.push(converted.segment)
    nativeLayers.set(layerName, bucket)
  }

  const nativeBounds = [...nativeLayers.values()]
    .flat()
    .reduce((acc, segment) => unionBounds(acc, segmentBounds(segment)), EMPTY_BOUNDS)

  const units = resolveUnitScale({
    declaredCode: headerNumber(dxf, '$INSUNITS'),
    extent: { width: boundsWidth(nativeBounds), height: boundsHeight(nativeBounds) },
    override: options.unitScale,
  })

  const layers: DrawingLayer[] = [...nativeLayers].map(([name, segments]) => {
    const scaled = segments.map((segment) => scaleSegment(segment, units.factor))
    return {
      name,
      segments: scaled,
      bounds: scaled.reduce((acc, s) => unionBounds(acc, segmentBounds(s)), EMPTY_BOUNDS),
    }
  })

  return {
    layers,
    bounds: layers.reduce((acc, layer) => unionBounds(acc, layer.bounds), EMPTY_BOUNDS),
    units,
    warnings: collectWarnings(
      skipped,
      flattenedBulges,
      units.source === 'heuristic' ? units.note : null,
    ),
    entityCount: dxf.entities.length,
  }
}

type Conversion =
  | { kind: 'segment'; segment: DrawingSegment; flattenedBulges: number }
  | { kind: 'unsupported'; type: string }

function toSegment(entity: IEntity): Conversion {
  switch (entity.type) {
    case 'LINE': {
      const { vertices } = entity as ILineEntity
      const [from, to] = vertices
      if (!from || !to) return unsupported('LINE (malformed)')
      return segment({ kind: 'line', from: xy(from), to: xy(to) })
    }
    case 'ARC': {
      const { center, radius, startAngle, endAngle } = entity as IArcEntity
      return segment({ kind: 'arc', center: xy(center), radius, startAngle, endAngle })
    }
    case 'CIRCLE': {
      const { center, radius } = entity as ICircleEntity
      return segment({ kind: 'circle', center: xy(center), radius })
    }
    case 'LWPOLYLINE': {
      const { vertices, shape } = entity as ILwpolylineEntity
      const bulged = vertices.filter((v) => v.bulge !== undefined && v.bulge !== 0).length
      return segment({ kind: 'polyline', points: vertices.map(xy), closed: shape === true }, bulged)
    }
    case 'POLYLINE': {
      const { vertices, shape } = entity as IPolylineEntity
      const bulged = vertices.filter((v) => v.bulge !== undefined && v.bulge !== 0).length
      return segment({ kind: 'polyline', points: vertices.map(xy), closed: shape === true }, bulged)
    }
    default:
      return unsupported(entity.type)
  }
}

function segment(segment: DrawingSegment, flattenedBulges = 0): Conversion {
  return { kind: 'segment', segment, flattenedBulges }
}

function unsupported(type: string): Conversion {
  return { kind: 'unsupported', type }
}

function xy(p: { x: number; y: number }): Point {
  return { x: p.x, y: p.y }
}

function scaleSegment(segment: DrawingSegment, factor: number): DrawingSegment {
  if (factor === 1) return segment
  const s = (p: Point): Point => ({ x: p.x * factor, y: p.y * factor })
  switch (segment.kind) {
    case 'line':
      return { ...segment, from: s(segment.from), to: s(segment.to) }
    case 'arc':
      return { ...segment, center: s(segment.center), radius: segment.radius * factor }
    case 'circle':
      return { ...segment, center: s(segment.center), radius: segment.radius * factor }
    case 'polyline':
      return { ...segment, points: segment.points.map(s) }
  }
}

export function segmentBounds(segment: DrawingSegment): Bounds {
  switch (segment.kind) {
    case 'line':
      return boundsFromPoints([segment.from, segment.to])
    case 'circle':
      return boundsFromPoints([
        { x: segment.center.x - segment.radius, y: segment.center.y - segment.radius },
        { x: segment.center.x + segment.radius, y: segment.center.y + segment.radius },
      ])
    case 'polyline':
      return boundsFromPoints(segment.points)
    case 'arc':
      return arcBounds(segment)
  }
}

/**
 * Tight bounds of an arc: its two end points plus any axis-extreme point
 * (0°, 90°, 180°, 270°) that the sweep passes through.
 */
function arcBounds({
  center,
  radius,
  startAngle,
  endAngle,
}: Extract<DrawingSegment, { kind: 'arc' }>): Bounds {
  const sweep = arcSweep(startAngle, endAngle)
  const points: Point[] = [
    pointOnCircle(center, radius, startAngle),
    pointOnCircle(center, radius, endAngle),
  ]
  const quarter = Math.PI / 2
  const firstQuadrant = Math.ceil(startAngle / quarter) * quarter
  for (let angle = firstQuadrant; angle <= startAngle + sweep; angle += quarter) {
    points.push(pointOnCircle(center, radius, angle))
  }
  return boundsFromPoints(points)
}

function headerNumber(dxf: IDxf, key: string): number | undefined {
  const value = dxf.header?.[key]
  return typeof value === 'number' ? value : undefined
}

function collectWarnings(
  skipped: ReadonlyMap<string, number>,
  flattenedBulges: number,
  unitNote: string | null,
): string[] {
  const warnings: string[] = []
  if (unitNote) warnings.push(unitNote)
  if (skipped.size > 0) {
    const total = [...skipped.values()].reduce((a, b) => a + b, 0)
    const breakdown = [...skipped].map(([type, count]) => `${type} (${count})`).join(', ')
    warnings.push(`Skipped ${total} unsupported entit${total === 1 ? 'y' : 'ies'}: ${breakdown}.`)
  }
  if (flattenedBulges > 0) {
    warnings.push(
      `${flattenedBulges} polyline vert${flattenedBulges === 1 ? 'ex' : 'ices'} carried bulge (arc) data that was flattened to straight edges.`,
    )
  }
  return warnings
}
