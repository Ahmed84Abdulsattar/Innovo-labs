'use client'
import Link from 'next/link'
import { Star } from 'lucide-react'
import { COLLABORATION_STATUSES } from '@/lib/shared/constants'
import Badge from '@/components/ui/Badge'
import RatingDots from '@/components/ui/RatingDots'
import type { Startup, CollaborationStatus } from '@/lib/shared/types'

const COL_ACCENT: Partial<Record<CollaborationStatus, string>> = {
  'Identified':     '#94a3b8',
  'Assessed':       'var(--chip-cyan)',
  'Business Review':'var(--accent)',
  'Pilot':          'var(--chip-violet)',
  'Onboarded':      'var(--chip-green)',
  'Rejected':       'var(--chip-rose)',
}

export default function KanbanBoard({ startups }: { startups: Startup[] }) {
  const byStatus = COLLABORATION_STATUSES.reduce<Record<string, Startup[]>>((acc, s) => {
    acc[s] = startups.filter(i => i.collaborationStatus === s)
    return acc
  }, {})

  return (
    <div className="flex gap-3 overflow-x-auto pb-6" style={{ minHeight: '60vh' }}>
      {COLLABORATION_STATUSES.map(status => {
        const items = byStatus[status] || []
        const accent = COL_ACCENT[status] || '#94a3b8'
        return (
          <div key={status} className="flex-shrink-0 flex flex-col rounded-xl overflow-hidden"
            style={{ width: 232, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            
            {/* Column header */}
            <div className="px-3 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent, flexShrink: 0 }} />
                  <p className="text-xs font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>{status}</p>
                </div>
                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md"
                  style={{ background: items.length > 0 ? accent + '18' : 'var(--gray-100)', color: items.length > 0 ? accent : 'var(--faint)' }}>
                  {items.length}
                </span>
              </div>
            </div>

            {/* Cards */}
            <div className="flex-1 p-2 space-y-2 overflow-y-auto">
              {items.length === 0 && (
                <p className="text-[11px] font-light text-center py-10" style={{ color: 'var(--gray-300)' }}>
                  No startups
                </p>
              )}
              {items.map(ini => (
                <Link href={`/startups/${ini.id}`} key={ini.id}
                  className="group block rounded-xl transition-all hover:shadow-sm"
                  style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    textDecoration: 'none', overflow: 'hidden',
                  }}>
                  {/* Accent top line */}
                  <div style={{ height: 2, background: accent, opacity: 0.6 }} />
                  <div style={{ padding: '10px 12px' }}>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <p className="text-xs font-semibold leading-tight group-hover:text-[var(--accent)] transition-colors"
                        style={{ color: 'var(--text-primary)' }}>{ini.company}</p>
                      {ini.starEngagement && <Star size={10} fill="#f59e0b" style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }} />}
                    </div>
                    <p className="text-[10px] font-light mb-2.5 truncate" style={{ color: 'var(--text-muted)' }}>{ini.product}</p>
                    <div className="flex items-center justify-between">
                      <RatingDots rating={ini.rating} size={5} />
                      <Badge label={ini.priority} variant="priority" className="text-[9px]" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
