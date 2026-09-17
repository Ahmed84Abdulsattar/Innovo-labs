import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/server/auth/session'
import logger from '@/lib/server/logger'

const BUCKET = 'videos'

export async function POST(req: NextRequest) {
  try {
    const me = await getCurrentUser()
    if (!me) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    if (!['super_admin', 'innovation_admin'].includes(me.role))
      return NextResponse.json({ error: 'Admins only' }, { status: 403 })

    const { fileName, contentType } = await req.json()
    if (!fileName || !contentType)
      return NextResponse.json({ error: 'fileName and contentType required' }, { status: 400 })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    // Strip any non-ASCII characters that may have crept in during copy-paste
    const serviceKey  = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').replace(/[^\x20-\x7E]/g, '').trim()
    // Sanitize the extension — fileName is client-controlled and could contain
    // path separators that would otherwise end up in the storage key.
    const rawExt = (fileName as string).split('.').pop() ?? ''
    const ext    = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) || 'mp4'
    const path   = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    // Use Supabase Storage REST API directly — works with all key formats
    const signRes = await fetch(
      `${supabaseUrl}/storage/v1/object/upload/sign/${BUCKET}/${path}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresIn: 3600 }),
      }
    )

    if (!signRes.ok) {
      const err = await signRes.text()
      logger.error({ err, status: signRes.status }, 'Supabase signed URL error')
      return NextResponse.json({ error: `Storage error: ${err}` }, { status: 500 })
    }

    const json = await signRes.json()
    // Response: { signedURL: '/object/upload/sign/...?token=...' }
    const signedUrl = `${supabaseUrl}/storage/v1${json.signedURL ?? json.url}`
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`

    return NextResponse.json({ signedUrl, publicUrl })
  } catch (err: any) {
    logger.error({ err }, 'upload-video route error')
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 })
  }
}
