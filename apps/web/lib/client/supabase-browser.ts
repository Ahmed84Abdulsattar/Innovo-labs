import 'client-only' // Build fails if this browser-only module is ever pulled into a server bundle.
export async function uploadVideo(file: File): Promise<string> {
  // Step 1: ask our server for a signed upload URL (uses service role key server-side)
  const metaRes = await fetch('/api/news/upload-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: file.name, contentType: file.type }),
  })

  if (!metaRes.ok) {
    const err = await metaRes.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to get upload URL')
  }

  const { signedUrl, publicUrl } = await metaRes.json()

  // Step 2: PUT the file directly to Supabase Storage — no body size limit on our API
  const uploadRes = await fetch(signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })

  if (!uploadRes.ok) {
    const errText = await uploadRes.text().catch(() => uploadRes.statusText)
    throw new Error(`Upload failed (${uploadRes.status}): ${errText}`)
  }

  return publicUrl
}
