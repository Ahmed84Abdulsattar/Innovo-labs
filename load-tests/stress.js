// Stress test — pushes concurrency well beyond the expected peak to find the
// breaking point (where latency spikes or errors climb). Thresholds are recorded
// but NOT set to abort, so the run continues to the failure region for analysis.
import { sleep } from 'k6'
import { READ_ENDPOINTS, getAndCheck } from './lib/endpoints.js'

export const options = {
  stages: [
    { duration: '2m', target: 200 },
    { duration: '3m', target: 500 },
    { duration: '3m', target: 1000 },
    { duration: '3m', target: 2000 },
    { duration: '2m', target: 0 },
  ],
  // Report-only: observe where p95/error-rate degrade rather than failing the run.
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
  },
}

export default function () {
  const path = READ_ENDPOINTS[Math.floor(Math.random() * READ_ENDPOINTS.length)]
  getAndCheck(path)
  sleep(Math.random() * 2 + 0.5) // shorter think-time to intensify load
}
