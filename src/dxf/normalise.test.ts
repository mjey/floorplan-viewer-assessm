import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import type { IDxf, IEntity } from 'dxf-parser'

import { containsPoint } from '@/geometry'

import { normaliseDrawing, segmentBounds } from './normalise'
import { parseDxf } from './parseDxf'

/** Minimal stand-in for a parsed DXF; only the fields the normaliser reads. */
function dxfWith(
  entities: readonly Record<string, unknown>[],
  header: Record<string, number> = {},
): IDxf {
  return {
    header,
    entities: entities.map((e) => ({ layer: '0', ...e })) as unknown as IEntity[],
    blocks: {},
    tables: {} as IDxf['tables'],
  }
}

const closeTo = (expected: number) => expect.closeTo(expected, 3)

describe('normaliseDrawing', () => {
  it('converts supported entities, groups them by layer and scales to millimetres', () => {
    const dxf = dxfWith(
      [
        {
          type: 'LINE',
          layer: 'walls',
          vertices: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
          ],
        },
        {
          type: 'ARC',
          layer: 'doors',
          center: { x: 10, y: 0 },
          radius: 1,
          startAngle: 0,
          endAngle: Math.PI / 2,
        },
        { type: 'CIRCLE', layer: 'doors', center: { x: 2, y: 2 }, radius: 0.5 },
        {
          type: 'LWPOLYLINE',
          layer: 'zone',
          vertices: [
            { x: 1, y: 1 },
            { x: 9, y: 1 },
            { x: 9, y: 7 },
          ],
          shape: true,
        },
      ],
      { $INSUNITS: 6 }, // metres, extent 10 m -> plausible, header trusted
    )

    const drawing = normaliseDrawing(dxf)

    expect(drawing.units).toMatchObject({ factor: 1000, source: 'header' })
    expect(drawing.layers.map((l) => l.name)).toEqual(['walls', 'doors', 'zone'])
    expect(drawing.layers[0]?.segments[0]).toEqual({
      kind: 'line',
      from: { x: 0, y: 0 },
      to: { x: 10_000, y: 0 },
    })
    expect(drawing.layers[1]?.segments[0]).toMatchObject({
      kind: 'arc',
      radius: 1000,
      center: { x: 10_000, y: 0 },
    })
    expect(drawing.layers[2]?.segments[0]).toMatchObject({ kind: 'polyline', closed: true })
    expect(drawing.bounds).toEqual({ minX: 0, minY: 0, maxX: 11_000, maxY: 7000 })
    expect(drawing.warnings).toEqual([])
    expect(drawing.entityCount).toBe(4)
  })

  it('applies the unit heuristic and surfaces it as a warning', () => {
    const dxf = dxfWith(
      [
        {
          type: 'LINE',
          vertices: [
            { x: 0, y: 0 },
            { x: 12, y: 8 },
          ],
        },
      ],
      { $INSUNITS: 4 }, // claims mm, but 12 "mm" wide is nonsense
    )

    const drawing = normaliseDrawing(dxf)

    expect(drawing.units).toMatchObject({ factor: 1000, source: 'heuristic' })
    expect(drawing.bounds).toEqual({ minX: 0, minY: 0, maxX: 12_000, maxY: 8000 })
    expect(drawing.warnings).toHaveLength(1)
    expect(drawing.warnings[0]).toMatch(/implausible/)
  })

  it('skips unsupported entities and reports them instead of failing', () => {
    const dxf = dxfWith(
      [
        {
          type: 'LINE',
          vertices: [
            { x: 0, y: 0 },
            { x: 5000, y: 0 },
          ],
        },
        { type: 'INSERT', name: 'DOOR' },
        { type: 'INSERT', name: 'RACK' },
        { type: 'TEXT', text: 'Hall 1' },
        { type: 'LINE', vertices: [{ x: 0, y: 0 }] }, // malformed: one vertex
      ],
      { $INSUNITS: 4 },
    )

    const drawing = normaliseDrawing(dxf)

    expect(drawing.layers[0]?.segments).toHaveLength(1)
    expect(drawing.warnings).toEqual([
      'Skipped 4 unsupported entities: INSERT (2), TEXT (1), LINE (malformed) (1).',
    ])
  })

  it('flattens polyline bulges and says so', () => {
    const dxf = dxfWith(
      [
        {
          type: 'LWPOLYLINE',
          vertices: [
            { x: 0, y: 0, bulge: 0.5 },
            { x: 5000, y: 0 },
            { x: 5000, y: 3000, bulge: 0 },
          ],
          shape: false,
        },
      ],
      { $INSUNITS: 4 },
    )

    const drawing = normaliseDrawing(dxf)

    expect(drawing.layers[0]?.segments[0]).toMatchObject({ kind: 'polyline', closed: false })
    expect(drawing.warnings[0]).toMatch(/1 polyline vertex carried bulge/)
  })

  it('honours an explicit unit override', () => {
    const dxf = dxfWith(
      [
        {
          type: 'LINE',
          vertices: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
          ],
        },
      ],
      {
        $INSUNITS: 4,
      },
    )

    const drawing = normaliseDrawing(dxf, { unitScale: 25.4 })

    expect(drawing.units).toMatchObject({ factor: 25.4, source: 'override' })
    expect(drawing.bounds.maxX).toBe(2540)
  })

  it('defaults entities with a blank layer name to layer 0', () => {
    const dxf = dxfWith([
      {
        type: 'LINE',
        layer: '',
        vertices: [
          { x: 0, y: 0 },
          { x: 5000, y: 0 },
        ],
      },
    ])

    expect(normaliseDrawing(dxf).layers[0]?.name).toBe('0')
  })
})

