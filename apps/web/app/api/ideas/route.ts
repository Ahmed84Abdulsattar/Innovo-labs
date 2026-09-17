import { NextResponse } from 'next/server'
import { queryOne, queryAsUser, queryOneAsUser } from '@/lib/server/db/client'
import { CreateIdeaSchema } from '@/lib/shared/validate'
import { defineRoute } from '@/lib/server/api/handler'
import { serverCache } from '@/lib/server/server-cache'

export const GET = defineRoute({ errorMessage: 'Failed to fetch ideas' }, async ({ req, user: me }) => {
  const sp     = new URL(req.url).searchParams
  const page   = Math.max(1, parseInt(sp.get('page') ?? '1', 10))
  const limit  = Math.min(100, Math.max(1, parseInt(sp.get('limit') ?? '50', 10)))
  const offset = (page - 1) * limit
  const q        = sp.get('q')?.trim()
  const status   = sp.get('status')?.trim()
  const bu       = sp.get('bu')?.trim()
  const dept     = sp.get('dept')?.trim()
  const dateFrom = sp.get('dateFrom')?.trim()
  const dateTo   = sp.get('dateTo')?.trim()

  const isAdmin = ['super_admin', 'innovation_admin'].includes(me.role)

  // Build WHERE from base scope (non-admins see only their own) + optional
  // search + status + business unit + department + date range. All filters
  // combine (AND), all parameterized.
  const conds: string[] = []
  const params: any[]   = []
  if (!isAdmin) { params.push(me.id);    conds.push(`submitted_by = $${params.length}`) }
  if (q)        { params.push(`%${q}%`); conds.push(`(problem_title ILIKE $${params.length} OR submitted_by_name ILIKE $${params.length} OR idea_ref ILIKE $${params.length})`) }
  if (status)   { params.push(status);   conds.push(`status = $${params.length}`) }
  if (bu)       { params.push(bu);       conds.push(`$${params.length} = ANY(benefit_business_units)`) }
  if (dept)     { params.push(dept);     conds.push(`$${params.length} = ANY(benefit_departments)`) }
  if (dateFrom) { params.push(dateFrom);              conds.push(`created_at >= $${params.length}`) }
  if (dateTo)   { params.push(`${dateTo} 23:59:59`);  conds.push(`created_at <= $${params.length}`) }
  const whereClause = conds.length ? `WHERE ${conds.join(' AND ')}` : ''

  const cacheKey = `ideas:${isAdmin ? 'all' : me.id}:${page}:${limit}:${q ?? ''}:${status ?? ''}:${bu ?? ''}:${dept ?? ''}:${dateFrom ?? ''}:${dateTo ?? ''}`
  const cached = await serverCache.get<object>(cacheKey)
  if (cached) return NextResponse.json(cached)

  const countRow = await queryOneAsUser<{ total: string }>(me,
    `SELECT COUNT(*) AS total FROM ideas ${whereClause}`,
    params
  )
  const total = parseInt(countRow?.total ?? '0', 10)

  const ideas = await queryAsUser(me,
    `SELECT * FROM ideas ${whereClause} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  )
  const payload = { ideas, pagination: { page, limit, total, pages: Math.ceil(total / limit) } }
  await serverCache.set(cacheKey, payload, 30)
  return NextResponse.json(payload)
})

export const POST = defineRoute({
  schema: CreateIdeaSchema,
  rateLimit: { limit: 12, window: 60_000 }, // max 12 idea submissions / minute / user
  errorMessage: 'Failed to create idea',
}, async ({ user: me, body: b }) => {
  // queryOneAsUser applies the ideas INSERT policy (submitted_by must be self)
  // at the DB layer when RLS_ENFORCED=true.
  const row = await queryOneAsUser(me,
    `INSERT INTO ideas (submitted_by, submitted_by_name, submitted_by_dept, problem_title,
      problem_description, current_process, impact_if_solved, estimated_time_saved,
      affected_teams, urgency, suggested_solution, has_tried_before, tried_before_details,
      expected_benefits, any_budget_in_mind,
      benefit_drivers, benefit_cost_saving, benefit_time_saving, benefit_quality,
      benefit_safety, benefit_esg, benefit_business_units, benefit_departments)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
             $16,$17,$18,$19,$20,$21,$22,$23) RETURNING *`,
    [me.id, me.name || me.username, me.department, b.problemTitle, b.problemDescription,
     b.currentProcess, b.impactIfSolved, b.estimatedTimeSaved, b.affectedTeams || [],
     b.urgency || 'Medium', b.suggestedSolution, b.hasTriedBefore || false, b.triedBeforeDetails,
     b.expectedBenefits ?? null, b.anyBudgetInMind,
     b.benefitDrivers || [], b.benefitCostSaving ?? null, b.benefitTimeSaving ?? null,
     b.benefitQuality ?? null, b.benefitSafety ?? null, b.benefitEsg ?? null,
     b.benefitBusinessUnits || [], b.benefitDepartments || []]
  )
  // Seed the status timeline with the initial submission. Non-fatal.
  if ((row as any)?.id) {
    await queryOne(
      `INSERT INTO idea_status_history (idea_id, from_status, to_status, changed_by, changed_by_name, changed_by_email)
       VALUES ($1, NULL, $2, $3, $4, $5)`,
      [(row as any).id, (row as any).status || 'Submitted', me.id, me.name || me.username, me.email]
    ).catch(() => {})
  }
  await serverCache.delPrefix('ideas:')
  return NextResponse.json({ idea: row }, { status: 201 })
})
