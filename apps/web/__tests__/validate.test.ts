import { describe, it, expect } from 'vitest'
import {
  LoginSchema,
  CreateStartupSchema, CreateIdeaSchema,
  CreateCommentSchema, CreateCollaborationSchema, parseBody,
} from '@/lib/shared/validate'

describe('LoginSchema', () => {
  it('accepts valid credentials', () => {
    const r = LoginSchema.safeParse({ email: 'user@innovogroup.com', password: 'pass123' })
    expect(r.success).toBe(true)
  })

  it('rejects non-innovo email', () => {
    const r = LoginSchema.safeParse({ email: 'user@gmail.com', password: 'pass123' })
    expect(r.success).toBe(false)
  })

  it('rejects empty password', () => {
    const r = LoginSchema.safeParse({ email: 'user@innovogroup.com', password: '' })
    expect(r.success).toBe(false)
  })
})

describe('CreateStartupSchema', () => {
  it('accepts minimal valid startup', () => {
    const r = CreateStartupSchema.safeParse({ company: 'Acme', product: 'Widget' })
    expect(r.success).toBe(true)
  })

  it('rejects missing company', () => {
    const r = CreateStartupSchema.safeParse({ product: 'Widget' })
    expect(r.success).toBe(false)
  })

  it('rejects invalid priority', () => {
    const r = CreateStartupSchema.safeParse({ company: 'A', product: 'B', priority: 'Extreme' })
    expect(r.success).toBe(false)
  })

  it('rejects invalid URL in website', () => {
    const r = CreateStartupSchema.safeParse({ company: 'A', product: 'B', website: 'not-a-url' })
    expect(r.success).toBe(false)
  })

  it('accepts empty string for website', () => {
    const r = CreateStartupSchema.safeParse({ company: 'A', product: 'B', website: '' })
    expect(r.success).toBe(true)
  })
})

describe('CreateIdeaSchema', () => {
  it('accepts valid idea', () => {
    const r = CreateIdeaSchema.safeParse({
      problemTitle: 'Slow reports', problemDescription: 'Reports take too long to generate.',
    })
    expect(r.success).toBe(true)
  })

  it('rejects empty problem title', () => {
    const r = CreateIdeaSchema.safeParse({
      problemTitle: '', problemDescription: 'Reports take too long.',
    })
    expect(r.success).toBe(false)
  })
})

describe('CreateCommentSchema', () => {
  it('accepts valid comment', () => {
    const r = CreateCommentSchema.safeParse({
      startupId: '123e4567-e89b-12d3-a456-426614174000', body: 'Great startup!',
    })
    expect(r.success).toBe(true)
  })

  it('rejects non-UUID startupId', () => {
    const r = CreateCommentSchema.safeParse({ startupId: 'not-a-uuid', body: 'Hello' })
    expect(r.success).toBe(false)
  })

  it('rejects empty body', () => {
    const r = CreateCommentSchema.safeParse({
      startupId: '123e4567-e89b-12d3-a456-426614174000', body: '',
    })
    expect(r.success).toBe(false)
  })
})

describe('CreateCollaborationSchema images', () => {
  const base = { partner: 'MIT', description: 'Joint research programme.' }
  const validImage = { id: 'img-1', dataUrl: 'data:image/jpeg;base64,/9j/4AAQ', caption: 'Lab visit' }

  it('accepts a valid image array', () => {
    const r = CreateCollaborationSchema.safeParse({ ...base, images: [validImage] })
    expect(r.success).toBe(true)
  })

  it('rejects a non-image data URL', () => {
    const r = CreateCollaborationSchema.safeParse({
      ...base, images: [{ id: 'x', dataUrl: 'data:text/html;base64,PHNjcmlwdD4=' }],
    })
    expect(r.success).toBe(false)
  })

  it('rejects arbitrary strings as images', () => {
    const r = CreateCollaborationSchema.safeParse({ ...base, images: ['not-an-object'] })
    expect(r.success).toBe(false)
  })

  it('rejects more than 12 images', () => {
    const images = Array.from({ length: 13 }, (_, i) => ({ ...validImage, id: `img-${i}` }))
    const r = CreateCollaborationSchema.safeParse({ ...base, images })
    expect(r.success).toBe(false)
  })
})

describe('parseBody helper', () => {
  it('returns data on success', () => {
    const result = parseBody(LoginSchema, { email: 'u@innovogroup.com', password: 'abc' })
    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()
  })

  it('returns error string on failure', () => {
    const result = parseBody(LoginSchema, { email: 'bad', password: '' })
    expect(result.data).toBeNull()
    expect(typeof result.error).toBe('string')
    expect(result.error!.length).toBeGreaterThan(0)
  })
})
