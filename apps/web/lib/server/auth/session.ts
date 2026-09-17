import 'server-only' // Build fails if this module is ever imported into a client bundle.
// This module runs in Node.js runtime only (not edge)
// ── Session management using JWT in HttpOnly cookies ─────────────────────
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { after } from 'next/server'
import { queryOne } from '@/lib/server/db/client'
import { config } from '@/lib/server/config'

const SECRET = new TextEncoder().encode(config.auth.jwtSecret)
const COOKIE_NAME = 'innovo_session'
const MAX_AGE    = 60 * 60 * 24 * 7 // 7 days

export interface SessionPayload {
  userId: string
  email:  string
  role:   string
}

// Sign a JWT
export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET)
}

// Verify a JWT
export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

// Set session cookie
export async function setSession(payload: SessionPayload): Promise<void> {
  const token = await signToken(payload)
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   MAX_AGE,
    path:     '/',
  })
}

// Get current session from cookie
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

// Clear session cookie
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

// Get current user from DB using session.
// Uses a fast SELECT for the hot path so every API call is not blocked by
// a write. The last_login UPDATE runs fire-and-forget in the background at
// most once per hour — it never delays the response.
export async function getCurrentUser() {
  const session = await getSession()
  if (!session) return null

  // Deliberately does NOT select profile_photo: it can be a multi-megabyte
  // base64 data URL and this query runs on every authenticated API request just
  // to authorize. Only /api/auth/me needs the photo and fetches it separately.
  const user = await queryOne(
    `SELECT id, email, username, name, department, role,
            department_unassigned, last_login
     FROM users WHERE id = $1 AND email_verified = TRUE`,
    [session.userId]
  )
  if (!user) return null

  // Refresh last_login at most once per hour. Deferred with after() so it runs
  // *after* the response is sent: on serverless a plain un-awaited promise can
  // be frozen/killed when the function returns, so fire-and-forget was
  // unreliable. after() guarantees the write executes without blocking the
  // response.
  const stale = !user.last_login ||
    new Date(user.last_login) < new Date(Date.now() - 60 * 60 * 1000)
  if (stale) {
    after(() =>
      queryOne(`UPDATE users SET last_login = NOW() WHERE id = $1`, [session.userId]).catch(() => {})
    )
  }

  return user
}
