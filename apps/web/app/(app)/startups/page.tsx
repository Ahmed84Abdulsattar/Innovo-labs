'use client'
import { useState, useMemo, useRef, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, SlidersHorizontal, LayoutGrid, List, Kanban, Plus, Star, X, Download, ChevronDown, Upload, AlertCircle, CheckCircle2, Layers } from 'lucide-react'
import { useApp } from '@/lib/client/context'
import { SECTORS, COLLABORATION_STATUSES, PRIORITIES, BUSINESS_UNITS, BUILD_DEPARTMENTS, BUILD_DEPT_MAP, SOURCES, TECHNOLOGIES, PRODUCT_MATURITIES, RATINGS, NEXT_STEPS, COMMERCIAL_MODELS } from '@/lib/shared/constants'
import StartupCard from '@/components/startups/StartupCard'
import KanbanBoard from '@/components/startups/KanbanBoard'
import Badge from '@/components/ui/Badge'
import RatingDots from '@/components/ui/RatingDots'
import PageHeader from '@/components/layout/PageHeader'
import Pagination from '@/components/ui/Pagination'
import { exportAllStartups } from '@/lib/client/exportToExcel'
import { isAdmin } from '@/lib/shared/permissions'
import type { Startup } from '@/lib/shared/types'

type View = 'grid' | 'table' | 'kanban'

// Returns true if an startup belongs to the given Build sub-department
function matchesBuildDept(startupDepts: string[], buildDept: string): boolean {
  const mapped = BUILD_DEPT_MAP[buildDept] || [buildDept]
  return startupDepts.some(d => mapped.includes(d))
}

// ── Checkbox dropdown ─────────────────────────────────────────────────────
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

// ── Import result toast ───────────────────────────────────────────────────
function ImportToast({ result, onClose }: { result: { success: number; errors: string[] } | null; onClose: () => void }) {
  if (!result) return null
  const hasErrors = result.errors.length > 0
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 10000,
      background: 'var(--surface)', borderRadius: 12, padding: '16px 20px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.14)', border: `1px solid ${hasErrors ? 'var(--su-amber-border)' : 'var(--aqua-border)'}`,
      maxWidth: 380, animation: 'slide-up 0.2s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {hasErrors
          ? <AlertCircle size={18} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }} />
          : <CheckCircle2 size={18} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            {result.success > 0
              ? `${result.success} startup${result.success !== 1 ? 's' : ''} imported successfully`
              : 'Import completed with issues'}
          </p>
          {result.errors.length > 0 && (
            <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              {result.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
              {result.errors.length > 5 && <li>…and {result.errors.length - 5} more</li>}
            </ul>
          )}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--faint)', padding: 0, flexShrink: 0 }}>
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Excel Import Logic ────────────────────────────────────────────────────
// Import Template columns (data starts row 5 — rows 1-4 are headers/empty):
// A(1):blank  B(2):ID  C(3):Company  D(4):HQCountry  E(5):Website  F(6):Source
// G(7):ContactName  H(8):ContactEmail  I(9):ProductName  J(10):CommercialModel
// K(11):ProblemStatement  L(12):SolutionDetails  M(13):Sector  N(14):Technology
// O(15):ProductMaturity  P(16):Keywords  Q(17):BusinessUnits  R(18):Departments
// S(19):Priority  T(20):DocumentsLink  U(21):CollaborationStatus  V(22):StrategicFit
// W(23):Rating  X(24):NextSteps  Y(25):WhatsGreat  Z(26):WhatsLacking

// Returns the matching allowed value (case-insensitive) or an error string
function matchEnum<T extends string>(raw: string, allowed: readonly T[], label: string): T | string {
  if (!raw) return '' as T
  const found = allowed.find(v => v.toLowerCase() === raw.toLowerCase())
  if (found) return found
  return `invalid ${label} "${raw}" — allowed: ${allowed.join(', ')}`
}

function normaliseUrl(raw: string): string {
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  return `https://${raw}`
}

function normalizeCommercialModel(val: string): string {
  const v = val.toLowerCase().replace(/\s+/g, ' ').trim()
  if (v.includes('saas') || v.includes('per user')) return 'Saas/ Per user'
  if (v.includes('project') || v.includes('construction')) return 'Project/ Construction Value'
  if (v.includes('consumption')) return 'Consumption based'
  if (v.includes('hardware')) return 'Hardware + Software'
  return val
}

