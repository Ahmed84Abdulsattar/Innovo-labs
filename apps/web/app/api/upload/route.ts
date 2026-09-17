import { NextResponse } from 'next/server'
import { defineRoute } from '@/lib/server/api/handler'
import { createClient } from '@supabase/supabase-js'
import logger from '@/lib/server/logger'

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
])

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB
const ALLOWED_BUCKETS = new Set(['documents', 'videos', 'images'])

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars not configured.')
  return createClient(url, key)
}

export const POST = defineRoute({
  roles: ['super_admin', 'innovation_admin', 'contributor'],
  forbiddenMessage: 'Viewers cannot upload files.',
  errorMessage: 'Upload failed.',
}, async ({ req, user: me }) => {
  const formData = await req.formData()
  const file     = formData.get('file') as File | null
  const bucket   = (formData.get('bucket') as string | null) ?? 'documents'
  const folder   = me.id  // always use the authenticated user's ID — never trust client-supplied folder

  if (!ALLOWED_BUCKETS.has(bucket))
    return NextResponse.json({ error: 'Invalid bucket.' }, { status: 400 })

  if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })

  if (!ALLOWED_MIME_TYPES.has(file.type))
    return NextResponse.json({ error: `File type "${file.type}" is not allowed.` }, { status: 400 })

  if (file.size > MAX_FILE_SIZE)
    return NextResponse.json({ error: 'File exceeds 50 MB limit.' }, { status: 400 })

  // Sanitize the extension — file.name is client-controlled and could
  // contain path separators (e.g. "x.png/../../evil") that would otherwise
  // end up in the storage key.
  const rawExt   = file.name.split('.').pop() ?? ''
  const ext      = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) || 'bin'
  const filename = `${folder}/${Date.now()}-${crypto.randomUUID()}.${ext}`

  const supabase  = getSupabaseAdmin()
  const arrayBuf  = await file.arrayBuffer()
  const { error } = await supabase.storage
    .from(bucket)
    .upload(filename, arrayBuf, { contentType: file.type, upsert: false })

  if (error) {
    logger.error({ error }, 'Supabase upload error')
    return NextResponse.json({ error: 'Upload failed.' }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filename)

  return NextResponse.json({
    url:      publicUrl,
    filename,
    size:     file.size,
    mimeType: file.type,
    name:     file.name,
  })
})
