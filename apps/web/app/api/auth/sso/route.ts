import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'

export const runtime = 'nodejs'

export async function GET() {
  const tenantId  = process.env.AZURE_AD_TENANT_ID
  const clientId  = process.env.AZURE_AD_CLIENT_ID
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL

  if (!tenantId || !clientId || !appUrl) {
    return NextResponse.json({ error: 'SSO is not configured on this server.' }, { status: 503 })
  }

  const state       = randomBytes(32).toString('hex')
  const redirectUri = `${appUrl}/api/auth/callback/azure`

  const params = new URLSearchParams({
    client_id:     clientId,
    response_type: 'code',
    redirect_uri:  redirectUri,
    response_mode: 'query',
    scope:         'openid profile email',
    state,
  })

  const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params}`

  const cookieStore = await cookies()
  cookieStore.set('sso_state', state, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   10 * 60, // 10 minutes
    path:     '/',
  })

  return NextResponse.redirect(authUrl)
}
