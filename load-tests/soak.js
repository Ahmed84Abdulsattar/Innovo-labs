// Soak (endurance) test — moderate, steady load held for 1 hour to surface
// stability problems that only appear over time: memory leaks, connection-pool
// exhaustion, slow degradation, cache growth.
import { sleep } from 'k6'
import { READ_ENDPOINTS, getAndCheck } from './lib/endpoints.js'

export const options = {
  stages: [
    { duration: '5m', target: 100 },   // ramp to a sustainable level
    { duration: '50m', target: 100 },  // hold for the soak window
    { duration: '5m', target: 0 },     // ramp down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],  // p95 must NOT drift up over the hour
  },
}

export default function () {
  const path = READ_ENDPOINTS[Math.floor(Math.random() * READ_ENDPOINTS.length)]
  getAndCheck(path)
  sleep(Math.random() * 4 + 2)
}
