import { describe, it, expect } from 'vitest'
import {
  canEditStartup, canDeleteStartup, canAddStartup,
  canChangeStatus, canComment, canRateStartup,
  canManageUser, canAddTimelineEvent,
  isSuperAdmin, isAdmin,
} from '@/lib/shared/permissions'
import type { User, Startup } from '@/lib/shared/types'

const mkUser = (overrides: Partial<User>): User => ({
  id: 'u1', email: 'a@innovogroup.com', username: 'a', name: 'A',
  department: 'Digital Innovation', role: 'viewer',
  departmentUnassigned: false,
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  ...overrides,
} as User)

const mkStartup = (overrides: Partial<Startup>): Startup => ({
  id: 'i1', departmentId: 'Digital Innovation', company: 'Test Co', product: 'TestProd',
  businessUnits: ['Digital Innovation'], departments: ['Digital Innovation'],
  collaborationStatus: 'Identified', priority: 'Medium',
  starEngagement: false, createdBy: 'u1',
  timeline: [], keyContacts: [], ndaDocuments: [], legalDocuments: [], videos: [],
  costs: { capex: [], opex: [] }, technologies: [],
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  ...overrides,
} as Startup)

describe('isSuperAdmin / isAdmin', () => {
  it('only super_admin is superAdmin', () => {
    expect(isSuperAdmin(mkUser({ role: 'super_admin' }))).toBe(true)
    expect(isSuperAdmin(mkUser({ role: 'innovation_admin' }))).toBe(false)
  })

  it('isAdmin includes super_admin and admin', () => {
    expect(isAdmin(mkUser({ role: 'super_admin' }))).toBe(true)
    expect(isAdmin(mkUser({ role: 'innovation_admin' }))).toBe(true)
    expect(isAdmin(mkUser({ role: 'contributor' }))).toBe(false)
    expect(isAdmin(mkUser({ role: 'viewer' }))).toBe(false)
  })
})

describe('canEditStartup', () => {
  const startup = mkStartup({ departmentId: 'Build', businessUnits: ['Build'] })

  it('super_admin can always edit', () => {
    expect(canEditStartup(mkUser({ role: 'super_admin' }), startup)).toBe(true)
  })

  it('admin can edit within own department', () => {
    const admin = mkUser({ role: 'innovation_admin', department: 'Build' })
    expect(canEditStartup(admin, startup)).toBe(true)
  })

  it('admin cannot edit outside own department', () => {
    const admin = mkUser({ role: 'innovation_admin', department: 'MEP' })
    expect(canEditStartup(admin, startup)).toBe(false)
  })

  it('contributor cannot edit (only innovation_admin+)', () => {
    const contrib = mkUser({ role: 'contributor', department: 'Build' })
    expect(canEditStartup(contrib, startup)).toBe(false)
  })

  it('contributor cannot edit outside own BU', () => {
    const contrib = mkUser({ role: 'contributor', department: 'Development' })
    expect(canEditStartup(contrib, startup)).toBe(false)
  })

  it('viewer cannot edit', () => {
    const viewer = mkUser({ role: 'viewer', department: 'Build' })
    expect(canEditStartup(viewer, startup)).toBe(false)
  })
})

describe('canDeleteStartup', () => {
  it('super_admin can delete any', () => {
    expect(canDeleteStartup(mkUser({ role: 'super_admin' }))).toBe(true)
  })

  it('admin can delete in own department', () => {
    const startup = mkStartup({ departmentId: 'Development' })
    const admin      = mkUser({ role: 'innovation_admin', department: 'Development' })
    expect(canDeleteStartup(admin, startup)).toBe(true)
  })

  it('contributor cannot delete', () => {
    expect(canDeleteStartup(mkUser({ role: 'contributor' }))).toBe(false)
  })
})

describe('canAddStartup', () => {
  it('innovation_admin and super_admin can add', () => {
    expect(canAddStartup(mkUser({ role: 'super_admin' }))).toBe(true)
    expect(canAddStartup(mkUser({ role: 'innovation_admin' }))).toBe(true)
  })

  it('contributor and viewer cannot add', () => {
    expect(canAddStartup(mkUser({ role: 'contributor' }))).toBe(false)
    expect(canAddStartup(mkUser({ role: 'viewer' }))).toBe(false)
  })
})

describe('canChangeStatus', () => {
  it('only admin+ can change status', () => {
    expect(canChangeStatus(mkUser({ role: 'super_admin' }))).toBe(true)
    expect(canChangeStatus(mkUser({ role: 'innovation_admin' }))).toBe(true)
    expect(canChangeStatus(mkUser({ role: 'contributor' }))).toBe(false)
    expect(canChangeStatus(mkUser({ role: 'viewer' }))).toBe(false)
  })
})

describe('canComment', () => {
  it('all authenticated users can comment including viewers', () => {
    expect(canComment(mkUser({ role: 'contributor' }))).toBe(true)
    expect(canComment(mkUser({ role: 'innovation_admin' }))).toBe(true)
    expect(canComment(mkUser({ role: 'viewer' }))).toBe(true)
  })
})

describe('canRateStartup', () => {
  it('everyone can rate', () => {
    for (const role of ['super_admin', 'innovation_admin', 'contributor', 'viewer'] as const) {
      expect(canRateStartup(mkUser({ role }))).toBe(true)
    }
  })
})

describe('canManageUser', () => {
  it('super_admin can manage anyone', () => {
    const actor  = mkUser({ role: 'super_admin' })
    const target = mkUser({ role: 'innovation_admin', department: 'MEP' })
    expect(canManageUser(actor, target)).toBe(true)
  })

  it('innovation_admin cannot manage users (only super_admin can)', () => {
    const actor  = mkUser({ role: 'innovation_admin', department: 'Development' })
    const target = mkUser({ role: 'viewer', department: 'Development' })
    expect(canManageUser(actor, target)).toBe(false)
  })
})

describe('canAddTimelineEvent', () => {
  it('super_admin can always add', () => {
    const startup = mkStartup({ timeline: [{ status: 'Onboarded' }] as any })
    const result     = canAddTimelineEvent(startup, mkUser({ role: 'super_admin' }))
    expect(result.allowed).toBe(true)
  })

  it('is locked after Onboarded status', () => {
    const startup = mkStartup({ timeline: [{ status: 'Onboarded' }] as any })
    const result     = canAddTimelineEvent(startup, mkUser({ role: 'innovation_admin' }))
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/onboarded/i)
  })

  it('is open on fresh startup', () => {
    const startup = mkStartup({ timeline: [] })
    const result     = canAddTimelineEvent(startup)
    expect(result.allowed).toBe(true)
  })
})
