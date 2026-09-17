'use client'
import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/lib/client/context'
import { useTheme } from '@/lib/client/theme'
import type { Initiative } from '@/lib/shared/data/initiatives-data'
import {
  STAKEHOLDERS, PROJECT_LIFECYCLE_STAGES, PROJECT_TYPES, PROJECT_LOCATIONS,
  PROJECT_SIZE_OPTIONS, PROJECT_COMPLEXITIES,
  SECONDARY_VALUE_DRIVERS, PRIMARY_VALUE_DRIVERS,
} from '@/lib/shared/constants'
import { RotateCcw, ArrowRight, Lightbulb } from 'lucide-react'

const CONTRACTOR_SPECIALITIES = ['Build', 'MEP', 'Infrastructure'] as const

// ── Pill ─────────────────────────────────────────────────────────────────────
function Pill({
  label, active, onToggle, color = 'var(--accent)',
}: {
  label: string; active: boolean; onToggle: () => void; color?: string
}) {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  // In dark mode several per-group colours (dark slate, muted greys) disappear
  // on the dark surface, so selected pills use one clearly-visible aqua fill.
  const activeBg     = dark ? 'var(--aqua)' : color
  const activeText   = dark ? '#06201f'     : '#fff'
  const activeBorder = dark ? 'var(--aqua)' : color
  return (
    <button
      type="button"
      onClick={onToggle}
      className="pill-btn"
      style={{
        background: active ? activeBg : 'var(--surface)',
        color: active ? activeText : 'var(--gray-500)',
        border: `1.5px solid ${active ? activeBorder : 'var(--border)'}`,
        boxShadow: active
          ? (dark ? '0 2px 12px rgba(94,221,215,0.30)' : '0 2px 10px rgba(15,28,31,0.14), inset 0 1px 0 rgba(255,255,255,0.15)')
          : 'none',
      }}
    >
      {label}
    </button>
  )
}

// ── Step badge ────────────────────────────────────────────────────────────────
function StepBadge({ n }: { n: number }) {
  return (
    <div style={{
      width: 30, height: 30, borderRadius: 999, flexShrink: 0,
      background: 'rgba(15,151,144,0.08)',
      border: '1.5px solid rgba(15,151,144,0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.05em' }}>
        {String(n).padStart(2, '0')}
      </span>
    </div>
  )
}

