'use client'
import { Suspense, useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppProvider, useApp } from '@/lib/client/context'
import Sidebar from '@/components/layout/Sidebar'
import InnovoLogo from '@/components/ui/InnovoLogo'

export const dynamic = 'force-dynamic'

function Shell({ children }: { children: React.ReactNode }) {
  const { currentUser, setCurrentUserId, loading } = useApp()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  // Close the mobile drawer whenever the route changes so it never stays open
  // covering the page the user just navigated to.
  useEffect(() => { setSidebarOpen(false) }, [pathname])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', margin: '0 auto 16px',
            border: '3px solid var(--border)', borderTopColor: 'var(--aqua-dark)',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading your workspace…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      <Suspense fallback={
        <aside className="hidden md:block fixed left-0 top-0 h-screen w-60 z-40" style={{ background: 'var(--sidebar-bg)' }} />
      }>
        <Sidebar user={currentUser} onUserChange={setCurrentUserId} mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
      </Suspense>
      <main className="flex-1 md:ml-60 min-h-screen overflow-x-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 sticky top-0 z-30 border-b"
          style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--sidebar-border)' }}>
          <button onClick={() => setSidebarOpen(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <Menu size={20} style={{ color: 'var(--sidebar-active-text)' }} />
          </button>
          <InnovoLogo color="var(--sidebar-logo)" height={24} />
        </div>
        {children}
      </main>
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // One QueryClient per browser session (created lazily so it isn't recreated
  // on re-render). React Query owns per-screen server state going forward;
  // AppProvider remains for the still-eager global data until each resource is
  // migrated to its own hook.
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
  }))
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider><Shell>{children}</Shell></AppProvider>
    </QueryClientProvider>
  )
}
