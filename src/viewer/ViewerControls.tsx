import type { ViewportControls } from './useViewportControls'
import styles from './ViewerControls.module.css'

const BUTTON_ZOOM_FACTOR = 1.5

interface ViewerControlsProps {
  readonly controls: ViewportControls
}

export function ViewerControls({ controls }: ViewerControlsProps) {
  return (
    <div className={styles.controls} role="toolbar" aria-label="View controls">
      <button
        type="button"
        className={styles.button}
        onClick={() => controls.zoomBy(BUTTON_ZOOM_FACTOR)}
        aria-label="Zoom in"
        title="Zoom in (+)"
      >
        +
      </button>
      <button
        type="button"
        className={styles.button}
        onClick={() => controls.zoomBy(1 / BUTTON_ZOOM_FACTOR)}
        aria-label="Zoom out"
        title="Zoom out (-)"
      >
        &minus;
      </button>
      <button
        type="button"
        className={styles.button}
        onClick={controls.fit}
        disabled={controls.isFitted}
        aria-label="Fit to view"
        title="Fit to view (0)"
      >
        &#8690;
      </button>
    </div>
  )
}
