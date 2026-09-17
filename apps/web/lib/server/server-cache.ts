import 'server-only' // Build fails if this module is ever imported into a client bundle.
// ── Server-side response cache ───────────────────────────────────────────────
// Uses Vercel KV (Upstash Redis, via its REST API — no extra dependency) when
// KV_REST_API_URL / KV_REST_API_TOKEN are set, so cache invalidation is GLOBAL
// across every serverless instance. When those env vars are absent (local dev,
// or before a KV store is provisioned) it transparently falls back to a
// per-instance in-memory Map — identical to the previous behaviour — so the app
// works either way and deploying this is safe even before KV exists.
//
// All methods are async. Cache failures are swallowed (return null / no-op) so a
// KV outage degrades to "cache miss → hit the DB", never a request failure.

// Accept both Vercel-KV and native-Upstash env var names.
const KV_URL    = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL
const KV_TOKEN  = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
const kvEnabled = Boolean(KV_URL && KV_TOKEN)

// ── In-memory fallback ───────────────────────────────────────────────────────
type Entry = { data: unknown; expiresAt: number }
const store = new Map<string, Entry>()

// ── Upstash REST command helper ──────────────────────────────────────────────
async function kv(cmd: (string | number)[]): Promise<unknown> {
  const res = await fetch(KV_URL!, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`KV ${cmd[0]} failed: ${res.status}`)
  return ((await res.json()) as { result: unknown }).result
}

export const serverCache = {
  async get<T>(key: string): Promise<T | null> {
    if (!kvEnabled) {
      const e = store.get(key)
      if (!e) return null
      if (Date.now() > e.expiresAt) { store.delete(key); return null }
      return e.data as T
    }
    try {
      const raw = await kv(['GET', key])
      return raw ? (JSON.parse(raw as string) as T) : null
    } catch { return null }
  },

  async set(key: string, data: unknown, ttlSeconds: number): Promise<void> {
    if (!kvEnabled) {
      store.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 })
      return
    }
    try { await kv(['SET', key, JSON.stringify(data), 'EX', ttlSeconds]) } catch {}
  },

  // Delete one or more exact keys
  async del(...keys: string[]): Promise<void> {
    if (!keys.length) return
    if (!kvEnabled) { for (const k of keys) store.delete(k); return }
    try { await kv(['DEL', ...keys]) } catch {}
  },

  // Delete all keys starting with a prefix (e.g. 'startups:'). Uses SCAN rather
  // than the blocking KEYS command.
  async delPrefix(prefix: string): Promise<void> {
    if (!kvEnabled) {
      for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k)
      return
    }
    try {
      let cursor = '0'
      const toDelete: string[] = []
      do {
        const [next, keys] = (await kv(['SCAN', cursor, 'MATCH', `${prefix}*`, 'COUNT', 1000])) as [string, string[]]
        cursor = next
        if (keys?.length) toDelete.push(...keys)
      } while (cursor !== '0')
      if (toDelete.length) await kv(['DEL', ...toDelete])
    } catch {}
  },
}
