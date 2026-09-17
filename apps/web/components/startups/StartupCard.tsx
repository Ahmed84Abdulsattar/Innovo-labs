'use client'
import Link from 'next/link'
import { Star, MapPin, Tag } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import RatingDots from '@/components/ui/RatingDots'
import { cardSpotlight } from '@/lib/client/hover'
import type { Startup } from '@/lib/shared/types'

const STATUS_DOT: Record<string, string> = {
  'Onboarded':      'var(--chip-green)',
  'Pilot':          'var(--chip-violet)',
  'Business Review':'var(--accent)',
  'Assessed':       'var(--chip-cyan)',
  'Identified':     '#94a3b8',
  'Rejected':       'var(--chip-rose)',
}

export default function StartupCard({ startup: s, index = 0 }: { startup: Startup; index?: number }) {
  const dot = STATUS_DOT[s.collaborationStatus] || '#94a3b8'

  return (
    <Link
      href={`/startups/${s.id}`}
      onMouseMove={cardSpotlight}
      className="inn-card card-glow flex flex-col cursor-pointer group animate-slide-up"
      style={{
        opacity: 0,
        animationDelay: `${Math.min(index * 0.04, 0.28)}s`,
        animationFillMode: 'forwards',
        textDecoration: 'none',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '18px 18px 18px', display: 'flex', flexDirection: 'column', flex: 1 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: dot, flexShrink: 0,
                boxShadow: `0 0 0 2px ${dot}22`,
              }} />
              {s.starEngagement && (
                <Star size={11} fill="#f59e0b" style={{ color: '#f59e0b', flexShrink: 0 }} />
              )}
              <h3 style={{
                fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                transition: 'color 0.15s',
              }} className="group-hover:text-[var(--accent)]">
                {s.company}
              </h3>
            </div>
            <p style={{ fontSize: 11, fontWeight: 300, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.product}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
            {s.startupId && (
              <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--gray-300)', fontVariantNumeric: 'tabular-nums' }}>
                {s.startupId}
              </span>
            )}
            <Badge label={s.priority} variant="priority" className="text-[10px]" />
          </div>
        </div>

        {/* Status + sector tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
          <Badge label={s.collaborationStatus} variant="status" className="text-[10px]" />
          <Badge label={s.sector} variant="sector" className="text-[10px]" />
          {s.technologies?.[0] && (
            <Badge label={s.technologies[0]} variant="tech" className="text-[10px]" />
          )}
        </div>

        {/* Description */}
        {s.description && (
          <p style={{
            fontSize: 12, fontWeight: 300, color: 'var(--gray-500)', lineHeight: 1.55,
            marginBottom: 14, flex: 1,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {s.description}
          </p>
        )}

        {/* Footer */}
        <div style={{ paddingTop: 12, marginTop: 'auto', borderTop: '1px solid var(--gray-100)' }}>
          {s.source && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <div style={{ width: 18, height: 18, borderRadius: 5, background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Tag size={9} style={{ color: 'var(--gray-500)' }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)' }}>{s.source}</span>
            </div>
          )}
          {s.hqCountry && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <div style={{ width: 18, height: 18, borderRadius: 5, background: 'var(--aqua-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MapPin size={9} style={{ color: 'var(--accent)' }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)' }}>{s.hqCountry}</span>
            </div>
          )}
          <RatingDots rating={s.rating} size={6} />
        </div>
      </div>
    </Link>
  )
}
