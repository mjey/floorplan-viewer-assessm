import { EMPTY_BOUNDS } from './bounds'
import type { Bounds, Size } from './types'
import {
  DEFAULT_ZOOM_LIMITS,
  IDENTITY_VIEWPORT,
  fitBounds,
  modelToScreen,
  panBy,
  screenToModel,
  toSvgTransform,
  zoomAt,
  type Viewport,
} from './viewport'

const closeTo = (expected: number) => expect.closeTo(expected, 6)

describe('modelToScreen / screenToModel', () => {
  const vp: Viewport = { scale: 0.1, tx: 100, ty: 400 }

  it('maps the model origin to (tx, ty)', () => {
    expect(modelToScreen({ x: 0, y: 0 }, vp)).toEqual({ x: 100, y: 400 })
  })

  it('scales x and flips y so that model "up" is screen "up"', () => {
    // Model y +1000 (up) must land ABOVE the origin on screen, i.e. smaller screen y.
    expect(modelToScreen({ x: 2000, y: 1000 }, vp)).toEqual({ x: 300, y: 300 })
    // Model y -1000 (down) lands below.
    expect(modelToScreen({ x: 2000, y: -1000 }, vp)).toEqual({ x: 300, y: 500 })
  })

  it('round-trips arbitrary points through both directions', () => {
    const samples = [
      { x: 5200, y: -2300 }, // Aisle A-01 from sensors.json
      { x: 12_800, y: 3200 }, // Aisle C-02
      { x: -17.5, y: 0.25 },
      { x: 0, y: 0 },
    ]

    for (const p of samples) {
      const back = screenToModel(modelToScreen(p, vp), vp)
      expect(back.x).toEqual(closeTo(p.x))
      expect(back.y).toEqual(closeTo(p.y))
    }
  })

  it('agrees with the SVG matrix transform it is paired with', () => {
    // `matrix(a b c d e f)` maps (x, y) -> (a*x + c*y + e, b*x + d*y + f)
    const [a, b, c, d, e, f] = toSvgTransform(vp)
      .slice('matrix('.length, -1)
      .split(' ')
      .map(Number) as [number, number, number, number, number, number]

    const p = { x: 1234, y: -567 }
    const viaMatrix = { x: a * p.x + c * p.y + e, y: b * p.x + d * p.y + f }

    expect(viaMatrix).toEqual(modelToScreen(p, vp))
  })
})

describe('panBy', () => {
  it('moves every model point by exactly the screen delta', () => {
    const vp: Viewport = { scale: 0.25, tx: 10, ty: 20 }
    const p = { x: 800, y: -400 }

    const before = modelToScreen(p, vp)
    const after = modelToScreen(p, panBy(vp, 15, -7))

    expect(after.x - before.x).toBe(15)
    expect(after.y - before.y).toBe(-7)
  })

  it('does not change the scale', () => {
    expect(panBy({ scale: 0.3, tx: 0, ty: 0 }, 5, 5).scale).toBe(0.3)
  })
})

describe('zoomAt', () => {
  const vp: Viewport = { scale: 0.05, tx: 300, ty: 250 }
  const cursor = { x: 420, y: 180 }

  it('keeps the model point under the cursor fixed while zooming in', () => {
    const underCursorBefore = screenToModel(cursor, vp)
    const zoomed = zoomAt(vp, cursor, 1.5)
    const underCursorAfter = screenToModel(cursor, zoomed)

    expect(zoomed.scale).toEqual(closeTo(0.075))
    expect(underCursorAfter.x).toEqual(closeTo(underCursorBefore.x))
    expect(underCursorAfter.y).toEqual(closeTo(underCursorBefore.y))
  })

  it('keeps the model point under the cursor fixed while zooming out', () => {
    const underCursorBefore = screenToModel(cursor, vp)
    const zoomed = zoomAt(vp, cursor, 0.5)
    const underCursorAfter = screenToModel(cursor, zoomed)

    expect(zoomed.scale).toEqual(closeTo(0.025))
    expect(underCursorAfter.x).toEqual(closeTo(underCursorBefore.x))
    expect(underCursorAfter.y).toEqual(closeTo(underCursorBefore.y))
  })

  it('is stable under a zoom in followed by the inverse zoom out', () => {
    const roundTrip = zoomAt(zoomAt(vp, cursor, 2), cursor, 0.5)

    expect(roundTrip.scale).toEqual(closeTo(vp.scale))
    expect(roundTrip.tx).toEqual(closeTo(vp.tx))
    expect(roundTrip.ty).toEqual(closeTo(vp.ty))
  })

  it('clamps to the zoom limits and returns the same viewport when already at a limit', () => {
    const limits = { minScale: 0.01, maxScale: 0.1 }

    const maxed = zoomAt(vp, cursor, 1000, limits)
    expect(maxed.scale).toBe(0.1)

    const stillMaxed = zoomAt(maxed, cursor, 2, limits)
    expect(stillMaxed).toBe(maxed)

    const minned = zoomAt(vp, cursor, 0.0001, limits)
    expect(minned.scale).toBe(0.01)
  })

  it('treats factor 1 as the identity', () => {
    expect(zoomAt(vp, cursor, 1)).toBe(vp)
  })
})