async function parseStartupsExcel(file: File): Promise<{ rows: Partial<Startup>[]; errors: string[] }> {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const buffer = await file.arrayBuffer()
  await wb.xlsx.load(buffer)

  const ws = wb.getWorksheet('Import Template') || wb.getWorksheet('Startups Import Template') || wb.getWorksheet('Startups') || wb.worksheets[0]
  if (!ws) return { rows: [], errors: ['Could not find the import sheet in the file.'] }

  const rows: Partial<Startup>[] = []
  const errors: string[] = []

  // col 1=ID(skip), 2=Company, 3=HQ Country, 4=Website, 5=Source,
  // 6=Contact Name, 7=Contact Email, 8=Product Name, 9=Commercial Model,
  // 10=Problem Statement, 11=Solution Details, 12=Sector, 13=Technology,
  // 14=Product Maturity, 15=Keywords, 16=Business Units, 17=Departments,
  // 18=Priority, 19=Documents Link, 20=Collaboration Status, 21=Strategic Fit,
  // 22=Rating, 23=Next Steps, 24=Whats great, 25=Whats lacking

  ws.eachRow((row, rowNum) => {
    if (rowNum < 4) return   // headers in row 3, data from row 4
    const get = (col: number): string => {
      const cell = row.getCell(col)
      const v = cell.value
      if (v === null || v === undefined) return ''
      if (typeof v === 'object' && 'text' in v) return String((v as any).text)
      if (typeof v === 'object' && 'richText' in v) return (v as any).richText.map((r: any) => r.text).join('')
      return String(v).trim()
    }

    // Skip rows where every relevant cell is empty (trailing blank rows)
    const hasAnyData = [2,3,4,5,6,7,8,9,10,11,12,13,14].some(c => get(c) !== '')
    if (!hasAnyData) return

    const rowErrors: string[] = []

    // ── Required fields ───────────────────────────────────────────────────
    const company = get(2)
    if (!company) rowErrors.push('Company name is required')

    const product = get(8)
    if (!product) rowErrors.push('Product / Solution is required')

    // ── Source — fall back to 'Others' if unrecognised ────────────────────
    const sourceRaw = get(5)
    const sourceMatch = matchEnum(sourceRaw, SOURCES, 'Source')
    const sourceVal = (typeof sourceMatch === 'string' && sourceMatch.startsWith('invalid')) || !sourceRaw
      ? 'Others'
      : sourceMatch

    // ── Sector — split multi-value, take first valid, fall back to 'ConTech'
    const sectorRaw   = get(12)
    const sectorFirst = sectorRaw ? sectorRaw.split(/[,;]/)[0].trim() : ''
    const sectorMatch = matchEnum(sectorFirst, SECTORS, 'Sector')
    const sectorVal   = (typeof sectorMatch === 'string' && sectorMatch.startsWith('invalid')) || !sectorFirst
      ? 'ConTech'
      : sectorMatch

    // ── Technology ────────────────────────────────────────────────────────
    const techRaw  = get(13)
    const techList = techRaw ? techRaw.split(/[,;]/).map(s => s.trim()).filter(Boolean) : []
    if (!techRaw)  rowErrors.push('At least one Technology is required')
    else {
      const badTechs = techList.filter(t => !TECHNOLOGIES.find(v => v.toLowerCase() === t.toLowerCase()))
      if (badTechs.length) rowErrors.push(`invalid Technology "${badTechs.join(', ')}" — allowed: ${TECHNOLOGIES.join(', ')}`)
    }

    // ── Commercial Model — normalise formatting before matching ───────────
    const commercialRaw  = get(9)
    const commercialNorm = commercialRaw ? normalizeCommercialModel(commercialRaw) : ''
    const commercialVal  = matchEnum(commercialNorm, COMMERCIAL_MODELS, 'Commercial Model')
    if (typeof commercialVal === 'string' && commercialVal.startsWith('invalid')) rowErrors.push(commercialVal)

    const maturityRaw = get(14)
    const maturityVal = matchEnum(maturityRaw, PRODUCT_MATURITIES, 'Product Maturity')
    if (typeof maturityVal === 'string' && maturityVal.startsWith('invalid')) rowErrors.push(maturityVal)

    const priorityRaw = get(18)
    const priorityVal = matchEnum(priorityRaw || 'Medium', PRIORITIES, 'Priority')
    if (typeof priorityVal === 'string' && priorityVal.startsWith('invalid')) rowErrors.push(priorityVal)

    const collabRaw  = get(20)
    const collabVal  = matchEnum(collabRaw || 'Identified', COLLABORATION_STATUSES, 'Status')
    if (typeof collabVal === 'string' && collabVal.startsWith('invalid')) rowErrors.push(collabVal)

    const fitRaw     = get(21)
    const FITS       = ['Excellent Fit', 'Good Fit', 'Not fit'] as const
    const fitVal     = matchEnum(fitRaw, FITS, 'Strategic Fit')
    if (typeof fitVal === 'string' && fitVal.startsWith('invalid')) rowErrors.push(fitVal)

    const ratingRaw  = get(22)
    const ratingVal  = matchEnum(ratingRaw, RATINGS, 'Rating')
    if (typeof ratingVal === 'string' && ratingVal.startsWith('invalid')) rowErrors.push(ratingVal)

    const nextRaw    = get(23)
    const nextVal    = matchEnum(nextRaw, NEXT_STEPS, 'Next Steps')
    if (typeof nextVal === 'string' && nextVal.startsWith('invalid')) rowErrors.push(nextVal)

    // ── Website — skip silently if not a valid URL ────────────────────────
    const websiteRaw = get(4)
    let websiteVal = websiteRaw ? normaliseUrl(websiteRaw) : ''
    if (websiteVal) {
      try { new URL(websiteVal) } catch { websiteVal = '' }
    }

    if (rowErrors.length) {
      errors.push(`Row ${rowNum} "${company}": ${rowErrors.join('; ')}`)
      return
    }

    // ── All valid — build the row ─────────────────────────────────────────
    const buRaw        = get(16)
    const deptsRaw     = get(17)
    const businessUnits = buRaw ? buRaw.split(/[,;]/).map(s => s.trim()).filter(Boolean) : []
    const contactName  = get(6)
    const contactEmail = get(7)

    rows.push({
      company,
      hqCountry:           get(3) || undefined,
      website:             websiteVal || undefined,
      source:              sourceVal as any,
      product:             product,
      commercialModel:     (commercialVal as any) || undefined,
      problemStatement:    get(10) || undefined,
      solutionDetails:     get(11) || undefined,
      sector:              sectorVal as any,
      technologies:        techList.map(t => TECHNOLOGIES.find(v => v.toLowerCase() === t.toLowerCase())!).filter(Boolean),
      productMaturity:     (maturityVal as any) || undefined,
      keywords:            get(15) || undefined,
      businessUnits,
      departments:         deptsRaw ? deptsRaw.split(/[,;]/).map(s => s.trim()).filter(Boolean) : [],
      priority:            (priorityVal as any) || 'Medium',
      documentsLink:       get(19) || undefined,
      collaborationStatus: (collabVal as any) || 'Identified',
      strategicFit:        (fitVal as any) || undefined,
      rating:              (ratingVal as any) || undefined,
      nextSteps:           (nextVal as any) || undefined,
      whatsGreat:          get(24) || undefined,
      whatsLacking:        get(25) || undefined,
      keyContacts:         (contactName && contactEmail) ? [{ id: crypto.randomUUID(), name: contactName, email: contactEmail }] : [],
      starEngagement:      false,
      departmentId:        (businessUnits[0] || 'Digital Innovation') as any,
    })
  })

  return { rows, errors }
}

