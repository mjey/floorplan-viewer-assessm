import { useImperativeHandle, type ReactNode, type Ref } from 'react'

import { FIT_PADDING_PX } from '@/config'
import type { Drawing } from '@/dxf'

import { FloorplanLayer } from './FloorplanLayer'
import styles from './FloorplanViewer.module.css'
import { ScaleBar } from './ScaleBar'
import { useElementSize } from './useElementSize'
import { usePanZoom } from './usePanZoom'
import { useViewportControls, type ViewportControls } from './useViewportControls'
import { ViewerControls } from './ViewerControls'
import { ViewportProvider } from './ViewportProvider'

/** What a parent gets through `ref`: the camera, for "zoom to X" style actions. */
export type FloorplanViewerHandle = ViewportControls

interface FloorplanViewerProps {
  readonly drawing: Drawing
  /**
   * Overlays, rendered inside the SVG above the floorplan. Each one reads the
   * current mapping through `useViewport()` and draws itself in screen space.
   */
  readonly children?: ReactNode
  /** Imperative access to the camera for components outside the viewer. */
  readonly ref?: Ref<FloorplanViewerHandle>
}

/**
 * The viewer owns the viewport, the gestures and the SVG surface. It knows nothing
 * about what the overlays contain; they are composed in as children.
 */
export function FloorplanViewer({ drawing, children, ref }: FloorplanViewerProps) {
  const { ref: element, size } = useElementSize<HTMLDivElement>()
  const controls = useViewportControls(drawing.bounds, size, FIT_PADDING_PX)
  const { handlers, isDragging } = usePanZoom(controls, element)
  const measured = size.width > 0 && size.height > 0

  useImperativeHandle(ref, () => controls, [controls])

  return (
    <div
      ref={element}
      className={isDragging ? `${styles.viewer} ${styles.dragging}` : styles.viewer}
      data-testid="floorplan-viewer"
      tabIndex={0}
      aria-label="Floorplan. Drag to pan, scroll to zoom, press 0 to fit."
      {...handlers}
    >
      <ViewportProvider viewport={controls.viewport} size={size} controls={controls}>
        {measured && (
          <svg
            className={styles.surface}
            width={size.width}
            height={size.height}
            role="img"
            aria-label="Floorplan"
          >
            <FloorplanLayer drawing={drawing} viewport={controls.viewport} />
            {children}
          </svg>
        )}
        <ViewerControls controls={controls} />
        <ScaleBar />
      </ViewportProvider>
    </div>
  )
}
