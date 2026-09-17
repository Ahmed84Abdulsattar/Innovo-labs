// ─────────────────────────────────────────────────────────────────────────────
// One-off migration: move legacy base64 profile photos out of the `users` table
// and into Supabase Storage (the `images` bucket), replacing the row value with a
// normal public-style Storage URL — the exact format the upload endpoint uses, so
// the app's signImage() reads them identically.
//
// WHY: base64 photos are multi-MB blobs stored inline; they bloat every
// /api/auth/me and /api/users response. After this, those responses carry a small
// URL instead.
//
// SAFETY:
//   • DRY-RUN by default — prints what it *would* do and changes nothing.
//     Add `--apply` to actually migrate.
//   • Uploads to Storage FIRST, verifies success, THEN updates the DB row — so a
//     failed upload never loses a photo.
//   • Idempotent: only touches rows whose photo is a `data:image/...;base64,` URL;
//     already-migrated rows are skipped. Safe to re-run.
//   • Deletes nothing.
//
// ⚠️ Take a Supabase backup first (Dashboard → Database → Backups). This edits the
//    users table.
//
// PREREQUISITES (env vars — put them in apps/web/.env.local, or export them):
//   DATABASE_URL                 (your Supabase Postgres connection string)
//   NEXT_PUBLIC_SUPABASE_URL     (https://<ref>.supabase.co)
//   SUPABASE_SERVICE_ROLE_KEY    (service role key — Storage + DB write access)
//
// RUN (from the apps/web directory — that's where pg/@supabase are installed):
//   cd apps/web
//   node --env-file=.env.local scripts/migrate-base64-photos.mjs           # dry run
//   node --env-file=.env.local scripts/migrate-base64-photos.mjs --apply   # migrate
//   (if your Node is <20.6 and lacks --env-file, export the 3 vars manually instead)
// ─────────────────────────────────────────────────────────────────────────────

import { Client } from 'pg'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

const APPLY = process.argv.includes('--apply')
const BUCKET = 'images'

const DATABASE_URL = process.env.DATABASE_URL
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

for (const [name, val] of Object.entries({ DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY })) {
  if (!val) { console.error(`✗ Missing env var: ${name}`); process.exit(1) }
}

const EXT_BY_MIME = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg',
  'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg',
}

function parseDataUrl(value) {
  // data:image/png;base64,AAAA....
  const m = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/is.exec(value)
  if (!m) return null
  const mime = m[1].toLowerCase()
  return { mime, ext: EXT_BY_MIME[mime] ?? 'png', buffer: Buffer.from(m[2], 'base64') }
}

async function main() {
  console.log(`\n${APPLY ? '🚀 APPLY mode — will migrate' : '🔎 DRY RUN — no changes (add --apply to migrate)'}\n`)

  const db = new Client({ connectionString: DATABASE_URL })
  await db.connect()
  const sb = createClient(SUPABASE_URL, SERVICE_KEY)

  const { rows } = await db.query(
    `SELECT id, name, email, profile_photo
       FROM users
      WHERE profile_photo LIKE 'data:image/%'
      ORDER BY created_at`,
  )
  console.log(`Found ${rows.length} user(s) with a legacy base64 photo.\n`)

  let migrated = 0, skipped = 0, failed = 0
  for (const u of rows) {
    const parsed = parseDataUrl(u.profile_photo)
    const kb = parsed ? Math.round(parsed.buffer.length / 1024) : 0
    if (!parsed) { console.log(`  – skip  ${u.email} (unrecognised data URL)`); skipped++; continue }

    const path = `${u.id}/${Date.now()}-${randomUUID()}.${parsed.ext}`
    console.log(`  • ${u.email.padEnd(34)} ${String(kb).padStart(5)} KB → images/${path}`)

    if (!APPLY) { migrated++; continue }

    // 1) Upload to Storage first.
    const up = await sb.storage.from(BUCKET).upload(path, parsed.buffer, { contentType: parsed.mime, upsert: false })
    if (up.error) { console.error(`    ✗ upload failed: ${up.error.message}`); failed++; continue }

    // 2) Only after a confirmed upload, point the row at the new public URL.
    const publicUrl = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
    await db.query(`UPDATE users SET profile_photo = $1 WHERE id = $2`, [publicUrl, u.id])
    migrated++
  }

  await db.end()
  console.log(`\n${APPLY ? '✅ Done' : 'Dry run complete'} — ${migrated} ${APPLY ? 'migrated' : 'to migrate'}, ${skipped} skipped, ${failed} failed.\n`)
  if (!APPLY && migrated > 0) console.log('Re-run with --apply to perform the migration.\n')
}

main().catch(err => { console.error('✗ Migration error:', err); process.exit(1) })
