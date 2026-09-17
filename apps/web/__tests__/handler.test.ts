import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'

// Mock the modules defineRoute pulls in so no DB / pino transport is touched.
vi.mock('@/lib/server/auth/session', () => ({ getCurrentUser: vi.fn() }))
vi.mock('@/lib/server/logger', () => ({ default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

import { NextResponse } from 'next/server'
import { defineRoute, HttpError } from '@/lib/server/api/handler'
import { getCurrentUser } from '@/lib/server/auth/session'

const mockedUser = vi.mocked(getCurrentUser)
const okHandler = async () => NextResponse.json({ ok: true })

// Minimal NextRequest stand-in — defineRoute only touches .json() and .nextUrl.
function mkReq(body?: any): any {
  return { json: async () => body, nextUrl: { pathname: '/api/test' } }
}

beforeEach(() => { mockedUser.mockReset() })

describe('defineRoute — authentication', () => {
  it('returns 401 when unauthenticated', async () => {
    mockedUser.mockResolvedValue(null as any)
    const res = await defineRoute({}, okHandler)(mkReq())
    expect(res.status).toBe(401)
  })

  it('runs the handler when authenticated', async () => {
    mockedUser.mockResolvedValue({ id: 'u1', role: 'viewer' } as any)
    const res = await defineRoute({}, okHandler)(mkReq())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('skips auth entirely for public routes (auth:false)', async () => {
    const res = await defineRoute({ auth: false }, okHandler)(mkReq())
    expect(res.status).toBe(200)
    expect(mockedUser).not.toHaveBeenCalled()
  })
})

describe('defineRoute — role gate', () => {
  it('returns 403 with the custom message when the role is not allowed', async () => {
    mockedUser.mockResolvedValue({ id: 'u1', role: 'viewer' } as any)
    const res = await defineRoute({ roles: ['super_admin'], forbiddenMessage: 'nope' }, okHandler)(mkReq())
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'nope' })
  })

  it('allows a permitted role through', async () => {
    mockedUser.mockResolvedValue({ id: 'u1', role: 'super_admin' } as any)
    const res = await defineRoute({ roles: ['super_admin', 'innovation_admin'] }, okHandler)(mkReq())
    expect(res.status).toBe(200)
  })
})

describe('defineRoute — body validation', () => {
  const schema = z.object({ name: z.string().min(1) })

  it('returns 400 on an invalid body', async () => {
    mockedUser.mockResolvedValue({ id: 'u1', role: 'viewer' } as any)
    const res = await defineRoute({ schema }, okHandler)(mkReq({ name: '' }))
    expect(res.status).toBe(400)
  })

  it('injects the parsed body into the handler on success', async () => {
    mockedUser.mockResolvedValue({ id: 'u1', role: 'viewer' } as any)
    let received: any
    const res = await defineRoute({ schema }, async (ctx) => {
      received = ctx.body
      return NextResponse.json({ ok: true })
    })(mkReq({ name: 'hi' }))
    expect(res.status).toBe(200)
    expect(received).toEqual({ name: 'hi' })
  })
})

describe('defineRoute — error handling', () => {
  it('maps HttpError to its status + message', async () => {
    mockedUser.mockResolvedValue({ id: 'u1', role: 'viewer' } as any)
    const res = await defineRoute({}, async () => { throw new HttpError(404, 'missing') })(mkReq())
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'missing' })
  })

  it('maps an unexpected throw to 500 with the generic message (no leak)', async () => {
    mockedUser.mockResolvedValue({ id: 'u1', role: 'viewer' } as any)
    const res = await defineRoute({ errorMessage: 'Failed' }, async () => { throw new Error('secret stack detail') })(mkReq())
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Failed' })
  })

  it('awaits dynamic params and passes them to the handler', async () => {
    mockedUser.mockResolvedValue({ id: 'u1', role: 'viewer' } as any)
    let received: any
    await defineRoute({}, async (ctx) => {
      received = ctx.params
      return NextResponse.json({ ok: true })
    })(mkReq(), { params: Promise.resolve({ id: 'abc' }) })
    expect(received).toEqual({ id: 'abc' })
  })
})
