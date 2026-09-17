import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--surface-2)', fontFamily: 'Poppins, sans-serif',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 400, padding: 32 }}>
        <p style={{ fontSize: 64, fontWeight: 700, color: 'var(--border)', lineHeight: 1 }}>404</p>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: '12px 0 8px' }}>
          Page not found
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>
          The page you're looking for doesn't exist or you don't have access.
        </p>
        <Link href="/dashboard" style={{
          display: 'inline-block', padding: '10px 24px', borderRadius: 8,
          background: '#122023', color: '#9ef3ee', fontSize: 14,
          fontWeight: 500, textDecoration: 'none',
        }}>
          Go to dashboard
        </Link>
      </div>
    </div>
  )
}
