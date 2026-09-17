'use client'
import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to error tracking service in production (e.g. Sentry)
    console.error('Global error:', error)
  }, [error])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--surface-2)', fontFamily: 'Poppins, sans-serif',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 400, padding: 32 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', background: 'var(--su-red-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
        }}>
          <AlertTriangle size={24} style={{ color: 'var(--chip-rose)' }} />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
          Something went wrong
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
          An unexpected error occurred. Please try again or contact support if the issue persists.
        </p>
        <button
          onClick={reset}
          style={{
            padding: '10px 24px', borderRadius: 8, border: 'none',
            background: '#122023', color: '#9ef3ee', fontSize: 14,
            fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}>
          Try again
        </button>
      </div>
    </div>
  )
}
