// Smoke test — 1 virtual user for 1 minute. Confirms the script, BASE_URL and
// SESSION cookie are correct before running the heavier scenarios.
import { sleep } from 'k6'
import { READ_ENDPOINTS, getAndCheck } from './lib/endpoints.js'

export const options = {
  vus: 1,
  duration: '1m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
  },
}

export default function () {
  for (const path of READ_ENDPOINTS) {
    getAndCheck(path)
    sleep(1)
  }
}
