'use client'
import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { useApp } from '@/lib/client/context'
import { isAdmin } from '@/lib/shared/permissions'
import PageHeader from '@/components/layout/PageHeader'
import Pagination from '@/components/ui/Pagination'

const ACTION_STYLE: Record<string, string> = {
  created:        'bg-emerald-50 text-emerald-700',
  status_changed: 'bg-cyan-50 text-cyan-700',
  updated:        'bg-violet-50 text-violet-600',
  deleted:        'bg-red-50 text-red-500',
  user_invited:   'bg-blue-50 text-blue-600',
}
const ACTION_LABEL: Record<string, string> = {
  created: 'Created', status_changed: 'Status changed',
  updated: 'Updated', deleted: 'Deleted', user_invited: 'User invited',
}

export default function AuditLogPage() {
  const { currentUser } = useApp()
  const LIMIT = 50
  const [entries, setEntries] = useState<any[]>([])
  const [total,   setTotal]   = useState(0)
  const [search,  setSearch]  = useState('')
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(1)

  // Server-side pagination + search (debounced) — only one page of rows is ever
  // fetched, so the audit table can grow without bloating the response.
  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true)
      const qs = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
      if (search.trim()) qs.set('q', search.trim())
      fetch(`/api/audit?${qs}`)
        .then(r => r.json())
        .then(d => { setEntries(d.entries || []); setTotal(d.total || 0); setLoading(false) })
        .catch(() => setLoading(false))
    }, 250)
    return () => clearTimeout(t)
  }, [page, search])

  if (!isAdmin(currentUser)) {
    return <div className="p-8"><p style={{ color: 'var(--faint)' }}>Access restricted.</p></div>
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))
  const safeP      = Math.min(page, totalPages)

  return (
    <div className="p-4 md:p-8 page-enter">
      <PageHeader title="Audit Log" eyebrow="Admin" subtitle="Full history of all changes across the portal" />

      <div className="relative max-w-sm mb-6">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
        <input
          className="inn-input"
          style={{ paddingLeft: '2.25rem' }}
          placeholder="Search by user or startup…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
        />
      </div>

      {loading ? (
        <p style={{ color: 'var(--faint)' }}>Loading…</p>
      ) : entries.length === 0 ? (
        <div className="inn-card p-12 text-center">
          <p style={{ color: 'var(--faint)' }}>{search.trim() ? 'No matching entries.' : 'No audit entries yet.'}</p>
        </div>
      ) : (
        <div className="inn-card overflow-x-auto">
          <table className="inn-table">
            <thead>
              <tr>
                <th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Change</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e: any, idx: number) => (
                <tr key={e.id} className="animate-slide-up" style={{ opacity: 0, animationFillMode: 'forwards', animationDelay: `${Math.min(idx * 40, 280)}ms` }}>
                  <td className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                    {new Date(e.created_at||e.createdAt).toLocaleString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                  </td>
                  <td className="font-medium" style={{ color: 'var(--text-primary)' }}>{e.user_name||e.userName}</td>
                  <td>
                    <span className={`badge text-xs ${ACTION_STYLE[e.action] || 'bg-gray-100 text-gray-600'}`}>
                      {ACTION_LABEL[e.action] || e.action}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{e.company_name||e.companyName||'—'}</td>
                  <td className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {e.old_value||e.oldValue ? <span><s>{e.old_value||e.oldValue}</s> → </span> : null}
                    {e.new_value||e.newValue}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={safeP} totalPages={totalPages} onChange={setPage} />
    </div>
  )
}
