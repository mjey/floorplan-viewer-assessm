import { FLOORPLAN_URL } from '@/config'
import { useDrawing } from '@/dxf'
import { FloorplanViewer } from '@/viewer'

import styles from './App.module.css'

export function App() {
  const { state, reload } = useDrawing(FLOORPLAN_URL)

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Floorplan Viewer</h1>
        {state.status === 'success' && (
          <p className={styles.meta}>
            {state.data.entityCount} entities · units: {state.data.units.declared}
            {state.data.units.source === 'heuristic' && ' (corrected)'}
          </p>
        )}
      </header>

      <main className={styles.main}>
        {state.status === 'loading' && (
          <p className={styles.status} role="status">
            Loading floorplan…
          </p>
        )}
        {state.status === 'error' && (
          <div className={styles.status} role="alert">
            <p>Could not load the floorplan: {state.error.message}</p>
            <button type="button" onClick={reload}>
              Retry
            </button>
          </div>
        )}
        {state.status === 'success' && <FloorplanViewer drawing={state.data} />}
      </main>

      {state.status === 'success' && state.data.warnings.length > 0 && (
        <footer className={styles.warnings}>
          {state.data.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </footer>
      )}
    </div>
  )
}
