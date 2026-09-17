import { NextResponse } from 'next/server'
import { clearSession } from '@/lib/server/auth/session'

// POST only: a GET logout can be triggered cross-site (e.g. an <img> tag)
// or by link prefetching, logging users out without their intent.
export async function POST() {
  try { await clearSession() } catch {}
  const res = NextResponse.json({ success: true })
  res.cookies.set('innovo_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    expires: new Date(0),
    path: '/',
  })
  return res
}
