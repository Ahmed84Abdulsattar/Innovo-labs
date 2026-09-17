'use client'
import { useState, useEffect } from 'react'
import { CheckCircle2, Lightbulb, Search, Plus, Download } from 'lucide-react'
import Link from 'next/link'
import { useApp } from '@/lib/client/context'
import { cardSpotlight } from '@/lib/client/hover'
import { useIdeasPage, useSubmitIdea, fetchAllIdeas } from '@/lib/client/hooks/useIdeas'
import { exportIdeas } from '@/lib/client/exportToExcel'
import { isAdmin } from '@/lib/shared/permissions'
import { URGENCY_LEVELS } from '@/lib/shared/constants'
import { INITIATIVE_BUSINESS_UNITS, INITIATIVE_DEPARTMENTS } from '@/lib/shared/data/initiatives-data'
import { BENEFIT_DRIVERS, IDEA_STATUSES, IDEA_STATUS_STYLE } from '@/lib/shared/data/ideas-data'
import PageHeader from '@/components/layout/PageHeader'
import Pagination from '@/components/ui/Pagination'

function Q({ label, required, hint, children }: { label:string; required?:boolean; hint?:string; children:React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color:'var(--text-primary)' }}>
        {label}{required && <span style={{ color:'#ef4444' }}> *</span>}
      </label>
      {hint && <p className="text-xs font-light mb-1.5" style={{ color:'var(--text-muted)' }}>{hint}</p>}
      {children}
    </div>
  )
}

const blankForm = () => ({
  problemTitle:'', problemDescription:'', currentProcess:'', impactIfSolved:'',
  estimatedTimeSaved:'', urgency:'Medium' as any,
  suggestedSolution:'', hasTriedBefore:false, triedBeforeDetails:'',
  anyBudgetInMind:'',
  benefitDrivers:[] as string[],
  benefitCostSaving:'', benefitTimeSaving:'', benefitQuality:'', benefitSafety:'', benefitEsg:'',
  benefitBusinessUnits:[] as string[], benefitDepartments:[] as string[],
})

