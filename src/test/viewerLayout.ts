import type { Size } from '@/geometry'

/**
 * jsdom performs no layout and has no `ResizeObserver`. Tests that render the viewer
 * call this so it measures a real size and `fitBounds` has something to fit.
 */
export function stubViewerLayout(size: Size = { width: 800, height: 600 }): void {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    ...size,
    top: 0,
    left: 0,
    right: size.width,
    bottom: size.height,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  })
}

export function restoreViewerLayout(): void {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
}
