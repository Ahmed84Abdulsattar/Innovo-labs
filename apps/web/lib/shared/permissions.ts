import type { User, Startup } from './types'

// ── Role hierarchy (lowest → highest) ────────────────────────────────────────
// viewer           → read-only, can submit ideas and comment
// contributor      → can update evaluation fields on assigned startups,
//                    upload documents, add activity/timeline notes
// innovation_admin → full CRUD on startups and startups within their scope
//                    + all contributor permissions
// super_admin      → unrestricted system access including user management

export function isSuperAdmin(user: User): boolean {
  return user.role === 'super_admin'
}

export function isInnovationAdmin(user: User): boolean {
  return user.role === 'innovation_admin' || user.role === 'super_admin'
}

// Backward-compatible alias used throughout the codebase
export function isAdmin(user: User): boolean {
  return isInnovationAdmin(user)
}

export function isContributor(user: User): boolean {
  return ['contributor', 'innovation_admin', 'super_admin'].includes(user.role)
}

// ── Internal helpers ──────────────────────────────────────────────────────────
function adminOwnsStartup(user: User, startup: Startup): boolean {
  if (user.role === 'super_admin') return true
  if (user.role === 'innovation_admin') {
    return (
      startup.departmentId === user.department ||
      (startup.businessUnits || []).includes(user.department)
    )
  }
  return false
}

function contributorInBU(user: User, startup: Startup): boolean {
  return (
    startup.departmentId === user.department ||
    (startup.businessUnits || []).includes(user.department)
  )
}

// ── Startups ───────────────────────────────────────────────────────────────
// Only innovation_admin+ can create or fully edit startups (startups)
export function canAddStartup(user: User): boolean {
  return isInnovationAdmin(user)
}

export function canEditStartup(user: User, startup: Startup): boolean {
  if (user.role === 'super_admin') return true
  if (user.role === 'innovation_admin') return adminOwnsStartup(user, startup)
  return false
}

export function canDeleteStartup(user: User, startup?: Startup): boolean {
  if (user.role === 'super_admin') return true
  if (user.role === 'innovation_admin' && startup) return adminOwnsStartup(user, startup)
  return false
}

// Contributor+ can update evaluation fields (status, progress, next steps, lessons)
export function canUpdateEvaluation(user: User, startup?: Startup): boolean {
  if (isSuperAdmin(user)) return true
  if (isInnovationAdmin(user)) return startup ? adminOwnsStartup(user, startup) : true
  if (user.role === 'contributor' && startup) return contributorInBU(user, startup)
  return false
}

export function canChangeStatus(user: User, startup?: Startup): boolean {
  return canUpdateEvaluation(user, startup)
}

// ── Timeline / Activity notes ─────────────────────────────────────────────────
// Contributor+ can add engagement / activity notes
export function canAddTimelineEvent(
  startup: Startup,
  user?: User
): { allowed: boolean; reason: string | null } {
  if (user && user.role === 'super_admin') return { allowed: true, reason: null }

  const statuses = startup.timeline.map(e => e.status)
  if (statuses.includes('Onboarded'))
    return { allowed: false, reason: 'This startup has been onboarded — timeline is locked.' }
  if (statuses.includes('Rejected'))
    return { allowed: false, reason: 'This startup has been rejected — timeline is locked.' }

  return { allowed: true, reason: null }
}

export function canUnlockTimeline(user: User): boolean {
  return user.role === 'super_admin'
}

// ── Ideas ─────────────────────────────────────────────────────────────────────
// innovation_admin+ can review submitted ideas
export function canReviewIdea(user: User): boolean {
  return isInnovationAdmin(user)
}

// ── Comments ──────────────────────────────────────────────────────────────────
// All authenticated users including viewers can comment
export function canComment(_user: User): boolean {
  return true
}

// ── Documents / uploads ───────────────────────────────────────────────────────
// Contributor+ can upload documents
export function canUploadDocuments(user: User): boolean {
  return isContributor(user)
}

// ── Star engagement ───────────────────────────────────────────────────────────
export function canStarStartup(user: User): boolean {
  return isContributor(user)
}

// ── Ratings (1-5 stars) ───────────────────────────────────────────────────────
export function canRateStartup(_user: User): boolean {
  return true
}

// ── User management ───────────────────────────────────────────────────────────
// Only super_admin can manage users, groups, and permissions
export function canManageUsers(user: User): boolean {
  return isSuperAdmin(user)
}

export function canManageUser(actor: User, _target: User): boolean {
  return isSuperAdmin(actor)
}

export function canPromoteToAdmin(actor: User): boolean {
  return isSuperAdmin(actor)
}

// ── Misc ──────────────────────────────────────────────────────────────────────
export function filterStartupsForUser(_user: User, startups: Startup[]): Startup[] {
  return startups
}

// ── Route-level scope checks (operate on raw snake_case DB rows) ────────────────
// API route handlers work with DB rows, not the mapped camelCase `Startup`.
// These mirror adminOwnsStartup / contributorInBU above so the ownership formula
// — "same department, or my department is one of the business units" — lives in
// exactly one place instead of being re-typed inline in every route.
export interface StartupRowScope {
  department_id?: string | null
  business_units?: string[] | null
}

type ScopedUser = { role: string; department?: string }

export function inStartupScope(user: ScopedUser, row: StartupRowScope): boolean {
  return row.department_id === user.department ||
    (row.business_units || []).includes(user.department as string)
}

// ── Initiative visibility (the one sensitive resource in the portal) ───────────
// Only initiatives explicitly marked 'Internal' are restricted. Everything else
// — 'Global' or an unset/legacy value — stays visible to all authenticated staff
// (this is also how the concierge already treats 'Global'). An 'Internal'
// initiative is visible only to Super/Innovation Admins, its creator, and its
// assigned contributors. Operates on the mapped (camelCase) initiative item.
export interface InitiativeViewScope {
  visibility?: string | null
  createdBy?: string | null
  contributors?: ({ id?: string } | null)[] | null
}

export function canViewInitiative(
  user: { id: string; role: string },
  init: InitiativeViewScope,
): boolean {
  if ((init.visibility ?? '') !== 'Internal') return true
  if (user.role === 'super_admin' || user.role === 'innovation_admin') return true
  if (init.createdBy && init.createdBy === user.id) return true
  return (init.contributors ?? []).some(c => c?.id === user.id)
}

// ── Per-record contributors (ideas & initiatives) ─────────────────────────────
// A user assigned to a SPECIFIC idea or initiative via its `contributors` list.
// This is independent of the `contributor` ROLE — capability comes only from being
// added to that record (by an admin), not from the user's global role.
//   * Idea contributor    → may review the idea (status + feedback); cannot delete.
//   * Initiative contributor → may edit the Framework fields only.
export function isRecordContributor(
  userId: string | undefined | null,
  contributors?: ({ id?: string | null } | null)[] | null,
): boolean {
  if (!userId) return false
  return (contributors ?? []).some(c => c?.id === userId)
}
