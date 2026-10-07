import { useCallback, useRef, useState } from 'react'

import { FLOORPLAN_URL, LOCATE_MIN_SCALE, POLL_INTERVAL_MS } from '@/config'
import { useDrawing } from '@/dxf'
import { useDocumentVisibility } from '@/lib/useDocumentVisibility'
import { SensorDetail, SensorLayer } from '@/overlays/sensors'
import {
  usePolledReadings,
  useSensors,
  type Sensor,
  type SensorApi,
  type SensorId,
} from '@/sensors'
import { StatusBar } from '@/ui/StatusBar'
import { FloorplanViewer, type FloorplanViewerHandle } from '@/viewer'

import styles from './App.module.css'

interface AppProps {
  /** Injected so the app never knows which transport is behind the sensors. */
  readonly sensorApi: SensorApi
}

export function App({ sensorApi }: AppProps) {
  const drawing = useDrawing(FLOORPLAN_URL)
  const sensors = useSensors(sensorApi)
  const visible = useDocumentVisibility()
  const readings = usePolledReadings(sensorApi, { intervalMs: POLL_INTERVAL_MS, enabled: visible })
  const [selectedId, setSelectedId] = useState<SensorId | null>(null)
  const clearSelection = useCallback(() => setSelectedId(null), [])

  const viewer = useRef<FloorplanViewerHandle>(null)
  const locate = useCallback((sensor: Sensor) => {
    const camera = viewer.current
    if (!camera) return
    camera.centerOn(sensor.position, Math.max(camera.viewport.scale, LOCATE_MIN_SCALE))
  }, [])

  const sensorList = sensors.state.status === 'success' ? sensors.state.data : null
  const selectedSensor = sensorList?.find((s) => s.id === selectedId) ?? null

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Floorplan Viewer</h1>
        {drawing.state.status === 'success' && (
          <p className={styles.meta}>
            {drawing.state.data.entityCount} entities · units: {drawing.state.data.units.declared}
            {drawing.state.data.units.source === 'heuristic' && ' (corrected)'}
          </p>
        )}
        <StatusBar readings={readings} paused={!visible} />
      </header>

      <main className={styles.main}>
        {drawing.state.status === 'loading' && (
          <p className={styles.status} role="status">
            Loading floorplan…
          </p>
        )}
        {drawing.state.status === 'error' && (
          <div className={styles.status} role="alert">
            <p>Could not load the floorplan: {drawing.state.error.message}</p>
            <button type="button" onClick={drawing.reload}>
              Retry
            </button>
          </div>
        )}
        {drawing.state.status === 'success' && (
          <FloorplanViewer drawing={drawing.state.data} ref={viewer}>
            {sensorList && (
              <SensorLayer
                sensors={sensorList}
                readings={readings.readings}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            )}
          </FloorplanViewer>
        )}

        {sensors.state.status === 'error' && (
          <div className={styles.notice} role="alert">
            <p>Could not load sensors: {sensors.state.error.message}</p>
            <button type="button" onClick={sensors.reload}>
              Retry
            </button>
          </div>
        )}

        {selectedSensor && (
          <SensorDetail
            sensor={selectedSensor}
            entry={readings.readings.get(selectedSensor.id)}
            onClose={clearSelection}
            onLocate={() => locate(selectedSensor)}
          />
        )}
      </main>

      {drawing.state.status === 'success' && drawing.state.data.warnings.length > 0 && (
        <footer className={styles.warnings}>
          {drawing.state.data.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </footer>
      )}
    </div>
  )
}
