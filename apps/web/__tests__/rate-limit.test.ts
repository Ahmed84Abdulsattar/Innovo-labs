import { describe, it, expect, beforeEach, vi } from 'vitest'

// Must mock before importing the module under test.
vi.mock('@/lib/server/db/client', () => ({ queryOne: vi.fn() }))
vi.mock('@/lib/server/logger', () => ({ default: { warn: vi.fn(), error: vi.fn() } }))
// rateLimit's ~1% opportunistic cleanup calls next/server's after(), which THROWS
// outside a request scope (i.e. in tests) and trips rateLimit's fail-open catch —
// a flaky ~1% failure. Stub it to a no-op so the branch is harmless.
vi.mock('next/server', () => ({ after: vi.fn() }))

import { queryOne } from '@/lib/server/db/client'
import { rateLimit, resetRateLimit } from '@/lib/server/rate-limit'

const mockQueryOne = vi.mocked(queryOne)

const OPTS = { limit: 3, window: 60_000 }

// Simulate the DB upsert: track in-memory state per key for test isolation
function makeDbState() {
  const store = new Map<string, { count: number; reset_at: string }>()

  return (key: string, windowEnd: Date) => {
    const now = new Date()
    const existing = store.get(key)
    if (!existing || new Date(existing.reset_at) < now) {
      const row = { count: 1, reset_at: windowEnd.toISOString() }
      store.set(key, row)
      return row
    }
    existing.count += 1
    store.set(key, existing)
    return { ...existing }
  }
}

describe('rateLimit (DB-backed)', () => {
  let simulateUpsert: ReturnType<typeof makeDbState>

  beforeEach(() => {
    simulateUpsert = makeDbState()
    mockQueryOne.mockImplementation(async (sql: string, params?: any[]) => {
      if (sql.includes('DELETE')) return null
      const key     = params![0] as string
      const resetAt = params![1] as Date
      return simulateUpsert(key, resetAt) as any
    })
  })

  it('allows requests under the limit', async () => {
    expect((await rateLimit('k', OPTS)).success).toBe(true)
    expect((await rateLimit('k', OPTS)).success).toBe(true)
    expect((await rateLimit('k', OPTS)).success).toBe(true)
  })

  it('blocks after limit is exceeded', async () => {
    await rateLimit('k2', OPTS)
    await rateLimit('k2', OPTS)
    await rateLimit('k2', OPTS)
    const result = await rateLimit('k2', OPTS)
    expect(result.success).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('tracks remaining count correctly', async () => {
    const r1 = await rateLimit('k3', OPTS)
    expect(r1.remaining).toBe(2)
    const r2 = await rateLimit('k3', OPTS)
    expect(r2.remaining).toBe(1)
    const r3 = await rateLimit('k3', OPTS)
    expect(r3.remaining).toBe(0)
  })

  it('uses separate counters for different keys', async () => {
    await rateLimit('ka', OPTS)
    await rateLimit('ka', OPTS)
    await rateLimit('ka', OPTS)
    const result = await rateLimit('kb', OPTS)
    expect(result.success).toBe(true)
  })

  it('fails open when DB throws', async () => {
    mockQueryOne.mockRejectedValueOnce(new Error('DB down'))
    const result = await rateLimit('k-fail', OPTS)
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(OPTS.limit)
  })

  it('resetRateLimit deletes the key', async () => {
    await resetRateLimit('k-reset')
    expect(mockQueryOne).toHaveBeenCalledWith(
      expect.stringContaining('DELETE'),
      ['k-reset']
    )
  })
})
