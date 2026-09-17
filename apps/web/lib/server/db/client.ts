import 'server-only' // Build fails if this module is ever imported into a client bundle.
// ── Database client using pg Pool ────────────────────────────────────────────
// In serverless (Vercel), each cold start creates a new process. We cache the
// pool on `globalThis` in development to survive Next.js hot-reloads, but in
// production we deliberately keep the pool small (max: 3) so many concurrent
// function invocations don't exhaust Supabase's connection limit.
// For high-traffic production use, point DATABASE_URL at the Supabase
// transaction-mode PgBouncer endpoint (port 6543) which pools externally.

import { Pool } from 'pg'
import logger from '@/lib/server/logger'

declare global {
  var _pgPool: Pool | undefined
}

function createPool(): Pool {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set.')

  const isProd = process.env.NODE_ENV === 'production'

  // Append ?pgbouncer=true when connecting through PgBouncer (transaction mode)
  // so that pg skips prepared statements, which PgBouncer does not support.
  const connectionString = isProd && url.includes(':6543') && !url.includes('pgbouncer')
    ? `${url}${url.includes('?') ? '&' : '?'}pgbouncer=true`
    : url

  if (!isProd) logger.debug({ host: new URL(url.replace('postgresql://', 'http://')).hostname }, '[DB] connecting')

  // Verify the server certificate when a CA cert is provided (Supabase →
  // Project Settings → Database → SSL certificate). Without it we must fall
  // back to unverified TLS, which is open to MITM — warn loudly in production.
  const caCert = process.env.DATABASE_CA_CERT
  const ssl = caCert
    ? { rejectUnauthorized: true, ca: caCert.replace(/\\n/g, '\n') }
    : { rejectUnauthorized: false }
  if (!caCert && isProd) {
    logger.warn('[DB] DATABASE_CA_CERT not set — TLS certificate verification is disabled.')
  }

  return new Pool({
    connectionString,
    ssl,
    // Keep pool small in serverless — each instance has its own pool.
    // Use Supabase's PgBouncer on port 6543 for transaction-level pooling.
    max:                    isProd ? 3 : 10,
    idleTimeoutMillis:      isProd ? 10_000 : 30_000,
    connectionTimeoutMillis: 10_000,
  })
}

function getPool(): Pool {
  if (process.env.NODE_ENV === 'development') {
    if (!global._pgPool) global._pgPool = createPool()
    return global._pgPool
  }
  // In production each module import gets its own pool — that's fine
  // because Vercel runs each function in isolation.
  if (!global._pgPool) global._pgPool = createPool()
  return global._pgPool
}

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const result = await getPool().query(sql, params)
  return result.rows as T[]
}

export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows[0] ?? null
}

// ── RLS: run a user-facing read under database-side Row-Level Security ────────
// When RLS_ENFORCED=true, the query runs inside a transaction as the restricted
// `app_rls` role with the caller's identity set as transaction-local GUCs, so
// the policies in migration 044 apply (defense in depth). When the flag is off,
// it behaves exactly like query() — so this is safe to ship before the DB side
// is set up, and is instantly reversible by unsetting the env var.
// Use ONLY for user-facing reads; system/auth/admin queries keep using query().
const RLS_ENFORCED = process.env.RLS_ENFORCED === 'true'

export async function queryAsUser<T = any>(
  user: { id: string; role: string; department?: string | null },
  sql: string,
  params?: any[],
): Promise<T[]> {
  if (!RLS_ENFORCED) return query<T>(sql, params)
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    // Identity as transaction-local settings (parameterised — never interpolated).
    // app.user_department carries the caller's department for business-unit scope
    // checks (startups / timeline policies).
    await client.query(
      `SELECT set_config('app.user_id', $1, true),
              set_config('app.user_role', $2, true),
              set_config('app.user_department', $3, true)`,
      [user.id, user.role, user.department ?? ''],
    )
    await client.query('SET LOCAL ROLE app_rls')   // drop to the RLS-subject role
    const result = await client.query(sql, params)
    await client.query('COMMIT')
    return result.rows as T[]
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

export async function queryOneAsUser<T = any>(
  user: { id: string; role: string; department?: string | null },
  sql: string,
  params?: any[],
): Promise<T | null> {
  const rows = await queryAsUser<T>(user, sql, params)
  return rows[0] ?? null
}

// Run multiple statements atomically. The callback receives thin wrappers that
// use the same client (and therefore the same transaction) for every call.
export async function transaction<T>(
  fn: (tx: { query: typeof query; queryOne: typeof queryOne }) => Promise<T>
): Promise<T> {
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const tx = {
      query:    async <R = any>(sql: string, params?: any[]) => (await client.query(sql, params)).rows as R[],
      queryOne: async <R = any>(sql: string, params?: any[]) => ((await client.query(sql, params)).rows[0] ?? null) as R | null,
    }
    const result = await fn(tx)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

// Multi-statement atomic write under RLS (as app_rls with the caller's identity).
// Falls back to a plain privileged transaction when RLS_ENFORCED is off.
export async function transactionAsUser<T>(
  user: { id: string; role: string; department?: string | null },
  fn: (tx: { query: typeof query; queryOne: typeof queryOne }) => Promise<T>,
): Promise<T> {
  if (!RLS_ENFORCED) return transaction(fn)
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `SELECT set_config('app.user_id', $1, true),
              set_config('app.user_role', $2, true),
              set_config('app.user_department', $3, true)`,
      [user.id, user.role, user.department ?? ''],
    )
    await client.query('SET LOCAL ROLE app_rls')
    const tx = {
      query:    async <R = any>(sql: string, params?: any[]) => (await client.query(sql, params)).rows as R[],
      queryOne: async <R = any>(sql: string, params?: any[]) => ((await client.query(sql, params)).rows[0] ?? null) as R | null,
    }
    const result = await fn(tx)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

const db = { query, queryOne, queryAsUser, queryOneAsUser, transaction, transactionAsUser }
export default db
