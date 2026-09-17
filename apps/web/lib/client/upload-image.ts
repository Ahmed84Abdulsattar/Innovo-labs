import 'client-only' // Build fails if this browser-only module is ever pulled into a server bundle.
// ── Client-side image upload to Supabase Storage ───────────────────────────
// Centralises the pattern the news/profile/collaboration forms use: take an
// image (a data URL produced by compressImage/prepareImage, or a raw Blob/File),
// POST it to /api/upload (which streams it to the public `images` bucket and
// returns a public URL), and hand back that URL.
//
// Storing the returned URL instead of the base64 bytes keeps multi-megabyte
// blobs out of Postgres rows while leaving every <img src> unchanged — a
// public Storage URL renders exactly like a data URL.

// Decode a base64 data URL into a Blob WITHOUT fetch(). Fetching a `data:` URL
// is blocked by our Content-Security-Policy (connect-src is 'self' + Supabase,
// not `data:`), and decoding the base64 directly is faster anyway.
function dataUrlToBlob(dataUrl: string): Blob {
  const comma  = dataUrl.indexOf(',')
  const header = dataUrl.slice(0, comma)
  const mime   = /data:([^;]+)/.exec(header)?.[1] || 'image/jpeg'
  const binary = atob(dataUrl.slice(comma + 1))
  const bytes  = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

export async function uploadImageToStorage(source: string | Blob, prefix = 'img'): Promise<string> {
  const blob = typeof source === 'string' ? dataUrlToBlob(source) : source

  const type = blob.type || 'image/jpeg'
  const ext  = (type.split('/')[1] || 'jpg').replace(/[^a-z0-9]/gi, '').slice(0, 10) || 'jpg'
  const file = new File([blob], `${prefix}-${Date.now()}.${ext}`, { type })

  const form = new FormData()
  form.append('file', file)
  form.append('bucket', 'images')

  const res  = await fetch('/api/upload', { method: 'POST', body: form })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Image upload failed.')
  return data.url as string
}