describe('segmentBounds', () => {
  it('includes the axis extremes an arc sweeps through, not just its end points', () => {
    // Half circle on top: from 0 to 180 deg passes through 90 deg where y = r.
    const bounds = segmentBounds({
      kind: 'arc',
      center: { x: 0, y: 0 },
      radius: 10,
      startAngle: 0,
      endAngle: Math.PI,
    })

    expect(bounds.minX).toEqual(closeTo(-10))
    expect(bounds.maxX).toEqual(closeTo(10))
    expect(bounds.minY).toEqual(closeTo(0))
    expect(bounds.maxY).toEqual(closeTo(10))
  })

  it('keeps a small arc tight', () => {
    // 10 to 80 deg never reaches an axis extreme.
    const bounds = segmentBounds({
      kind: 'arc',
      center: { x: 0, y: 0 },
      radius: 1,
      startAngle: (10 * Math.PI) / 180,
      endAngle: (80 * Math.PI) / 180,
    })

    expect(bounds.maxX).toBeLessThan(1)
    expect(bounds.maxY).toBeLessThan(1)
    expect(bounds.minX).toEqual(closeTo(Math.cos((80 * Math.PI) / 180)))
    expect(bounds.minY).toEqual(closeTo(Math.sin((10 * Math.PI) / 180)))
  })
})

describe('the provided floorplan.dxf', () => {
  const source = readFileSync(resolve(__dirname, '../../public/floorplan.dxf'), 'utf8')

  it('parses and normalises into a hall roughly 10 m by 8 m in millimetres', () => {
    const drawing = normaliseDrawing(parseDxf(source))

    expect(drawing.entityCount).toBe(952)
    expect(drawing.units).toMatchObject({
      factor: 1000,
      source: 'heuristic',
      declared: 'millimetres',
    })
    expect(drawing.layers.map((l) => l.name).sort()).toEqual(['0', 'h01_z01'])
    expect(drawing.bounds.minX).toEqual(closeTo(3806.189))
    expect(drawing.bounds.maxX).toEqual(closeTo(14_145.042))
    expect(drawing.bounds.minY).toEqual(closeTo(-3531.193))
    expect(drawing.bounds.maxY).toEqual(closeTo(4711.081))
    // Only the unit heuristic should be reported: nothing is skipped or flattened.
    expect(drawing.warnings).toHaveLength(1)
  })

  it('contains every sensor position from sensors.json inside the drawing', () => {
    const drawing = normaliseDrawing(parseDxf(source))
    const zone = drawing.layers.find((l) => l.name === 'h01_z01')
    const sensorPositions = [
      { x: 5200, y: -2300 },
      { x: 5200, y: 3200 },
      { x: 9000, y: -2300 },
      { x: 9000, y: 3200 },
      { x: 12_800, y: -2300 },
      { x: 12_800, y: 3200 },
    ]

    expect(zone?.segments[0]).toMatchObject({ kind: 'polyline', closed: true })
    for (const p of sensorPositions) {
      expect(containsPoint(drawing.bounds, p)).toBe(true)
    }
    // A real-data quirk worth knowing: the aisle C sensors (x = 12 800) sit outside the
    // zone polyline, which ends at x ~ 12 245. The zone is a sub-area, not the hall.
    const insideZone = sensorPositions.filter((p) => containsPoint(zone!.bounds, p))
    expect(insideZone).toHaveLength(4)
  })
})
