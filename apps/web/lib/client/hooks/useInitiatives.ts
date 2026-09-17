'use client'
// Initiatives via React Query — an on-demand, cached read of the initiatives
// list. Used where the full board isn't needed (e.g. the profile "contributions"
// section), so the page doesn't hand-roll its own fetch/effect.
import { useQuery } from '@tanstack/react-query'

export interface InitiativeContributor { id: string; name: string; email: string; role: string }

export interface InitiativeListItem {
  id: string
  initiativeId: string
  name: string
  status: string
  priority: string
  createdBy?: string | null
  contributors: InitiativeContributor[]
}

export function useInitiatives() {
  return useQuery({
    queryKey: ['initiatives'],
    queryFn: async (): Promise<InitiativeListItem[]> => {
      const res  = await fetch('/api/initiatives')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load initiatives')
      return (data.initiatives || []) as InitiativeListItem[]
    },
    staleTime: 30_000,
  })
}
