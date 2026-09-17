'use client'
// Per-startup comments via React Query — replaces the god-context's eager
// `/api/comments?startupId=all` boot load (which fetched every comment in the
// system) with an on-demand fetch scoped to the startup being viewed. It also
// fixes a latent bug: the context stored raw snake_case rows while the UI reads
// camelCase, so pre-existing comments never rendered. This maps the rows.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Comment } from '@/lib/shared/types'

function mapComment(r: any): Comment {
  return {
    id:        r.id,
    startupId: r.startup_id ?? r.startupId,
    userId:    r.user_id    ?? r.userId,
    userName:  r.user_name  ?? r.userName,
    body:      r.body,
    createdAt: r.created_at ?? r.createdAt,
  }
}

async function fetchComments(startupId: string): Promise<Comment[]> {
  const res  = await fetch(`/api/comments?startupId=${startupId}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to load comments')
  return (data.comments || []).map(mapComment)
}

export function useStartupComments(startupId: string) {
  return useQuery({
    queryKey: ['comments', startupId],
    queryFn:  () => fetchComments(startupId),
    enabled:  Boolean(startupId),
    staleTime: 30_000,
  })
}

export function useAddComment(startupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: string) => {
      const res  = await fetch('/api/comments', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ startupId, body }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to post comment')
      return data.comment
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', startupId] }),
  })
}

// ── Edit / delete (shared by startup + idea comments) ───────────────────────
// Edit is owner-only; delete is owner-or-super-admin. Both are enforced
// server-side in /api/comments/[id]; these hooks just wire the requests and
// invalidate the right scoped query. `invalidateKey` is the queryKey of the
// comment list being shown (startup: ['comments', id]; idea: ['comments','idea',id]).
async function editCommentReq(id: string, body: string) {
  const res  = await fetch(`/api/comments/${id}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ body }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to edit comment')
  return data.comment
}

async function deleteCommentReq(id: string) {
  const res  = await fetch(`/api/comments/${id}`, { method: 'DELETE' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Failed to delete comment')
  return true
}

function useEditCommentFor(invalidateKey: unknown[]) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => editCommentReq(id, body),
    onSuccess:  () => qc.invalidateQueries({ queryKey: invalidateKey }),
  })
}

function useDeleteCommentFor(invalidateKey: unknown[]) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCommentReq(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: invalidateKey }),
  })
}

export const useEditComment    = (startupId: string) => useEditCommentFor(['comments', startupId])
export const useDeleteComment  = (startupId: string) => useDeleteCommentFor(['comments', startupId])

// ── Idea comments (same table, keyed by idea_id) ────────────────────────────
export function useIdeaComments(ideaId: string) {
  return useQuery({
    queryKey: ['comments', 'idea', ideaId],
    queryFn:  async (): Promise<Comment[]> => {
      const res  = await fetch(`/api/comments?ideaId=${ideaId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load comments')
      return (data.comments || []).map(mapComment)
    },
    enabled:  Boolean(ideaId),
    staleTime: 30_000,
  })
}

export function useAddIdeaComment(ideaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: string) => {
      const res  = await fetch('/api/comments', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ideaId, body }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to post comment')
      return data.comment
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', 'idea', ideaId] }),
  })
}

export const useEditIdeaComment   = (ideaId: string) => useEditCommentFor(['comments', 'idea', ideaId])
export const useDeleteIdeaComment = (ideaId: string) => useDeleteCommentFor(['comments', 'idea', ideaId])
