import 'server-only' // Build fails if this module is ever imported into a client bundle.
// ── Environment configuration ─────────────────────────────────────────────
// Single source of truth for all environment variables.
// Import this instead of process.env directly anywhere in the app.

function required(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`Missing required environment variable: ${key}`)
  return value
}

function optional(key: string, fallback = ''): string {
  return process.env[key] || fallback
}

// Required in production; falls back to a fixed dev value locally so the app
// runs without a .env. Enforces a minimum length — a short HS256 secret is
// brute-forceable.
function jwtSecret(): string {
  const s = process.env.JWT_SECRET
  if (!s) {
    if (process.env.NODE_ENV === 'production')
      throw new Error('JWT_SECRET environment variable must be set in production.')
    return 'dev-secret-change-in-production-minimum-32-chars!!'
  }
  if (s.length < 32) throw new Error('JWT_SECRET must be at least 32 characters.')
  return s
}

export const config = {
  database: {
    // Lazy: resolved on access, so importing config for auth/email settings
    // doesn't require DATABASE_URL to be set.
    get url() { return required('DATABASE_URL') },
  },
  auth: {
    jwtSecret:    jwtSecret(),
    jwtExpiresIn: optional('JWT_EXPIRES_IN', '7d'),
  },
  app: {
    url:    optional('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
    isDev:  process.env.NODE_ENV !== 'production',
    isProd: process.env.NODE_ENV === 'production',
  },
} as const
