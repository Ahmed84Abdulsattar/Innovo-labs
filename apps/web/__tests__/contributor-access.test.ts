import { describe, it, expect } from 'vitest'
import {
  canViewInitiative,
  isRecordContributor,
  inStartupScope,
  canUpdateEvaluation,
} from '@/lib/shared/permissions'
import type { User, Startup } from '@/lib/shared/types'

// These cover the per-record contributor, initiative visibility, and business-unit
// scope rules — the ones the database RLS policies mirror. They are the highest-risk
// authorization paths (a bug here = data exposure), so they get explicit coverage.

const mkUser = (o: Partial<User>): User => ({
  id: 'u1', email: 'a@innovogroup.com', username: 'a', name: 'A',
  department: 'Digital Innovation', role: 'viewer',
  departmentUnassigned: false,
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  ...o,
} as User)

const mkStartup = (o: Partial<Startup>): Startup => ({
  id: 'i1', departmentId: 'Digital Innovation', company: 'Test Co', product: 'P',
  businessUnits: ['Digital Innovation'], departments: ['Digital Innovation'],
  timeline: [],
  ...o,
} as Startup)

// ── Initiative visibility ('Internal' is the only restricted state) ────────────
describe('canViewInitiative', () => {
  const viewer = { id: 'v1', role: 'viewer' }

  it('shows non-Internal initiatives to everyone', () => {
    expect(canViewInitiative(viewer, { visibility: 'Global' })).toBe(true)
    expect(canViewInitiative(viewer, { visibility: null })).toBe(true)
    expect(canViewInitiative(viewer, {})).toBe(true)
  })

  it('hides Internal initiatives from an unrelated viewer', () => {
    expect(canViewInitiative(viewer, { visibility: 'Internal' })).toBe(false)
  })

  it('shows Internal initiatives to admins', () => {
    expect(canViewInitiative({ id: 'a', role: 'super_admin' }, { visibility: 'Internal' })).toBe(true)
    expect(canViewInitiative({ id: 'a', role: 'innovation_admin' }, { visibility: 'Internal' })).toBe(true)
  })

  it('shows Internal initiatives to the creator and assigned contributors', () => {
    expect(canViewInitiative({ id: 'owner', role: 'viewer' }, { visibility: 'Internal', createdBy: 'owner' })).toBe(true)
    expect(canViewInitiative(viewer, { visibility: 'Internal', contributors: [{ id: 'v1' }] })).toBe(true)
  })

  it('does NOT show an Internal initiative to a non-listed contributor', () => {
    expect(canViewInitiative(viewer, { visibility: 'Internal', contributors: [{ id: 'someone-else' }] })).toBe(false)
  })
})

// ── Per-record contributor (independent of the contributor ROLE) ───────────────
describe('isRecordContributor', () => {
  it('is true only when the user id is in the contributors list', () => {
    expect(isRecordContributor('u1', [{ id: 'u1' }])).toBe(true)
    expect(isRecordContributor('u1', [{ id: 'x' }, { id: 'u1' }])).toBe(true)
    expect(isRecordContributor('u1', [{ id: 'x' }])).toBe(false)
  })

  it('is false for missing user, empty, or null lists', () => {
    expect(isRecordContributor(undefined, [{ id: 'u1' }])).toBe(false)
    expect(isRecordContributor(null, [{ id: 'u1' }])).toBe(false)
    expect(isRecordContributor('u1', [])).toBe(false)
    expect(isRecordContributor('u1', null)).toBe(false)
    expect(isRecordContributor('u1', undefined)).toBe(false)
  })

  it('tolerates null entries in the list', () => {
    expect(isRecordContributor('u1', [null, { id: 'u1' }])).toBe(true)
    expect(isRecordContributor('u1', [null])).toBe(false)
  })
})

// ── Business-unit scope (used by startup/timeline RLS + route guards) ───────────
describe('inStartupScope', () => {
  const user = { role: 'innovation_admin', department: 'Digital Innovation' }

  it('matches on department_id', () => {
    expect(inStartupScope(user, { department_id: 'Digital Innovation', business_units: [] })).toBe(true)
  })

  it('matches when the user department is one of the business units', () => {
    expect(inStartupScope(user, { department_id: 'Other', business_units: ['Digital Innovation'] })).toBe(true)
  })

  it('is false when neither matches', () => {
    expect(inStartupScope(user, { department_id: 'Other', business_units: ['Something'] })).toBe(false)
  })

  it('handles null/undefined business_units safely', () => {
    expect(inStartupScope(user, { department_id: 'Other', business_units: null })).toBe(false)
    expect(inStartupScope(user, { department_id: 'Digital Innovation' })).toBe(true)
  })
})

// ── Contributor evaluation rights (scoped) ─────────────────────────────────────
describe('canUpdateEvaluation (contributor scope)', () => {
  const startup = mkStartup({ departmentId: 'Digital Innovation', businessUnits: ['Digital Innovation'] })

  it('lets a super_admin update any startup', () => {
    expect(canUpdateEvaluation(mkUser({ role: 'super_admin', department: 'MEP' }), startup)).toBe(true)
  })

  it('lets a contributor update only startups in their scope', () => {
    const inScope = mkUser({ role: 'contributor', department: 'Digital Innovation' })
    const outScope = mkUser({ role: 'contributor', department: 'MEP' })
    expect(canUpdateEvaluation(inScope, startup)).toBe(true)
    expect(canUpdateEvaluation(outScope, startup)).toBe(false)
  })

  it('denies a plain viewer', () => {
    expect(canUpdateEvaluation(mkUser({ role: 'viewer' }), startup)).toBe(false)
  })
})