export default function IdeasPage() {
  const { currentUser } = useApp()
  const submitIdea = useSubmitIdea()
  const [tab, setTab]           = useState<'list'|'submit'>('list')
  const [done, setDone]         = useState(false)
  const [submittedRef, setSubmittedRef] = useState<string | null>(null)
  const [errors, setErrors]     = useState<string[]>([])
  const [search, setSearch]     = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterBU, setFilterBU]          = useState('')
  const [filterDept, setFilterDept]      = useState('')
  const [dateFrom, setDateFrom]          = useState('')
  const [dateTo, setDateTo]              = useState('')
  const [page, setPage]         = useState(1)
  const [form, setForm]         = useState(blankForm())

  const s = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))
  const toggleArr = (key: 'benefitBusinessUnits' | 'benefitDepartments') => (v: string) =>
    setForm(f => ({ ...f, [key]: f[key].includes(v) ? f[key].filter(x => x !== v) : [...f[key], v] }))
  const toggleDriver = (key: string, field: string) =>
    setForm(f => {
      const has = f.benefitDrivers.includes(key)
      return {
        ...f,
        benefitDrivers: has ? f.benefitDrivers.filter(x => x !== key) : [...f.benefitDrivers, key],
        ...(has ? { [field]: '' } : {}),   // clear the value when a driver is removed
      }
    })

  const handleSubmit = async () => {
    const err: string[] = []
    if (!form.problemTitle.trim())       err.push('Problem title is required')
    if (!form.problemDescription.trim()) err.push('Description is required')
    if (err.length) { setErrors(err); return }
    setErrors([])
    const num = (v: string) => (v !== '' ? Number(v) : null)
    try {
      const res: any = await submitIdea.mutateAsync({
        ...form,
        benefitCostSaving: num(form.benefitCostSaving),
        benefitTimeSaving: num(form.benefitTimeSaving),
        benefitQuality:    num(form.benefitQuality),
        benefitSafety:     num(form.benefitSafety),
        benefitEsg:        num(form.benefitEsg),
      })
      setSubmittedRef(res?.idea?.idea_ref ?? null)
    } catch {
      setErrors(['Could not submit — please try again.']); return
    }
    setDone(true)
    setTimeout(() => {
      setDone(false); setSubmittedRef(null); setTab('list'); setForm(blankForm())
    }, 2800)
  }

  // Debounce the search box so we hit the server at most ~every 300ms.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])
  useEffect(() => { setPage(1) }, [debouncedSearch, filterStatus, filterBU, filterDept, dateFrom, dateTo])

  // Server-side pagination: fetch exactly one page + the total. All filters
  // combine and are applied server-side, so it scales and can never blank.
  const PER_PAGE = 20
  const { data: ideasPage } = useIdeasPage(page, { q: debouncedSearch, status: filterStatus, bu: filterBU, dept: filterDept, dateFrom, dateTo }, PER_PAGE)
  const ideas      = ideasPage?.ideas ?? []
  const total      = ideasPage?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
  const safeP      = Math.min(page, totalPages)
  const hasFilters = !!(search || filterStatus || filterBU || filterDept || dateFrom || dateTo)

  return (
    <div className="p-4 md:p-8 page-enter">
      <PageHeader
        title="Ideas"
        eyebrow="Community"
        subtitle="Share challenges and innovative ideas with the Digital Innovation team"
        actions={
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => fetchAllIdeas().then(exportIdeas).catch(console.error)} className="btn-secondary text-xs">
              <Download size={13} /> Export
            </button>
            <button type="button" onClick={() => setTab('submit')} className="btn-primary">
              <Plus size={14}/> Submit an idea
            </button>
          </div>
        }
      />

      {/* Tab bar */}
      <div className="flex gap-0 mb-6" style={{ borderBottom: '2px solid var(--gray-100)' }}>
        {([['list', isAdmin(currentUser) ? `All submissions (${total})` : `My submissions (${total})`], ['submit', 'Submit new']] as const).map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            className="px-5 py-3 text-sm font-medium transition-all"
            style={{
              background: 'none', border: 'none', cursor: 'pointer', marginBottom: -2,
              color: tab === key ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: tab === key ? 600 : 400,
              borderBottom: tab === key ? '2px solid var(--text-primary)' : '2px solid transparent',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── LIST TAB ── */}
      {tab === 'list' && (
        <div className="max-w-4xl">
          {/* Search + filters — all combine (status AND date AND BU AND dept) */}
          <div className="flex flex-col gap-3 mb-5">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-0" style={{ minWidth: 180 }}>
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color:'var(--text-muted)' }}/>
                <input className="inn-input" style={{ paddingLeft: '2.25rem' }} placeholder="Search by ID, title or submitter…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="inn-select text-sm w-full sm:w-40">
                <option value="">All statuses</option>
                {IDEA_STATUSES.map(st => <option key={st}>{st}</option>)}
              </select>
              <select value={filterBU} onChange={e => setFilterBU(e.target.value)} className="inn-select text-sm w-full sm:w-44">
                <option value="">All business units</option>
                {INITIATIVE_BUSINESS_UNITS.map(bu => <option key={bu}>{bu}</option>)}
              </select>
              <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="inn-select text-sm w-full sm:w-44">
                <option value="">All departments</option>
                {INITIATIVE_DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-medium" style={{ color:'var(--text-muted)' }}>Submitted between</span>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="inn-input text-sm" style={{ width: 'auto' }} />
              <span className="text-xs" style={{ color:'var(--faint)' }}>to</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="inn-input text-sm" style={{ width: 'auto' }} />
              {hasFilters && (
                <button type="button" onClick={() => { setSearch(''); setFilterStatus(''); setFilterBU(''); setFilterDept(''); setDateFrom(''); setDateTo('') }} className="btn-ghost text-xs">Clear all</button>
              )}
            </div>
          </div>

          {ideas.length === 0 ? (
            <div className="inn-card">
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Lightbulb size={20} style={{ color: 'var(--faint)' }} />
                </div>
                <h3>{hasFilters ? 'No ideas match your filters' : 'No submissions yet'}</h3>
                <p>{hasFilters
                  ? 'Try adjusting your search or filters.'
                  : 'Be the first to share a problem or idea with the team.'}</p>
                {!hasFilters && (
                  <button type="button" onClick={() => setTab('submit')} className="btn-primary" style={{ marginTop: 8 }}>
                    <Plus size={13} /> Submit an idea
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {ideas.map((idea, i) => (
                <Link key={idea.id} href={`/ideas/${idea.id}?from=%2Fideas`} onMouseMove={cardSpotlight}
                  className="inn-card card-glow block p-5 animate-slide-up"
                  style={{ opacity: 0, animationFillMode: 'forwards', animationDelay: `${Math.min(i * 40, 280)}ms`, textDecoration: 'none' }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate" style={{ color:'var(--text-primary)' }}>{idea.problemTitle}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {idea.ideaRef && <span className="text-xs font-bold" style={{ color:'var(--accent)', fontVariantNumeric:'tabular-nums' }}>{idea.ideaRef}</span>}
                        {idea.ideaRef && <span style={{ color:'var(--gray-300)' }}>·</span>}
                        <span className="text-xs font-light" style={{ color:'var(--text-muted)' }}>{idea.submittedByName}</span>
                        {idea.submittedByDept && <><span style={{ color:'var(--gray-300)' }}>·</span><span className="text-xs font-light" style={{ color:'var(--text-muted)' }}>{idea.submittedByDept}</span></>}
                        <span style={{ color:'var(--gray-300)' }}>·</span>
                        <span className="text-xs font-light" style={{ color:'var(--faint)' }}>
                          {new Date(idea.createdAt).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                        style={{ background:IDEA_STATUS_STYLE[idea.status]?.bg, color:IDEA_STATUS_STYLE[idea.status]?.text }}>
                        {idea.status}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: idea.urgency==='Critical'?'#450a0a':idea.urgency==='High'?'var(--su-red-bg2)':idea.urgency==='Medium'?'var(--su-amber-bg)':'var(--gray-100)',
                          color:      idea.urgency==='Critical'?'#fff':idea.urgency==='High'?'var(--su-red-tx)':idea.urgency==='Medium'?'var(--su-amber-tx)':'var(--text-secondary)',
                        }}>
                        {idea.urgency}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <Pagination page={safeP} totalPages={totalPages} onChange={setPage} />
        </div>
      )}

      {/* ── SUBMIT TAB ── */}
      {tab === 'submit' && (done ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center animate-scale-in" style={{ opacity:0, animationFillMode:'forwards' }}>
            <CheckCircle2 size={48} style={{ color:'var(--accent)', margin:'0 auto 16px' }}/>
            <h2 className="text-xl font-semibold mb-2" style={{ color:'var(--text-primary)' }}>Idea submitted</h2>
            {submittedRef && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-3" style={{ background:'var(--aqua-light)', border:'1px solid var(--aqua-border)' }}>
                <span className="text-xs font-medium" style={{ color:'var(--text-muted)' }}>Your reference</span>
                <span className="text-sm font-bold" style={{ color:'var(--accent)', fontVariantNumeric:'tabular-nums' }}>{submittedRef}</span>
              </div>
            )}
            <p className="text-sm font-light" style={{ color:'var(--text-muted)' }}>Save your reference to track it. The Digital Innovation team will review your submission.</p>
          </div>
        </div>
      ) : (
        <div className="max-w-3xl">
          <div className="inn-card p-6 mb-6" style={{ background:'linear-gradient(135deg,var(--aqua-pale),var(--aqua-pale))', borderColor:'var(--aqua-border)' }}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:'var(--aqua-light)' }}>
                <Lightbulb size={22} style={{ color:'var(--accent)' }}/>
              </div>
              <div>
                <h2 className="text-base font-semibold mb-1" style={{ color:'var(--text-primary)' }}>Share your idea or problem</h2>
                <p className="text-sm font-light leading-relaxed" style={{ color:'var(--gray-500)' }}>Have a process that could be improved? A technology that might help? Share it here and the Digital Innovation team will evaluate and follow up.</p>
              </div>
            </div>
          </div>

          {errors.length > 0 && (
            <div className="mb-5 p-4 rounded-xl" style={{ background:'var(--su-red-bg)', border:'1px solid var(--su-red-border)' }}>
              {errors.map(e => <p key={e} className="text-sm font-light" style={{ color:'#ef4444' }}>• {e}</p>)}
            </div>
          )}

          <div className="inn-card p-6 space-y-6">
            <div>
              <h3 className="text-xs font-bold tracking-widest mb-4 pb-2 border-b" style={{ color:'var(--accent)', borderColor:'var(--aqua-light)' }}>THE PROBLEM</h3>
              <div className="space-y-4">
                <Q label="What is the problem or idea?" required hint="Give it a short, clear title">
                  <input type="text" value={form.problemTitle} onChange={s('problemTitle')} placeholder="e.g. Manual site inspection reports take too long" className="inn-input"/>
                </Q>
                <Q label="Describe in detail" required hint="What happens currently? What are the pain points?">
                  <textarea rows={4} value={form.problemDescription} onChange={s('problemDescription')} placeholder="Explain what the problem is and how it affects work…" className="inn-input resize-none"/>
                </Q>
                <Q label="How is this currently handled?" hint="Describe the existing process or workaround">
                  <textarea rows={3} value={form.currentProcess} onChange={s('currentProcess')} placeholder="We currently use Excel / manual process…" className="inn-input resize-none"/>
                </Q>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold tracking-widest mb-4 pb-2 border-b" style={{ color:'var(--accent)', borderColor:'var(--aqua-light)' }}>THE SOLUTION</h3>
              <div className="space-y-4">
                <Q label="Suggested solution or technology?" hint="Optional — share if you have one">
                  <textarea rows={3} value={form.suggestedSolution} onChange={s('suggestedSolution')} placeholder="I think we could use…" className="inn-input resize-none"/>
                </Q>
                <Q label="Has anything been tried before?">
                  <div className="flex gap-3 mb-2">
                    {['Yes','No'].map(v => (
                      <button key={v} type="button" onClick={() => setForm(f => ({ ...f, hasTriedBefore: v === 'Yes' }))}
                        className="text-sm font-medium px-4 py-2 rounded-lg transition-all"
                        style={{ background:(form.hasTriedBefore?'Yes':'No')===v?'var(--aqua-light)':'var(--surface-2)', color:(form.hasTriedBefore?'Yes':'No')===v?'var(--accent)':'var(--text-muted)', border:`1.5px solid ${(form.hasTriedBefore?'Yes':'No')===v?'var(--aqua-border)':'var(--border)'}`, cursor:'pointer' }}>
                        {v}
                      </button>
                    ))}
                  </div>
                  {form.hasTriedBefore && <textarea rows={2} value={form.triedBeforeDetails} onChange={s('triedBeforeDetails')} placeholder="What was tried and why didn't it work?" className="inn-input resize-none"/>}
                </Q>
                <Q label="Budget in mind?" hint="Optional rough estimate">
                  <input type="text" value={form.anyBudgetInMind} onChange={s('anyBudgetInMind')} placeholder="e.g. Under AED 50,000 / Not sure" className="inn-input"/>
                </Q>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold tracking-widest mb-4 pb-2 border-b" style={{ color:'var(--accent)', borderColor:'var(--aqua-light)' }}>THE IMPACT</h3>
              <div className="space-y-4">
                <Q label="What would be different if solved?" hint="Time saved, cost reduction, quality, safety">
                  <textarea rows={3} value={form.impactIfSolved} onChange={s('impactIfSolved')} placeholder="If solved, we could…" className="inn-input resize-none"/>
                </Q>
                <Q label="Estimated time lost to this problem?" hint="Approximate hours lost per month">
                  <div style={{ position:'relative' }}>
                    <input type="number" min={0} value={form.estimatedTimeSaved} onChange={s('estimatedTimeSaved')} placeholder="e.g. 40" className="inn-input" style={{ paddingRight: 92 }}/>
                    <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', fontSize:12, color:'var(--faint)', pointerEvents:'none' }}>Hrs/month</span>
                  </div>
                </Q>
                <Q label="How will your idea benefit Innovo's business?" hint="Select the value areas and estimate the monthly impact">
                  <div className="flex flex-wrap gap-2 mt-1">
                    {BENEFIT_DRIVERS.map(d => {
                      const on = form.benefitDrivers.includes(d.key)
                      return (
                        <button key={d.key} type="button" onClick={() => toggleDriver(d.key, d.field)}
                          className="text-xs font-medium px-3 py-1.5 rounded-full transition-all"
                          style={{ background:on?'var(--aqua-light)':'var(--surface-2)', color:on?'var(--accent)':'var(--gray-500)', border:`1px solid ${on?'var(--aqua-border)':'var(--border)'}`, cursor:'pointer' }}>
                          {d.key}
                        </button>
                      )
                    })}
                  </div>
                  {form.benefitDrivers.length > 0 && (
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:14, padding:'14px 16px', borderRadius:10, background:'var(--aqua-pale)', border:'1px solid var(--aqua-light)' }}>
                      <p style={{ gridColumn:'1 / -1', fontSize:10, fontWeight:700, letterSpacing:'0.08em', color:'var(--text-primary)', margin:'0 0 2px' }}>VALUE TRACKER</p>
                      {BENEFIT_DRIVERS.filter(d => form.benefitDrivers.includes(d.key)).map(d => (
                        <div key={d.key}>
                          <label className="block text-xs font-medium mb-1.5" style={{ color:'var(--gray-500)' }}>{d.key} <span style={{ fontWeight:300, color:'var(--faint)' }}>({d.unit})</span></label>
                          <input type="number" min={0} value={form[d.field]} onChange={s(d.field)} className="inn-input"/>
                        </div>
                      ))}
                    </div>
                  )}
                </Q>
                <Q label="Which business function will benefit from the idea?" hint="Select the business unit(s) and department(s) that gain the most">
                  <p className="text-[11px] font-semibold mb-1.5 mt-1" style={{ color:'var(--text-secondary)' }}>Business Unit</p>
                  <div className="flex flex-wrap gap-2">
                    {INITIATIVE_BUSINESS_UNITS.map(bu => {
                      const on = form.benefitBusinessUnits.includes(bu)
                      return (
                        <button key={bu} type="button" onClick={() => toggleArr('benefitBusinessUnits')(bu)}
                          className="text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all"
                          style={{ background:on?'var(--accent)':'var(--surface-2)', color:on?'#fff':'var(--gray-500)', border:`1px solid ${on?'var(--accent)':'var(--border)'}`, cursor:'pointer' }}>
                          {bu}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-[11px] font-semibold mb-1.5 mt-3" style={{ color:'var(--text-secondary)' }}>Department</p>
                  <div className="flex flex-wrap gap-2">
                    {INITIATIVE_DEPARTMENTS.map(dep => {
                      const on = form.benefitDepartments.includes(dep)
                      return (
                        <button key={dep} type="button" onClick={() => toggleArr('benefitDepartments')(dep)}
                          className="text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all"
                          style={{ background:on?'var(--accent)':'var(--surface-2)', color:on?'#fff':'var(--gray-500)', border:`1px solid ${on?'var(--accent)':'var(--border)'}`, cursor:'pointer' }}>
                          {dep}
                        </button>
                      )
                    })}
                  </div>
                </Q>
                <Q label="How urgent is this?">
                  <div className="flex gap-2 mt-1">
                    {URGENCY_LEVELS.map(u => {
                      const cols: Record<string,{bg:string;text:string;border:string}> = {
                        Low:{bg:'var(--gray-100)',text:'var(--text-secondary)',border:'var(--gray-200)'},
                        Medium:{bg:'var(--su-amber-bg)',text:'var(--su-amber-tx)',border:'var(--su-amber-border)'},
                        High:{bg:'var(--su-red-bg2)',text:'var(--su-red-tx)',border:'var(--su-red-border)'},
                        Critical:{bg:'#450a0a',text:'#fff',border:'#7f1d1d'},
                      }
                      const c = cols[u]; const active = form.urgency === u
                      return (
                        <button key={u} type="button" onClick={() => setForm(f => ({ ...f, urgency: u as any }))}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                          style={{ background:active?c.bg:'var(--surface-2)', color:active?c.text:'var(--text-muted)', border:`1.5px solid ${active?c.border:'var(--border)'}`, cursor:'pointer', fontWeight:active?600:400 }}>
                          {u}
                        </button>
                      )
                    })}
                  </div>
                </Q>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor:'var(--gray-100)' }}>
              <p className="text-xs font-light" style={{ color:'var(--faint)' }}>Submitted as {currentUser.name} · {currentUser.department}</p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { setTab('list'); setForm(blankForm()); setErrors([]) }} className="btn-secondary text-xs">Cancel</button>
                <button type="button" onClick={handleSubmit} className="btn-primary"><Lightbulb size={14}/> Submit idea</button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
