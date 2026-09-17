import { NextResponse } from 'next/server'
import { query, queryOne, transactionAsUser } from '@/lib/server/db/client'
import { defineRoute } from '@/lib/server/api/handler'
import { canViewInitiative } from '@/lib/shared/permissions'
import { logAudit } from '@/lib/server/audit'
import { serverCache } from '@/lib/server/server-cache'

function toItem(row: any) {
  return {
    id:                   row.id,
    initiativeId:         row.initiative_id,
    name:                 row.name,
    description:          row.description,
    problemStatement:     row.problem_statement,
    proposedSolution:     row.proposed_solution,
    valueDrivers:         row.value_drivers || [],
    potentialCostSaving:    row.potential_cost_saving    != null ? Number(row.potential_cost_saving)    : undefined,
    potentialTimeSaving:    row.potential_time_saving    != null ? Number(row.potential_time_saving)    : undefined,
    potentialQualitySaving: row.potential_quality_saving != null ? Number(row.potential_quality_saving) : undefined,
    potentialSafetyImpact:  row.potential_safety_impact  != null ? Number(row.potential_safety_impact)  : undefined,
    potentialEsgOffset:     row.potential_esg_offset     != null ? Number(row.potential_esg_offset)     : undefined,
    identifiedSolution:   row.identified_solution,
    linkedStartup:        row.linked_startup,
    businessUnits:        row.business_units || [],
    departments:          row.departments || [],
    priority:             row.priority,
    status:               row.status,
    progress:             row.progress,
    nextSteps:            row.next_steps,
    lessonsLearnt:        row.lessons_learnt,
    documents:              row.documents || [],
    evaluations:            row.evaluations || [],
    secondaryValueDrivers:  row.secondary_value_drivers || [],
    applicableStakeholders: row.applicable_stakeholders || [],
    projectLifecycleStages: row.project_lifecycle_stages || [],
    projectTypes:           row.project_types || [],
    projectLocation:        row.project_location || [],
    applicableProjectSize:  row.applicable_project_size || [],
    applicableProjectValue: row.applicable_project_value || [],
    technologyCategory:     row.technology_category || [],
    implementationComplexity: row.implementation_complexity,
    investmentLevel:        row.investment_level,
    changeManagementEffort: row.change_management_effort,
    deploymentType:         row.deployment_type || [],
    visibility:             row.visibility ?? null,
    projectComplexity:      row.project_complexity ?? null,
    contributors:           row.contributors || [],
    createdBy:              row.created_by,
    createdAt:              row.created_at,
    updatedAt:              row.updated_at,
  }
}

export const GET = defineRoute({ errorMessage: 'Failed to fetch initiatives' }, async ({ req, user: me }) => {
    const sp     = new URL(req.url).searchParams
    const search = sp.get('q')?.trim()
    const status = sp.get('status')
    const priority = sp.get('priority')

    const params: any[] = []
    const where: string[] = []

    if (status)   { where.push(`status = $${params.length + 1}`);  params.push(status) }
    if (priority) { where.push(`priority = $${params.length + 1}`); params.push(priority) }
    if (search) {
      where.push(`(name ILIKE $${params.length + 1} OR description ILIKE $${params.length + 1} OR initiative_id ILIKE $${params.length + 1})`)
      params.push(`%${search}%`)
    }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : ''
    const cacheKey = `initiatives:${new URL(req.url).search || 'all'}`

    // Cache the full mapped set (shared across users), then apply per-user
    // visibility filtering on EVERY request — so 'Internal' initiatives are never
    // served to users who shouldn't see them, even on a cache hit.
    let items = await serverCache.get<any[]>(cacheKey)
    if (!items) {
      const rows = await query(`SELECT * FROM initiatives ${whereClause} ORDER BY created_at DESC`, params)
      // List view (and the concierge/dashboard) never read `documents` or
      // `evaluations` — they're detail-page-only and can be large. Drop them from
      // the list payload to cut response size (the full detail route still returns
      // them). Framework fields stay: the concierge matches on them.
      items = rows.map(row => ({ ...toItem(row), documents: [], evaluations: [] }))
      await serverCache.set(cacheKey, items, 60)
    }
    const visible = items.filter(it => canViewInitiative(me, it))
    return NextResponse.json({ initiatives: visible }, { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } })
})

