'use client'
import { Suspense, useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, SearchX, Target } from 'lucide-react'
import { useApp } from '@/lib/client/context'
import Badge from '@/components/ui/Badge'
import type { Initiative } from '@/lib/shared/data/initiatives-data'
import { STATUS_STYLE } from '@/lib/shared/data/initiatives-data'

function arrMatch(vals: string[] | undefined, selected: string[]): boolean {
  if (!selected.length) return true
  if (!vals?.length) return false
  if (vals.includes('All')) return true
  return selected.some(s => vals.includes(s))
}
function strMatch(val: string | null | undefined, selected: string[]): boolean {
  if (!selected.length) return true
  if (!val) return false
  // handle comma-separated multi-values (e.g. "Simple, Complex")
  const parts = val.split(', ').map(v => v.trim()).filter(Boolean)
  return selected.some(s => parts.includes(s))
}
function parse(params: URLSearchParams, key: string): string[] {
  const val = params.get(key)
  return val ? val.split('|') : []
}

const CARD_STYLE = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 13,
  padding: '20px',
  height: '100%',
  cursor: 'pointer',
  boxShadow: '0 1px 2px rgba(15,28,31,0.04), 0 4px 12px rgba(15,28,31,0.03)',
  transition: 'border-color 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s cubic-bezier(0.16,1,0.3,1), transform 0.2s cubic-bezier(0.16,1,0.3,1)',
  display: 'flex', flexDirection: 'column' as const,
}

