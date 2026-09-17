'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import InnovoLogo from '@/components/ui/InnovoLogo'

const DOMAIN = '@innovogroup.com'

function BrandPanel() {
  return (
    <div className="hidden lg:flex flex-col justify-between flex-shrink-0 p-12"
      style={{ width: 360, background: '#122023' }}>
      <div>
        <InnovoLogo variant="aqua" height={26} />
        <p style={{ marginTop: 6, fontSize: 11, color: 'rgba(158,243,238,0.45)', fontWeight: 300 }}>
          Innovating for a better tomorrow
        </p>
      </div>
      <div>
        <p style={{ fontSize: 24, fontWeight: 600, color: '#9ef3ee', lineHeight: 1.35, marginBottom: 14, letterSpacing: '-0.03em' }}>
          Digital Startups<br />Portal
        </p>
        <p style={{ fontSize: 13, fontWeight: 300, color: 'rgba(158,243,238,0.5)', lineHeight: 1.75 }}>
          Track, evaluate and onboard technology innovations across all Innovo business units.
        </p>
      </div>
      <p style={{ fontSize: 11, fontWeight: 300, color: 'rgba(158,243,238,0.25)' }}>
        © Innovo Labs {new Date().getFullYear()} · Internal use only
      </p>
    </div>
  )
}

function Error({ msg }: { msg: string }) {
  if (!msg) return null
  return <p style={{ fontSize: 12, color: 'var(--chip-rose)', background: 'var(--su-red-bg)', padding: '8px 12px', borderRadius: 7, border: '1px solid var(--su-red-border)' }}>{msg}</p>
}

const SSO_ERROR_MESSAGES: Record<string, string> = {
  config:        'SSO is not configured on this server.',
  token_exchange: 'Microsoft sign-in failed. Please try again.',
  wrong_domain:  'Only @innovogroup.com accounts can sign in.',
  state_mismatch: 'Sign-in session expired. Please try again.',
  db_error:      'Account could not be created. Contact your admin.',
  default:       'Microsoft sign-in failed. Please try again.',
}

function LoginPageContent() {
  const [error, setError] = useState('')
  const searchParams = useSearchParams()

  // Show SSO error if redirected back from the callback with one
  useEffect(() => {
    const ssoErr = searchParams?.get('sso_error')
    if (ssoErr) setError(SSO_ERROR_MESSAGES[ssoErr] ?? SSO_ERROR_MESSAGES.default)
  }, [searchParams])

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--surface-2)' }}>
      <BrandPanel />
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm animate-scale-in" style={{ opacity: 0, animationFillMode: 'forwards' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>Welcome back</h1>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>Sign in to your Innovo Labs account.</p>
            </div>
            <Error msg={error} />

            {/* Microsoft SSO — the only sign-in method */}
            <a href="/api/auth/sso" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              width: '100%', padding: '12px 16px', borderRadius: 9,
              border: '1px solid var(--border)', background: 'var(--surface)',
              fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
              fontFamily: 'Poppins, sans-serif', textDecoration: 'none',
              cursor: 'pointer', transition: 'background 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
            >
              <svg width="18" height="18" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                <rect x="1"  y="1"  width="9" height="9" fill="#f25022"/>
                <rect x="11" y="1"  width="9" height="9" fill="#7fba00"/>
                <rect x="1"  y="11" width="9" height="9" fill="#00a4ef"/>
                <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
              </svg>
              Sign in with Microsoft
            </a>

            <p style={{ fontSize: 12, color: 'var(--faint)', textAlign: 'center', marginTop: 4 }}>
              Only {DOMAIN} accounts can sign in
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  )
}
