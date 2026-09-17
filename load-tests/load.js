// Load test — ramps up to the target concurrent virtual users, holds, ramps down.
// Each VU simulates a user browsing pages with realistic think-time between clicks.
//
//   VUS=300  k6 run load.js     # default: ~5–10% of 3,000 employees active
//   VUS=3000 k6 run load.js     # pessimistic "everyone at once" ceiling
import { sleep } from 'k6'
import { READ_ENDPOINTS, getAndCheck } from './lib/endpoints.js'

const TARGET = parseInt(__ENV.VUS || '300', 10)

export const options = {
  stages: [
    { duration: '2m', target: TARGET },  // ramp up
    { duration: '5m', target: TARGET },  // hold at peak
    { duration: '2m', target: 0 },       // ramp down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],       // < 1% errors
    http_req_duration: ['p(95)<800'],     // 95% under 800ms
  },
}

export default function () {
  // A VU opens one "page" (endpoint) then pauses like a real user reading.
  const path = READ_ENDPOINTS[Math.floor(Math.random() * READ_ENDPOINTS.length)]
  getAndCheck(path)
  sleep(Math.random() * 4 + 2) // think-time 2–6s
}