export const POST = defineRoute({
  roles: ['super_admin', 'innovation_admin'],
  forbiddenMessage: 'Only Innovation Admins can create initiatives',
  rateLimit: { limit: 20, window: 60_000 },
  errorMessage: 'Failed to create initiative',
}, async ({ req, user: me }) => {
    const body = await req.json()
    const {
      initiativeId, name, description, problemStatement, proposedSolution,
      valueDrivers, potentialCostSaving, potentialTimeSaving,
      potentialQualitySaving, potentialSafetyImpact, potentialEsgOffset,
      identifiedSolution, linkedStartup, businessUnits, departments,
      priority, status, progress, nextSteps, lessonsLearnt,
      secondaryValueDrivers,
      applicableStakeholders, projectLifecycleStages,
      projectTypes, projectLocation, applicableProjectSize, applicableProjectValue,
      technologyCategory, implementationComplexity, investmentLevel,
      changeManagementEffort, deploymentType, visibility, projectComplexity,
    } = body

    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    // Auto-generate ID inside a transaction with an advisory lock to prevent
    // concurrent requests from computing the same next sequence number.
    let finalId = initiativeId?.trim()
    if (finalId) {
      if (!/^INIT-[0-9]+$/i.test(finalId))
        return NextResponse.json({ error: 'Initiative ID must follow the format INIT-NNN (e.g. INIT-001).' }, { status: 400 })
      // Normalize to 3-digit zero-padded format
      const num = parseInt(finalId.replace(/^INIT-/i, ''), 10)
      finalId = `INIT-${String(num).padStart(3, '0')}`
      const dup = await queryOne(`SELECT id FROM initiatives WHERE initiative_id = $1`, [finalId])
      if (dup) return NextResponse.json({ error: `Initiative ID "${finalId}" already exists. Please use a unique ID.` }, { status: 400 })
    }

    const row = await transactionAsUser(me, async (tx) => {
      if (!finalId) {
        await tx.query(`SELECT pg_advisory_xact_lock(hashtext('initiatives_id_seq'))`)
        const maxRow = await tx.queryOne<{ initiative_id: string }>(
          `SELECT initiative_id FROM initiatives WHERE initiative_id ~ '^INIT-[0-9]+$' ORDER BY LENGTH(initiative_id) DESC, initiative_id DESC LIMIT 1`
        )
        const lastNum = maxRow ? parseInt(maxRow.initiative_id.replace('INIT-', ''), 10) : 0
        finalId = `INIT-${String(lastNum + 1).padStart(3, '0')}`
      }
      return tx.queryOne(
      `INSERT INTO initiatives
        (initiative_id, name, description, problem_statement, proposed_solution,
         value_drivers, potential_cost_saving, potential_time_saving,
         potential_quality_saving, potential_safety_impact, potential_esg_offset,
         identified_solution, linked_startup, business_units, departments,
         priority, status, progress, next_steps, lessons_learnt,
         documents, evaluations, created_by,
         secondary_value_drivers,
         applicable_stakeholders, project_lifecycle_stages,
         project_types, project_location, applicable_project_size, applicable_project_value,
         technology_category, implementation_complexity, investment_level,
         change_management_effort, deployment_type, visibility, project_complexity)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,'[]','[]',$21,
               $22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35)
       RETURNING *`,
      [
        finalId, name, description || null, problemStatement || null, proposedSolution || null,
        valueDrivers || [], potentialCostSaving || null, potentialTimeSaving || null,
        potentialQualitySaving || null, potentialSafetyImpact || null, potentialEsgOffset || null,
        identifiedSolution || null, linkedStartup || null,
        businessUnits || [], departments || [],
        priority || 'Medium', status || 'Not Started',
        progress || null, nextSteps || null, lessonsLearnt || null,
        me.id,
        secondaryValueDrivers || [],
        applicableStakeholders || [], projectLifecycleStages || [],
        projectTypes || [], projectLocation || [], applicableProjectSize || [], applicableProjectValue || [],
        technologyCategory || [], implementationComplexity || null, investmentLevel || null,
        changeManagementEffort || null, deploymentType || [],
        visibility || null, projectComplexity || null,
      ])
    })

    if (!row) return NextResponse.json({ error: 'Failed to create initiative' }, { status: 500 })
    await logAudit({ userId: me.id, userName: me.name || me.username, action: 'created', entityName: `Initiative: ${name}`, newValue: row.initiative_id })
    await serverCache.delPrefix('initiatives:')
    return NextResponse.json({ initiative: toItem(row) }, { status: 201 })
})
