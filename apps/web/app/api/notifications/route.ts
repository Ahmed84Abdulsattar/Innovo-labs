import { NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/server/db/client'
import { defineRoute } from '@/lib/server/api/handler'
import { serverCache } from '@/lib/server/server-cache'

// Notifications are derived from the audit log: only adds / updates / status
// changes, and intentionally WITHOUT the actor's name.
const ACTION_LABEL: Record<string, string> = {
  created:        'Added',
  updated:        'Updated',
  status_changed: 'Status changed',
}
const ACTION_TYPE: Record<string, string> = {
  created:        'info',
  updated:        'status',
  status_changed: 'status',
}

export const GET = defineRoute({ errorMessage: 'Failed to fetch notifications' }, async ({ user }) => {
  let payload = await serverCache.get<{ notifications: any[] }>('notifications')
  if (!payload) {
    const rows = await query(
      `SELECT id, action, company_name, created_at
         FROM audit_entries
        WHERE action IN ('created','updated','status_changed')
        ORDER BY created_at DESC
        LIMIT 30`
    )
    const notifications = rows.map((r: any) => {
      const label  = ACTION_LABEL[r.action] || 'Updated'
      const entity = r.company_name || ''
      return {
        id:        r.id,
        message:   entity ? `${label}: ${entity}` : label,
        type:      ACTION_TYPE[r.action] || 'info',
        createdAt: r.created_at,
      }
    })
    payload = { notifications }
    await serverCache.set('notifications', payload, 30)
  }

  // Per-user read marker (not cached) so "read" persists across sessions.
  const u = await queryOne<{ notifications_read_at: string | null }>(
    `SELECT notifications_read_at FROM users WHERE id = $1`, [user.id]
  )
  return NextResponse.json({ notifications: payload.notifications, lastReadAt: u?.notifications_read_at ?? null })
})

// Mark all notifications read for this user. Persisted on the user row, so
// opened notifications stay read after logout/login until a newer one arrives.
export const POST = defineRoute({ errorMessage: 'Failed to update notifications' }, async ({ user }) => {
  await query(`UPDATE users SET notifications_read_at = NOW() WHERE id = $1`, [user.id])
  return NextResponse.json({ ok: true, lastReadAt: new Date().toISOString() })
})
