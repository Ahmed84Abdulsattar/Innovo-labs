'use client'
import { useState, useEffect, useMemo, Suspense, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Plus, Search, X, Target, ChevronDown,
  SlidersHorizontal, LayoutGrid, List, Kanban, Download, BarChart2,
  DollarSign, Clock, ShieldCheck, Star, Leaf,
} from 'lucide-react'
import { useApp } from '@/lib/client/context'
import { cardSpotlight } from '@/lib/client/hover'
import { exportInitiativesBoard } from '@/lib/client/exportToExcel'
import { isAdmin } from '@/lib/shared/permissions'
import PageHeader from '@/components/layout/PageHeader'
import Pagination from '@/components/ui/Pagination'
import {
  VALUE_DRIVERS, IDENTIFIED_SOLUTIONS, INITIATIVE_STATUSES, INITIATIVE_PRIORITIES,
  INITIATIVE_BUSINESS_UNITS, INITIATIVE_DEPARTMENTS,
  STATUS_STYLE, PRIORITY_STYLE, VALUE_DRIVER_STYLE,
  type Initiative, type ValueDriver, type IdentifiedSolution,
  type InitiativeStatus, type InitiativePriority,
} from '@/lib/shared/data/initiatives-data'
import { BUILD_DEPT_MAP, BU_FILTER_MAP } from '@/lib/shared/constants'

type View = 'grid' | 'table' | 'kanban'

// ── Startup search dropdown ───────────────────────────────────────────────────
function StartupSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [query, setQuery]     = useState(value)
  const [results, setResults] = useState<{ id: string; company: string; product: string }[]>([])
  const [open, setOpen]       = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setQuery(value) }, [value])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const t = setTimeout(() => {
      fetch(`/api/startups?q=${encodeURIComponent(query)}&limit=10`)
        .then(r => r.json())
        .then(d => setResults((d.startups || []).map((i: any) => ({ id: i.id, company: i.company, product: i.product }))))
        .catch(() => setResults([]))
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--faint)', pointerEvents: 'none' }} />
        <input type="text" value={query}
          onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search startups…" className="inn-input" style={{ paddingLeft: 32 }} />
      </div>
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          {results.map(r => (
            <button key={r.id} type="button"
              onClick={() => { onChange(r.company); setQuery(r.company); setOpen(false) }}
              style={{ width: '100%', textAlign: 'left', padding: '9px 12px', background: 'none',
                border: 'none', borderBottom: '1px solid var(--gray-100)', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--aqua-pale)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{r.company}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{r.product}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Checkbox dropdown (matches startups page) ─────────────────────────────────
function CheckboxDropdown({ label, options, selected, onChange }: {
  label: string
  options: readonly string[] | string[]
  selected: string[]
  onChange: (vals: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const count = selected.length
  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v])

  return (
    <div style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 11px', borderRadius: 8, fontSize: 13,
        background: count > 0 ? 'var(--aqua-light)' : 'var(--surface)',
        color: count > 0 ? 'var(--accent)' : 'var(--gray-500)',
        border: `1px solid ${count > 0 ? 'var(--aqua-border)' : 'var(--border)'}`,
        cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
      }}>
        {label}
        {count > 0 && (
          <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--accent)', color: '#fff', borderRadius: 999, padding: '1px 5px' }}>
            {count}
          </span>
        )}
        <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 9999,
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)', minWidth: 220,
            maxHeight: 300, overflowY: 'auto',
          }}>
            {count > 0 && (
              <button type="button" onClick={() => { onChange([]); setOpen(false) }} style={{
                width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 11,
                fontWeight: 600, color: '#ef4444', background: 'none', border: 'none',
                borderBottom: '1px solid var(--gray-100)', cursor: 'pointer',
              }}>
                Clear all
              </button>
            )}
            {options.map(opt => (
              <label key={opt} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                cursor: 'pointer', fontSize: 13,
                color: selected.includes(opt) ? 'var(--accent)' : 'var(--text-secondary)',
                background: selected.includes(opt) ? 'var(--aqua-pale)' : 'transparent',
                transition: 'background 0.1s',
              }}>
                <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)}
                  style={{ accentColor: 'var(--accent)', width: 14, height: 14, flexShrink: 0, cursor: 'pointer' }} />
                {opt}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Pill multiselect (for form) ───────────────────────────────────────────────
