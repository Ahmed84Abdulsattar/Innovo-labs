#!/usr/bin/env node
/**
 * Seed script — promotes a user to super_admin
 * Run: node scripts/seed.js your.email@innovogroup.com
 */

const { Pool } = require('pg')
const path     = require('path')

require('dotenv').config({ path: path.join(__dirname, '../apps/web/.env.local') })

async function seed() {
  const email = process.argv[2]
  if (!email) {
    console.error('Usage: node scripts/seed.js your.email@innovogroup.com')
    process.exit(1)
  }

  const url   = process.env.DATABASE_URL.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  const match = url.match(/^postgresql?:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/)
  const pool  = new Pool({
    user: match[1], password: match[2], host: match[3],
    port: parseInt(match[4]), database: match[5],
    ssl: { rejectUnauthorized: false },
  })

  try {
    const result = await pool.query(
      "UPDATE users SET role = 'super_admin' WHERE email = $1 RETURNING email, role",
      [email.toLowerCase()]
    )
    if (result.rowCount === 0) {
      console.error(`❌ No user found with email: ${email}`)
      console.log('Register the account first, then run this script.')
    } else {
      console.log(`✅ ${email} is now Super Admin`)
    }
  } finally {
    await pool.end()
  }
}

seed()
