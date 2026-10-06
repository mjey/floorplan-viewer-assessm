import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './App'
import { MOCK_FAIL_EVERY, MOCK_LATENCY_MS, SENSORS_URL } from './config'
import { demoOptionsFromSearch } from './demoOptions'
import './index.css'
import { createMockSensorApi, loadSensorFeed } from './sensors'

const container = document.getElementById('root')
if (!container) {
  throw new Error('Root element #root not found')
}

// Composition root: the only place that knows readings come from a mocked JSON feed.
// ?failEvery=N and ?latency=MIN-MAX on the URL override the defaults for manual testing.
const demo = demoOptionsFromSearch(window.location.search, {
  failEvery: MOCK_FAIL_EVERY,
  latencyMs: MOCK_LATENCY_MS,
})

const sensorApi = createMockSensorApi({
  source: () => loadSensorFeed(SENSORS_URL),
  failEvery: demo.failEvery,
  latencyMs: demo.latencyMs,
})

createRoot(container).render(
  <StrictMode>
    <App sensorApi={sensorApi} />
  </StrictMode>,
)
