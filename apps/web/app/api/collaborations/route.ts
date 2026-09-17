import { NextResponse } from 'next/server'
import { query, queryOneAsUser } from '@/lib/server/db/client'
import { CreateCollaborationSchema } from '@/lib/shared/validate'
import { defineRoute } from '@/lib/server/api/handler'
import { signImages } from '@/lib/server/storage'
import { logAudit } from '@/lib/server/audit'
import { serverCache } from '@/lib/server/server-cache'

function toCollab(row: any) {
  const images = row.images ?? (row.first_image ? [row.first_image] : [])
  return {
    id:               row.id,
    partner:          row.partner,
    type:             row.type,
    focusArea:        row.focus_area,
    description:      row.description,
    status:           row.status,
    detailedOverview: row.detailed_overview,
    currentStatus:    row.current_status,
    nextSteps:        row.next_steps,
    images,
    imageCount:       row.image_count ?? images.length,
    createdAt:        row.created_at,
    createdBy:        row.created_by,
  }
}

export const GET = defineRoute({ errorMessage: 'Failed to fetch collaborations' }, async () => {
  // The list page only shows a thumbnail + count. Images are base64 data
  // URLs stored inline, so SELECT * would ship every image of every
  // collaboration in one response — send just the first image and a count.
  //
  // Cache the mapped list holding CANONICAL (unsigned) image refs, then sign on
  // every request: signed URLs are short-lived, so they must not be stored in the
  // cache. We never mutate the cached objects (the in-memory cache returns the
  // same reference) — signing builds fresh copies.
  let collaborations = await serverCache.get<any[]>('collaborations:list')
  if (!collaborations) {
    const rows = await query(
      `SELECT id, partner, type, focus_area, description, status, detailed_overview,
              current_status, next_steps, created_by, created_at,
              images->0 AS first_image,
              COALESCE(jsonb_array_length(images), 0) AS image_count
       FROM collaborations ORDER BY created_at DESC`
    )
    collaborations = rows.map(toCollab)
    await serverCache.set('collaborations:list', collaborations, 60)
  }
  const flat = collaborations.flatMap((c: any) => c.images.map((im: any) => im?.dataUrl))
  const signed = await signImages(flat)
  let k = 0
  const out = collaborations.map((c: any) => ({
    ...c,
    images: c.images.map((im: any) => ({ ...im, dataUrl: signed[k++] })),
  }))
  return NextResponse.json(
    { collaborations: out },
    { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } }
  )
})

export const POST = defineRoute({
  roles: ['super_admin', 'innovation_admin'],
  forbiddenMessage: 'Only admins can create collaborations',
  schema: CreateCollaborationSchema,
  rateLimit: { limit: 20, window: 60_000 },
  errorMessage: 'Failed to create collaboration',
}, async ({ user: me, body: b }) => {
  const row = await queryOneAsUser(me,
    `INSERT INTO collaborations
      (partner, type, focus_area, description, status, detailed_overview, current_status, next_steps, images, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [
      b.partner, b.type || 'University', b.focusArea || null, b.description,
      b.status || 'Not Started', b.detailedOverview || null, b.currentStatus || null,
      b.nextSteps || null, JSON.stringify(b.images || []), me.id,
    ]
  )
  await logAudit({ userId: me.id, userName: me.name || me.username, action: 'created', entityName: `Collaboration: ${b.partner}` })
  await serverCache.delPrefix('collaborations:')
  const collab = toCollab(row)
  const signed = await signImages(collab.images.map((im: any) => im?.dataUrl))
  collab.images = collab.images.map((im: any, i: number) => ({ ...im, dataUrl: signed[i] }))
  return NextResponse.json({ collaboration: collab }, { status: 201 })
})
