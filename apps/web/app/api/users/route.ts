import { NextResponse } from 'next/server'
import { queryAsUser } from '@/lib/server/db/client'
import { defineRoute } from '@/lib/server/api/handler'
import { signImages } from '@/lib/server/storage'
import { serverCache } from '@/lib/server/server-cache'

export const GET = defineRoute({
  roles: ['super_admin', 'innovation_admin'],
  forbiddenMessage: 'Forbidden',
  errorMessage: 'Failed to fetch users',
}, async ({ req, user: me }) => {
  const q = new URL(req.url).searchParams.get('q')?.trim()
  const cacheKey = `users:${q ?? 'all'}`
  const cached = await serverCache.get<object>(cacheKey)
  if (cached) return NextResponse.json(cached)

  const params: any[] = []
  let where = 'WHERE email_verified = TRUE'
  if (q) {
    where += ` AND (name ILIKE $1 OR email ILIKE $1)`
    params.push(`%${q}%`)
  }

  // The admin users page loads the full list (no pagination in the UI),
  // so the cap is a safety bound rather than a page size — LIMIT 20 was
  // silently hiding users once the team grew past 20.
  const users = await queryAsUser(me,
    `SELECT id, email, username, name, department, role,
            department_unassigned, last_login, created_at, profile_photo
     FROM users ${where} ORDER BY name ASC LIMIT 500`,
    params
  )
  const signed = await signImages(users.map((u: any) => u.profile_photo))
  users.forEach((u: any, i: number) => { u.profile_photo = signed[i] })
  const payload = { users }
  await serverCache.set(cacheKey, payload, 300) // 5 minutes — users change rarely
  return NextResponse.json(payload)
})
