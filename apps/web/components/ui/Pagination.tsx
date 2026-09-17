'use client'
// Shared page switcher — same look/behaviour as the news page.
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ page, totalPages, onChange }: {
  page: number
  totalPages: number
  onChange: (p: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 32 }}>
      <button type="button" onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1}
        className="btn-secondary text-xs" style={{ opacity: page === 1 ? 0.4 : 1 }}>
        <ChevronLeft size={14} /> Prev
      </button>
      <div style={{ display: 'flex', gap: 4 }}>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .reduce<(number | '…')[]>((acc, p, i, arr) => {
            if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('…')
            acc.push(p); return acc
          }, [])
          .map((p, i) => p === '…'
            ? <span key={`e${i}`} style={{ fontSize: 12, color: 'var(--faint)', padding: '0 4px' }}>…</span>
            : <button key={p} type="button" onClick={() => onChange(p as number)}
                style={{ width: 32, height: 32, borderRadius: 8, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', border: 'none',
                  background: page === p ? 'var(--accent)' : 'var(--gray-100)',
                  color: page === p ? '#fff' : 'var(--gray-500)' }}>{p}</button>
          )}
      </div>
      <button type="button" onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page === totalPages}
        className="btn-secondary text-xs" style={{ opacity: page === totalPages ? 0.4 : 1 }}>
        Next <ChevronRight size={14} />
      </button>
    </div>
  )
}
