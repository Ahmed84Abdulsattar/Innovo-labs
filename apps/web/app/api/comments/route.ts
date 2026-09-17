import { NextResponse } from 'next/server'
import { query, queryOneAsUser } from '@/lib/server/db/client'
import { CreateCommentSchema } from '@/lib/shared/validate'
import { defineRoute } from '@/lib/server/api/handler'
import { serverCache } from '@/lib/server/server-cache'

export const GET = defineRoute({ errorMessage: 'Failed to fetch comments' }, async ({ req }) => {
  const sp        = new URL(req.url).searchParams
  const startupId = sp.get('startupId')
  const ideaId    = sp.get('ideaId')
  const cacheKey  = ideaId ? `comments:idea:${ideaId}` : `comments:${startupId ?? 'all'}`
  const cached = await serverCache.get<object>(cacheKey)
  if (cached) return NextResponse.json(cached)

  const rows = ideaId
    ? await query('SELECT * FROM comments WHERE idea_id=$1 ORDER BY created_at', [ideaId])
    : startupId && startupId !== 'all'
      ? await query('SELECT * FROM comments WHERE startup_id=$1 ORDER BY created_at', [startupId])
      : await query('SELECT * FROM comments ORDER BY created_at')
  const payload = { comments: rows }
  await serverCache.set(cacheKey, payload, 30)
  return NextResponse.json(payload)
})

// All authenticated users including viewers can comment per the permission matrix
export const POST = defineRoute({
  schema: CreateCommentSchema,
  rateLimit: { limit: 20, window: 60_000 },
  errorMessage: 'Failed to post comment',
}, async ({ user: me, body }) => {
  const row = await queryOneAsUser(me,
    `INSERT INTO comments (startup_id, idea_id, user_id, user_name, body) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [body.startupId ?? null, body.ideaId ?? null, me.id, me.name || me.username, body.body]
  )
  if (!row) return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 })
  await serverCache.delPrefix('comments:')
  return NextResponse.json({ comment: row })
})