describe('fitBounds', () => {
  const viewer: Size = { width: 800, height: 600 }
  // Roughly the real floorplan in mm: ~10.3 m wide, ~8.2 m tall, offset from the origin.
  const floorplan: Bounds = { minX: 3806, minY: -3531, maxX: 14_145, maxY: 4711 }

  it('places every corner of the bounds inside the viewer, respecting padding', () => {
    const padding = 24
    const vp = fitBounds(floorplan, viewer, padding)

    const corners = [
      { x: floorplan.minX, y: floorplan.minY },
      { x: floorplan.minX, y: floorplan.maxY },
      { x: floorplan.maxX, y: floorplan.minY },
      { x: floorplan.maxX, y: floorplan.maxY },
    ].map((c) => modelToScreen(c, vp))

    for (const c of corners) {
      expect(c.x).toBeGreaterThanOrEqual(padding - 1e-6)
      expect(c.x).toBeLessThanOrEqual(viewer.width - padding + 1e-6)
      expect(c.y).toBeGreaterThanOrEqual(padding - 1e-6)
      expect(c.y).toBeLessThanOrEqual(viewer.height - padding + 1e-6)
    }
  })

  it('centres the content in the viewer', () => {
    const vp = fitBounds(floorplan, viewer, 10)
    const centre = modelToScreen(
      { x: (floorplan.minX + floorplan.maxX) / 2, y: (floorplan.minY + floorplan.maxY) / 2 },
      vp,
    )

    expect(centre.x).toEqual(closeTo(viewer.width / 2))
    expect(centre.y).toEqual(closeTo(viewer.height / 2))
  })

  it('is limited by the tighter axis so the whole drawing is visible', () => {
    // Content is 10 wide, 1000 tall: height must drive the scale.
    const tall: Bounds = { minX: 0, minY: 0, maxX: 10, maxY: 1000 }
    const vp = fitBounds(tall, { width: 1000, height: 500 }, 0, { minScale: 0, maxScale: 100 })

    expect(vp.scale).toEqual(closeTo(0.5))
  })

  it('falls back to the identity for empty bounds or a zero-size viewer', () => {
    expect(fitBounds(EMPTY_BOUNDS, viewer)).toBe(IDENTITY_VIEWPORT)
    expect(fitBounds(floorplan, { width: 0, height: 600 })).toBe(IDENTITY_VIEWPORT)
  })

  it('handles a single-point bounds without producing NaN or Infinity', () => {
    const vp = fitBounds({ minX: 5, minY: 5, maxX: 5, maxY: 5 }, viewer, 10)

    expect(Number.isFinite(vp.scale)).toBe(true)
    expect(vp.scale).toBe(DEFAULT_ZOOM_LIMITS.maxScale)
    expect(modelToScreen({ x: 5, y: 5 }, vp)).toEqual({ x: 400, y: 300 })
  })
})

describe('toSvgTransform', () => {
  it('encodes scale, Y flip and translation as a matrix()', () => {
    expect(toSvgTransform({ scale: 0.5, tx: 12, ty: 34 })).toBe('matrix(0.5 0 0 -0.5 12 34)')
  })
})
