import { NextResponse } from 'next/server'
import { query, queryOneAsUser } from '@/lib/server/db/client'
import { defineRoute } from '@/lib/server/api/handler'
import { logAudit } from '@/lib/server/audit'
import { serverCache } from '@/lib/server/server-cache'

function toChallenge(row: any) {
  return {
    id:                      row.id,
    number:                  row.number,
    title:                   row.title,
    shortDescription:        row.short_description,
    overview:                row.overview,
    keyChallenges:           row.key_challenges || [],
    innovationOpportunities: row.innovation_opportunities || [],
    businessImpact:          row.business_impact || [],
    useCases:                row.use_cases?.length ? row.use_cases : undefined,
    strategicFocusAreas:     row.strategic_focus_areas?.length ? row.strategic_focus_areas : undefined,
    isCustom:                row.is_custom,
  }
}

export const GET = defineRoute({ errorMessage: 'Failed to fetch challenges' }, async () => {
  // Challenges are global content (same for every user), so the mapped list is
  // cached under one key and invalidated on any write (delPrefix('challenges:')).
  let challenges = await serverCache.get<any[]>('challenges:list')
  if (!challenges) {
    const rows = await query(`SELECT * FROM challenges ORDER BY number ASC`)
    challenges = rows.map(toChallenge)
    await serverCache.set('challenges:list', challenges, 60)
  }
  return NextResponse.json(
    { challenges },
    { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } }
  )
})

export const POST = defineRoute({
  roles: ['super_admin', 'innovation_admin'],
  forbiddenMessage: 'Only admins can create challenges',
  rateLimit: { limit: 20, window: 60_000 },
  errorMessage: 'Failed to create challenge',
}, async ({ req, user: me }) => {
  const body = await req.json()
  const { number, title, shortDescription, overview, keyChallenges, innovationOpportunities, businessImpact, useCases, strategicFocusAreas } = body

  if (!title?.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 })

  // Generate ID server-side so clients cannot overwrite existing records by
  // supplying a known ID, and so IDs are always valid UUIDs.
  const { randomUUID } = await import('crypto')
  const row = await queryOneAsUser(me,
    `INSERT INTO challenges (id, number, title, short_description, overview, key_challenges, innovation_opportunities, business_impact, use_cases, strategic_focus_areas, is_custom, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,TRUE,$11) RETURNING *`,
    [
      randomUUID(), number || 0, title, shortDescription || null, overview || null,
      keyChallenges || [], innovationOpportunities || [], businessImpact || [],
      useCases || [], strategicFocusAreas || [],
      me.id,
    ]
  )
  await logAudit({ userId: me.id, userName: me.name || me.username, action: 'created', entityName: `Challenge: ${title}` })
  await serverCache.delPrefix('challenges:')
  return NextResponse.json({ challenge: toChallenge(row) }, { status: 201 })
})
