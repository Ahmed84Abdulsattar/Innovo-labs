import http from 'k6/http'
import { check, sleep } from 'k6'

/*
 * Concurrency ceiling probe for POST /api/ideas using k6 (true parallel VUs).
 *
 * Install k6:  https://grafana.com/docs/k6/latest/set-up/install-k6/
 *   Windows:  winget install k6   (or:  choco install k6)
 *
 * Run (from the repo root):
 *   k6 run -e APP_URL=https://innovo-labs-portal.vercel.app -e SESSION=<cookie> scripts/load-ideas.k6.js
 *
 * Ramps 200 -> 500 -> 1000 concurrent virtual users, each submitting ~1/sec.
 * k6 marks the run FAILED if error rate > 2% or p95 latency > 2s — that's your
 * ceiling signal. Watch the live "http_req_failed" and "http_req_duration" rows.
 *
 * ⚠️  This inserts MANY test ideas (potentially tens of thousands). Point it at a
 * staging DB if you can, and clean up afterwards in the Supabase SQL editor:
 *     DELETE FROM ideas WHERE problem_title LIKE '[LOADTEST]%';
 */

const APP_URL = __ENV.APP_URL
const SESSION = __ENV.SESSION

export const options = {
  scenarios: {
    ramp: {
      executor: 'ramping-vus',
      startVUs: 50,
      stages: [
        { duration: '15s', target: 200 },   // warm up
        { duration: '20s', target: 500 },    // 500 concurrent
        { duration: '20s', target: 1000 },   // 1000 concurrent — the ceiling probe
        { duration: '10s', target: 0 },      // ramp down
      ],
    },
  },
  thresholds: {
    http_req_failed:   ['rate<0.02'],    // fail if >2% of requests error
    http_req_duration: ['p(95)<2000'],   // fail if p95 latency > 2s
  },
}

export default function () {
  const res = http.post(
    `${APP_URL}/api/ideas`,
    JSON.stringify({
      problemTitle:       `[LOADTEST] k6 ${__VU}-${__ITER}`,
      problemDescription: 'k6 concurrency ceiling test. Safe to delete.',
      urgency:            'Medium',
      affectedTeams:      [],
    }),
    { headers: { 'Content-Type': 'application/json', Origin: APP_URL, Cookie: `innovo_session=${SESSION}` } },
  )
  check(res, { 'created (201)': (r) => r.status === 201 })
  sleep(1)   // each VU submits ~once/sec — raise/lower to change intensity
}
