import { NextResponse } from 'next/server'
import { queryOneAsUser } from '@/lib/server/db/client'
import { defineRoute } from '@/lib/server/api/handler'
import { z } from 'zod'

const RatingSchema = z.object({
  startupId: z.string().uuid(),
  rating:       z.number().int().min(1).max(5),
})

export const POST = defineRoute({
  schema: RatingSchema,
  rateLimit: { limit: 30, window: 60_000 },
  errorMessage: 'Failed to submit rating',
}, async ({ user: me, body }) => {
  const row = await queryOneAsUser(me,
    `INSERT INTO user_ratings (startup_id, user_id, user_name, rating)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (startup_id, user_id) DO UPDATE SET rating=$4, updated_at=NOW()
     RETURNING *`,
    [body.startupId, me.id, me.name || me.username, body.rating]
  )
  return NextResponse.json({ rating: row })
})
