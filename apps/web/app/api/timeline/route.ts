import { NextResponse } from 'next/server'
import { transactionAsUser, queryOne } from '@/lib/server/db/client'
import { CreateTimelineEventSchema } from '@/lib/shared/validate'
import { defineRoute, HttpError } from '@/lib/server/api/handler'
import { inStartupScope } from '@/lib/shared/permissions'
import { logAudit } from '@/lib/server/audit'
import { z } from 'zod'

const DeleteSchema = z.object({
  eventId:      z.string().uuid(),
  startupId: z.string().uuid(),
})

// Contributor+ can add engagement / activity notes on startups
export const POST = defineRoute({
  roles: ['super_admin', 'innovation_admin', 'contributor'],
  forbiddenMessage: 'Viewers cannot add timeline events.',
  schema: CreateTimelineEventSchema,
  rateLimit: { limit: 30, window: 60_000 },
  errorMessage: 'Failed to add timeline event',
}, async ({ user: me, body }) => {
  const { startupId, status, rating, feedback } = body

  // innovation_admin and contributor are scoped to their own department/BU
  // (matching canUpdateEvaluation in lib/permissions.ts); only super_admin
  // may add events to any startup.
  if (me.role !== 'super_admin') {
    const init = await queryOne<{ department_id: string; business_units: string[] }>(
      'SELECT department_id, business_units FROM startups WHERE id=$1',
      [startupId]
    )
    if (!init) throw new HttpError(404, 'Startup not found.')
    if (!inStartupScope(me, init))
      throw new HttpError(403, 'You can only update startups in your department.')
  }

  // Run all three DB writes atomically
  const row = await transactionAsUser(me, async (tx) => {
    const event = await tx.queryOne(
      `INSERT INTO timeline_events (startup_id, status, rating, feedback, created_by, created_by_name)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [startupId, status, rating || null, feedback || null, me.id, me.name || me.username]
    )
    await tx.query(
      `UPDATE startups SET collaboration_status=$1, updated_at=NOW() WHERE id=$2`,
      [status, startupId]
    )
    if (rating) {
      await tx.query(`UPDATE startups SET rating=$1 WHERE id=$2`, [rating, startupId])
    }
    return event
  })

  await logAudit({
    userId: me.id, userName: me.name || me.username,
    action: 'timeline_event_added', newValue: status,
  })

  return NextResponse.json({ event: row })
})

export const DELETE = defineRoute({
  roles: ['super_admin'],
  forbiddenMessage: 'Only Super Admin can delete timeline events',
  schema: DeleteSchema,
  errorMessage: 'Failed to delete timeline event',
}, async ({ user: me, body }) => {
  const { eventId, startupId } = body

  await transactionAsUser(me, async (tx) => {
    const removed = await tx.queryOne<{ id: string }>(
      'DELETE FROM timeline_events WHERE id=$1 RETURNING id', [eventId]
    )
    if (!removed) throw new HttpError(404, 'Timeline event not found')
    const last = await tx.queryOne<{ status: string; rating?: string }>(
      `SELECT status, rating FROM timeline_events WHERE startup_id=$1 ORDER BY created_at DESC LIMIT 1`,
      [startupId]
    )
    const newStatus = last?.status || 'To be assessed'
    await tx.query(
      `UPDATE startups SET collaboration_status=$1, updated_at=NOW() WHERE id=$2`,
      [newStatus, startupId]
    )
    if (last?.rating) {
      await tx.query(`UPDATE startups SET rating=$1 WHERE id=$2`, [last.rating, startupId])
    }
  })

  return NextResponse.json({ success: true })
})
