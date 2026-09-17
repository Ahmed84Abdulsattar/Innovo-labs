'use client'
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { filterStartupsForUser } from '@/lib/shared/permissions'
import type { User, Startup, Notification, UserRating } from '@/lib/shared/types'

interface AppCtx {
  currentUser: User
  setCurrentUserId: (id: string) => void
  updateProfilePhoto: (photo: string | null) => Promise<void>
  allStartups: Startup[]
  visibleStartups: Startup[]
  addStartup: (data: Omit<Startup,'id'|'createdAt'|'updatedAt'>) => Promise<Startup>
  updateStartup: (id: string, changes: Partial<Startup>) => Promise<void>
  deleteStartup: (id: string) => Promise<void>
  getStartupById: (id: string) => Startup | undefined
  userRatings: UserRating[]
  submitRating: (startupId: string, rating: number) => Promise<void>
  getUserRating: (startupId: string, userId: string) => UserRating | undefined
  getAverageRating: (startupId: string) => { avg: number; count: number } | null
  users: User[]
  updateUser: (id: string, changes: Partial<User>) => Promise<void>
  notifications: Notification[]
  markAllRead: () => void
  unreadCount: number
  loading: boolean
  reload: () => void
}

const AppContext = createContext<AppCtx | null>(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

// ── Default guest user while loading ─────────────────────────────────────
const GUEST_USER: User = {
  id: 'loading', name: 'Loading…', email: '', department: 'Digital Innovation',
  role: 'viewer', username: 'loading',
}

// ── Map DB snake_case rows to frontend camelCase ───────────────────────────
function mapUser(u: any): User {
  return {
    id:                   u.id,
    name:                 u.name || u.username || u.email,
    email:                u.email,
    username:             u.username,
    department:           u.department || 'Digital Innovation',
    role:                 u.role,
    departmentUnassigned: u.department_unassigned,
    lastLogin:            u.last_login,
    profilePhoto:         u.profile_photo || u.profilePhoto || undefined,
  }
}

function mapStartup(r: any): Startup {
  return {
    id:                       r.id,
    startupId:                r.startup_id               || r.startupId,
    departmentId:             r.department_id            || r.departmentId,
    createdBy:                r.created_by               || r.createdBy,
    company:                  r.company,
    product:                  r.product,
    description:              r.description,
    solutionDetails:          r.solution_details         || r.solutionDetails,
    hqCountry:                r.hq_country               || r.hqCountry,
    commercialModel:          r.commercial_model         || r.commercialModel,
    problemStatement:         r.problem_statement        || r.problemStatement,
    strategicFit:             r.strategic_fit            || r.strategicFit,
    source:                   r.source,
    sector:                   r.sector,
    technologies:             r.technologies             || [],
    businessUnits:            r.business_units           || r.businessUnits || [],
    departments:              r.departments              || [],
    productMaturity:          r.product_maturity         || r.productMaturity,
    priority:                 r.priority                 || 'Medium',
    collaborationStatus:      r.collaboration_status     || r.collaborationStatus || 'Identified',
    rating:                   r.rating,
    whatsGreat:               r.whats_great              || r.whatsGreat,
    whatsLacking:             r.whats_lacking            || r.whatsLacking,
    nextSteps:                r.next_steps               || r.nextSteps,
    starEngagement:           r.star_engagement          ?? r.starEngagement ?? false,
    website:                  r.website,
    documentsLink:            r.documents_link           || r.documentsLink,
    keywords:                 r.keywords,
    keyContacts:              r.key_contacts             || r.keyContacts || [],
    cyberSecurityReview:      r.cyber_security_review      || r.cyberSecurityReview,
    cyberSecurityStatus:      r.cyber_security_status      || r.cyberSecurityStatus,
    cyberSecurityReviewFile:  r.cyber_security_review_file || r.cyberSecurityReviewFile,
    saasFile:                 r.saas_file                  || r.saasFile,
    ndaDocuments:             r.nda_documents              || r.ndaDocuments || [],
    legalDocuments:           r.legal_documents          || r.legalDocuments || [],
    videos:                   r.videos                   || [],
    costs:                    r.costs                    || { capex: [], opex: [] },
    timeline:                 r.timeline                 || [],
    valueDrivers:             r.value_drivers            || r.valueDrivers || [],
    potentialCostSaving:      r.potential_cost_saving    != null ? Number(r.potential_cost_saving)    : (r.potentialCostSaving    ?? null),
    potentialTimeSaving:      r.potential_time_saving    != null ? Number(r.potential_time_saving)    : (r.potentialTimeSaving    ?? null),
    potentialQualitySaving:   r.potential_quality_saving != null ? Number(r.potential_quality_saving) : (r.potentialQualitySaving ?? null),
    potentialSafetyImpact:    r.potential_safety_impact  != null ? Number(r.potential_safety_impact)  : (r.potentialSafetyImpact  ?? null),
    potentialEsgOffset:       r.potential_esg_offset     != null ? Number(r.potential_esg_offset)     : (r.potentialEsgOffset     ?? null),
    secondaryValueDrivers:    r.secondary_value_drivers  || r.secondaryValueDrivers,
    applicableStakeholders:   r.applicable_stakeholders  || r.applicableStakeholders,
    projectLifecycleStages:   r.project_lifecycle_stages || r.projectLifecycleStages,
    projectTypes:             r.project_types            || r.projectTypes,
    projectLocation:          r.project_location         || r.projectLocation,
    applicableProjectSize:    r.applicable_project_size  || r.applicableProjectSize,
    applicableProjectValue:   r.applicable_project_value || r.applicableProjectValue,
    technologyCategory:       r.technology_category      || r.technologyCategory,
    implementationComplexity: r.implementation_complexity ?? r.implementationComplexity ?? null,
    investmentLevel:          r.investment_level         ?? r.investmentLevel ?? null,
    changeManagementEffort:   r.change_management_effort ?? r.changeManagementEffort ?? null,
    deploymentType:           r.deployment_type          || r.deploymentType,
    visibility:               r.visibility               ?? null,
    projectComplexity:        r.project_complexity       ?? r.projectComplexity ?? null,
    createdAt:                r.created_at               || r.createdAt,
    updatedAt:                r.updated_at               || r.updatedAt,
  }
}

// ── API helpers ────────────────────────────────────────────────────────────
async function api(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'API error')
  return data
}

