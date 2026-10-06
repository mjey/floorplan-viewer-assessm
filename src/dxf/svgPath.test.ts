import { arcSweep, layerToPath, pointOnCircle, segmentToPath } from './svgPath'
import type { DrawingLayer } from './types'

const closeTo = (expected: number) => expect.closeTo(expected, 6)

describe('segmentToPath', () => {
  it('emits a move and line for a line segment', () => {
    expect(segmentToPath({ kind: 'line', from: { x: 0, y: 0 }, to: { x: 10, y: -5 } })).toBe(
      'M0 0L10 -5',
    )
  })

  it('draws a quarter arc counter-clockwise with the small-arc flag', () => {
    const path = segmentToPath({
      kind: 'arc',
      center: { x: 0, y: 0 },
      radius: 10,
      startAngle: 0,
      endAngle: Math.PI / 2,
    })

    expect(path).toBe('M10 0A10 10 0 0 1 0 10')
  })

  it('sets the large-arc flag for sweeps over 180 degrees', () => {
    const path = segmentToPath({
      kind: 'arc',
      center: { x: 5, y: 5 },
      radius: 2,
      startAngle: 0,
      endAngle: (3 * Math.PI) / 2,
    })

    expect(path).toBe('M7 5A2 2 0 1 1 5 3')
  })

  it('handles arcs whose end angle wraps past 0 degrees', () => {
    // From 270 deg to 10 deg counter-clockwise is a 100 deg sweep, not -260.
    const start = (3 * Math.PI) / 2
    const end = (10 * Math.PI) / 180
    expect(arcSweep(start, end)).toEqual(closeTo((100 * Math.PI) / 180))

    const path = segmentToPath({
      kind: 'arc',
      center: { x: 0, y: 0 },
      radius: 1,
      startAngle: start,
      endAngle: end,
    })
    expect(path).toMatch(/^M0 -1A1 1 0 0 1 /)
  })

  it('renders a circle as two half arcs', () => {
    expect(segmentToPath({ kind: 'circle', center: { x: 3, y: 4 }, radius: 1 })).toBe(
      'M2 4A1 1 0 1 1 4 4A1 1 0 1 1 2 4',
    )
  })

  it('closes a polyline with Z only when it is closed', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 3 },
    ]

    expect(segmentToPath({ kind: 'polyline', points, closed: true })).toBe('M0 0L4 0L4 3Z')
    expect(segmentToPath({ kind: 'polyline', points, closed: false })).toBe('M0 0L4 0L4 3')
    expect(segmentToPath({ kind: 'polyline', points: [], closed: true })).toBe('')
  })

  it('rounds to a thousandth to keep path data short', () => {
    expect(
      segmentToPath({ kind: 'line', from: { x: 1.23456789, y: 0 }, to: { x: 0, y: 9.0000001 } }),
    ).toBe('M1.235 0L0 9')
  })
})

describe('layerToPath', () => {
  it('concatenates every segment into one path', () => {
    const layer: DrawingLayer = {
      name: '0',
      bounds: { minX: 0, minY: 0, maxX: 2, maxY: 2 },
      segments: [
        { kind: 'line', from: { x: 0, y: 0 }, to: { x: 1, y: 1 } },
        { kind: 'line', from: { x: 1, y: 1 }, to: { x: 2, y: 2 } },
      ],
    }

    expect(layerToPath(layer)).toBe('M0 0L1 1M1 1L2 2')
  })
})

describe('pointOnCircle', () => {
  it('walks counter-clockwise from +X', () => {
    const top = pointOnCircle({ x: 0, y: 0 }, 2, Math.PI / 2)
    expect(top.x).toEqual(closeTo(0))
    expect(top.y).toEqual(closeTo(2))
  })
})
