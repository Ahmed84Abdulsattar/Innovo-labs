import { describe, it, expect, vi, beforeEach } from 'vitest'

// API endpoint tests — exercise real route handlers (not just the wrapper) with
// their DB / storage / cache dependencies mocked, so the auth + RBAC gate is
// verified end-to-end through the actual exported GET/POST/etc.

vi.mock('@/lib/server/auth/session', () => ({ getCurrentUser: vi.fn() }))
vi.mock('@/lib/server/logger', () => ({ default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))
vi.mock('@/lib/server/db/client', () => ({
  query: vi.fn(), queryOne: vi.fn(),
  queryAsUser: vi.fn(async () => []),
  queryOneAsUser: vi.fn(), transaction: vi.fn(), transactionAsUser: vi.fn(),
}))
vi.mock('@/lib/server/storage', () => ({ signImages: vi.fn(async (a: any[]) => a) }))
vi.mock('@/lib/server/server-cache', () => ({
  serverCache: { get: vi.fn(async () => null), set: vi.fn(async () => {}), del: vi.fn(), delPrefix: vi.fn() },
}))

import { getCurrentUser } from '@/lib/server/auth/session'
import { queryAsUser } from '@/lib/server/db/client'
import { GET as usersGET } from '@/app/api/users/route'

const mockedUser = vi.mocked(getCurrentUser)
const mockedQuery = vi.mocked(queryAsUser)

// Minimal NextRequest stand-in — the route reads req.url and req.nextUrl.
function mkReq(url = 'http://localhost/api/users'): any {
  return { url, nextUrl: { pathname: '/api/users' }, headers: { get: () => null } }
}

beforeEach(() => {
  mockedUser.mockReset()
  mockedQuery.mockReset()
  mockedQuery.mockResolvedValue([] as any)
})

describe('GET /api/users — admin-only listing', () => {
  it('returns 401 when there is no session', async () => {
    mockedUser.mockResolvedValue(null as any)
    const res = await usersGET(mkReq())
    expect(res.status).toBe(401)
    expect(mockedQuery).not.toHaveBeenCalled()
  })

  it('returns 403 for a viewer (not an admin)', async () => {
    mockedUser.mockResolvedValue({ id: 'v1', role: 'viewer' } as any)
    const res = await usersGET(mkReq())
    expect(res.status).toBe(403)
    expect(mockedQuery).not.toHaveBeenCalled()
  })

  it('returns 403 for a contributor', async () => {
    mockedUser.mockResolvedValue({ id: 'c1', role: 'contributor' } as any)
    const res = await usersGET(mkReq())
    expect(res.status).toBe(403)
  })

  it('allows a super_admin and returns the user list', async () => {
    mockedUser.mockResolvedValue({ id: 'a1', role: 'super_admin' } as any)
    mockedQuery.mockResolvedValue([
      { id: 'u1', email: 'a@x.com', name: 'A', role: 'viewer', profile_photo: null },
    ] as any)
    const res = await usersGET(mkReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.users).toHaveLength(1)
    expect(body.users[0].email).toBe('a@x.com')
    expect(mockedQuery).toHaveBeenCalledOnce()
  })

  it('allows an innovation_admin (also permitted)', async () => {
    mockedUser.mockResolvedValue({ id: 'a2', role: 'innovation_admin' } as any)
    const res = await usersGET(mkReq())
    expect(res.status).toBe(200)
  })

  it('runs the DB query as the caller (RLS-scoped via queryAsUser)', async () => {
    const me = { id: 'a1', role: 'super_admin' }
    mockedUser.mockResolvedValue(me as any)
    await usersGET(mkReq())
    // First arg to queryAsUser is the identity used to set the RLS GUCs.
    expect(mockedQuery.mock.calls[0][0]).toMatchObject({ id: 'a1', role: 'super_admin' })
  })
})
