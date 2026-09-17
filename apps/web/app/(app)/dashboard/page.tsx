'use client'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  BarChart3, Zap, CheckCircle2, AlertCircle, Target,
  Layers, FlaskConical, Lightbulb, Handshake, Newspaper,
  Banknote, Clock, ShieldCheck, TrendingUp, Leaf,
} from 'lucide-react'
import { useApp } from '@/lib/client/context'
import { useIdeasCount } from '@/lib/client/hooks/useIdeas'
import { isAdmin } from '@/lib/shared/permissions'
import PageHeader from '@/components/layout/PageHeader'
import type { Initiative } from '@/lib/shared/data/initiatives-data'
import type { Collaboration } from '@/lib/shared/data/collaborations-data'

function NewsCarousel({ articles, loading }: { articles: any[], loading: boolean }) {
  const [active, setActive] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const items = articles.slice(0, 8)

  const goTo = useCallback((idx: number) => {
    setActive(idx)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setActive(i => (i + 1) % Math.max(items.length, 1))
    }, 4500)
  }, [items.length])

  useEffect(() => {
    if (items.length === 0) return
    timerRef.current = setTimeout(() => {
      setActive(i => (i + 1) % items.length)
    }, 4500)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [active, items.length])

  const current = items[active]
  const img = current?.thumbnailDataUrl || current?.thumbnailUrl

  return (
    <div className="inn-card overflow-hidden" style={{ alignSelf: 'start' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlide { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--gray-100)' }}>
        <div className="flex items-center gap-2">
          <Newspaper size={13} style={{ color: 'var(--accent)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Latest News</h2>
        </div>
        <Link href="/news" className="text-xs" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>All →</Link>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 220 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--aqua-light)', borderTopColor: 'var(--accent)', animation: 'spin 0.7s linear infinite' }} />
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state" style={{ padding: '40px 24px' }}>
          <div className="empty-state-icon"><Newspaper size={20} style={{ color: 'var(--faint)' }} /></div>
          <p>No news published yet</p>
        </div>
      ) : (
        <>
          <Link href={`/news/${current.id}`} style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{ position: 'relative', width: '100%', height: 172, background: 'var(--gray-100)', overflow: 'hidden' }}>
              {img ? (
                <img key={current.id} src={img} alt={current.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', animation: 'fadeSlide 0.45s ease forwards' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Newspaper size={28} style={{ color: 'var(--gray-300)' }} />
                </div>
              )}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,28,31,0.65) 0%, transparent 55%)' }} />
              {current.categories?.[0] && (
                <span style={{ position: 'absolute', top: 10, left: 10, background: 'var(--accent)', color: '#fff', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 20 }}>
                  {current.categories[0]}
                </span>
              )}
            </div>
          </Link>

          <Link href={`/news/${current.id}`} style={{ textDecoration: 'none', display: 'block', padding: '14px 16px 10px' }}>
            <p key={current.id + '-t'} className="text-xs font-semibold leading-snug"
              style={{ color: 'var(--text-primary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', animation: 'fadeSlide 0.45s ease forwards' }}>
              {current.title}
            </p>
            <p className="text-[10px] font-light mt-1" style={{ color: 'var(--faint)' }}>
              {current.categories?.slice(0, 2).join(' · ')}
              {current.publishedAt ? ` · ${new Date(current.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
            </p>
          </Link>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 5, paddingBottom: 14 }}>
            {items.map((_, i) => (
              <button key={i} onClick={() => goTo(i)} style={{
                width: i === active ? 16 : 5, height: 5, borderRadius: 3,
                background: i === active ? 'var(--accent)' : 'var(--aqua-light)',
                border: 'none', cursor: 'pointer', transition: 'all 0.3s ease', padding: 0,
              }} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const PIPELINE_STATUS_COLOR: Record<string, string> = {
  'Not Started':    '#94a3b8',
  'Pre-Evaluation': 'var(--chip-cyan)',
  'In Progress':    'var(--chip-violet)',
  'Pilot':          '#f59e0b',
  'Live':           'var(--chip-green)',
  'Closed':         'var(--text-muted)',
  'On Hold':        '#f97316',
}

function SkeletonStrip() {
  return (
    <div className="stat-strip mb-6">
      {[1,2,3,4].map(i => (
        <div key={i} className="stat-strip-item">
          <div className="skeleton" style={{ height: 10, width: 60, marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 22, width: 40 }} />
          <div className="skeleton" style={{ height: 9, width: 80, marginTop: 6 }} />
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const { currentUser, visibleStartups } = useApp()
  const { data: ideasCount = 0 } = useIdeasCount()
  const thisYear = new Date().getFullYear()

  // Dashboard data is fetched via React Query so revisiting the page (or tabbing
  // back within staleTime) serves from the client cache instead of re-fetching —
  // the browser-side layer the dashboard was missing. Server-side caching is
  // unchanged; these keys are dashboard-specific to avoid clashing with the
  // lighter initiatives-list hook.
  const initiativesQ    = useQuery({ queryKey: ['dashboard', 'initiatives'],    queryFn: () => fetch('/api/initiatives').then(r => r.json()),    staleTime: 60_000 })
  const collaborationsQ = useQuery({ queryKey: ['dashboard', 'collaborations'], queryFn: () => fetch('/api/collaborations').then(r => r.json()), staleTime: 60_000 })
  const newsQ           = useQuery({ queryKey: ['dashboard', 'news'],           queryFn: () => fetch('/api/news').then(r => r.json()),           staleTime: 60_000 })

  // Memoised so the derived arrays keep a stable reference across renders (React
  // Query returns stable data), which keeps the downstream useMemos honest.
  const boardItems   = useMemo<Initiative[]>(()    => initiativesQ.data?.initiatives      ?? [], [initiativesQ.data])
  const collabs      = useMemo<Collaboration[]>(() => collaborationsQ.data?.collaborations ?? [], [collaborationsQ.data])
  const newsArticles = useMemo<any[]>(()           => newsQ.data?.articles                ?? [], [newsQ.data])
  const loading = initiativesQ.isLoading || collaborationsQ.isLoading || newsQ.isLoading

  const boardStats = useMemo(() => ({
    total:      boardItems.length,
    high:       boardItems.filter(i => i.priority === 'High').length,
    inProgress: boardItems.filter(i => ['In Progress', 'Pilot', 'Pre-Evaluation'].includes(i.status)).length,
    live:       boardItems.filter(i => i.status === 'Live').length,
  }), [boardItems])

  const boardByStatus = useMemo(() => {
    const m: Record<string, number> = {}
    boardItems.forEach(i => { m[i.status] = (m[i.status] || 0) + 1 })
    return m
  }, [boardItems])

  const vtTotals = useMemo(() => ({
    cost:    boardItems.reduce((s, i) => s + (i.potentialCostSaving    ?? 0), 0),
    time:    boardItems.reduce((s, i) => s + (i.potentialTimeSaving    ?? 0), 0),
    safety:  boardItems.reduce((s, i) => s + (i.potentialSafetyImpact  ?? 0), 0),
    quality: boardItems.reduce((s, i) => s + (i.potentialQualitySaving ?? 0), 0),
    esg:     boardItems.reduce((s, i) => s + (i.potentialEsgOffset     ?? 0), 0),
  }), [boardItems])

  const fmtVT = (n: number) =>
    n === 0 ? '0'
    : n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M`
    : n >= 1_000     ? `${(n / 1_000).toFixed(0)}K`
    : n.toLocaleString()

  const kpiItems = [
    { label: 'Total Initiatives', value: boardStats.total,      sub: 'on the board',        accent: 'var(--accent)', icon: Target       },
    { label: 'High Priority',     value: boardStats.high,       sub: 'need attention',       accent: 'var(--chip-rose)', icon: AlertCircle  },
    { label: 'Active',            value: boardStats.inProgress, sub: 'in progress or pilot', accent: 'var(--chip-violet)', icon: Zap          },
    { label: 'Live',              value: boardStats.live,       sub: 'deployed & running',   accent: 'var(--chip-green)', icon: CheckCircle2 },
  ]

  const vtItems = [
    { icon: Banknote,    label: 'Cost Saving',    value: fmtVT(vtTotals.cost),    prefix: 'AED ', suffix: '',                  sub: '' },
    { icon: Clock,       label: 'Time Saved',     value: fmtVT(vtTotals.time),    prefix: '',     suffix: ' hrs/yr',            sub: '' },
    { icon: ShieldCheck, label: 'Site Safety',    value: fmtVT(vtTotals.safety),  prefix: '',     suffix: ' injuries prevented', sub: '' },
    { icon: TrendingUp,  label: 'Quality',        value: fmtVT(vtTotals.quality), prefix: 'AED ', suffix: ' rework prevented',  sub: '' },
    { icon: Leaf,        label: 'ESG',            value: fmtVT(vtTotals.esg),     prefix: '',     suffix: ' MT CO₂ reduced',    sub: '' },
  ]

  return (
    <div className="p-4 md:p-8 page-enter">
      <PageHeader
        title="Dashboard"
        eyebrow="Overview"
        subtitle={isAdmin(currentUser) ? `All departments · ${thisYear}` : `${currentUser.department}`}
      />

      {/* ── Value tracker strip ──────────────────────────────────────────── */}
      <div className="mb-2">
        <span className="eyebrow-badge" style={{ marginBottom: 14, display: 'inline-flex' }}>
          <TrendingUp size={10} /> Value Tracker
        </span>
      </div>

      {loading ? (
        <div className="stat-strip mb-6">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="stat-strip-item">
              <div className="skeleton" style={{ height: 9, width: 50, marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 18, width: 44 }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="stat-strip mb-6 animate-slide-up" style={{ opacity: 0, animationFillMode: 'forwards' }}>
          {vtItems.map(({ icon: Icon, label, value, prefix, suffix, sub }) => (
            <div key={label} className="stat-strip-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7 }}>
                <Icon size={12} strokeWidth={1.5} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)' }}>{label}</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {prefix && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{prefix}</span>}
                {value}
              </div>
              {suffix && <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--gray-500)', marginTop: 4 }}>{suffix}</p>}
              {sub    && <p style={{ fontSize: 10, fontWeight: 500, color: 'var(--faint)', marginTop: 2 }}>{sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* ── Initiative health strip ──────────────────────────────────────── */}
      <div className="mb-2">
        <span className="eyebrow-badge" style={{ marginBottom: 14, display: 'inline-flex' }}>
          <Target size={10} /> Initiative Health
        </span>
      </div>

      {loading ? <SkeletonStrip /> : (
        <div className="stat-strip mb-6 animate-slide-up" style={{ opacity: 0, animationFillMode: 'forwards', animationDelay: '0.06s' }}>
          {kpiItems.map(({ label, value, sub, accent, icon: Icon }) => (
            <div key={label} className="stat-strip-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: accent + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={12} strokeWidth={1.5} style={{ color: accent }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)' }}>{label}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
                {value}
              </div>
              <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--gray-500)', marginTop: 5 }}>{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Bottom row: Pipeline + Overview + News ───────────────────────── */}
      <div className="mb-2">
        <span className="eyebrow-badge" style={{ marginBottom: 14, display: 'inline-flex' }}>
          <BarChart3 size={10} /> Portfolio Overview
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Pipeline */}
        <div className="inn-card p-6" style={{ alignSelf: 'start' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Pipeline</h2>
            <Link href="/initiatives" style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'none' }}>All →</Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 28 }} />)}
            </div>
          ) : boardStats.total === 0 ? (
            <div className="empty-state" style={{ padding: '32px 0' }}>
              <div className="empty-state-icon"><BarChart3 size={18} style={{ color: 'var(--faint)' }} /></div>
              <p>No initiatives yet</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {['Not Started','Pre-Evaluation','In Progress','Pilot','Live','On Hold','Closed'].map(s => {
                const count = boardByStatus[s] || 0
                const pct   = boardStats.total > 0 ? (count / boardStats.total) * 100 : 0
                const color = PIPELINE_STATUS_COLOR[s] || '#94a3b8'
                return (
                  <div key={s}>
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-secondary)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: count > 0 ? color : 'var(--gray-300)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: 'var(--gray-100)' }}>
                      <div style={{ height: '100%', borderRadius: 2, transition: 'width 0.7s cubic-bezier(0.16,1,0.3,1)', width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Overview quicklinks */}
        <div className="inn-card p-5" style={{ alignSelf: 'start' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Modules</h2>
          <div className="space-y-1">
            {[
              { label: 'Startup engagements', value: visibleStartups.length, icon: Layers,       color: 'var(--chip-cyan)', href: '/startups'   },
              { label: 'Challenges',          value: '7+',                      icon: FlaskConical,  color: 'var(--chip-violet)', href: '/challenges'    },
              { label: 'Ideas submitted',     value: ideasCount,                icon: Lightbulb,    color: '#f59e0b', href: '/ideas'         },
              { label: 'Collaborations',      value: collabs.length,            icon: Handshake,    color: 'var(--chip-green)', href: '/collaborations' },
              { label: 'News articles',       value: newsArticles.length,       icon: Newspaper,    color: 'var(--accent)', href: '/news'          },
            ].map(({ label, value, icon: Icon, color, href }) => (
              <Link key={label} href={href} style={{ textDecoration: 'none' }}>
                <div className="flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--aqua-pale)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div className="flex items-center gap-2.5">
                    <div style={{ width: 26, height: 26, borderRadius: 7, background: color + '14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={12} style={{ color }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)' }}>{label}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                    {loading && (label === 'Collaborations' || label === 'News articles') ? (
                      <span className="skeleton" style={{ display: 'inline-block', width: 20, height: 14 }} />
                    ) : value}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* News */}
        <NewsCarousel articles={newsArticles} loading={loading} />

      </div>
    </div>
  )
}
