import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
} from 'react'

import { panBy, zoomAt, type ScreenPoint } from '@/geometry'

import type { ViewportControls } from './useViewportControls'

/** Movement (px) before a press becomes a drag, so clicks on overlays still fire. */
const DRAG_THRESHOLD_PX = 4
/** Wheel sensitivity: ~100 px of delta is one 15 % zoom step. */
const WHEEL_ZOOM_SENSITIVITY = 0.0015
const DOUBLE_CLICK_ZOOM_FACTOR = 2
const KEY_ZOOM_FACTOR = 1.25
const KEY_PAN_STEP_PX = 48

interface PressState {
  readonly pointerId: number
  readonly origin: ScreenPoint
  last: ScreenPoint
  dragging: boolean
}

export interface PanZoomHandlers {
  readonly onPointerDown: (event: PointerEvent<HTMLElement>) => void
  readonly onPointerMove: (event: PointerEvent<HTMLElement>) => void
  readonly onPointerUp: (event: PointerEvent<HTMLElement>) => void
  readonly onPointerCancel: (event: PointerEvent<HTMLElement>) => void
  readonly onDoubleClick: (event: MouseEvent<HTMLElement>) => void
  readonly onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
}

export interface PanZoom {
  readonly handlers: PanZoomHandlers
  readonly isDragging: boolean
}

/**
 * Translates pointer, wheel and keyboard gestures on `element` into viewport updates.
 *
 * - Drag to pan. Pointer capture is only taken once the drag threshold is crossed, so
 *   a plain click still reaches whatever overlay element was under the cursor.
 * - Wheel to zoom about the cursor. Attached natively as non-passive because React's
 *   synthetic `onWheel` cannot `preventDefault()` page scrolling.
 * - Double-click zooms in about the cursor; `+`, `-`, `0` and the arrow keys work when
 *   the viewer is focused.
 */
export function usePanZoom(
  controls: ViewportControls,
  element: RefObject<HTMLElement | null>,
): PanZoom {
  const { update, zoomBy, fit } = controls
  const press = useRef<PressState | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const target = element.current
    if (!target) return

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const delta = event.deltaY * wheelDeltaScale(event.deltaMode)
      const factor = Math.exp(-delta * WHEEL_ZOOM_SENSITIVITY)
      const anchor = toLocal(target, event)
      update((current) => zoomAt(current, anchor, factor))
    }

    target.addEventListener('wheel', onWheel, { passive: false })
    return () => target.removeEventListener('wheel', onWheel)
  }, [element, update])

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return
    const origin = { x: event.clientX, y: event.clientY }
    press.current = { pointerId: event.pointerId, origin, last: origin, dragging: false }
  }, [])

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const state = press.current
      if (!state || state.pointerId !== event.pointerId) return

      const point = { x: event.clientX, y: event.clientY }
      if (!state.dragging) {
        const moved = Math.hypot(point.x - state.origin.x, point.y - state.origin.y)
        if (moved < DRAG_THRESHOLD_PX) return
        state.dragging = true
        setIsDragging(true)
        capturePointer(event.currentTarget, event.pointerId)
      }

      const dx = point.x - state.last.x
      const dy = point.y - state.last.y
      state.last = point
      update((current) => panBy(current, dx, dy))
    },
    [update],
  )

  const endPress = useCallback((event: PointerEvent<HTMLElement>) => {
    const state = press.current
    if (!state || state.pointerId !== event.pointerId) return
    press.current = null
    if (state.dragging) {
      setIsDragging(false)
      releasePointer(event.currentTarget, event.pointerId)
    }
  }, [])

  const onDoubleClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      zoomBy(DOUBLE_CLICK_ZOOM_FACTOR, toLocal(event.currentTarget, event))
    },
    [zoomBy],
  )

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const pan = (dx: number, dy: number) => update((current) => panBy(current, dx, dy))
      const actions: Record<string, () => void> = {
        '+': () => zoomBy(KEY_ZOOM_FACTOR),
        '=': () => zoomBy(KEY_ZOOM_FACTOR),
        '-': () => zoomBy(1 / KEY_ZOOM_FACTOR),
        '0': fit,
        ArrowLeft: () => pan(KEY_PAN_STEP_PX, 0),
        ArrowRight: () => pan(-KEY_PAN_STEP_PX, 0),
        ArrowUp: () => pan(0, KEY_PAN_STEP_PX),
        ArrowDown: () => pan(0, -KEY_PAN_STEP_PX),
      }
      const action = actions[event.key]
      if (!action) return
      event.preventDefault()
      action()
    },
    [fit, update, zoomBy],
  )

  return {
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endPress,
      onPointerCancel: endPress,
      onDoubleClick,
      onKeyDown,
    },
    isDragging,
  }
}

/** Normalises `WheelEvent.deltaMode` so lines and pages behave like pixels. */
function wheelDeltaScale(deltaMode: number): number {
  switch (deltaMode) {
    case WheelEvent.DOM_DELTA_LINE:
      return 16
    case WheelEvent.DOM_DELTA_PAGE:
      return 400
    default:
      return 1
  }
}

// Pointer capture is absent in some test environments; the gestures degrade gracefully.
function capturePointer(target: HTMLElement, pointerId: number) {
  if (typeof target.setPointerCapture === 'function') target.setPointerCapture(pointerId)
}

function releasePointer(target: HTMLElement, pointerId: number) {
  if (typeof target.releasePointerCapture !== 'function') return
  if (typeof target.hasPointerCapture === 'function' && !target.hasPointerCapture(pointerId)) return
  target.releasePointerCapture(pointerId)
}

/** Converts a client-space event position to screen space relative to `target`. */
function toLocal(target: HTMLElement, event: { clientX: number; clientY: number }): ScreenPoint {
  const rect = target.getBoundingClientRect()
  return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}
