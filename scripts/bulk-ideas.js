#!/usr/bin/env node
/**
 * Volume test: bulk-insert marked test ideas straight into the DB (bypasses the
 * app, so no audit/notification spam). Every row is tagged so cleanup is one call.
 *
 * Reads DATABASE_URL from apps/web/.env.local. Needs only `pg` + `dotenv`.
 *
 * Usage (from the repo root):
 *   node scripts/bulk-ideas.js            # insert 1000 test ideas
 *   node scripts/bulk-ideas.js 5000       # insert 5000
 *   node scripts/bulk-ideas.js --cleanup  # delete ALL test ideas this script made
 */

const { Pool } = require('pg')
const path     = require('path')
require('dotenv').config({ path: path.join(__dirname, '../apps/web/.env.local') })

const MARKER = '[LOADTEST]'   // stored in submitted_by_name — the cleanup key
const BATCH  = 200            // rows per INSERT

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set (apps/web/.env.local).')
  process.exit(1)
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

async function cleanup() {
  const res = await pool.query(`DELETE FROM ideas WHERE submitted_by_name = $1`, [MARKER])
  console.log(`Deleted ${res.rowCount} test idea(s).`)
}

async function insert(count) {
  const urgencies = ['Low', 'Medium', 'High', 'Critical']
  let inserted = 0
  const t0 = Date.now()

  for (let start = 0; start < count; start += BATCH) {
    const rows = Math.min(BATCH, count - start)
    const values = []
    const params = []
    for (let i = 0; i < rows; i++) {
      const n = start + i + 1
      const b = params.length
      values.push(`($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},'Submitted')`)
      params.push(
        MARKER, 'Digital Innovation',
        `Load Test Idea #${n}`,
        `Auto-generated load-test idea number ${n}. Safe to delete.`,
        urgencies[n % urgencies.length],
      )
    }
    await pool.query(
      `INSERT INTO ideas (submitted_by_name, submitted_by_dept, problem_title, problem_description, urgency, status)
       VALUES ${values.join(',')}`,
      params
    )
    inserted += rows
    process.stdout.write(`\r  inserted ${inserted}/${count}`)
  }

  const secs = (Date.now() - t0) / 1000
  console.log(`\nDone: ${inserted} ideas in ${secs.toFixed(2)}s (${Math.round(inserted / secs)} rows/s).`)
}

async function main() {
  try {
    if (process.argv.includes('--cleanup')) { await cleanup(); return }
    const count = parseInt(process.argv[2], 10) || 1000
    console.log(`Inserting ${count} test ideas (marker "${MARKER}")…`)
    await insert(count)
    console.log(`Clean up later with:  node scripts/bulk-ideas.js --cleanup`)
  } finally {
    await pool.end()
  }
}
main().catch(err => { console.error(err); process.exit(1) })
