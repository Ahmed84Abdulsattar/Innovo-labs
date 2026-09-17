import { NextResponse, after } from 'next/server'
import { queryOne } from '@/lib/server/db/client'
import { parseBody, isSupabaseStorageUrl } from '@/lib/shared/validate'
import { defineRoute } from '@/lib/server/api/handler'
import { signImage, canonicalImageUrl, deleteImages } from '@/lib/server/storage'
import { serverCache } from '@/lib/server/server-cache'
import { z } from 'zod'

// null clears the photo. Otherwise it is either a Supabase Storage URL on our
// own host (the current flow uploads the image and stores the URL) or, for rows
// not yet migrated, a legacy base64 image data URL. Arbitrary external https
// URLs are rejected. The 4.5 MB cap only ever bites the legacy data-URL path.
const UpdateProfileSchema = z.object({
  profilePhoto: z.string()
    .max(4_500_000, 'Profile photo is too large.')
    .refine(
      v => isSupabaseStorageUrl(v) || /^data:image\/[a-z0-9.+-]+;base64,/i.test(v),
      'Profile photo must be an uploaded image.',
    )
    .nullable(),
})

export const GET = defineRoute({ errorMessage: 'Failed to get user' }, async ({ user }) => {
  // getCurrentUser() omits profile_photo from its hot-path query, so fetch it
  // here (the one place the client needs it). This endpoint is hit on nearly
  // every page load, so the photo query + signed-URL round-trip are cached per
  // user (signed URLs are valid 1h; cache 50m). Invalidated on profile PATCH.
  // Wrapped in an object so a genuine "no photo" (null) isn't re-fetched every time.
  const cacheKey = `me:photo:${user.id}`
  let cached = await serverCache.get<{ url: string | null }>(cacheKey)
  if (!cached) {
    const photo = await queryOne<{ profile_photo: string | null }>(
      `SELECT profile_photo FROM users WHERE id = $1`,
      [user.id]
    )
    cached = { url: await signImage(photo?.profile_photo) }
    await serverCache.set(cacheKey, cached, 50 * 60)
  }
  return NextResponse.json({ user: { ...user, profile_photo: cached.url } })
})

export const PATCH = defineRoute({ errorMessage: 'Failed to update profile' }, async ({ req, user }) => {
  // Normalise an absent field to null (clear photo) before validating, so a
  // bare {} body clears the photo rather than failing the required field.
  const raw    = await req.json()
  const result = parseBody(UpdateProfileSchema, { profilePhoto: raw.profilePhoto ?? null })
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 })

  const newPhoto = canonicalImageUrl(result.data.profilePhoto)
  const before = await queryOne<{ profile_photo: string | null }>(`SELECT profile_photo FROM users WHERE id = $1`, [user.id])
  await queryOne(`UPDATE users SET profile_photo = $1 WHERE id = $2`, [newPhoto, user.id])
  // Delete the previous photo's file if it changed (best-effort).
  if (before?.profile_photo && canonicalImageUrl(before.profile_photo) !== newPhoto)
    after(() => deleteImages([before.profile_photo]))
  // Invalidate the cached signed photo so the change shows immediately.
  await serverCache.del(`me:photo:${user.id}`)
  return NextResponse.json({ ok: true })
})
