import 'server-only' // Build fails if this module is ever imported into a client bundle.
// PostgreSQL-backed sliding-window rate limiter.
// Works across all serverless instances and survives cold starts.
// Falls back to fail-open if the DB is unreachable so users aren't blocked by infra issues.

import { after } from 'next/server'
import { queryOne } from '@/lib/server/db/client'
import logger from '@/lib/server/logger'

export interface RateLimitOptions {
  limit:  number
  window: number // ms
}

export interface RateLimitResult {
  success:   boolean
  remaining: number
  resetAt:   number
}

export async function rateLimit(key: string, opts: RateLimitOptions): Promise<RateLimitResult> {
  const windowEnd = new Date(Date.now() + opts.window)
  try {
    // Opportunistic cleanup (~1% of calls) — expired keys otherwise accumulate
    // forever since only successful logins delete their own entry. Deferred with
    // after() so it runs post-response and isn't killed when the serverless
    // function returns.
    if (Math.random() < 0.01) {
      after(() => queryOne(`DELETE FROM rate_limit_entries WHERE reset_at < NOW()`).catch(() => {}))
    }
    const row = await queryOne<{ count: number; reset_at: string }>(
      `INSERT INTO rate_limit_entries (key, count, reset_at)
       VALUES ($1, 1, $2)
       ON CONFLICT (key) DO UPDATE SET
         count    = CASE WHEN rate_limit_entries.reset_at < NOW() THEN 1                  ELSE rate_limit_entries.count + 1   END,
         reset_at = CASE WHEN rate_limit_entries.reset_at < NOW() THEN EXCLUDED.reset_at  ELSE rate_limit_entries.reset_at    END
       RETURNING count, reset_at`,
      [key, windowEnd]
    )
    const count  = row?.count ?? 1
    const expiry = row ? new Date(row.reset_at).getTime() : windowEnd.getTime()
    return { success: count <= opts.limit, remaining: Math.max(0, opts.limit - count), resetAt: expiry }
  } catch (err) {
    logger.warn({ err, key }, 'rate-limit DB unavailable, failing open')
    return { success: true, remaining: opts.limit, resetAt: windowEnd.getTime() }
  }
}

export async function resetRateLimit(key: string): Promise<void> {
  try {
    await queryOne(`DELETE FROM rate_limit_entries WHERE key = $1`, [key])
  } catch (err) {
    logger.warn({ err, key }, 'rate-limit reset DB error')
  }
}

export const AUTH_LIMIT = { limit: 10, window: 15 * 60 * 1000 } // 10 req / 15 min
export const API_LIMIT  = { limit: 60, window:      60 * 1000 } // 60 req / min