function ResultsContent() {
  const searchParams = useSearchParams()
  const { visibleStartups } = useApp()
  const [initiatives, setInitiatives] = useState<Initiative[]>([])

  useEffect(() => {
    fetch('/api/initiatives')
      .then(r => r.json())
      .then(d => setInitiatives(
        (d.initiatives || []).filter((ini: Initiative) => ini.visibility === 'Global')
      ))
      .catch(() => {})
  }, [])

  const selStakeholders   = parse(searchParams, 'stakeholders')
  const selContractorSpec = parse(searchParams, 'contractorSpec')
  const selStages         = parse(searchParams, 'stages')
  const selTypes          = parse(searchParams, 'types')
  const selLocations      = parse(searchParams, 'locations')
  const selSizes          = parse(searchParams, 'sizes')
  const selProjComplexity = parse(searchParams, 'projComplexity')
  const selFocusAreas     = parse(searchParams, 'focusAreas')

  const contractorActive = selStakeholders.includes('Contractor')

  const startupResults = useMemo(() =>
    visibleStartups.filter(s =>
      arrMatch(s.applicableStakeholders,   selStakeholders)   &&
      arrMatch(s.projectLifecycleStages,   selStages)         &&
      arrMatch(s.projectTypes,             selTypes)          &&
      arrMatch(s.projectLocation,          selLocations)      &&
      arrMatch(s.applicableProjectSize,    selSizes)          &&
      strMatch(s.projectComplexity,        selProjComplexity) &&
      arrMatch([...(s.valueDrivers || []), ...(s.secondaryValueDrivers || [])], selFocusAreas) &&
      (!contractorActive || selContractorSpec.length === 0 || arrMatch(s.businessUnits, selContractorSpec))
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleStartups, searchParams.toString()]
  )

  const initiativeResults = useMemo(() =>
    initiatives.filter(ini =>
      arrMatch(ini.applicableStakeholders,  selStakeholders)   &&
      arrMatch(ini.projectLifecycleStages,  selStages)         &&
      arrMatch(ini.projectTypes,            selTypes)          &&
      arrMatch(ini.projectLocation,         selLocations)      &&
      arrMatch(ini.applicableProjectSize,   selSizes)          &&
      strMatch(ini.projectComplexity,       selProjComplexity) &&
      arrMatch([...(ini.valueDrivers || []), ...(ini.secondaryValueDrivers || [])], selFocusAreas)
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initiatives, searchParams.toString()]
  )

  const totalResults = startupResults.length + initiativeResults.length

  const activeTags = [
    ...selStakeholders, ...selContractorSpec, ...selTypes, ...selStages,
    ...selLocations, ...selSizes, ...selProjComplexity, ...selFocusAreas,
  ]

  // Return URL so a startup/initiative opened from here comes back to THIS
  // result set (filters preserved), not the generic list.
  const returnTo = `/innovation-concierge/results?${searchParams.toString()}`

  return (
    <div className="p-4 md:p-8 page-enter" style={{ maxWidth: 1100 }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <Link href="/innovation-concierge" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: 20 }}>
          <button type="button" className="btn-secondary flex items-center gap-1.5" style={{ fontSize: 12 }}>
            <ArrowLeft size={13} /> Back to Concierge
          </button>
        </Link>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: '0 0 2px 0', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)' }}>
              Matched Results
            </p>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {totalResults === 0 ? 'No matches found' : (
                <><span style={{ color: 'var(--accent)' }}>{totalResults}</span>{' '}result{totalResults !== 1 ? 's' : ''} matched</>
              )}
            </h1>
          </div>
          {totalResults > 0 && (
            <p style={{ fontSize: 12, fontWeight: 300, color: 'var(--faint)', marginBottom: 3 }}>All criteria must match</p>
          )}
        </div>
      </div>

      {/* ── Active filter chips ── */}
      {activeTags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24 }}>
          {activeTags.map(tag => (
            <span key={tag} style={{
              fontSize: 11, fontWeight: 600, padding: '3px 11px', borderRadius: 999,
              background: 'var(--aqua-light)', color: 'var(--accent)', border: '1px solid rgba(15,151,144,0.2)',
              letterSpacing: '0.01em',
            }}>{tag}</span>
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {totalResults === 0 && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
          padding: '64px 24px', textAlign: 'center',
          boxShadow: '0 1px 2px rgba(15,28,31,0.04)',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: 'var(--gray-100)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <SearchX size={22} style={{ color: 'var(--faint)' }} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-secondary)', margin: '0 0 6px 0' }}>No matching results</p>
          <p style={{ fontSize: 13, fontWeight: 300, color: 'var(--faint)', margin: '0 0 20px 0', maxWidth: 300, marginLeft: 'auto', marginRight: 'auto' }}>
            Try going back and selecting fewer or different criteria.
          </p>
          <Link href="/innovation-concierge">
            <button type="button" className="btn-secondary" style={{ fontSize: 12 }}>Adjust criteria</button>
          </Link>
        </div>
      )}

      {/* ── Startups section ── */}
      {startupResults.length > 0 && (
        <div style={{ marginBottom: initiativeResults.length > 0 ? 40 : 0 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gray-500)', marginBottom: 12 }}>
            Startups · {startupResults.length}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 14 }}>
            {startupResults.map((s, i) => (
              <Link key={s.id} href={`/startups/${s.id}?from=${encodeURIComponent(returnTo)}`} style={{ textDecoration: 'none' }}>
                <div
                  className="result-card"
                  style={{ ...CARD_STYLE, animationDelay: `${Math.min(i * 0.05, 0.4)}s` }}
                  onMouseEnter={e => {
                    const el = e.currentTarget
                    el.style.borderColor = 'rgba(15,151,144,0.3)'
                    el.style.boxShadow = '0 2px 8px rgba(15,151,144,0.07), 0 8px 28px rgba(15,151,144,0.09)'
                    el.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget
                    el.style.borderColor = 'var(--border)'
                    el.style.boxShadow = '0 1px 2px rgba(15,28,31,0.04), 0 4px 12px rgba(15,28,31,0.03)'
                    el.style.transform = 'translateY(0)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ margin: '0 0 2px 0', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.company}
                      </p>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 300, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.product}
                      </p>
                    </div>
                    <Badge label={s.collaborationStatus} variant="status" className="text-[10px] flex-shrink-0" />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                    <Badge label={s.sector} variant="sector" className="text-[10px]" />
                    {s.technologies?.[0] && <Badge label={s.technologies[0]} variant="tech" className="text-[10px]" />}
                  </div>
                  {s.description && (
                    <p style={{
                      fontSize: 12, fontWeight: 300, color: 'var(--gray-500)', lineHeight: 1.55,
                      margin: '0 0 12px 0',
                      display: '-webkit-box', WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>{s.description}</p>
                  )}
                  <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--gray-100)', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {[
                      ...(selStakeholders.filter(v => s.applicableStakeholders?.includes(v))),
                      ...(selTypes.filter(v => s.projectTypes?.includes(v))),
                      ...(selStages.filter(v => s.projectLifecycleStages?.includes(v))),
                    ].slice(0, 4).map(tag => (
                      <span key={tag} style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 9px', borderRadius: 999,
                        background: 'var(--aqua-light)', color: 'var(--accent)', border: '1px solid rgba(15,151,144,0.18)',
                      }}>{tag}</span>
                    ))}
                    {s.hqCountry && (
                      <span style={{
                        fontSize: 10, fontWeight: 400, padding: '2px 9px', borderRadius: 999,
                        background: 'var(--gray-100)', color: 'var(--text-muted)',
                        display: 'flex', alignItems: 'center', gap: 3,
                      }}>
                        <MapPin size={9} />{s.hqCountry}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Initiatives section (Global only) ── */}
      {initiativeResults.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gray-500)', marginBottom: 12 }}>
            Initiatives · {initiativeResults.length}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 14 }}>
            {initiativeResults.map((ini, i) => {
              const statusStyle = STATUS_STYLE[ini.status] ?? STATUS_STYLE['Not Started']
              return (
                <Link key={ini.id} href={`/initiatives/${ini.id}?from=${encodeURIComponent(returnTo)}`} style={{ textDecoration: 'none' }}>
                  <div
                    className="result-card"
                    style={{ ...CARD_STYLE, animationDelay: `${Math.min(i * 0.05, 0.4)}s` }}
                    onMouseEnter={e => {
                      const el = e.currentTarget
                      el.style.borderColor = 'rgba(15,151,144,0.3)'
                      el.style.boxShadow = '0 2px 8px rgba(15,151,144,0.07), 0 8px 28px rgba(15,151,144,0.09)'
                      el.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget
                      el.style.borderColor = 'var(--border)'
                      el.style.boxShadow = '0 1px 2px rgba(15,28,31,0.04), 0 4px 12px rgba(15,28,31,0.03)'
                      el.style.transform = 'translateY(0)'
                    }}
                  >
                    {/* Card header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                          <Target size={11} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {ini.name}
                          </p>
                        </div>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 300, color: 'var(--text-muted)' }}>
                          {ini.initiativeId}
                        </p>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 999, flexShrink: 0,
                        background: statusStyle.bg, color: statusStyle.text, border: `1px solid ${statusStyle.border}`,
                      }}>{ini.status}</span>
                    </div>

                    {/* Business units */}
                    {ini.businessUnits?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                        {ini.businessUnits.slice(0, 2).map(bu => (
                          <span key={bu} style={{
                            fontSize: 10, fontWeight: 500, padding: '2px 9px', borderRadius: 999,
                            background: 'var(--gray-100)', color: 'var(--text-secondary)', border: '1px solid var(--border)',
                          }}>{bu}</span>
                        ))}
                        {ini.businessUnits.length > 2 && (
                          <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 9px', borderRadius: 999, background: 'var(--gray-100)', color: 'var(--text-muted)' }}>
                            +{ini.businessUnits.length - 2}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Description */}
                    {ini.description && (
                      <p style={{
                        fontSize: 12, fontWeight: 300, color: 'var(--gray-500)', lineHeight: 1.55,
                        margin: '0 0 12px 0',
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>{ini.description}</p>
                    )}

                    {/* Matched tags */}
                    <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--gray-100)', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {[
                        ...(selStakeholders.filter(v => ini.applicableStakeholders?.includes(v))),
                        ...(selTypes.filter(v => ini.projectTypes?.includes(v))),
                        ...(selStages.filter(v => ini.projectLifecycleStages?.includes(v))),
                      ].slice(0, 4).map(tag => (
                        <span key={tag} style={{
                          fontSize: 10, fontWeight: 600, padding: '2px 9px', borderRadius: 999,
                          background: 'var(--aqua-light)', color: 'var(--accent)', border: '1px solid rgba(15,151,144,0.18)',
                        }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ConciergeResultsPage() {
  return (
    <Suspense fallback={
      <div className="p-8" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ height: 120, borderRadius: 13 }} />
        ))}
      </div>
    }>
      <ResultsContent />
    </Suspense>
  )
}
