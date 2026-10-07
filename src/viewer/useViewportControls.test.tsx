import { act, renderHook } from '@testing-library/react'

import {
  DEFAULT_ZOOM_LIMITS,
  fitBounds,
  modelToScreen,
  panBy,
  screenToModel,
  type Bounds,
  type Size,
} from '@/geometry'

import { useViewportControls } from './useViewportControls'

const closeTo = (expected: number) => expect.closeTo(expected, 6)

const bounds: Bounds = { minX: 0, minY: 0, maxX: 10_000, maxY: 5000 }
const size: Size = { width: 800, height: 600 }
const padding = 20

describe('useViewportControls', () => {
  it('starts fitted to the bounds', () => {
    const { result } = renderHook(() => useViewportControls(bounds, size, padding))

    expect(result.current.isFitted).toBe(true)
    expect(result.current.viewport).toEqual(fitBounds(bounds, size, padding))
  })

  it('applies updates and reports that the view is no longer fitted', () => {
    const { result } = renderHook(() => useViewportControls(bounds, size, padding))
    const before = result.current.viewport

    act(() => result.current.update((vp) => panBy(vp, 10, -5)))

    expect(result.current.isFitted).toBe(false)
    expect(result.current.viewport).toEqual({ ...before, tx: before.tx + 10, ty: before.ty - 5 })
  })

  it('zooms about the viewer centre by default', () => {
    const { result } = renderHook(() => useViewportControls(bounds, size, padding))
    const centre = { x: size.width / 2, y: size.height / 2 }
    const underCentreBefore = screenToModel(centre, result.current.viewport)

    act(() => result.current.zoomBy(2))

    const underCentreAfter = screenToModel(centre, result.current.viewport)
    expect(result.current.viewport.scale).toEqual(
      closeTo(fitBounds(bounds, size, padding).scale * 2),
    )
    expect(underCentreAfter.x).toEqual(closeTo(underCentreBefore.x))
    expect(underCentreAfter.y).toEqual(closeTo(underCentreBefore.y))
  })

  it('returns to the fit on fit()', () => {
    const { result } = renderHook(() => useViewportControls(bounds, size, padding))

    act(() => result.current.zoomBy(3, { x: 10, y: 10 }))
    expect(result.current.isFitted).toBe(false)

    act(() => result.current.fit())
    expect(result.current.isFitted).toBe(true)
    expect(result.current.viewport).toEqual(fitBounds(bounds, size, padding))
  })

  it('keeps the user viewport across a resize but refits for new bounds', () => {
    const { result, rerender } = renderHook(
      ({ b, s }: { b: Bounds; s: Size }) => useViewportControls(b, s, padding),
      { initialProps: { b: bounds, s: size } },
    )

    act(() => result.current.update((vp) => panBy(vp, 100, 100)))
    const userViewport = result.current.viewport

    rerender({ b: bounds, s: { width: 1000, height: 700 } })
    expect(result.current.viewport).toBe(userViewport)

    const otherBounds: Bounds = { minX: -500, minY: -500, maxX: 500, maxY: 500 }
    rerender({ b: otherBounds, s: { width: 1000, height: 700 } })
    expect(result.current.isFitted).toBe(true)
    expect(result.current.viewport).toEqual(
      fitBounds(otherBounds, { width: 1000, height: 700 }, padding),
    )
  })

  it('keeps a model point under a given anchor while zooming there', () => {
    const { result } = renderHook(() => useViewportControls(bounds, size, padding))
    const anchor = { x: 123, y: 456 }
    const modelUnderAnchor = screenToModel(anchor, result.current.viewport)

    act(() => result.current.zoomBy(1.7, anchor))

    const screenAfter = modelToScreen(modelUnderAnchor, result.current.viewport)
    expect(screenAfter.x).toEqual(closeTo(anchor.x))
    expect(screenAfter.y).toEqual(closeTo(anchor.y))
  })
})

describe('useViewportControls: centerOn', () => {
  it('puts the given model point at the viewer centre, keeping the current scale', () => {
    const { result } = renderHook(() => useViewportControls(bounds, size, padding))
    const scaleBefore = result.current.viewport.scale
    const target = { x: 5200, y: -2300 }

    act(() => result.current.centerOn(target))

    const onScreen = modelToScreen(target, result.current.viewport)
    expect(onScreen.x).toEqual(closeTo(size.width / 2))
    expect(onScreen.y).toEqual(closeTo(size.height / 2))
    expect(result.current.viewport.scale).toBe(scaleBefore)
    expect(result.current.isFitted).toBe(false)
  })

  it('applies a requested scale, clamped to the zoom limits', () => {
    const { result } = renderHook(() => useViewportControls(bounds, size, padding))
    const target = { x: 100, y: 100 }

    act(() => result.current.centerOn(target, 0.5))
    expect(result.current.viewport.scale).toBe(0.5)
    expect(modelToScreen(target, result.current.viewport).x).toEqual(closeTo(size.width / 2))

    act(() => result.current.centerOn(target, 1e9))
    expect(result.current.viewport.scale).toBe(DEFAULT_ZOOM_LIMITS.maxScale)
  })
})
