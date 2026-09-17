'use client'
// Ideas via React Query — replaces the god-context's eager load.
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import type { IdeaSubmission, IdeaStatusHistory } from '@/lib/shared/types'

function mapIdea(r: any): IdeaSubmission {
  return {
    id:                 r.id,
    ideaRef:            r.idea_ref             || r.ideaRef,
    submittedBy:        r.submitted_by         || r.submittedBy,
    submittedByName:    r.submitted_by_name    || r.submittedByName,
    submittedByDept:    r.submitted_by_dept    || r.submittedByDept,
    problemTitle:       r.problem_title        || r.problemTitle,
    problemDescription: r.problem_description  || r.problemDescription,
    currentProcess:     r.current_process      || r.currentProcess,
    impactIfSolved:     r.impact_if_solved     || r.impactIfSolved,
    estimatedTimeSaved: r.estimated_time_saved || r.estimatedTimeSaved,
    affectedTeams:      r.affected_teams       || r.affectedTeams || [],
    urgency:            r.urgency              || 'Medium',
    suggestedSolution:  r.suggested_solution   || r.suggestedSolution,
    hasTriedBefore:     r.has_tried_before     ?? r.hasTriedBefore ?? false,
    triedBeforeDetails: r.tried_before_details || r.triedBeforeDetails,
    expectedBenefits:   r.expected_benefits    || r.expectedBenefits,
    anyBudgetInMind:    r.any_budget_in_mind   || r.anyBudgetInMind,
    benefitDrivers:        r.benefit_drivers        || r.benefitDrivers        || [],
    benefitCostSaving:     r.benefit_cost_saving  != null ? Number(r.benefit_cost_saving)  : (r.benefitCostSaving ?? null),
    benefitTimeSaving:     r.benefit_time_saving  != null ? Number(r.benefit_time_saving)  : (r.benefitTimeSaving ?? null),
    benefitQuality:        r.benefit_quality      != null ? Number(r.benefit_quality)      : (r.benefitQuality ?? null),
    benefitSafety:         r.benefit_safety       != null ? Number(r.benefit_safety)       : (r.benefitSafety ?? null),
    benefitEsg:            r.benefit_esg          != null ? Number(r.benefit_esg)          : (r.benefitEsg ?? null),
    benefitBusinessUnits:  r.benefit_business_units || r.benefitBusinessUnits || [],
    benefitDepartments:    r.benefit_departments    || r.benefitDepartments    || [],
    status:             r.status               || 'Submitted',
    linkedStartupId:    r.linked_startup_id    || r.linkedStartupId,
    reviewNotes:        r.review_notes         || r.reviewNotes,
    contributors:       r.contributors         || [],
    createdAt:          r.created_at           || r.createdAt,
  }
}

async function api(url: string, options?: RequestInit) {
  const res = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'API error')
  return data
}

const KEY = ['ideas']

// /api/ideas paginates (100/page). The app treats useIdeas() as the working set
// (list, dashboard count, credits leaderboard, profile). Page 1 always loads;
// the rest load via allSettled and a bounded fan-out, so:
//   - one slow/failed page can NEVER blank the UI (we show whatever arrived), and
//   - a runaway idea count can't fire hundreds of parallel requests.
// The cap is far above real-world volume; if it's ever exceeded the Ideas page
// should move to true server-side pagination.
const MAX_PAGES = 30 // ~3000 ideas

export async function fetchAllIdeas(): Promise<IdeaSubmission[]> {
  const first = await api('/api/ideas?limit=100&page=1')
  const ideas = [...(first.ideas || [])]
  const pages = Math.min(first.pagination?.pages ?? 1, MAX_PAGES)
  if (pages > 1) {
    const results = await Promise.allSettled(
      Array.from({ length: pages - 1 }, (_, i) => api(`/api/ideas?limit=100&page=${i + 2}`))
    )
    for (const r of results) if (r.status === 'fulfilled') ideas.push(...(r.value.ideas || []))
  }
  return ideas.map(mapIdea)
}

export function useIdeas() {
  return useQuery({
    queryKey: KEY,
    queryFn:  fetchAllIdeas,
    staleTime: 30_000,
  })
}

// O(1) total count (asks the API for page 1 with limit 1 and reads pagination.total)
// — for the dashboard tile, so the count is exact at any volume without loading rows.
export function useIdeasCount() {
  return useQuery({
    queryKey: ['ideas', 'count'],
    queryFn:  async (): Promise<number> => (await api('/api/ideas?limit=1')).pagination?.total ?? 0,
    staleTime: 30_000,
  })
}

// True server-side pagination for the Ideas list — fetches exactly one page plus
// the total, so it scales to any volume and can never blank. Search + status are
// applied server-side. Keyed under ['ideas', ...] so the mutations below (which
// invalidate ['ideas']) refetch the current page.
export interface IdeasPage { ideas: IdeaSubmission[]; total: number }
export interface IdeaFilters { q?: string; status?: string; bu?: string; dept?: string; dateFrom?: string; dateTo?: string }

export function useIdeasPage(page: number, filters: IdeaFilters, limit = 20) {
  const { q = '', status = '', bu = '', dept = '', dateFrom = '', dateTo = '' } = filters
  return useQuery<IdeasPage>({
    queryKey: ['ideas', 'page', page, q, status, bu, dept, dateFrom, dateTo, limit],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (q)        p.set('q', q)
      if (status)   p.set('status', status)
      if (bu)       p.set('bu', bu)
      if (dept)     p.set('dept', dept)
      if (dateFrom) p.set('dateFrom', dateFrom)
      if (dateTo)   p.set('dateTo', dateTo)
      const d = await api(`/api/ideas?${p.toString()}`)
      return { ideas: (d.ideas || []).map(mapIdea) as IdeaSubmission[], total: d.pagination?.total ?? 0 }
    },
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  })
}

// Single idea (detail page). Access is enforced server-side.
export function useIdea(id: string) {
  return useQuery<IdeaSubmission>({
    queryKey: ['ideas', 'one', id],
    queryFn: async () => mapIdea((await api(`/api/ideas/${id}`)).idea),
    enabled: !!id,
    staleTime: 15_000,
  })
}

// Status timeline — super admins only (server enforces the role).
export function useIdeaHistory(id: string, enabled: boolean) {
  return useQuery<IdeaStatusHistory[]>({
    queryKey: ['ideas', 'history', id],
    queryFn: async () => {
      const d = await api(`/api/ideas/${id}/history`)
      return (d.history || []).map((r: any): IdeaStatusHistory => ({
        id: r.id, ideaId: r.idea_id, fromStatus: r.from_status, toStatus: r.to_status,
        changedBy: r.changed_by, changedByName: r.changed_by_name, changedByEmail: r.changed_by_email,
        note: r.note, createdAt: r.created_at,
      }))
    },
    enabled: enabled && !!id,
    staleTime: 10_000,
  })
}

export function useSubmitIdea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => api('/api/ideas', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateIdea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Partial<IdeaSubmission> }) =>
      api(`/api/ideas/${id}`, { method: 'PATCH', body: JSON.stringify(changes) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteIdea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api(`/api/ideas/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
