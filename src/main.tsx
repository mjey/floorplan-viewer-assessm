import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './App'
import { MOCK_FAIL_EVERY, SENSORS_URL } from './config'
import './index.css'
import { createMockSensorApi, loadSensorFeed } from './sensors'

const container = document.getElementById('root')
if (!container) {
  throw new Error('Root element #root not found')
}

// Composition root: the only place that knows readings come from a mocked JSON feed.
const sensorApi = createMockSensorApi({
  source: (signal) => loadSensorFeed(SENSORS_URL, signal),
  failEvery: MOCK_FAIL_EVERY,
})

createRoot(container).render(
  <StrictMode>
    <App sensorApi={sensorApi} />
  </StrictMode>,
)
