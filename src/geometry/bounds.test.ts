import {
  EMPTY_BOUNDS,
  boundsCenter,
  boundsFromPoints,
  boundsHeight,
  boundsWidth,
  containsPoint,
  isEmptyBounds,
  padBounds,
  scaleBounds,
  unionBounds,
} from './bounds'

describe('bounds', () => {
  it('builds a box from points and reports its size and centre', () => {
    const b = boundsFromPoints([
      { x: 10, y: -5 },
      { x: -2, y: 7 },
      { x: 4, y: 1 },
    ])

    expect(b).toEqual({ minX: -2, minY: -5, maxX: 10, maxY: 7 })
    expect(boundsWidth(b)).toBe(12)
    expect(boundsHeight(b)).toBe(12)
    expect(boundsCenter(b)).toEqual({ x: 4, y: 1 })
  })

  it('treats no points as the empty box with zero size', () => {
    const b = boundsFromPoints([])

    expect(isEmptyBounds(b)).toBe(true)
    expect(boundsWidth(b)).toBe(0)
    expect(boundsHeight(b)).toBe(0)
  })

  it('unions with EMPTY_BOUNDS as the identity', () => {
    const b = { minX: 1, minY: 2, maxX: 3, maxY: 4 }

    expect(unionBounds(EMPTY_BOUNDS, b)).toEqual(b)
    expect(unionBounds(b, EMPTY_BOUNDS)).toEqual(b)
  })

  it('unions two overlapping boxes into their hull', () => {
    const a = { minX: 0, minY: 0, maxX: 10, maxY: 10 }
    const b = { minX: 5, minY: -5, maxX: 20, maxY: 5 }

    expect(unionBounds(a, b)).toEqual({ minX: 0, minY: -5, maxX: 20, maxY: 10 })
  })

  it('pads and scales', () => {
    const b = { minX: 0, minY: 0, maxX: 10, maxY: 20 }

    expect(padBounds(b, 2)).toEqual({ minX: -2, minY: -2, maxX: 12, maxY: 22 })
    expect(scaleBounds(b, 1000)).toEqual({ minX: 0, minY: 0, maxX: 10_000, maxY: 20_000 })
    expect(scaleBounds(EMPTY_BOUNDS, 1000)).toBe(EMPTY_BOUNDS)
  })

  it('contains points inclusively on the edges', () => {
    const b = { minX: 0, minY: 0, maxX: 10, maxY: 10 }

    expect(containsPoint(b, { x: 0, y: 10 })).toBe(true)
    expect(containsPoint(b, { x: 5, y: 5 })).toBe(true)
    expect(containsPoint(b, { x: 10.01, y: 5 })).toBe(false)
  })
})
