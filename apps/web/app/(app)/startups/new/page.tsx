'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, CheckCircle2, Plus, Trash2, ExternalLink } from 'lucide-react'
import { useApp } from '@/lib/client/context'
import { isAdmin } from '@/lib/shared/permissions'
import { SOURCES, SECTORS, TECHNOLOGIES, BUSINESS_UNITS, DEPT_OPTIONS, PRODUCT_MATURITIES, PRIORITIES, COLLABORATION_STATUSES, RATINGS, NEXT_STEPS, COMMERCIAL_MODELS } from '@/lib/shared/constants'
import MultiSelect from '@/components/ui/MultiSelect'
import PageHeader from '@/components/layout/PageHeader'
import type { Startup, KeyContact } from '@/lib/shared/types'

function Section({ title, icon, children, span }: { title: string; icon?: string; children: React.ReactNode; span?: boolean }) {
  return (
    <div className="inn-card mb-5 overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center gap-3" style={{ borderColor: 'var(--gray-100)', background: 'var(--surface-2)' }}>
        {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      </div>
      <div className={`p-6 grid gap-x-8 gap-y-5 ${span ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>{children}</div>
    </div>
  )
}

function F({ label, required, children, span }: { label: string; required?: boolean; children: React.ReactNode; span?: boolean }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

export default function NewStartupPage() {
  const router = useRouter()
  const { currentUser, addStartup } = useApp()
  const [done, setDone]       = useState(false)
  const [saving, setSaving]   = useState(false)
  const [errors, setErrors]   = useState<string[]>([])

  const [form, setForm] = useState({
    company: '', source: '' as Startup['source'] | '',
    sector: '', product: '', description: '', solutionDetails: '',
    hqCountry: '', commercialModel: '', problemStatement: '',
    website: '', documentsLink: '',
    productMaturity: '' as Startup['productMaturity'] | '',
    priority: 'Medium' as Startup['priority'],
    collaborationStatus: 'Identified' as Startup['collaborationStatus'],
    rating: '' as Startup['rating'] | '',
    strategicFit: '' as Startup['strategicFit'] | '',
    nextSteps: 'Assess' as Startup['nextSteps'],
    whatsGreat: '', whatsLacking: '', keywords: '',
  })
  const [technologies, setTechnologies]   = useState<string[]>([])
  const [businessUnits, setBusinessUnits] = useState<string[]>(!isAdmin(currentUser) ? [currentUser.department] : [])
  const [departments, setDepartments]     = useState<string[]>([])
  const [keyContacts, setKeyContacts]     = useState<KeyContact[]>([{ id: 'kc_new_1', name: '', email: '' }])

  const s = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const addContact    = () => setKeyContacts(p => [...p, { id: `kc_new_${Date.now()}`, name: '', email: '' }])
  const removeContact = (id: string) => setKeyContacts(p => p.filter(c => c.id !== id))
  const updateContact = (id: string, field: 'name' | 'email', val: string) =>
    setKeyContacts(p => p.map(c => c.id === id ? { ...c, [field]: val } : c))

  const save = async () => {
    const err: string[] = []
    if (!form.company.trim())      err.push('Company name is required')
    if (!form.source)              err.push('Source is required')
    if (!form.product.trim())      err.push('Product name is required')
    if (!form.sector)              err.push('Sector is required')
    if (technologies.length === 0) err.push('At least one technology is required')
    if (err.length) { setErrors(err); return }
    setErrors([])
    setSaving(true)

    try {
      const validContacts = keyContacts.filter(c => c.name.trim() || c.email.trim())
      await addStartup({
        company: form.company, source: form.source as Startup['source'],
        sector: form.sector, technologies, businessUnits, departments,
        product: form.product, description: form.description,
        solutionDetails: form.solutionDetails || undefined,
        hqCountry: form.hqCountry || undefined,
        commercialModel: form.commercialModel || undefined,
        problemStatement: form.problemStatement || undefined,
        productMaturity: form.productMaturity as Startup['productMaturity'] || undefined,
        priority: form.priority, collaborationStatus: form.collaborationStatus,
        rating: form.rating as Startup['rating'] || undefined,
        strategicFit: form.strategicFit as Startup['strategicFit'] || undefined,
        nextSteps: form.nextSteps,
        whatsGreat: form.whatsGreat || undefined, whatsLacking: form.whatsLacking || undefined,
        keywords: form.keywords || undefined,
        website: form.website || undefined, documentsLink: form.documentsLink || undefined,
        keyContacts: validContacts,
        departmentId: (businessUnits[0] || currentUser.department) as Startup['departmentId'],
        createdBy: currentUser.id, starEngagement: false,
        timeline: [{
          id: `t${Date.now()}`, status: 'Identified',
          date: new Date().toISOString(),
          createdBy: currentUser.id, createdByName: currentUser.name,
        }],
      })
      setDone(true)
      setTimeout(() => router.push('/startups'), 1200)
    } catch (e: any) {
      setErrors([e?.message || 'Failed to save. Please try again.'])
    } finally {
      setSaving(false)
    }
  }

  if (done) return (
    <div className="p-8 flex items-center justify-center min-h-96">
      <div className="text-center animate-scale-in" style={{ opacity: 0, animationFillMode: 'forwards' }}>
        <CheckCircle2 size={48} style={{ color: 'var(--accent)', margin: '0 auto 16px' }} />
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Startup saved!</h2>
        <p className="text-sm font-light" style={{ color: 'var(--text-muted)' }}>Redirecting…</p>
      </div>
    </div>
  )

  return (
    <div className="p-4 md:p-8 page-enter max-w-4xl">
      <div className="mb-6">
        <Link href="/startups" className="inline-flex items-center gap-2 text-sm font-light hover:text-[var(--accent)]"
          style={{ color: 'var(--text-muted)', textDecoration: 'none' }}><ArrowLeft size={14} />Back</Link>
      </div>
      <PageHeader title="Add Startup" eyebrow="Portfolio" subtitle="Submit a new startup or company for evaluation" />

      {errors.length > 0 && (
        <div className="mb-5 p-4 rounded-xl" style={{ background: 'var(--su-red-bg)', border: '1px solid var(--su-red-border)' }}>
          {errors.map(e => <p key={e} className="text-sm font-light" style={{ color: '#ef4444' }}>• {e}</p>)}
        </div>
      )}

      <Section title="Company Details">
        <F label="Company name" required><input type="text" value={form.company} onChange={s('company')} placeholder="e.g. BuildScan AI" className="inn-input" /></F>
        <F label="Source" required>
          <select value={form.source} onChange={s('source')} className="inn-select">
            <option value="">Select source</option>{SOURCES.map(x => <option key={x}>{x}</option>)}
          </select>
        </F>
        <F label="Website"><div className="flex gap-1.5"><input type="url" value={form.website} onChange={s('website')} placeholder="https://" className="inn-input flex-1" />{form.website && <a href={form.website} target="_blank" rel="noopener noreferrer" className="btn-secondary !px-2 flex-shrink-0" title="Open URL"><ExternalLink size={13}/></a>}</div></F>
        <F label="HQ Country"><input type="text" value={form.hqCountry} onChange={s('hqCountry')} placeholder="e.g. UAE" className="inn-input" /></F>
      </Section>

      {/* Key Contacts */}
      <div className="inn-card mb-5 overflow-hidden">
        <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--gray-100)', background: 'var(--surface-2)' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium tracking-widest" style={{ color: 'var(--text-muted)' }}>KEY CONTACTS</h2>
            <button onClick={addContact} className="btn-secondary text-xs py-1 px-2"><Plus size={12} /> Add contact</button>
          </div>
        </div>
        <div className="p-6 space-y-3">
          {keyContacts.map((c, idx) => (
            <div key={c.id} className="flex items-center gap-3">
              <div className="flex-1 grid grid-cols-2 gap-3">
                <div>
                  {idx === 0 && <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Name</label>}
                  <input type="text" value={c.name} onChange={e => updateContact(c.id, 'name', e.target.value)}
                    placeholder="Contact name" className="inn-input" />
                </div>
                <div>
                  {idx === 0 && <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Email</label>}
                  <input type="email" value={c.email} onChange={e => updateContact(c.id, 'email', e.target.value)}
                    placeholder="contact@company.com" className="inn-input" />
                </div>
              </div>
              {keyContacts.length > 1 && (
                <button onClick={() => removeContact(c.id)} className="btn-ghost text-xs flex-shrink-0" style={{ color: '#ef4444', marginTop: idx === 0 ? 20 : 0 }}>
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <Section title="Product Details">
        <F label="Product name" required><input type="text" value={form.product} onChange={s('product')} placeholder="Product or platform name" className="inn-input" /></F>
        <F label="Sector" required>
          <select value={form.sector} onChange={s('sector')} className="inn-select">
            <option value="">Select sector</option>{SECTORS.map(x => <option key={x}>{x}</option>)}
          </select>
        </F>
        <F label="Technology (multi-select)" required span>
          <MultiSelect options={TECHNOLOGIES} value={technologies} onChange={setTechnologies} placeholder="Select technologies…" />
        </F>
        <F label="Product maturity">
          <select value={form.productMaturity} onChange={s('productMaturity')} className="inn-select">
            <option value="">Select maturity</option>{PRODUCT_MATURITIES.map(x => <option key={x}>{x}</option>)}
          </select>
        </F>
        <F label="Keywords"><input type="text" value={form.keywords} onChange={s('keywords')} placeholder="Comma-separated, e.g. Safety, AI, Vision" className="inn-input" /></F>
        <F label="Commercial Model">
          <select value={form.commercialModel} onChange={s('commercialModel')} className="inn-select">
            <option value="">Select model</option>{COMMERCIAL_MODELS.map(x => <option key={x}>{x}</option>)}
          </select>
        </F>
        <F label="Solution Details" span>
          <textarea rows={4} value={form.solutionDetails} onChange={s('solutionDetails')} placeholder="Describe the product and its value proposition for Innovo…" className="inn-input resize-none" />
        </F>
        <F label="Problem they are trying to solve" span>
          <textarea rows={3} value={form.problemStatement} onChange={s('problemStatement')} placeholder="What problem does this startup solve?" className="inn-input resize-none" />
        </F>
      </Section>

      <Section title="Innovo Context">
        <F label="Business unit (multi-select)" span>
          {!isAdmin(currentUser)
            ? <MultiSelect options={[currentUser.department]} value={businessUnits} onChange={setBusinessUnits} disabled />
            : <MultiSelect options={BUSINESS_UNITS} value={businessUnits} onChange={setBusinessUnits} placeholder="Select business units…" />}
        </F>
        <F label="Department (multi-select)" span>
          <MultiSelect options={DEPT_OPTIONS} value={departments} onChange={setDepartments} placeholder="Select departments…" />
        </F>
        <F label="Priority">
          <select value={form.priority} onChange={s('priority')} className="inn-select">
            {PRIORITIES.map(x => <option key={x}>{x}</option>)}
          </select>
        </F>
        <F label="Documents link"><input type="url" value={form.documentsLink} onChange={s('documentsLink')} placeholder="https://" className="inn-input" /></F>
      </Section>

      {isAdmin(currentUser) && (
        <Section title="Evaluation">
          <F label="Collaboration status">
            <select value={form.collaborationStatus} onChange={s('collaborationStatus')} className="inn-select">
              {COLLABORATION_STATUSES.map(x => <option key={x}>{x}</option>)}
            </select>
          </F>
          <F label="Strategic fit">
            <select value={form.strategicFit} onChange={s('strategicFit')} className="inn-select">
              <option value="">Not assessed</option>
              {(['Excellent Fit', 'Good Fit', 'Not fit'] as const).map(x => <option key={x}>{x}</option>)}
            </select>
          </F>
          <F label="Rating">
            <select value={form.rating} onChange={s('rating')} className="inn-select">
              <option value="">Not yet rated</option>{RATINGS.map(x => <option key={x}>{x}</option>)}
            </select>
          </F>
          <F label="Next steps">
            <select value={form.nextSteps} onChange={s('nextSteps')} className="inn-select">
              {NEXT_STEPS.map(x => <option key={x}>{x}</option>)}
            </select>
          </F>
        </Section>
      )}

      <div className="inn-card mb-5 overflow-hidden">
        <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--gray-100)', background: 'var(--surface-2)' }}>
          <h2 className="text-xs font-medium tracking-widest" style={{ color: 'var(--text-muted)' }}>FEEDBACK</h2>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>What's great</label>
            <textarea rows={3} value={form.whatsGreat} onChange={s('whatsGreat')} placeholder="Key strengths…" className="inn-input resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>What's lacking</label>
            <textarea rows={3} value={form.whatsLacking} onChange={s('whatsLacking')} placeholder="Gaps, concerns…" className="inn-input resize-none" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2 pb-8">
        <Link href="/startups" className="btn-secondary">Cancel</Link>
        <button onClick={save} disabled={saving} className="btn-aqua" style={{ opacity: saving ? 0.6 : 1 }}><Save size={14} /> {saving ? 'Saving startup…' : 'Save startup'}</button>
      </div>
    </div>
  )
}
