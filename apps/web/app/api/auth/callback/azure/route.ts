import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { queryOne } from '@/lib/server/db/client'
import { setSession } from '@/lib/server/auth/session'
import logger from '@/lib/server/logger'

export const runtime = 'nodejs'

const DOMAIN = '@innovogroup.com'

// Turn an email-style handle ("first.last" / "first_last") into "First Last".
function humanizeName(raw: string): string {
  const out = raw
    .split('@')[0]
    .split(/[._]+/)
    .filter(Boolean)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(' ')
  return out || raw
}

// Cached across invocations within the same instance; jose handles key rotation.
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null
function getJwks(tenantId: string) {
  if (!jwks) {
    jwks = createRemoteJWKSet(
      new URL(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`)
    )
  }
  return jwks
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl     = process.env.NEXT_PUBLIC_APP_URL!
  const tenantId   = process.env.AZURE_AD_TENANT_ID
  const clientId   = process.env.AZURE_AD_CLIENT_ID
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET

  if (!tenantId || !clientId || !clientSecret || !appUrl) {
    return NextResponse.redirect(`${appUrl}/login?sso_error=config`)
  }

  if (error) {
    return NextResponse.redirect(`${appUrl}/login?sso_error=${encodeURIComponent(error)}`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/login?sso_error=missing_params`)
  }

  // Validate state cookie to prevent CSRF
  const cookieStore = await cookies()
  const savedState  = cookieStore.get('sso_state')?.value
  cookieStore.delete('sso_state')

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${appUrl}/login?sso_error=state_mismatch`)
  }

  // Exchange authorisation code for tokens
  const redirectUri = `${appUrl}/api/auth/callback/azure`
  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  redirectUri,
        code,
      }),
    }
  )

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/login?sso_error=token_exchange`)
  }

  const tokenData = await tokenRes.json()
  const idToken   = tokenData.id_token as string | undefined

  if (!idToken) {
    return NextResponse.redirect(`${appUrl}/login?sso_error=no_id_token`)
  }

  // Verify the ID token signature against Microsoft's published keys and
  // assert issuer + audience, per the OIDC spec. Even though the token came
  // from the token endpoint over TLS, audience validation prevents accepting
  // a token issued to a different application.
  let claims: Record<string, any>
  try {
    const { payload } = await jwtVerify(idToken, getJwks(tenantId), {
      issuer:   `https://login.microsoftonline.com/${tenantId}/v2.0`,
      audience: clientId,
    })
    claims = payload as Record<string, any>
  } catch (err) {
    logger.warn({ err }, 'Azure ID token validation failed')
    return NextResponse.redirect(`${appUrl}/login?sso_error=invalid_token`)
  }

  const email: string = (claims.preferred_username || claims.email || claims.upn || '').toLowerCase()
  const handle = email.split('@')[0]
  // Azure normally returns the display name. If it's missing — or is itself an
  // email-style handle like "first.last" — build/humanize a proper "First Last".
  const fromParts = [claims.given_name, claims.family_name].filter(Boolean).join(' ').trim()
  const rawName   = (typeof claims.name === 'string' && claims.name.trim()) || fromParts || handle
  const name      = /\s/.test(rawName) ? rawName.trim() : humanizeName(rawName)

  if (!email.endsWith(DOMAIN)) {
    return NextResponse.redirect(`${appUrl}/login?sso_error=wrong_domain`)
  }

  // Find or create user
  let user = await queryOne<{ id: string; email: string; role: string; name: string }>(
    `SELECT id, email, role, name FROM users WHERE email = $1`,
    [email]
  )

  if (!user) {
    user = await queryOne<{ id: string; email: string; role: string; name: string }>(
      `INSERT INTO users (email, name, username, role, email_verified, department_unassigned)
       VALUES ($1, $2, $3, 'viewer', TRUE, TRUE)
       RETURNING id, email, role, name`,
      [email, name, handle]
    )
  }
  if (!user) {
    return NextResponse.redirect(`${appUrl}/login?sso_error=db_error`)
  }

  // Mark email verified, and self-heal a previously-stored email-handle name
  // ("first.last") without clobbering a real or in-app-edited name.
  const storedIsHandle = !!user.name && !/\s/.test(user.name) && user.name.includes('.')
  if (storedIsHandle && /\s/.test(name)) {
    await queryOne(`UPDATE users SET email_verified = TRUE, name = $2 WHERE id = $1`, [user.id, name])
  } else {
    await queryOne(`UPDATE users SET email_verified = TRUE WHERE id = $1`, [user.id])
  }

  await setSession({ userId: user.id, email: user.email, role: user.role })

  return NextResponse.redirect(`${appUrl}/dashboard`)
}
