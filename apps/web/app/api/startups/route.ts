import { NextResponse } from 'next/server'
import { query, queryOne, queryOneAsUser } from '@/lib/server/db/client'
import { CreateStartupSchema } from '@/lib/shared/validate'
import { defineRoute, HttpError } from '@/lib/server/api/handler'
import { logAudit } from '@/lib/server/audit'
import { toStartup, signStartupFiles } from '@/lib/server/serializers'
import { serverCache } from '@/lib/server/server-cache'

export const GET = defineRoute({ errorMessage: 'Failed to fetch startups' }, async ({ req }) => {
    const cacheKey = `startups:${new URL(req.url).search || 'all'}`
    const cached = await serverCache.get<object>(cacheKey)
    if (cached) return NextResponse.json(cached, { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } })

    const sp     = new URL(req.url).searchParams
    const bu     = sp.get('bu')
    const dept   = sp.get('dept')
    const search = sp.get('q')?.trim()
    const page   = Math.max(1, parseInt(sp.get('page') ?? '1', 10))
    const limit  = Math.min(100, Math.max(1, parseInt(sp.get('limit') ?? '50', 10)))
    const offset = (page - 1) * limit

    const params: any[] = []
    const where: string[] = []

    // Use array containment (`@>`) rather than `= ANY(...)` so PostgreSQL can
    // use the GIN indexes on business_units / departments (migration 026).
    // `col @> ARRAY[$1]` is equivalent to `$1 = ANY(col)` for a scalar value.
    if (bu)   { where.push(`i.business_units @> ARRAY[$${params.length + 1}]::text[]`); params.push(bu) }
    if (dept) { where.push(`i.departments @> ARRAY[$${params.length + 1}]::text[]`);    params.push(dept) }
    if (search) {
      where.push(`i.search_vector @@ plainto_tsquery('english', $${params.length + 1})`)
      params.push(search)
    }

    const whereClause = where.length ? ' WHERE ' + where.join(' AND ') : ''

    const countRow = await queryOne<{ total: string }>(
      `SELECT COUNT(*) AS total FROM startups i${whereClause}`,
      params
    )
    const total = parseInt(countRow?.total ?? '0', 10)

    const dataParams = [...params, limit, offset]
    const sql = `
      SELECT i.*,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', te.id, 'status', te.status, 'date', te.created_at,
              'rating', te.rating, 'feedback', te.feedback,
              'createdBy', te.created_by, 'createdByName', te.created_by_name
            ) ORDER BY te.created_at
          ) FILTER (WHERE te.id IS NOT NULL), '[]'
        ) AS timeline
      FROM startups i
      LEFT JOIN timeline_events te ON te.startup_id = i.id
      ${whereClause}
      GROUP BY i.id
      ORDER BY i.created_at DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `

    const rows   = await query(sql, dataParams)
    const payload = { startups: rows.map(toStartup), pagination: { page, limit, total, pages: Math.ceil(total / limit) } }
    await signStartupFiles(payload.startups)
    await serverCache.set(cacheKey, payload, 60)
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } })
})

export const POST = defineRoute({
    roles: ['super_admin', 'innovation_admin'],
    forbiddenMessage: 'Only Innovation Admins can create startups',
    schema: CreateStartupSchema,
    rateLimit: { limit: 20, window: 60_000 },
    errorMessage: 'Failed to create startup',
  }, async ({ user: me, body }) => {
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM startups WHERE LOWER(company) = LOWER($1)`,
      [body.company]
    )
    if (existing) {
      throw new HttpError(409, `A startup named "${body.company}" already exists.`)
    }

    const row = await queryOneAsUser(me,
      `INSERT INTO startups (
        department_id, created_by, company, product, description, source, sector,
        technologies, business_units, departments,
        solution_details, hq_country, commercial_model,
        problem_statement, product_maturity, priority,
        collaboration_status, rating, strategic_fit,
        whats_great, whats_lacking, next_steps,
        star_engagement, website, documents_link, keywords,
        key_contacts, costs
       ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
        $14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28
       ) RETURNING *`,
      [
        body.departmentId || me.department, me.id,
        body.company, body.product, body.description, body.source, body.sector,
        body.technologies || [], body.businessUnits || [], body.departments || [],
        body.solutionDetails, body.hqCountry, body.commercialModel,
        body.problemStatement, body.productMaturity,
        body.priority || 'Medium', body.collaborationStatus || 'Identified', body.rating,
        body.strategicFit,
        body.whatsGreat, body.whatsLacking, body.nextSteps,
        body.starEngagement || false, body.website, body.documentsLink, body.keywords,
        JSON.stringify(body.keyContacts || []),
        JSON.stringify(body.costs || { capex: [], opex: [] }),
      ]
    )
    if (!row) return NextResponse.json({ error: 'Failed to create startup.' }, { status: 500 })
    await logAudit({ userId: me.id, userName: me.name || me.username, action: 'startup_created', entityName: body.company })
    await serverCache.delPrefix('startups:')
    await serverCache.del('notifications')
    return NextResponse.json({ startup: toStartup({ ...row, timeline: [] }) }, { status: 201 })
})
