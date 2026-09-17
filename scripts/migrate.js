#!/usr/bin/env node
/**
 * Versioned migration runner.
 * Usage: node scripts/migrate.js
 *
 * Reads all .sql files from /migrations/ in order, runs any that haven't been
 * applied yet, and records them in schema_migrations.
 */

const { Pool } = require('pg')
const fs       = require('fs')
const path     = require('path')

require('dotenv').config({ path: path.join(__dirname, '../apps/web/.env.local') })

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set in .env.local')
  process.exit(1)
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

async function run() {
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    const { rows } = await client.query('SELECT version FROM schema_migrations')
    const applied  = new Set(rows.map(r => r.version))

    const migrationsDir = path.join(__dirname, '../supabase/migrations')
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()

    let ran = 0
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`  skip  ${file}`)
        continue
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
      console.log(`  run   ${file}`)
      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file])
        await client.query('COMMIT')
        ran++
      } catch (err) {
        await client.query('ROLLBACK')
        console.error(`  FAILED ${file}:`, err.message)
        process.exit(1)
      }
    }

    console.log(`\nDone. ${ran} migration(s) applied.`)
  } finally {
    client.release()
    await pool.end()
  }
}

run().catch(err => { console.error(err); process.exit(1) })