function PillSelect<T extends string>({
  label, options, selected, onToggle, color = 'var(--accent)',
}: {
  label: string; options: readonly T[]; selected: T[]; onToggle: (v: T) => void; color?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-3" style={{ color: 'var(--text-secondary)', letterSpacing: '0.01em' }}>{label}</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {options.map(opt => {
          const on = selected.includes(opt)
          return (
            <button key={opt} type="button" onClick={() => onToggle(opt)}
              style={{
                padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: on ? color : 'var(--gray-100)', color: on ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${on ? color : 'var(--gray-200)'}`, transition: 'all 0.12s',
              }}>{opt}</button>
          )
        })}
      </div>
    </div>
  )
}

// ── Initiative card (grid view) ───────────────────────────────────────────────
function InitiativeCard({ item }: { item: Initiative }) {
  const ss = STATUS_STYLE[item.status] || { bg: 'var(--gray-100)', text: 'var(--gray-500)', dot: 'var(--faint)', border: 'var(--border)' }
  const ps = PRIORITY_STYLE[item.priority] || { bg: 'var(--gray-100)', text: 'var(--gray-500)' }
  return (
    <Link href={`/initiatives/${item.id}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="inn-card card-glow h-full" onMouseMove={cardSpotlight} style={{ padding: 0, display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
        <div style={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', flex: 1, gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: ss.dot, flexShrink: 0, boxShadow: `0 0 0 2px ${ss.dot}22` }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--accent)', background: 'var(--aqua-light)', padding: '2px 8px', borderRadius: 999 }}>{item.initiativeId}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: ss.bg, color: ss.text, border: `1px solid ${ss.border}` }}>{item.status}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: ps.bg, color: ps.text }}>{item.priority}</span>
          </div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', margin: 0 }}>{item.name}</h3>
          {item.description && (
            <p style={{ fontSize: 12, fontWeight: 300, color: 'var(--gray-500)', lineHeight: 1.6, flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', margin: 0 }}>{item.description}</p>
          )}
          {item.valueDrivers.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {item.valueDrivers.slice(0, 3).map(vd => {
                const s = VALUE_DRIVER_STYLE[vd as keyof typeof VALUE_DRIVER_STYLE] || { bg: 'var(--gray-100)', text: 'var(--gray-500)' }
                return <span key={vd} style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 999, background: s.bg, color: s.text }}>{vd}</span>
              })}
              {item.valueDrivers.length > 3 && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 999, background: 'var(--gray-100)', color: 'var(--text-muted)' }}>+{item.valueDrivers.length - 3}</span>}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--gray-100)', marginTop: 'auto' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{item.businessUnits.join(', ') || '—'}</p>
            <p style={{ fontSize: 11, color: 'var(--faint)', flexShrink: 0 }}>{new Date(item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          </div>
        </div>
      </div>
    </Link>
  )
}

