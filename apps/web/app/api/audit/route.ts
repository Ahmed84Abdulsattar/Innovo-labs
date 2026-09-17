import { NextResponse } from 'next/server'
import { queryOne, queryAsUser } from '@/lib/server/db/client'
import { defineRoute } from '@/lib/server/api/handler'
import { z } from 'zod'

const WriteAuditSchema = z.object({
  startupId: z.string().uuid().optional().nullable(),
  companyName:  z.string().max(300).optional().nullable(),
  action:       z.string().min(1).max(100),
  oldValue:     z.string().max(1000).optional().nullable(),
  newValue:     z.string().max(1000).optional().nullable(),
})

export const GET = defineRoute({
  roles: ['super_admin', 'innovation_admin'],
  forbiddenMessage: 'Forbidden',
  errorMessage: 'Failed to fetch audit log',
}, async ({ req, user: me }) => {
  // Server-side pagination so the whole (unbounded) history is reachable a page
  // at a time instead of capping at the most recent N. COUNT(*) OVER() returns
  // the full match count in the same round-trip for the page switcher.
  const sp    = new URL(req.url).searchParams
  const page  = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') || '50', 10) || 50))
  const q     = sp.get('q')?.trim()

  const params: any[] = []
  let where = ''
  if (q) {
    params.push(`%${q}%`)
    where = `WHERE (user_name ILIKE $${params.length} OR company_name ILIKE $${params.length})`
  }
  params.push(limit);            const limitIdx  = params.length
  params.push((page - 1) * limit); const offsetIdx = params.length

  const rows = await queryAsUser(me,
    `SELECT *, COUNT(*) OVER() AS total
       FROM audit_entries ${where}
       ORDER BY created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params
  )
  const total = rows.length ? Number(rows[0].total) : 0
  return NextResponse.json({ entries: rows, total, page, limit })
})

// Only super_admin may write audit entries via the API.
// Regular admins cannot fabricate log entries attributed to other users.
export const POST = defineRoute({
  roles: ['super_admin'],
  forbiddenMessage: 'Forbidden',
  schema: WriteAuditSchema,
  errorMessage: 'Failed to write audit entry',
}, async ({ user: me, body: b }) => {
  const row = await queryOne(
    `INSERT INTO audit_entries (user_id, user_name, startup_id, company_name, action, old_value, new_value)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [me.id, me.name || me.username, b.startupId ?? null, b.companyName ?? null,
     b.action, b.oldValue ?? null, b.newValue ?? null]
  )
  return NextResponse.json({ entry: row })
})
