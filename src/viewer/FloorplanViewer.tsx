import type { ReactNode } from 'react'

import { FIT_PADDING_PX } from '@/config'
import type { Drawing } from '@/dxf'

import { FloorplanLayer } from './FloorplanLayer'
import styles from './FloorplanViewer.module.css'
import { ScaleBar } from './ScaleBar'
import { useElementSize } from './useElementSize'
import { usePanZoom } from './usePanZoom'
import { useViewportControls } from './useViewportControls'
import { ViewerControls } from './ViewerControls'
import { ViewportProvider } from './ViewportProvider'

interface FloorplanViewerProps {
  readonly drawing: Drawing
  /**
   * Overlays, rendered inside the SVG above the floorplan. Each one reads the
   * current mapping through `useViewport()` and draws itself in screen space.
   */
  readonly children?: ReactNode
}

/**
 * The viewer owns the viewport, the gestures and the SVG surface. It knows nothing
 * about what the overlays contain; they are composed in as children.
 */
export function FloorplanViewer({ drawing, children }: FloorplanViewerProps) {
  const { ref, size } = useElementSize<HTMLDivElement>()
  const controls = useViewportControls(drawing.bounds, size, FIT_PADDING_PX)
  const { handlers, isDragging } = usePanZoom(controls, ref)
  const measured = size.width > 0 && size.height > 0

  return (
    <div
      ref={ref}
      className={isDragging ? `${styles.viewer} ${styles.dragging}` : styles.viewer}
      data-testid="floorplan-viewer"
      tabIndex={0}
      aria-label="Floorplan. Drag to pan, scroll to zoom, press 0 to fit."
      {...handlers}
    >
      <ViewportProvider viewport={controls.viewport} size={size}>
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
