import 'server-only' // Build fails if this module is ever imported into a client bundle.
// ── Route handler wrapper ─────────────────────────────────────────────────
// Removes the auth + role-gate + body-validation + try/catch + error-logging
// boilerplate that is currently copy-pasted into all ~33 API route handlers.
//
// Behaviour-preserving by design: the same 401 / 403 / 400 / 500 responses are
// produced, just in one audited place instead of thirty-three. Adopt it route
// by route — it does not change any existing route until that route imports it.
//
// Example:
//   export const GET = defineRoute(
//     { errorMessage: 'Failed to fetch startups' },
//     async ({ user, req }) => NextResponse.json({ ... }),
//   )
//
//   export const POST = defineRoute(
//     { roles: ['super_admin', 'innovation_admin'], schema: CreateStartupSchema,
//       forbiddenMessage: 'Only Innovation Admins can create startups',
//       errorMessage: 'Failed to create startup' },
//     async ({ user, body }) => { ... },
//   )

import { NextRequest, NextResponse } from 'next/server'
import type { z } from 'zod'
import { getCurrentUser } from '@/lib/server/auth/session'
import { parseBody } from '@/lib/shared/validate'
import { rateLimit, type RateLimitOptions } from '@/lib/server/rate-limit'
import logger from '@/lib/server/logger'

export type AuthedUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>

// Throw this from inside a handler to short-circuit with a specific status +
// message (e.g. 409 conflict, 404 not found) without writing a NextResponse.
export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
    this.name = 'HttpError'
  }
}

interface RouteOptions<TBody> {
  /** Require an authenticated user (default: true). Set false for public routes. */
  auth?: boolean
  /** If set, the user's role must be one of these — otherwise 403. */
  roles?: readonly string[]
  /** Custom 403 message used when the `roles` gate fails. */
  forbiddenMessage?: string
  /** If set, the JSON body is parsed + validated and injected as `ctx.body`. */
  schema?: z.ZodType<TBody>
  /** Message logged + returned (500) when the handler throws unexpectedly. */
  errorMessage?: string
  /**
   * Per-caller rate limit for this route (keyed by user id, or client IP for
   * public routes). Exceeding it returns 429. Use on mutating routes to stop
   * abuse / bulk spam. The DB-backed limiter fails open if the DB is down.
   */
  rateLimit?: RateLimitOptions
}

interface RouteContext<TBody> {
  req: NextRequest
  /** The authenticated user. Non-null whenever `auth !== false`. */
  user: AuthedUser
  /** Validated body. Present only when a `schema` was supplied. */
  body: TBody
  /** Awaited dynamic route segments, e.g. `{ id }` for `/api/startups/[id]`. */
  params: Record<string, string>
}

type Segment = { params: Promise<Record<string, string>> }

export function defineRoute<TBody = undefined>(
  opts: RouteOptions<TBody>,
  handler: (ctx: RouteContext<TBody>) => Promise<NextResponse>,
) {
  return async (req: NextRequest, segment?: Segment): Promise<NextResponse> => {
    try {
      let user = null as AuthedUser | null
      if (opts.auth !== false) {
        user = (await getCurrentUser()) as AuthedUser | null
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        if (opts.roles && !opts.roles.includes(user.role)) {
          return NextResponse.json(
            { error: opts.forbiddenMessage ?? 'Forbidden' },
            { status: 403 },
          )
        }
      }

      // Per-caller rate limit (after auth so we can key by user).
      if (opts.rateLimit) {
        const ip  = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()
        const who = user?.id ?? ip
        const key = `route:${req.method}:${req.nextUrl?.pathname ?? 'unknown'}:${who}`
        const rl  = await rateLimit(key, opts.rateLimit)
        if (!rl.success) {
          return NextResponse.json(
            { error: 'Too many requests. Please slow down and try again shortly.' },
            { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
          )
        }
      }

      let body = undefined as unknown as TBody
      if (opts.schema) {
        const parsed = parseBody(opts.schema, await req.json())
        if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })
        body = parsed.data
      }

      const params = segment ? await segment.params : {}
      return await handler({ req, user: user as AuthedUser, body, params })
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json({ error: err.message }, { status: err.status })
      }
      logger.error({ err, path: req.nextUrl?.pathname }, opts.errorMessage ?? 'Request failed')
      return NextResponse.json(
        { error: opts.errorMessage ?? 'Internal server error' },
        { status: 500 },
      )
    }
  }
}