// ── Page ──────────────────────────────────────────────────────────────────
function StartupsInner() {
  const { currentUser, visibleStartups, userRatings, addStartup } = useApp()
  const searchParams = useSearchParams()

  const buTab   = searchParams.get('bu')   || ''
  const deptTab = searchParams.get('dept') || ''

  const [view, setView]     = useState<View>('grid')
  const [search, setSearch] = useState('')
  const [showF, setShowF]   = useState(false)
  const [importing, setImporting]       = useState(false)
  const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [sectors,    setSectors]    = useState<string[]>([])
  const [statuses,   setStatuses]   = useState<string[]>([])
  const [priorities, setPriorities] = useState<string[]>([])
  const [buFilter,   setBuFilter]   = useState<string[]>([])
  const [deptFilter, setDeptFilter] = useState<string[]>([])
  const [sources,    setSources]    = useState<string[]>([])
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => visibleStartups.filter(i => {
    const depts = i.departments || []
    const bus   = i.businessUnits || []

    if (deptTab) {
      if (!bus.includes('Build')) return false
      if (!matchesBuildDept(depts, deptTab)) return false
    }
    if (buTab && !deptTab && !bus.includes(buTab)) return false

    if (sectors.length    > 0 && !sectors.includes(i.sector))                        return false
    if (sources.length    > 0 && !sources.includes(i.source))                        return false
    if (statuses.length   > 0 && !statuses.includes(i.collaborationStatus))          return false
    if (priorities.length > 0 && !priorities.includes(i.priority))                   return false
    if (buFilter.length   > 0 && !bus.some(b => buFilter.includes(b)))               return false
    if (deptFilter.length > 0 && !deptFilter.some(d => matchesBuildDept(depts, d)))  return false

    const q = search.toLowerCase()
    if (q && ![i.company, i.product, i.description, i.keywords, ...i.technologies || [], i.sector]
      .some(v => (v || '').toLowerCase().includes(q))) return false

    return true
  }), [visibleStartups, buTab, deptTab, search, sectors, statuses, priorities, buFilter, deptFilter, sources])

  const PER_PAGE   = 60
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safeP      = Math.min(page, totalPages)
  const paged      = filtered.slice((safeP - 1) * PER_PAGE, safeP * PER_PAGE)
  useEffect(() => { setPage(1) }, [buTab, deptTab, search, sectors, statuses, priorities, buFilter, deptFilter, sources])

  const clearPanelFilters = () => { setSectors([]); setStatuses([]); setPriorities([]); setBuFilter([]); setDeptFilter([]); setSources([]) }
  const panelActiveCount  = sectors.length + statuses.length + priorities.length + buFilter.length + deptFilter.length + sources.length

  const pageTitle = deptTab
    ? `${deptTab}`
    : buTab ? `${buTab} Startups` : 'Startups'
  const pageSubtitle = deptTab
    ? `Build · ${deptTab} · ${filtered.length} startup${filtered.length !== 1 ? 's' : ''}`
    : `${filtered.length} of ${visibleStartups.length} startups${buTab ? ` · ${buTab}` : ''}`

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setImporting(true)
    setImportResult(null)

    try {
      const { rows, errors } = await parseStartupsExcel(file)
      let success = 0

      for (const row of rows) {
        try {
          await addStartup({
            ...row,
            createdBy:     currentUser.id,
            starEngagement: false,
            timeline: [{
              id:            `t${Date.now()}`,
              status:        (row.collaborationStatus || 'Identified') as any,
              date:          new Date().toISOString(),
              createdBy:     currentUser.id,
              createdByName: currentUser.name,
            }],
          } as any)
          success++
        } catch (err: any) {
          errors.push(`Row for "${row.company}": ${err?.message || 'Failed to save'}`)
        }
      }

      setImportResult({ success, errors })
    } catch (err: any) {
      setImportResult({ success: 0, errors: [`Failed to read file: ${err?.message || 'Unknown error'}`] })
    } finally {
      setImporting(false)
    }
  }

  const canImport = isAdmin(currentUser) || currentUser.role === 'contributor'

  return (
    <div className="p-4 md:p-8 page-enter">
      <PageHeader
        title={pageTitle}
        eyebrow="Portfolio"
        subtitle={pageSubtitle}
        actions={
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => exportAllStartups(filtered, userRatings).catch(console.error)} className="btn-secondary text-xs">
              <Download size={13} /> Export
            </button>
            {canImport && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImportFile}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="btn-secondary text-xs"
                  style={{ opacity: importing ? 0.6 : 1, cursor: importing ? 'wait' : 'pointer' }}
                >
                  <Upload size={13} />
                  {importing ? 'Importing…' : 'Import Excel'}
                </button>
              </>
            )}
            {canImport && (
              <Link href="/startups/new" className="btn-primary"><Plus size={14} /> Add Startup</Link>
            )}
          </div>
        }
      />

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-56">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--faint)', pointerEvents: 'none' }} />
          <input type="text" placeholder="Search company, product, keyword…" value={search}
            onChange={e => setSearch(e.target.value)} className="inn-input" style={{ paddingLeft: 38, paddingRight: 12 }} />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ background: 'none', border: 'none', color: 'var(--faint)', cursor: 'pointer' }}>
              <X size={13} />
            </button>
          )}
        </div>
        <button onClick={() => setShowF(v => !v)} className="btn-secondary" style={{ position: 'relative' }}>
          <SlidersHorizontal size={14} /> Filters
          {panelActiveCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[10px] font-medium flex items-center justify-center"
              style={{ background: 'var(--accent)', color: '#fff' }}>{panelActiveCount}</span>
          )}
        </button>
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

      {/* Filter panel */}
      {showF && (
        <div className="flex items-center gap-2 mb-5 flex-wrap p-4 rounded-xl animate-slide-up"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', opacity: 0, animationFillMode: 'forwards', position: 'relative', zIndex: 100 }}>
          <CheckboxDropdown label="Sector"           options={SECTORS}               selected={sectors}    onChange={setSectors}    />
          <CheckboxDropdown label="Source"           options={SOURCES}               selected={sources}    onChange={setSources}    />
          <CheckboxDropdown label="Status"           options={COLLABORATION_STATUSES} selected={statuses}   onChange={setStatuses}   />
          <CheckboxDropdown label="Priority"         options={PRIORITIES}             selected={priorities} onChange={setPriorities} />
          <CheckboxDropdown label="Business Unit"    options={BUSINESS_UNITS}         selected={buFilter}   onChange={setBuFilter}   />
          <CheckboxDropdown label="Build Department" options={BUILD_DEPARTMENTS}       selected={deptFilter} onChange={setDeptFilter} />
          {panelActiveCount > 0 && (
            <button onClick={clearPanelFilters} style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>
              <X size={12} /> Clear all
            </button>
          )}
        </div>
      )}

      {/* Active pills */}
      {panelActiveCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {[...sectors, ...sources, ...statuses, ...priorities, ...buFilter, ...deptFilter].map(f => (
            <span key={f} className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ background: 'var(--aqua-light)', color: 'var(--accent)', border: '1px solid var(--aqua-border)' }}>
              {f}
              <button type="button" onClick={() => {
                setSectors(p    => p.filter(x => x !== f))
                setSources(p    => p.filter(x => x !== f))
                setStatuses(p   => p.filter(x => x !== f))
                setPriorities(p => p.filter(x => x !== f))
                setBuFilter(p   => p.filter(x => x !== f))
                setDeptFilter(p => p.filter(x => x !== f))
              }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 0, display: 'flex' }}>
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="inn-card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <Layers size={20} style={{ color: 'var(--faint)' }} />
            </div>
            <h3>{search || panelActiveCount > 0 ? 'No startups match your filters' : 'No startups yet'}</h3>
            <p>{search || panelActiveCount > 0
              ? 'Try adjusting your search or clearing the active filters.'
              : 'Add your first startup to begin tracking evaluations.'}</p>
            {(search || panelActiveCount > 0) && (
              <button onClick={() => { setSearch(''); clearPanelFilters() }} className="btn-secondary" style={{ marginTop: 8, fontSize: 12 }}>
                Clear filters
              </button>
            )}
            {!search && panelActiveCount === 0 && canImport && (
              <Link href="/startups/new" className="btn-primary" style={{ marginTop: 8 }}>
                <Plus size={13} /> Add Startup
              </Link>
            )}
          </div>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paged.map((i, idx) => <StartupCard key={i.id} startup={i} index={idx} />)}
        </div>
      ) : view === 'kanban' ? (
        <KanbanBoard startups={paged} />
      ) : (
        <div className="inn-card overflow-x-auto">
          <table className="inn-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Company</th>
                <th>Source</th>
                <th>HQ</th>
                <th>Product / Solution</th>
                <th>Commercial Model</th>
                <th>Problem</th>
                <th>Sector</th>
                <th>Technology</th>
                <th>Maturity</th>
                <th>Business Unit</th>
                <th>Department</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Strategic Fit</th>
                <th>Rating</th>
                <th>Next Steps</th>
                <th>What's Great</th>
                <th>What's Lacking</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((ini, idx) => (
                <tr key={ini.id} className="animate-slide-up" style={{ cursor: 'pointer', opacity: 0, animationFillMode: 'forwards', animationDelay: `${Math.min(idx * 40, 280)}ms` }} onClick={() => window.location.href = `/startups/${ini.id}`}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {ini.startupId
                      ? <span className="text-[11px] font-medium px-2 py-0.5 rounded-md" style={{ background: 'var(--gray-100)', color: 'var(--gray-500)', fontVariantNumeric: 'tabular-nums' }}>{ini.startupId}</span>
                      : <span style={{ color: 'var(--faint)' }}>–</span>}
                  </td>
                  <td style={{ minWidth: 160 }}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{ini.company}</span>
                      {ini.starEngagement && <Star size={11} fill="#f59e0b" style={{ color: '#f59e0b', flexShrink: 0 }} />}
                    </div>
                    {ini.website && (
                      <a href={ini.website} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-[10px]" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                        {ini.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                      </a>
                    )}
                  </td>
                  <td className="text-xs" style={{ color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>{ini.source || '–'}</td>
                  <td className="text-xs" style={{ color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>{ini.hqCountry || '–'}</td>
                  <td style={{ minWidth: 140 }}>
                    <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{ini.product || '–'}</p>
                    {ini.solutionDetails && <p className="text-[11px] font-light max-w-[180px] truncate mt-0.5" style={{ color: 'var(--faint)' }}>{ini.solutionDetails}</p>}
                  </td>
                  <td className="text-xs" style={{ color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>{ini.commercialModel || '–'}</td>
                  <td style={{ maxWidth: 200 }}>
                    {(ini as any).problemStatement
                      ? <p className="text-[11px] font-light max-w-[180px] truncate" style={{ color: 'var(--text-secondary)' }}>{(ini as any).problemStatement}</p>
                      : <span style={{ color: 'var(--faint)' }}>–</span>}
                  </td>
                  <td><Badge label={ini.sector} variant="sector" className="text-[10px]" /></td>
                  <td className="text-xs" style={{ color: 'var(--text-secondary)', maxWidth: 160 }}>
                    {ini.technologies?.length
                      ? <span className="truncate block max-w-[140px]">{ini.technologies.join(', ')}</span>
                      : <span style={{ color: 'var(--faint)' }}>–</span>}
                  </td>
                  <td>
                    {ini.productMaturity
                      ? <span className="text-[10px] font-medium px-2 py-0.5 rounded-md" style={{ background: 'var(--gray-100)', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>{ini.productMaturity}</span>
                      : <span style={{ color: 'var(--faint)' }}>–</span>}
                  </td>
                  <td className="text-xs" style={{ color: 'var(--gray-500)' }}>
                    {ini.businessUnits?.length ? ini.businessUnits.join(', ') : <span style={{ color: 'var(--faint)' }}>–</span>}
                  </td>
                  <td><Badge label={ini.departmentId} variant="dept" className="text-[10px]" /></td>
                  <td><Badge label={ini.priority} variant="priority" className="text-[10px]" /></td>
                  <td><Badge label={ini.collaborationStatus} variant="status" className="text-[10px]" /></td>
                  <td>
                    {(ini as any).strategicFit
                      ? <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{
                          background: (ini as any).strategicFit === 'Excellent Fit' ? 'var(--su-green-bg)' : (ini as any).strategicFit === 'Good Fit' ? 'var(--su-blue-bg)' : 'var(--su-red-bg2)',
                          color: (ini as any).strategicFit === 'Excellent Fit' ? 'var(--su-green-tx)' : (ini as any).strategicFit === 'Good Fit' ? 'var(--su-blue-tx)' : 'var(--su-red-tx)',
                        }}>{(ini as any).strategicFit}</span>
                      : <span style={{ color: 'var(--faint)' }}>–</span>}
                  </td>
                  <td><RatingDots rating={ini.rating} size={6} /></td>
                  <td className="text-xs" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{ini.nextSteps || '–'}</td>
                  <td style={{ maxWidth: 200 }}>
                    {ini.whatsGreat
                      ? <p className="text-[11px] font-light max-w-[180px] truncate" style={{ color: 'var(--su-green-tx)' }}>{ini.whatsGreat}</p>
                      : <span style={{ color: 'var(--faint)' }}>–</span>}
                  </td>
                  <td style={{ maxWidth: 200 }}>
                    {ini.whatsLacking
                      ? <p className="text-[11px] font-light max-w-[180px] truncate" style={{ color: 'var(--su-red-tx)' }}>{ini.whatsLacking}</p>
                      : <span style={{ color: 'var(--faint)' }}>–</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={safeP} totalPages={totalPages} onChange={setPage} />

      <ImportToast result={importResult} onClose={() => setImportResult(null)} />
    </div>
  )
}

export default function StartupsPage() {
  return (
    <Suspense fallback={<div className="p-8"><p className="text-sm font-light" style={{ color: 'var(--faint)' }}>Loading…</p></div>}>
      <StartupsInner />
    </Suspense>
  )
}