// ── Kanban board (grouped by status) ─────────────────────────────────────────
function KanbanView({ items }: { items: Initiative[] }) {
  return (
    <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16, alignItems: 'flex-start' }}>
      {INITIATIVE_STATUSES.map(status => {
        const col = items.filter(i => i.status === status)
        const ss = STATUS_STYLE[status]
        return (
          <div key={status} style={{ minWidth: 240, maxWidth: 280, flex: '0 0 260px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '0 4px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: ss.dot, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{status}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 999, background: ss.bg, color: ss.text, border: `1px solid ${ss.border}` }}>{col.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {col.length === 0
                ? <div style={{ padding: '20px 12px', borderRadius: 10, border: '1px dashed var(--border)', textAlign: 'center' }}><p style={{ fontSize: 11, color: 'var(--gray-300)' }}>Empty</p></div>
                : col.map(item => {
                    const ps = PRIORITY_STYLE[item.priority] || { bg: 'var(--gray-100)', text: 'var(--gray-500)' }
                    return (
                      <Link key={item.id} href={`/initiatives/${item.id}`} style={{ textDecoration: 'none' }}>
                        <div style={{ background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--gray-100)', padding: '12px 14px', cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = ''; (e.currentTarget as HTMLDivElement).style.transform = '' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent)', background: 'var(--aqua-light)', padding: '1px 6px', borderRadius: 999 }}>{item.initiativeId}</span>
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: ps.bg, color: ps.text, marginLeft: 'auto' }}>{item.priority}</span>
                          </div>
                          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4, margin: '0 0 6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.name}</p>
                          {item.businessUnits.length > 0 && <p style={{ fontSize: 10, color: 'var(--faint)', margin: 0 }}>{item.businessUnits.join(', ')}</p>}
                        </div>
                      </Link>
                    )
                  })
              }
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Value Tracker Modal ───────────────────────────────────────────────────────
function ValueTrackerModal({ items, onClose }: { items: Initiative[]; onClose: () => void }) {
  const rows = items.filter(i =>
    i.potentialCostSaving != null || i.potentialTimeSaving != null ||
    i.potentialQualitySaving != null || i.potentialSafetyImpact != null || i.potentialEsgOffset != null
  )

  const totalCost    = rows.reduce((s, i) => s + (i.potentialCostSaving    ?? 0), 0)
  const totalTime    = rows.reduce((s, i) => s + (i.potentialTimeSaving    ?? 0), 0)
  const totalSafety  = rows.reduce((s, i) => s + (i.potentialSafetyImpact  ?? 0), 0)
  const totalQuality = rows.reduce((s, i) => s + (i.potentialQualitySaving ?? 0), 0)
  const totalEsg     = rows.reduce((s, i) => s + (i.potentialEsgOffset     ?? 0), 0)

  const fmt = (n: number, prefix = '') =>
    n === 0 ? '—' : `${prefix}${n >= 1_000_000 ? (n / 1_000_000).toFixed(2) + 'M' : n >= 1_000 ? (n / 1_000).toFixed(0) + 'K' : n.toLocaleString()}`

  const COLS = [
    { key: 'cost',    icon: DollarSign,   label: 'COST SAVING',     sub: 'AED/YEAR',              color: 'var(--accent)' },
    { key: 'time',    icon: Clock,        label: 'TIME',             sub: 'HOURS/YEAR',            color: 'var(--accent)' },
    { key: 'safety',  icon: ShieldCheck,  label: 'SAFETY',           sub: 'INJURIES PREVENTED',    color: 'var(--accent)' },
    { key: 'quality', icon: Star,         label: 'QUALITY',          sub: 'AED SAVED BY RE-WORK',  color: 'var(--accent)' },
    { key: 'esg',     icon: Leaf,         label: 'ESG',              sub: 'CARBON OFFSET',         color: 'var(--accent)' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(10,20,22,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--surface)', borderRadius: 20, width: '100%', maxWidth: 1100, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.25)' }}>

        {/* Header */}
        <div style={{ padding: '24px 32px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{ width: 4, height: 28, borderRadius: 2, background: 'var(--accent)' }} />
                <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>VALUE TRACKER</h2>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 14 }}>{rows.length} initiative{rows.length !== 1 ? 's' : ''}</p>
            </div>
            <button type="button" onClick={onClose} style={{ background: 'var(--gray-100)', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', color: 'var(--gray-500)', display: 'flex' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto', overflowY: 'auto', padding: '0 32px 32px' }}>
          {rows.length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <BarChart2 size={36} style={{ color: 'var(--gray-300)', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 14, color: 'var(--faint)', fontWeight: 300 }}>No initiatives yet.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: 760 }}>
              <thead>
                <tr>
                  <th style={{ background: '#122023', color: 'var(--aqua-light)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', padding: '16px 20px', borderRadius: '12px 0 0 0', textAlign: 'left', whiteSpace: 'nowrap' }}>
                    IMPLEMENTED INITIATIVES
                  </th>
                  {COLS.map((col, i) => {
                    const Icon = col.icon
                    return (
                      <th key={col.key} style={{
                        background: '#122023', padding: '12px 16px', textAlign: 'center', whiteSpace: 'nowrap',
                        borderRadius: i === COLS.length - 1 ? '0 12px 0 0' : 0,
                        borderLeft: '1px solid rgba(255,255,255,0.08)',
                      }}>
                        <Icon size={14} style={{ color: 'var(--accent)', display: 'block', margin: '0 auto 4px' }} />
                        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: 'var(--aqua-light)', margin: 0 }}>{col.label}</p>
                        <p style={{ fontSize: 9, fontWeight: 400, color: 'var(--text-muted)', margin: 0, letterSpacing: '0.05em' }}>({col.sub})</p>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((item, idx) => (
                  <tr key={item.id} style={{ background: idx % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)' }}>
                    <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--gray-100)', borderLeft: '1px solid var(--gray-100)', whiteSpace: 'nowrap', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.name}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', borderBottom: '1px solid var(--gray-100)', borderLeft: '1px solid var(--gray-100)', fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                      {item.potentialCostSaving != null ? `AED ${fmt(item.potentialCostSaving)} / year` : ''}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', borderBottom: '1px solid var(--gray-100)', borderLeft: '1px solid var(--gray-100)', fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                      {item.potentialTimeSaving != null ? `${item.potentialTimeSaving.toLocaleString()} hours / year` : ''}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', borderBottom: '1px solid var(--gray-100)', borderLeft: '1px solid var(--gray-100)', fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                      {item.potentialSafetyImpact != null ? `${item.potentialSafetyImpact.toLocaleString()} / year` : ''}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', borderBottom: '1px solid var(--gray-100)', borderLeft: '1px solid var(--gray-100)', fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                      {item.potentialQualitySaving != null ? `AED ${fmt(item.potentialQualitySaving)} / year` : ''}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', borderBottom: '1px solid var(--gray-100)', borderLeft: '1px solid var(--gray-100)', borderRight: '1px solid var(--gray-100)', fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                      {item.potentialEsgOffset != null ? `${item.potentialEsgOffset.toLocaleString()} CO₂ kg / year` : ''}
                    </td>
                  </tr>
                ))}

                {/* Totals row */}
                <tr>
                  <td style={{ padding: '16px 20px', fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', background: 'var(--aqua-pale)', borderTop: '2px solid var(--accent)', borderBottom: '1px solid var(--aqua-border)', borderLeft: '1px solid var(--aqua-border)', borderRadius: '0 0 0 12px' }}>
                    TOTAL
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center', fontSize: 13, fontWeight: 800, color: 'var(--accent)', background: 'var(--aqua-pale)', borderTop: '2px solid var(--accent)', borderBottom: '1px solid var(--aqua-border)', borderLeft: '1px solid var(--aqua-border)' }}>
                    {totalCost > 0 ? `AED ${fmt(totalCost)} / year` : '—'}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center', fontSize: 13, fontWeight: 800, color: 'var(--accent)', background: 'var(--aqua-pale)', borderTop: '2px solid var(--accent)', borderBottom: '1px solid var(--aqua-border)', borderLeft: '1px solid var(--aqua-border)' }}>
                    {totalTime > 0 ? `${totalTime.toLocaleString()} hours / year` : '—'}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center', fontSize: 13, fontWeight: 800, color: 'var(--accent)', background: 'var(--aqua-pale)', borderTop: '2px solid var(--accent)', borderBottom: '1px solid var(--aqua-border)', borderLeft: '1px solid var(--aqua-border)' }}>
                    {totalSafety > 0 ? `${totalSafety.toLocaleString()} / year` : '—'}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center', fontSize: 13, fontWeight: 800, color: 'var(--accent)', background: 'var(--aqua-pale)', borderTop: '2px solid var(--accent)', borderBottom: '1px solid var(--aqua-border)', borderLeft: '1px solid var(--aqua-border)' }}>
                    {totalQuality > 0 ? `AED ${fmt(totalQuality)} / year` : '—'}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center', fontSize: 13, fontWeight: 800, color: 'var(--accent)', background: 'var(--aqua-pale)', borderTop: '2px solid var(--accent)', borderBottom: '1px solid var(--aqua-border)', borderLeft: '1px solid var(--aqua-border)', borderRight: '1px solid var(--aqua-border)', borderRadius: '0 0 12px 0' }}>
                    {totalEsg > 0 ? `${totalEsg.toLocaleString()} CO₂ kg / year` : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main inner (needs useSearchParams so wrapped in Suspense) ─────────────────
function InitiativesBoardInner() {
  const { currentUser } = useApp()
  const admin = isAdmin(currentUser)
  const sp = useSearchParams()
  const buFilter   = sp.get('bu')   || ''
  const deptFilter = sp.get('dept') || ''

  const [items, setItems]       = useState<Initiative[]>([])
  const [view, setView]         = useState<View>('grid')
  const [sortBy, setSortBy]     = useState<'id' | 'name' | 'status' | 'priority' | 'created'>('created')
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('desc')
  const [showForm, setShowForm]               = useState(false)
  const [showValueTracker, setShowValueTracker] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [search, setSearch]     = useState('')

  // Panel filters
  const [filterStatuses,    setFilterStatuses]    = useState<string[]>([])
  const [filterPriorities,  setFilterPriorities]  = useState<string[]>([])
  const [filterBUs,         setFilterBUs]         = useState<string[]>([])
  const [filterValueDrivers, setFilterValueDrivers] = useState<string[]>([])

  // ── Form state ──────────────────────────────────────────────────────────────
  const [fId, setFId]                   = useState('')
  const [fName, setFName]               = useState('')
  const [fDesc, setFDesc]               = useState('')
  const [fProblem, setFProblem]         = useState('')
  const [fSolution, setFSolution]       = useState('')
  const [fValueDrivers, setFValueDrivers] = useState<ValueDriver[]>([])
  const [fCostSaving, setFCostSaving]       = useState('')
  const [fTimeSaving, setFTimeSaving]       = useState('')
  const [fQualitySaving, setFQualitySaving] = useState('')
  const [fSafetyImpact, setFSafetyImpact]   = useState('')
  const [fEsgOffset, setFEsgOffset]         = useState('')
  const [fIdentifiedSolution, setFIdentifiedSolution] = useState<IdentifiedSolution | ''>('')
  const [fLinkedStartup, setFLinkedStartup] = useState('')
  const [fBUs, setFBUs]                 = useState<string[]>([])
  const [fDepts, setFDepts]             = useState<string[]>([])
  const [fPriority, setFPriority]       = useState<InitiativePriority>('Medium')
  const [fStatus, setFStatus]           = useState<InitiativeStatus>('Not Started')
  const [fProgress, setFProgress]       = useState('')
  const [fNextSteps, setFNextSteps]     = useState('')
  const [fLessons, setFLessons]         = useState('')
  const [fSaveError, setFSaveError]     = useState('')

  // Framework matrix fields
  const [fSecondaryDrivers,  setFSecondaryDrivers]  = useState<string[]>([])
  const [fStakeholders,      setFStakeholders]      = useState<string[]>([])
  const [fLifecycleStages,   setFLifecycleStages]   = useState<string[]>([])
  const [fProjectTypes,      setFProjectTypes]      = useState<string[]>([])
  const [fProjectLocation,   setFProjectLocation]   = useState<string[]>([])
  const [fProjectSize,       setFProjectSize]       = useState<string[]>([])
  const [fTechCategory,      setFTechCategory]      = useState<string[]>([])
  const [fImplComplexity,    setFImplComplexity]    = useState('')
  const [fInvestmentLevel,   setFInvestmentLevel]   = useState('')
  const [fChangeMgmt,        setFChangeMgmt]        = useState('')
  const [fDeploymentType,    setFDeploymentType]    = useState<string[]>([])

  useEffect(() => {
    fetch('/api/initiatives')
      .then(r => r.json())
      .then(d => setItems(d.initiatives || []))
      .catch(() => {})
  }, [])

  // Auto-generate next initiative ID
  const nextInitiativeId = useMemo(() => {
    const nums = items
      .map(i => parseInt(i.initiativeId.replace(/^INIT-/i, ''), 10))
      .filter(n => !isNaN(n))
    const max = nums.length > 0 ? Math.max(...nums) : 0
    return `INIT-${String(max + 1).padStart(3, '0')}`
  }, [items])


  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    return [...items].sort((a, b) => {
      if (sortBy === 'id') {
        const numA = parseInt(a.initiativeId.replace(/^INIT\s*-\s*/i, ''), 10) || 0
        const numB = parseInt(b.initiativeId.replace(/^INIT\s*-\s*/i, ''), 10) || 0
        return dir * (numA - numB)
      }
      if (sortBy === 'name')     return dir * a.name.localeCompare(b.name)
      if (sortBy === 'status')   return dir * ((STATUS_ORDER[a.status as keyof typeof STATUS_ORDER] ?? 99) - (STATUS_ORDER[b.status as keyof typeof STATUS_ORDER] ?? 99))
      if (sortBy === 'priority') return dir * ((PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] ?? 99) - (PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER] ?? 99))
      return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    })
  }, [items, sortBy, sortDir])

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const deptLabels = deptFilter ? (BUILD_DEPT_MAP[deptFilter] || [deptFilter]) : null
    const buLabels   = buFilter   ? (BU_FILTER_MAP[buFilter]   || [buFilter])   : null
    return sorted.filter(a =>
      (!buLabels              || a.businessUnits.some(b => buLabels.includes(b))) &&
      (!deptLabels            || a.departments.some(d => deptLabels.includes(d))) &&
      (!filterStatuses.length    || filterStatuses.includes(a.status)) &&
      (!filterPriorities.length  || filterPriorities.includes(a.priority)) &&
      (!filterBUs.length         || a.businessUnits.some(b => filterBUs.includes(b))) &&
      (!filterValueDrivers.length || a.valueDrivers.some(v => filterValueDrivers.includes(v))) &&
      (!q || a.name.toLowerCase().includes(q) || a.initiativeId.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) || a.businessUnits.some(b => b.toLowerCase().includes(q)))
    )
  }, [sorted, buFilter, deptFilter, filterStatuses, filterPriorities, filterBUs, filterValueDrivers, search])

  const panelActiveCount = filterStatuses.length + filterPriorities.length + filterBUs.length + filterValueDrivers.length
  const clearPanelFilters = () => { setFilterStatuses([]); setFilterPriorities([]); setFilterBUs([]); setFilterValueDrivers([]) }

  const PER_PAGE        = 60
  const [page, setPage] = useState(1)
  const totalPages      = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safeP           = Math.min(page, totalPages)
  const paged           = filtered.slice((safeP - 1) * PER_PAGE, safeP * PER_PAGE)
  useEffect(() => { setPage(1) }, [buFilter, deptFilter, filterStatuses, filterPriorities, filterBUs, filterValueDrivers, search])

  const toggleDriver = (v: ValueDriver) =>
    setFValueDrivers(prev => {
      if (prev.includes(v)) {
        if (v === 'Cost Saving') setFCostSaving('')
        if (v === 'Time Saving') setFTimeSaving('')
        if (v === 'Site Safety') setFSafetyImpact('')
        if (v === 'Quality')     setFQualitySaving('')
        if (v === 'ESG')         setFEsgOffset('')
        return prev.filter(x => x !== v)
      }
      return [...prev, v]
    })
  const toggleBU = (v: string) =>
    setFBUs(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  const toggleDept = (v: string) =>
    setFDepts(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])

  const resetForm = () => {
    setFId(''); setFName(''); setFDesc(''); setFProblem(''); setFSolution('')
    setFValueDrivers([]); setFCostSaving(''); setFTimeSaving('')
    setFQualitySaving(''); setFSafetyImpact(''); setFEsgOffset('')
    setFIdentifiedSolution(''); setFLinkedStartup('')
    setFBUs([]); setFDepts([]); setFPriority('Medium'); setFStatus('Not Started')
    setFProgress(''); setFNextSteps(''); setFLessons(''); setFSaveError('')
    setFSecondaryDrivers([]); setFStakeholders([])
    setFLifecycleStages([]); setFProjectTypes([])
    setFProjectLocation([]); setFProjectSize([])
    setFTechCategory([]); setFImplComplexity(''); setFInvestmentLevel('')
    setFChangeMgmt(''); setFDeploymentType([])
  }

  const handleSave = async () => {
    if (!fName.trim()) return
    setFSaveError('')
    try {
      const res = await fetch('/api/initiatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initiativeId: fId.trim(),
          name: fName.trim(),
          description: fDesc.trim(),
          problemStatement: fProblem.trim(),
          proposedSolution: fSolution.trim(),
          valueDrivers: fValueDrivers,
          potentialCostSaving:    fCostSaving    ? Number(fCostSaving)    : null,
          potentialTimeSaving:    fTimeSaving    ? Number(fTimeSaving)    : null,
          potentialQualitySaving: fQualitySaving ? Number(fQualitySaving) : null,
          potentialSafetyImpact:  fSafetyImpact  ? Number(fSafetyImpact)  : null,
          potentialEsgOffset:     fEsgOffset     ? Number(fEsgOffset)     : null,
          identifiedSolution: fIdentifiedSolution || null,
          linkedStartup: fIdentifiedSolution === 'Startup Solution' ? fLinkedStartup.trim() || null : null,
          businessUnits: fBUs,
          departments: fDepts,
          priority: fPriority,
          status: fStatus,
          progress: fProgress.trim(),
          nextSteps: fNextSteps.trim(),
          lessonsLearnt: fLessons.trim(),
          secondaryValueDrivers:  fSecondaryDrivers,
          applicableStakeholders: fStakeholders,
          projectLifecycleStages: fLifecycleStages,
          projectTypes:           fProjectTypes,
          projectLocation:        fProjectLocation,
          applicableProjectSize:  fProjectSize,
          technologyCategory:     fTechCategory,
          implementationComplexity: fImplComplexity || null,
          investmentLevel:          fInvestmentLevel || null,
          changeManagementEffort:   fChangeMgmt || null,
          deploymentType:           fDeploymentType,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setFSaveError(data.error || 'Failed to save.'); return }
      setItems(prev => [data.initiative, ...prev])
      resetForm()
      setShowForm(false)
    } catch {
      setFSaveError('Network error. Please try again.')
    }
  }

  const pageTitle = deptFilter
    ? deptFilter
    : buFilter ? `${buFilter} Initiatives` : 'Initiatives'

  const pageSubtitle = deptFilter
    ? `Build · ${deptFilter} · ${filtered.length} initiative${filtered.length !== 1 ? 's' : ''}`
    : `${filtered.length} of ${items.length} initiatives${buFilter ? ` · ${buFilter}` : ''}`

  return (
    <>
    {showValueTracker && (
      <ValueTrackerModal items={items} onClose={() => setShowValueTracker(false)} />
    )}
    <div className="p-4 md:p-8 page-enter">
      <style>{`
        .init-form-grid > div[style*="grid-column"] { }
        @media (max-width: 767px) {
          .init-form-grid { grid-template-columns: 1fr !important; }
          .init-form-grid > div[style*="grid-column"] { grid-column: 1 !important; }
        }
      `}</style>

      <PageHeader
        title={pageTitle}
        eyebrow="Strategy"
        subtitle={pageSubtitle}
        actions={
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setShowValueTracker(true)} className="btn-secondary text-xs">
              <BarChart2 size={13} /> Value Tracker
            </button>
            <button type="button" onClick={() => exportInitiativesBoard(filtered).catch(console.error)} className="btn-secondary text-xs">
              <Download size={13} /> Export
            </button>
            {admin && (
              <button type="button" onClick={() => { setFId(nextInitiativeId); setShowForm(v => !v) }} className="btn-primary text-sm">
                <Plus size={15} /> Add Initiative
              </button>
            )}
          </div>
        }
      />

      {/* ── Create form ── */}
      {showForm && admin && (
        <div className="inn-card p-6 mb-6" style={{ borderColor: 'var(--aqua-border)' }}>
          <div className="flex items-center justify-between mb-5">
            <p className="text-xs font-bold tracking-widest" style={{ color: 'var(--accent)' }}>NEW INITIATIVE</p>
            <button type="button" onClick={() => { setShowForm(false); resetForm() }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={16} />
            </button>
          </div>

          <div className="init-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 16, rowGap: 14 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <p className="text-xs font-bold tracking-widest mb-3" style={{ color: 'var(--faint)' }}>INITIATIVE DETAILS</p>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Initiative ID <span style={{ fontWeight: 300, color: 'var(--faint)' }}>(auto-generated)</span></label>
              <input type="text" value={fId} readOnly className="inn-input" style={{ background: 'var(--surface-2)', color: 'var(--gray-500)', cursor: 'default' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Initiative Name *</label>
              <input type="text" value={fName} onChange={e => setFName(e.target.value)} placeholder="Short descriptive name" className="inn-input" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Description</label>
              <input type="text" value={fDesc} onChange={e => setFDesc(e.target.value)} placeholder="One-line summary" className="inn-input" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Problem Statement</label>
              <textarea value={fProblem} onChange={e => setFProblem(e.target.value)} rows={3} placeholder="Describe the problem or pain point…" className="inn-input" style={{ resize: 'vertical' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Proposed Solution</label>
              <textarea value={fSolution} onChange={e => setFSolution(e.target.value)} rows={3} placeholder="Describe the proposed solution…" className="inn-input" style={{ resize: 'vertical' }} />
            </div>

            <div style={{ gridColumn: '1 / -1', paddingTop: 24, borderTop: '1px solid var(--gray-100)' }}>
              <p className="text-xs font-bold tracking-widest mb-3" style={{ color: 'var(--faint)' }}>VALUE & SOLUTION</p>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <PillSelect label="Primary Value Driver" options={VALUE_DRIVERS} selected={fValueDrivers} onToggle={toggleDriver} color="var(--accent)" />
              {fValueDrivers.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14, padding: '14px 16px', borderRadius: 10, background: 'var(--aqua-pale)', border: '1px solid var(--aqua-light)' }}>
                  <p style={{ gridColumn: '1 / -1', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-primary)', margin: '0 0 2px' }}>VALUE TRACKER</p>
                  {fValueDrivers.includes('Cost Saving') && (
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Cost Saving <span style={{ fontWeight: 300, color: 'var(--faint)' }}>(AED/year)</span></label>
                      <input type="number" min={0} value={fCostSaving} onChange={e => setFCostSaving(e.target.value)} placeholder="0" className="inn-input" />
                    </div>
                  )}
                  {fValueDrivers.includes('Time Saving') && (
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Time Saving <span style={{ fontWeight: 300, color: 'var(--faint)' }}>(Hours/year)</span></label>
                      <input type="number" min={0} value={fTimeSaving} onChange={e => setFTimeSaving(e.target.value)} placeholder="0" className="inn-input" />
                    </div>
                  )}
                  {fValueDrivers.includes('Site Safety') && (
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Safety <span style={{ fontWeight: 300, color: 'var(--faint)' }}>(Injuries Prevented)</span></label>
                      <input type="number" min={0} value={fSafetyImpact} onChange={e => setFSafetyImpact(e.target.value)} placeholder="0" className="inn-input" />
                    </div>
                  )}
                  {fValueDrivers.includes('Quality') && (
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Quality <span style={{ fontWeight: 300, color: 'var(--faint)' }}>(AED Saved by Re-Work)</span></label>
                      <input type="number" min={0} value={fQualitySaving} onChange={e => setFQualitySaving(e.target.value)} placeholder="0" className="inn-input" />
                    </div>
                  )}
                  {fValueDrivers.includes('ESG') && (
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>ESG <span style={{ fontWeight: 300, color: 'var(--faint)' }}>(Carbon Offset kg CO₂)</span></label>
                      <input type="number" min={0} value={fEsgOffset} onChange={e => setFEsgOffset(e.target.value)} placeholder="0" className="inn-input" />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Identified Solution</label>
              <select value={fIdentifiedSolution} onChange={e => { const v = e.target.value as IdentifiedSolution; setFIdentifiedSolution(v); if (v !== 'Startup Solution') setFLinkedStartup('') }} className="inn-select">
                <option value="">— Select —</option>
                {IDENTIFIED_SOLUTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {fIdentifiedSolution === 'Startup Solution' && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Link Startup</label>
                <StartupSearch value={fLinkedStartup} onChange={setFLinkedStartup} />
              </div>
            )}

            <div style={{ gridColumn: '1 / -1', paddingTop: 24, borderTop: '1px solid var(--gray-100)' }}>
              <p className="text-xs font-bold tracking-widest mb-3" style={{ color: 'var(--faint)' }}>INNOVO CONTEXT</p>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <PillSelect label="Business Unit" options={INITIATIVE_BUSINESS_UNITS} selected={fBUs} onToggle={toggleBU} color="#122023" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <PillSelect label="Department" options={INITIATIVE_DEPARTMENTS} selected={fDepts} onToggle={toggleDept} color="var(--gray-500)" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Priority</label>
              <select value={fPriority} onChange={e => setFPriority(e.target.value as InitiativePriority)} className="inn-select">
                {INITIATIVE_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1', paddingTop: 24, borderTop: '1px solid var(--gray-100)' }}>
              <p className="text-xs font-bold tracking-widest mb-3" style={{ color: 'var(--faint)' }}>STATUS & PROGRESS</p>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Status</label>
              <select value={fStatus} onChange={e => setFStatus(e.target.value as InitiativeStatus)} className="inn-select">
                {INITIATIVE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Progress</label>
              <textarea value={fProgress} onChange={e => setFProgress(e.target.value)} rows={2} placeholder="Current progress notes…" className="inn-input" style={{ resize: 'vertical' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Next Steps</label>
              <textarea value={fNextSteps} onChange={e => setFNextSteps(e.target.value)} rows={2} placeholder="What comes next…" className="inn-input" style={{ resize: 'vertical' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Lessons Learnt</label>
              <textarea value={fLessons} onChange={e => setFLessons(e.target.value)} rows={2} placeholder="Key learnings so far…" className="inn-input" style={{ resize: 'vertical' }} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 mt-6">
            <div>
              {fSaveError
                ? <p className="text-xs font-medium" style={{ color: '#ef4444' }}>{fSaveError}</p>
                : <p className="text-xs font-light" style={{ color: 'var(--faint)' }}>Fields marked * are required</p>
              }
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setShowForm(false); resetForm() }} className="btn-secondary text-xs">Cancel</button>
              <button type="button" onClick={handleSave} disabled={!fName.trim()} className="btn-aqua text-xs" style={{ opacity: fName.trim() ? 1 : 0.5 }}>
                Create Initiative
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toolbar (matches startups page exactly) ── */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-56">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--faint)', pointerEvents: 'none' }} />
          <input type="text" placeholder="Search initiatives…" value={search}
            onChange={e => setSearch(e.target.value)} className="inn-input" style={{ paddingLeft: 38, paddingRight: 12 }} />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ background: 'none', border: 'none', color: 'var(--faint)', cursor: 'pointer' }}>
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filters button */}
        <button onClick={() => setShowFilters(v => !v)} className="btn-secondary" style={{ position: 'relative' }}>
          <SlidersHorizontal size={14} /> Filters
          {panelActiveCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[10px] font-medium flex items-center justify-center"
              style={{ background: 'var(--accent)', color: '#fff' }}>{panelActiveCount}</span>
          )}
        </button>

        {/* View toggle */}
        <div className="flex items-center rounded-lg p-0.5 gap-0" style={{ background: 'var(--gray-100)', border: '1px solid var(--border)' }}>
          {([['grid', LayoutGrid, 'Grid'], ['table', List, 'Table'], ['kanban', Kanban, 'Board']] as const).map(([m, Icon, lbl]) => (
            <button key={m} onClick={() => setView(m)} title={lbl}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all text-xs font-medium"
              style={{ background: view === m ? 'var(--surface)' : 'transparent', color: view === m ? 'var(--text-primary)' : 'var(--text-muted)', border: 'none', cursor: 'pointer', boxShadow: view === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
              <Icon size={13} />{lbl}
            </button>
          ))}
        </div>
      </div>

      {/* ── Filter panel ── */}
      {showFilters && (
        <div className="flex items-center gap-2 mb-5 flex-wrap p-4 rounded-xl animate-slide-up"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', opacity: 0, animationFillMode: 'forwards', position: 'relative', zIndex: 100 }}>
          <CheckboxDropdown label="Status"        options={INITIATIVE_STATUSES}     selected={filterStatuses}     onChange={setFilterStatuses}     />
          <CheckboxDropdown label="Priority"      options={INITIATIVE_PRIORITIES}   selected={filterPriorities}   onChange={setFilterPriorities}   />
          <CheckboxDropdown label="Business Unit" options={INITIATIVE_BUSINESS_UNITS} selected={filterBUs}        onChange={setFilterBUs}          />
          <CheckboxDropdown label="Value Driver"  options={VALUE_DRIVERS}           selected={filterValueDrivers} onChange={setFilterValueDrivers} />
          {panelActiveCount > 0 && (
            <button onClick={clearPanelFilters} style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>
              <X size={12} /> Clear all
            </button>
          )}
        </div>
      )}

      {/* ── Active filter pills ── */}
      {panelActiveCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {[...filterStatuses, ...filterPriorities, ...filterBUs, ...filterValueDrivers].map(f => (
            <span key={f} className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ background: 'var(--aqua-light)', color: 'var(--accent)', border: '1px solid var(--aqua-border)' }}>
              {f}
              <button type="button" onClick={() => {
                setFilterStatuses(p    => p.filter(x => x !== f))
                setFilterPriorities(p  => p.filter(x => x !== f))
                setFilterBUs(p         => p.filter(x => x !== f))
                setFilterValueDrivers(p => p.filter(x => x !== f))
              }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 0, display: 'flex' }}>
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* ── Results ── */}
      {filtered.length === 0 ? (
        <div className="inn-card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <Target size={20} style={{ color: 'var(--faint)' }} />
            </div>
            <h3>{search || panelActiveCount > 0 ? 'No initiatives match your filters' : 'No initiatives yet'}</h3>
            <p>{search || panelActiveCount > 0
              ? 'Try adjusting your search or clearing the active filters.'
              : 'Create your first initiative to start tracking strategic programs.'}</p>
            {(search || panelActiveCount > 0) && (
              <button onClick={() => { setSearch(''); clearPanelFilters() }} className="btn-secondary" style={{ marginTop: 8, fontSize: 12 }}>
                Clear filters
              </button>
            )}
          </div>
        </div>

      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paged.map((item, idx) => (
            <div key={item.id} className="animate-slide-up" style={{ opacity: 0, animationFillMode: 'forwards', animationDelay: `${Math.min(idx * 0.04, 0.28)}s` }}>
              <InitiativeCard item={item} />
            </div>
          ))}
        </div>

      ) : view === 'kanban' ? (
        <KanbanView items={paged} />

      ) : (
        /* Table view */
        <div className="inn-card overflow-x-auto">
          <table className="inn-table">
            <thead>
              <tr>
                {([
                  { key: 'id',       label: 'ID' },
                  { key: 'name',     label: 'Name' },
                  { key: 'status',   label: 'Status' },
                  { key: 'priority', label: 'Priority' },
                  { key: null,       label: 'Business Units' },
                  { key: null,       label: 'Departments' },
                  { key: null,       label: 'Value Drivers' },
                  { key: 'created',  label: 'Created' },
                ] as { key: typeof sortBy | null; label: string }[]).map(col => (
                  <th key={col.label}
                    onClick={col.key ? () => toggleSort(col.key!) : undefined}
                    style={{ cursor: col.key ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {col.label}
                      {col.key && (
                        <span style={{ fontSize: 10, color: sortBy === col.key ? 'var(--accent)' : 'var(--faint)' }}>
                          {sortBy === col.key ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((item, idx) => {
                const ss = STATUS_STYLE[item.status] || { bg: 'var(--gray-100)', text: 'var(--gray-500)', border: 'var(--border)' }
                const ps = PRIORITY_STYLE[item.priority] || { bg: 'var(--gray-100)', text: 'var(--gray-500)' }
                return (
                  <tr key={item.id} className="animate-slide-up" style={{ cursor: 'pointer', opacity: 0, animationFillMode: 'forwards', animationDelay: `${Math.min(idx * 40, 280)}ms` }} onClick={() => window.location.href = `/initiatives/${item.id}`}>
                    <td>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', background: 'var(--aqua-light)', padding: '2px 8px', borderRadius: 999 }}>{item.initiativeId}</span>
                    </td>
                    <td>
                      <p className="font-medium text-xs" style={{ color: 'var(--text-primary)', maxWidth: 200 }}>{item.name}</p>
                      {item.description && <p className="text-[10px] mt-0.5 truncate max-w-48" style={{ color: 'var(--faint)' }}>{item.description}</p>}
                    </td>
                    <td>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: ss.bg, color: ss.text, border: `1px solid ${ss.border}`, whiteSpace: 'nowrap' }}>{item.status}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: ps.bg, color: ps.text }}>{item.priority}</span>
                    </td>
                    <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.businessUnits.join(', ') || '—'}</td>
                    <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.departments.join(', ') || '—'}</td>
                    <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.valueDrivers.join(', ') || '—'}</td>
                    <td className="text-xs" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={safeP} totalPages={totalPages} onChange={setPage} />
    </div>
    </>
  )
}

// Stable lookup maps for sorting — module scope so they're not recreated each
// render (keeps the sorted useMemo's dependency list honest).
const PRIORITY_ORDER = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 }
const STATUS_ORDER = { 'Not Started': 0, 'Pre-Evaluation': 1, 'In Progress': 2, 'Pilot': 3, 'Live': 4, 'On Hold': 5, 'Closed': 6 }

export default function InitiativesBoardPage() {
  return (
    <Suspense fallback={<div className="p-8"><p className="text-sm font-light" style={{ color: 'var(--faint)' }}>Loading…</p></div>}>
      <InitiativesBoardInner />
    </Suspense>
  )
}