// /api/startups is paginated and caps `limit` at 100. The rest of the app
// treats `allStartups` as the complete set, so a bare `api('/api/startups')`
// silently truncated to the first 50 rows. Walk every page so the full set is
// loaded — page 1 reveals the page count, then the remainder fetch in parallel.
async function fetchAllStartups(): Promise<any[]> {
  const first   = await api('/api/startups?limit=100&page=1')
  const startups = [...(first.startups || [])]
  const pages    = first.pagination?.pages ?? 1
  if (pages > 1) {
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) => api(`/api/startups?limit=100&page=${i + 2}`))
    )
    for (const r of rest) startups.push(...(r.startups || []))
  }
  return startups
}

// ── Provider ───────────────────────────────────────────────────────────────
export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser,    setCurrentUser]    = useState<User>(GUEST_USER)
  const [startups,    setStartups]    = useState<Startup[]>([])
  const [userRatings,    setUserRatings]    = useState<UserRating[]>([])
  const [users,          setUsers]          = useState<User[]>([])
  const [notifications,  setNotifications]  = useState<Notification[]>([])
  const [lastReadAt,     setLastReadAt]     = useState<string | null>(null)
  const [loading,        setLoading]        = useState(true)
  const [tick,           setTick]           = useState(0)

  const reload = useCallback(() => setTick(t => t + 1), [])

  // ── Load all data on mount ──────────────────────────────────────────────
  useEffect(() => {
    async function loadAll() {
      setLoading(true)
      try {
        // 1. Current user first — needed to determine role for admin fetches
        const meData = await api('/api/auth/me')
        const me = mapUser(meData.user)
        setCurrentUser(me)

        const isAdmin = ['super_admin', 'innovation_admin'].includes(me.role)

        // 2. Fire all remaining requests in parallel
        const [startupsRes, notifsRes, usersRes] =
          await Promise.allSettled([
            fetchAllStartups(),
            api('/api/notifications'),
            isAdmin ? api('/api/users')        : Promise.resolve(null),
          ])

        if (startupsRes.status === 'fulfilled')
          setStartups((startupsRes.value || []).map(mapStartup))

        if (notifsRes.status === 'fulfilled') {
          setNotifications(notifsRes.value.notifications || [])
          setLastReadAt(notifsRes.value.lastReadAt ?? null)
        }

        if (isAdmin) {
          if (usersRes.status === 'fulfilled' && usersRes.value)
            setUsers((usersRes.value.users || []).map(mapUser))
          else if (usersRes.status === 'rejected')
            setUsers([me])
        } else {
          setUsers([me])
        }

      } catch (err) {
        console.error('Failed to load app data:', err)
        // Redirect to login if session expired
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [tick])

  const visibleStartups = filterStartupsForUser(currentUser, startups)

  // ── Startups ─────────────────────────────────────────────────────────
  const addStartup = useCallback(async (data: Omit<Startup,'id'|'createdAt'|'updatedAt'>) => {
    const res = await api('/api/startups', { method: 'POST', body: JSON.stringify(data) })
    const item = mapStartup(res.startup)
    setStartups(p => [item, ...p])
    return item
  }, [])

  const updateStartup = useCallback(async (id: string, changes: Partial<Startup>) => {
    await api(`/api/startups/${id}`, { method: 'PATCH', body: JSON.stringify(changes) })
    setStartups(p => p.map(i => {
      if (i.id !== id) return i
      const merged: any = { ...i, updatedAt: new Date().toISOString() }
      for (const [k, v] of Object.entries(changes)) { merged[k] = v ?? undefined }
      return merged
    }))
  }, [])

  const deleteStartup = useCallback(async (id: string) => {
    await api(`/api/startups/${id}`, { method: 'DELETE' })
    setStartups(p => p.filter(i => i.id !== id))
    setUserRatings(p => p.filter(r => r.startupId !== id))
  }, [])

  const getStartupById = useCallback((id: string) => startups.find(i => i.id === id), [startups])

  // ── Ratings ──────────────────────────────────────────────────────────────
  const submitRating = useCallback(async (startupId: string, rating: number) => {
    await api('/api/ratings', { method: 'POST', body: JSON.stringify({ startupId, rating }) })
    const now = new Date().toISOString()
    setUserRatings(p => {
      const existing = p.find(r => r.startupId === startupId && r.userId === currentUser.id)
      if (existing) return p.map(r => r.startupId === startupId && r.userId === currentUser.id ? { ...r, rating, updatedAt: now } : r)
      return [...p, { startupId, userId: currentUser.id, userName: currentUser.name, rating, createdAt: now, updatedAt: now }]
    })
  }, [currentUser])

  const getUserRating = useCallback((startupId: string, userId: string) =>
    userRatings.find(r => r.startupId === startupId && r.userId === userId), [userRatings])

  const getAverageRating = useCallback((startupId: string) => {
    const rs = userRatings.filter(r => r.startupId === startupId)
    if (!rs.length) return null
    return { avg: rs.reduce((s,r) => s + r.rating, 0) / rs.length, count: rs.length }
  }, [userRatings])

  // ── Users ─────────────────────────────────────────────────────────────────
  const updateUser = useCallback(async (id: string, changes: Partial<User>) => {
    const payload: any = {}
    if (changes.role                 !== undefined) payload.role                  = changes.role
    if (changes.department           !== undefined) {
      payload.department         = changes.department
      payload.department_unassigned = false
    }
    if (changes.departmentUnassigned !== undefined) payload.department_unassigned  = changes.departmentUnassigned
    await api(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
    setUsers(p => p.map(u => u.id === id ? { ...u, ...changes } : u))
    // If updating current user, refresh them too
    if (id === currentUser.id) setCurrentUser(u => ({ ...u, ...changes }))
  }, [currentUser.id])

  // ── Notifications ──────────────────────────────────────────────────────────
  // Read-state is server-side: mark-all-read persists on the user row, and unread
  // is anything created after the user's last "read" timestamp.
  const markAllRead = useCallback(() => {
    setLastReadAt(new Date().toISOString())
    api('/api/notifications', { method: 'POST' }).catch(() => {})
  }, [])
  // Tag each notification read/unread against the persisted last-read timestamp.
  const readCutoff = lastReadAt ? new Date(lastReadAt).getTime() : 0
  const notificationsWithRead = notifications.map(n => ({
    ...n, read: new Date(n.createdAt).getTime() <= readCutoff,
  }))
  const unreadCount = notificationsWithRead.filter(n => !n.read).length

  // ── Profile photo ─────────────────────────────────────────────────────────
  const updateProfilePhoto = useCallback(async (photo: string | null) => {
    await api('/api/auth/me', { method: 'PATCH', body: JSON.stringify({ profilePhoto: photo }) })
    setCurrentUser(u => ({ ...u, profilePhoto: photo ?? undefined }))
  }, [])

  // ── setCurrentUserId — only used in dev mode for user switcher ────────────
  const setCurrentUserId = useCallback((id: string) => {
    const u = users.find(u => u.id === id)
    if (u) setCurrentUser(u)
  }, [users])

  return (
    <AppContext.Provider value={{
      currentUser, setCurrentUserId, updateProfilePhoto,
      allStartups: startups, visibleStartups,
      addStartup, updateStartup, deleteStartup, getStartupById,
      userRatings, submitRating, getUserRating, getAverageRating,
      users, updateUser,
      notifications: notificationsWithRead, markAllRead, unreadCount,
      loading, reload,
    }}>
      {children}
    </AppContext.Provider>
  )
}