// ── Section card (double-bezel) ───────────────────────────────────────────────
function SectionCard({
  step, title, subtitle, children,
}: {
  step: number; title: string; subtitle?: string; children: React.ReactNode
}) {
  return (
    <div className="bezel-outer">
      <div className="bezel-inner">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 24 }}>
          <StepBadge n={step} />
          <div style={{ paddingTop: 2 }}>
            <p style={{
              margin: '0 0 3px 0', fontSize: 10, fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)',
            }}>{title}</p>
            {subtitle && (
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.015em', lineHeight: 1.3 }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ── Filter group ──────────────────────────────────────────────────────────────
function FilterGroup({
  label, options, selected, onToggle, onSetAll, color, singleSelect,
}: {
  label: string
  options: readonly string[]
  selected: string[]
  onToggle: (v: string) => void
  onSetAll: (vals: string[]) => void
  color?: string
  singleSelect?: boolean
}) {
  const hasAllOption = options.includes('All')
  const nonAllOptions = hasAllOption ? options.filter(o => o !== 'All') : options
  const allNonAllSelected = nonAllOptions.length > 0 && nonAllOptions.every(o => selected.includes(o))

  const handleToggle = (v: string) => {
    if (v === 'All' && hasAllOption) {
      onSetAll(allNonAllSelected ? [] : Array.from(nonAllOptions))
    } else if (singleSelect) {
      onSetAll(selected.includes(v) ? [] : [v])
    } else {
      onToggle(v)
    }
  }

  return (
    <div>
      <p style={{ margin: '0 0 10px 0', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {label}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {options.map(o => (
          <Pill
            key={o}
            label={o}
            active={o === 'All' ? allNonAllSelected : selected.includes(o)}
            onToggle={() => handleToggle(o)}
            color={color}
          />
        ))}
      </div>
    </div>
  )
}

// ── AND-match logic ───────────────────────────────────────────────────────────
function arrMatch(startupVals: string[] | undefined, selected: string[]): boolean {
  if (!selected.length) return true
  if (!startupVals?.length) return false
  if (startupVals.includes('All')) return true
  return selected.some(s => startupVals.includes(s))
}
function strMatch(startupVal: string | null | undefined, selected: string[]): boolean {
  if (!selected.length) return true
  if (!startupVal) return false
  // handle comma-separated multi-values (e.g. "Simple, Complex") — must match the
  // results page exactly, or the count here won't equal the results shown.
  const parts = startupVal.split(', ').map(v => v.trim()).filter(Boolean)
  return selected.some(s => parts.includes(s))
}

export default function InnovationConciergePage() {
  const router = useRouter()
  const { visibleStartups } = useApp()
  const [initiatives, setInitiatives] = useState<Initiative[]>([])
  useEffect(() => {
    fetch('/api/initiatives')
      .then(r => r.json())
      .then(d => setInitiatives((d.initiatives || []).filter((ini: Initiative) => ini.visibility === 'Global')))
      .catch(() => {})
  }, [])

  const [selStakeholders,   setStakeholders]   = useState<string[]>([])
  const [selContractorSpec, setContractorSpec] = useState<string[]>([])
  const [selStages,         setStages]         = useState<string[]>([])
  const [selTypes,          setTypes]          = useState<string[]>([])
  const [selLocations,      setLocations]      = useState<string[]>([])
  const [selSizes,          setSizes]          = useState<string[]>([])
  const [selProjComplexity, setProjComplexity] = useState<string[]>([])
  const [selFocusAreas,     setFocusAreas]     = useState<string[]>([])

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (v: string) =>
    setter(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v])

  const setAll = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (vals: string[]) =>
    setter(vals)

  const toggleStakeholder = (v: string) => {
    setStakeholders(prev => {
      const next = prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]
      if (!next.includes('Contractor')) setContractorSpec([])
      return next
    })
  }
  const setAllStakeholders = (vals: string[]) => {
    setStakeholders(vals)
    if (!vals.includes('Contractor')) setContractorSpec([])
  }

  const contractorActive = selStakeholders.includes('Contractor')

  const hasFilters = [
    selStakeholders, selContractorSpec, selStages, selTypes,
    selLocations, selSizes, selProjComplexity, selFocusAreas,
  ].some(a => a.length > 0)

  const resetAll = () => {
    setStakeholders([]); setContractorSpec([]); setStages([]); setTypes([])
    setLocations([]); setSizes([]); setProjComplexity([]); setFocusAreas([])
  }

  const matchCount = useMemo(() => {
    if (!hasFilters) return 0
    const startupCount = visibleStartups.filter(s =>
      arrMatch(s.applicableStakeholders,  selStakeholders)  &&
      arrMatch(s.projectLifecycleStages,  selStages)        &&
      arrMatch(s.projectTypes,            selTypes)         &&
      arrMatch(s.projectLocation,         selLocations)     &&
      arrMatch(s.applicableProjectSize,   selSizes)         &&
      strMatch(s.projectComplexity,       selProjComplexity) &&
      arrMatch([...(s.valueDrivers || []), ...(s.secondaryValueDrivers || [])], selFocusAreas) &&
      (!contractorActive || selContractorSpec.length === 0 || arrMatch(s.businessUnits, selContractorSpec))
    ).length
    const initiativeCount = initiatives.filter(ini =>
      arrMatch(ini.applicableStakeholders,  selStakeholders)  &&
      arrMatch(ini.projectLifecycleStages,  selStages)        &&
      arrMatch(ini.projectTypes,            selTypes)         &&
      arrMatch(ini.projectLocation,         selLocations)     &&
      arrMatch(ini.applicableProjectSize,   selSizes)         &&
      strMatch(ini.projectComplexity,       selProjComplexity) &&
      arrMatch([...(ini.valueDrivers || []), ...(ini.secondaryValueDrivers || [])], selFocusAreas)
    ).length
    return startupCount + initiativeCount
  }, [visibleStartups, initiatives, selStakeholders, selContractorSpec, selStages, selTypes, selLocations, selSizes, selProjComplexity, selFocusAreas, hasFilters, contractorActive])

  const handleSubmit = () => {
    const params = new URLSearchParams()
    if (selStakeholders.length)   params.set('stakeholders',   selStakeholders.join('|'))
    if (selStages.length)         params.set('stages',         selStages.join('|'))
    if (selTypes.length)          params.set('types',          selTypes.join('|'))
    if (selLocations.length)      params.set('locations',      selLocations.join('|'))
    if (selSizes.length)          params.set('sizes',          selSizes.join('|'))
    if (selProjComplexity.length) params.set('projComplexity', selProjComplexity.join('|'))
    if (selFocusAreas.length)     params.set('focusAreas',     selFocusAreas.join('|'))
    if (contractorActive && selContractorSpec.length)
                                  params.set('contractorSpec', selContractorSpec.join('|'))
    router.push(`/innovation-concierge/results?${params.toString()}`)
  }

  const focusAreaOptions = [...PRIMARY_VALUE_DRIVERS, ...SECONDARY_VALUE_DRIVERS] as readonly string[]

  return (
    <div className="p-4 md:p-8" style={{ maxWidth: 860 }}>

      {/* ── Page header ── */}
      <div className="page-enter" style={{ marginBottom: 36 }}>
        <span className="eyebrow-badge" style={{ marginBottom: 14 }}>
          <Lightbulb size={10} />
          Innovation Concierge
        </span>
        <h1 style={{
          fontSize: 26, fontWeight: 700, color: 'var(--text-primary)',
          letterSpacing: '-0.03em', lineHeight: 1.2, margin: '0 0 10px 0',
        }}>
          Find the right technology<br />for your project.
        </h1>
        <p style={{ fontSize: 13, fontWeight: 300, color: 'var(--text-muted)', margin: 0, maxWidth: 440, lineHeight: 1.6 }}>
          Answer a few questions and we&apos;ll match initiatives &amp; startups to your project context.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Section 1: Stakeholder ── */}
        <div className="concierge-section" style={{ animationDelay: '0.05s' }}>
          <SectionCard step={1} title="Stakeholder Details" subtitle="What is your role on the project?">
            <FilterGroup
              label="Your role"
              options={STAKEHOLDERS}
              selected={selStakeholders}
              onToggle={toggleStakeholder}
              onSetAll={setAllStakeholders}
              color="#122023"
            />

            {contractorActive && (
              <div className="spec-reveal" style={{
                marginTop: -4, paddingTop: 20,
                borderTop: '1px dashed rgba(226,234,236,0.9)',
              }}>
                <p style={{ margin: '0 0 10px 0', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Area of speciality
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {CONTRACTOR_SPECIALITIES.map(o => (
                    <Pill
                      key={o}
                      label={o}
                      active={selContractorSpec.includes(o)}
                      onToggle={() => toggle(setContractorSpec)(o)}
                      color="#122023"
                    />
                  ))}
                </div>
              </div>
            )}
          </SectionCard>
        </div>

        {/* ── Section 2: Project context ── */}
        <div className="concierge-section" style={{ animationDelay: '0.11s' }}>
          <SectionCard step={2} title="Tell us about your project" subtitle="Describe your project context">
            <FilterGroup label="Project Sector"                          options={PROJECT_TYPES}        selected={selTypes}          onToggle={toggle(setTypes)}          onSetAll={setAll(setTypes)}          color="var(--gray-500)" />
            <FilterGroup label="Applicable Project Size (BUA)"           options={PROJECT_SIZE_OPTIONS}  selected={selSizes}          onToggle={toggle(setSizes)}          onSetAll={setAll(setSizes)}          color="var(--text-secondary)" singleSelect />
            <FilterGroup label="Project Location"                        options={PROJECT_LOCATIONS}     selected={selLocations}      onToggle={toggle(setLocations)}      onSetAll={setAll(setLocations)}      color="#122023" singleSelect />
            <FilterGroup label="Project Complexity"                      options={PROJECT_COMPLEXITIES}  selected={selProjComplexity} onToggle={toggle(setProjComplexity)} onSetAll={setAll(setProjComplexity)} color="var(--accent)" singleSelect />
            <FilterGroup label="Project Lifecycle Stage (Current Stage)" options={PROJECT_LIFECYCLE_STAGES as any} selected={selStages} onToggle={toggle(setStages)} onSetAll={setAll(setStages)} color="var(--chip-cyan)" />
          </SectionCard>
        </div>

        {/* ── Section 3: Goals ── */}
        <div className="concierge-section" style={{ animationDelay: '0.17s' }}>
          <SectionCard step={3} title="Project Goals" subtitle="Select the focus areas most relevant to your project">
            <FilterGroup
              label="Focus Areas"
              options={focusAreaOptions}
              selected={selFocusAreas}
              onToggle={toggle(setFocusAreas)}
              onSetAll={setAll(setFocusAreas)}
              color="var(--chip-green)"
            />
          </SectionCard>
        </div>

        {/* ── Action bar ── */}
        <div className="concierge-section" style={{ animationDelay: '0.22s' }}>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '18px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
            boxShadow: '0 1px 2px rgba(15,28,31,0.04), 0 4px 16px rgba(15,28,31,0.03)',
          }}>
            <div>
              {hasFilters ? (
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)', letterSpacing: '-0.03em' }}>
                    {matchCount}
                  </span>
                  {' '}
                  <span style={{ color: 'var(--text-muted)', fontWeight: 300 }}>
                    result{matchCount !== 1 ? 's' : ''} match your criteria
                  </span>
                </p>
              ) : (
                <p style={{ margin: 0, fontSize: 12, fontWeight: 300, color: 'var(--faint)' }}>
                  Select at least one criterion above to see results
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
              <button
                type="button"
                onClick={resetAll}
                disabled={!hasFilters}
                className="btn-secondary flex items-center gap-1.5"
                style={{ opacity: hasFilters ? 1 : 0.35, cursor: hasFilters ? 'pointer' : 'not-allowed', fontSize: 12 }}
              >
                <RotateCcw size={11} /> Clear
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!hasFilters}
                className="btn-primary flex items-center gap-2"
                style={{ opacity: hasFilters ? 1 : 0.4, cursor: hasFilters ? 'pointer' : 'not-allowed' }}
              >
                View matches <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
