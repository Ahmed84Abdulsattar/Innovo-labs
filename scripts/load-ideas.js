#!/usr/bin/env node
/**
 * Concurrency / throughput load test for POST /api/ideas.
 * Simulates many users submitting ideas at once; reports latency + error rate.
 *
 * Auth: copy your `innovo_session` cookie from the browser (DevTools ->
 * Application -> Cookies -> your app) and pass it as SESSION. All requests reuse
 * that one session — the server does the same work regardless of which user.
 *
 * Usage (from the repo root; Node 18+ for global fetch):
 *   APP_URL=https://innovo-labs-portal.vercel.app SESSION=<cookie-value> \
 *     node scripts/load-ideas.js <total> <concurrency>
 *   e.g.  ... node scripts/load-ideas.js 500 50
 *
 * Start SMALL and ramp up (50, then 200, then 500…) to find the ceiling —
 * don't open with thousands. Cleanup afterwards (Supabase SQL editor):
 *   DELETE FROM ideas WHERE problem_title LIKE '[LOADTEST]%';
 */

const APP_URL = process.env.APP_URL
const SESSION = process.env.SESSION
const TOTAL   = parseInt(process.argv[2] || '200', 10)
const CONC    = parseInt(process.argv[3] || '20', 10)

if (!APP_URL || !SESSION) {
  console.error('Set APP_URL and SESSION env vars. See the header of this file.')
  process.exit(1)
}

const origin = new URL(APP_URL).origin
const url    = `${origin}/api/ideas`
const latencies = []
const statusCounts = {}
let sent = 0, done = 0

const body = (i) => JSON.stringify({
  problemTitle:       `[LOADTEST] idea ${i}`,
  problemDescription: `Concurrency load-test submission ${i}. Safe to delete.`,
  urgency:            'Medium',
  affectedTeams:      [],
})

async function one(i) {
  const t = Date.now()
  let status = 'ERR'
  try {
    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin, Cookie: `innovo_session=${SESSION}` },
      body:    body(i),
    })
    status = res.status
    await res.text()
  } catch { /* network error -> ERR */ }
  latencies.push(Date.now() - t)
  statusCounts[status] = (statusCounts[status] || 0) + 1
  done++
}

async function worker() { while (sent < TOTAL) await one(sent++) }

const pct = (arr, p) => {
  const s = [...arr].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.floor((s.length * p) / 100))]
}

async function main() {
  console.log(`Load test -> ${url}\n  ${TOTAL} requests, ${CONC} concurrent\n`)
  const t0 = Date.now()
  const timer = setInterval(() => process.stdout.write(`\r  ${done}/${TOTAL} done`), 300)
  await Promise.all(Array.from({ length: CONC }, worker))
  clearInterval(timer)

  const secs = (Date.now() - t0) / 1000
  const ok = statusCounts[201] || 0
  console.log(`\n\n=== Results ===`)
  console.log(`Throughput: ${TOTAL} in ${secs.toFixed(1)}s  (${(TOTAL / secs).toFixed(0)} req/s)`)
  console.log(`Success:    ${ok}/${TOTAL} (${((ok / TOTAL) * 100).toFixed(1)}%)  [201 = created]`)
  console.log(`Statuses:  `, statusCounts)
  console.log(`Latency ms: p50=${pct(latencies, 50)}  p95=${pct(latencies, 95)}  p99=${pct(latencies, 99)}  max=${Math.max(...latencies)}`)
  console.log(`\nCleanup:  DELETE FROM ideas WHERE problem_title LIKE '[LOADTEST]%';`)
}
main()
