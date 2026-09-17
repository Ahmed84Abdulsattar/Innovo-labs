import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/sso',
  '/api/auth/callback/azure',
]

// Single source of truth for security headers (vercel.json intentionally has
// none — keeping two copies caused them to drift).
// 'unsafe-eval' is only needed by React Fast Refresh in development.
const SCRIPT_SRC = process.env.NODE_ENV === 'production'
  ? "script-src 'self' 'unsafe-inline'; "
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options':    'nosniff',
  'X-Frame-Options':           'DENY',
  'X-XSS-Protection':          '1; mode=block',
  'Referrer-Policy':           'strict-origin-when-cross-origin',
  'Permissions-Policy':        'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Content-Security-Policy':
    "default-src 'self'; " +
    SCRIPT_SRC +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "img-src 'self' data: blob: https:; " +
    "font-src 'self' data: https://fonts.gstatic.com; " +
    "connect-src 'self' https://*.supabase.co; " +
    "media-src 'self' blob: https://*.supabase.co; " +
    // frame-src governs what WE embed (vs frame-ancestors = who embeds us):
    // YouTube/Vimeo video links, plus inline PDF/document previews served as
    // data:/blob: or Supabase signed URLs.
    "frame-src 'self' data: blob: https://www.youtube.com https://player.vimeo.com https://*.supabase.co; " +
    "frame-ancestors 'none';",
}

function applySecurityHeaders(res: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(key, value)
  }
  return res
}

function csrfCheck(req: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') return true
  const method = req.method.toUpperCase()
  if (!['POST', 'PATCH', 'DELETE', 'PUT'].includes(method)) return true

  // Fail closed: a misconfigured APP_URL must not silently disable CSRF.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) return false

  // Browsers always attach an Origin to state-changing requests, so a mutating
  // request must present an Origin (or Referer) that matches our own app. A
  // missing, opaque ("null"), or mismatched source is rejected — this blocks
  // header-stripped CSRF attempts, not just wrong-origin ones.
  const origin  = req.headers.get('origin')
  const referer = req.headers.get('referer')
  let source: string | null = origin && origin !== 'null' ? origin : null
  if (!source && referer) {
    try { source = new URL(referer).origin } catch { source = null }
  }
  return source === appUrl
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/public') ||
    pathname.includes('.')
  ) return applySecurityHeaders(NextResponse.next())

  // CSRF check on all mutating routes — including public auth endpoints,
  // so login/register can't be triggered cross-site either.
  if (!csrfCheck(req)) {
    return NextResponse.json({ error: 'CSRF check failed.' }, { status: 403 })
  }

  // Allow public auth paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return applySecurityHeaders(NextResponse.next())
  }

  // Check for session cookie
  const token = req.cookies.get('innovo_session')?.value

  // Root redirect
  if (pathname === '/') {
    return applySecurityHeaders(
      NextResponse.redirect(new URL(token ? '/dashboard' : '/login', req.url))
    )
  }

  // No session — block access
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('from', pathname)
    return applySecurityHeaders(NextResponse.redirect(loginUrl))
  }

  return applySecurityHeaders(NextResponse.next())
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|public).*)',
  ],
}
