#!/usr/bin/env node
/**
 * One-off backfill: move existing inline base64 images out of Postgres rows and
 * into the Supabase Storage `images` bucket, replacing each column with the
 * resulting public URL.
 *
 * Covers:
 *   - users.profile_photo              (data:… → URL)
 *   - collaborations.images[].dataUrl  (data:… → URL, in-place in the JSONB array)
 *   - news_articles.thumbnail_data_url (data:… → thumbnail_url, then cleared)
 *
 * Idempotent: rows whose values are already URLs are skipped, and uploads use
 * upsert so a re-run overwrites the same storage key rather than duplicating.
 *
 * Usage:
 *   node scripts/backfill-images-to-storage.js            # apply
 *   node scripts/backfill-images-to-storage.js --dry-run  # report only
 *
 * Requires DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * in apps/web/.env.local (same as the migration runner).
 */

const { Pool }         = require('pg')
const { createClient } = require('@supabase/supabase-js')
const path             = require('path')

require('dotenv').config({ path: path.join(__dirname, '../apps/web/.env.local') })

const DRY = process.argv.includes('--dry-run')

const { DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
if (!DATABASE_URL || !NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing DATABASE_URL / NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const pool     = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })
const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const BUCKET   = 'images'

const isDataUrl = (v) => typeof v === 'string' && v.startsWith('data:')

async function uploadDataUrl(dataUrl, key) {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl)
  if (!m) throw new Error('value is not a base64 data URL')
  const mime = m[1]
  const buf  = Buffer.from(m[2], 'base64')
  const ext  = (mime.split('/')[1] || 'jpg').replace(/[^a-z0-9]/gi, '').slice(0, 10) || 'jpg'
  const objectKey = `${key}.${ext}`
  if (DRY) return `[dry-run]/${objectKey} (${(buf.length / 1024).toFixed(0)} KB)`
  const { error } = await supabase.storage.from(BUCKET).upload(objectKey, buf, { contentType: mime, upsert: true })
  if (error) throw error
  return supabase.storage.from(BUCKET).getPublicUrl(objectKey).data.publicUrl
}

async function backfillProfilePhotos(client) {
  const { rows } = await client.query(`SELECT id, profile_photo FROM users WHERE profile_photo LIKE 'data:%'`)
  console.log(`\nusers.profile_photo: ${rows.length} to migrate`)
  for (const u of rows) {
    const url = await uploadDataUrl(u.profile_photo, `backfill/avatar-${u.id}`)
    if (!DRY) await client.query(`UPDATE users SET profile_photo = $1 WHERE id = $2`, [url, u.id])
    console.log(`  user ${u.id} -> ${url}`)
  }
}

async function backfillCollaborations(client) {
  const { rows } = await client.query(`SELECT id, images FROM collaborations WHERE images::text LIKE '%data:image%'`)
  console.log(`\ncollaborations.images: ${rows.length} rows with inline images`)
  for (const c of rows) {
    const imgs = Array.isArray(c.images) ? c.images : []
    let changed = false
    const out = []
    for (const img of imgs) {
      if (img && isDataUrl(img.dataUrl)) {
        const url = await uploadDataUrl(img.dataUrl, `backfill/collab-${c.id}-${img.id || out.length}`)
        out.push({ ...img, dataUrl: url })
        changed = true
        console.log(`  collab ${c.id} image ${img.id} -> ${url}`)
      } else {
        out.push(img)
      }
    }
    if (changed && !DRY) {
      await client.query(`UPDATE collaborations SET images = $1 WHERE id = $2`, [JSON.stringify(out), c.id])
    }
  }
}

async function backfillNewsThumbnails(client) {
  const { rows } = await client.query(`SELECT id, thumbnail_data_url FROM news_articles WHERE thumbnail_data_url LIKE 'data:%'`)
  console.log(`\nnews_articles.thumbnail_data_url: ${rows.length} to migrate`)
  for (const n of rows) {
    const url = await uploadDataUrl(n.thumbnail_data_url, `backfill/news-${n.id}`)
    if (!DRY) {
      await client.query(
        `UPDATE news_articles SET thumbnail_url = COALESCE(thumbnail_url, $1), thumbnail_data_url = NULL WHERE id = $2`,
        [url, n.id]
      )
    }
    console.log(`  news ${n.id} -> ${url}`)
  }
}

async function run() {
  const client = await pool.connect()
  try {
    console.log(DRY ? '=== DRY RUN (no writes) ===' : '=== Applying backfill ===')
    await backfillProfilePhotos(client)
    await backfillCollaborations(client)
    await backfillNewsThumbnails(client)
    console.log('\nDone.')
  } finally {
    client.release()
    await pool.end()
  }
}

run().catch((err) => { console.error(err); process.exit(1) })
