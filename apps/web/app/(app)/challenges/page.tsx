'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, ChevronRight, X } from 'lucide-react'
import { useApp } from '@/lib/client/context'
import { cardSpotlight } from '@/lib/client/hover'
import { isAdmin } from '@/lib/shared/permissions'
import PageHeader from '@/components/layout/PageHeader'
import Pagination from '@/components/ui/Pagination'
import { type Challenge } from '@/lib/shared/data/challenges-data'

const BLANK = (): Omit<Challenge, 'id' | 'number' | 'isCustom'> => ({
  title: '',
  shortDescription: '',
  overview: '',
  keyChallenges: [''],
  innovationOpportunities: [''],
  businessImpact: [''],
})

export default function ChallengesPage() {
  const { currentUser } = useApp()
  const admin = isAdmin(currentUser)

  const [allChallenges, setAllChallenges] = useState<Challenge[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(BLANK())
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetch('/api/challenges')
      .then(r => r.json())
      .then(d => setAllChallenges(d.challenges || []))
      .catch(() => {})
  }, [])

  const openCount = allChallenges.length

  const PER_PAGE   = 12
  const totalPages = Math.max(1, Math.ceil(allChallenges.length / PER_PAGE))
  const safeP      = Math.min(page, totalPages)
  const paged      = allChallenges.slice((safeP - 1) * PER_PAGE, safeP * PER_PAGE)

  const s = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const updateList = (key: 'keyChallenges' | 'innovationOpportunities' | 'businessImpact', idx: number, val: string) =>
    setForm(f => { const arr = [...f[key]]; arr[idx] = val; return { ...f, [key]: arr } })

  const addListItem = (key: 'keyChallenges' | 'innovationOpportunities' | 'businessImpact') =>
    setForm(f => ({ ...f, [key]: [...f[key], ''] }))

  const removeListItem = (key: 'keyChallenges' | 'innovationOpportunities' | 'businessImpact', idx: number) =>
    setForm(f => ({ ...f, [key]: f[key].filter((_, i) => i !== idx) }))

  const handleSave = async () => {
    if (!form.title.trim() || !form.overview.trim()) return
    const slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const id = `${slug}-${Date.now()}`
    try {
      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          number: allChallenges.length + 1,
          ...form,
          keyChallenges: form.keyChallenges.filter(Boolean),
          innovationOpportunities: form.innovationOpportunities.filter(Boolean),
          businessImpact: form.businessImpact.filter(Boolean),
        }),
      })
      const data = await res.json()
      if (!res.ok) return
      setAllChallenges(prev => [...prev, data.challenge])
      setForm(BLANK())
      setShowForm(false)
    } catch {}
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1100, margin: '0 auto' }} className="challenges-page page-enter">
      <style>{`
        @media (max-width: 767px) {
          .challenges-page { padding: 16px !important; }
          .challenges-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <PageHeader
        title="Innovation Challenges"
        eyebrow="Open Challenges"
        subtitle={`${openCount} open challenge${openCount !== 1 ? 's' : ''}`}
        actions={
          admin ? (
            <button
              type="button"
              onClick={() => setShowForm(v => !v)}
              className="btn-primary text-sm"
            >
              <Plus size={15} /> Create Challenge
            </button>
          ) : undefined
        }
      />

      {/* Create form */}
      {showForm && admin && (
        <div className="inn-card p-6 mb-8" style={{ borderColor: 'var(--aqua-border)' }}>
          <div className="flex items-center justify-between mb-5">
            <p className="text-xs font-bold tracking-widest" style={{ color: 'var(--accent)' }}>NEW CHALLENGE</p>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={16} />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Title *</label>
              <input type="text" value={form.title} onChange={s('title')} placeholder="e.g. Digital Twin Adoption" className="inn-input" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Short description *</label>
              <input type="text" value={form.shortDescription} onChange={s('shortDescription')} placeholder="One-line summary shown on the card" className="inn-input" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Overview *</label>
              <textarea value={form.overview} onChange={s('overview')} rows={3} placeholder="Full description of this challenge..." className="inn-input" style={{ resize: 'vertical' }} />
            </div>

            {/* Key Challenges */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Key Challenges</label>
              {form.keyChallenges.map((item, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input type="text" value={item} onChange={e => updateList('keyChallenges', i, e.target.value)} className="inn-input flex-1" placeholder={`Challenge ${i + 1}`} />
                  {form.keyChallenges.length > 1 && (
                    <button type="button" onClick={() => removeListItem('keyChallenges', i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><X size={14} /></button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => addListItem('keyChallenges')} className="btn-ghost text-xs mt-1"><Plus size={12} /> Add item</button>
            </div>

            {/* Innovation Opportunities */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Innovation Opportunities</label>
              {form.innovationOpportunities.map((item, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input type="text" value={item} onChange={e => updateList('innovationOpportunities', i, e.target.value)} className="inn-input flex-1" placeholder={`Opportunity ${i + 1}`} />
                  {form.innovationOpportunities.length > 1 && (
                    <button type="button" onClick={() => removeListItem('innovationOpportunities', i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><X size={14} /></button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => addListItem('innovationOpportunities')} className="btn-ghost text-xs mt-1"><Plus size={12} /> Add item</button>
            </div>

            {/* Business Impact */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Business Impact</label>
              {form.businessImpact.map((item, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input type="text" value={item} onChange={e => updateList('businessImpact', i, e.target.value)} className="inn-input flex-1" placeholder={`Impact ${i + 1}`} />
                  {form.businessImpact.length > 1 && (
                    <button type="button" onClick={() => removeListItem('businessImpact', i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><X size={14} /></button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => addListItem('businessImpact')} className="btn-ghost text-xs mt-1"><Plus size={12} /> Add item</button>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-xs">Cancel</button>
            <button type="button" onClick={handleSave} className="btn-aqua text-xs">Save Challenge</button>
          </div>
        </div>
      )}

      {/* Challenge cards grid */}
      <div
        className="challenges-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}
      >
        {paged.map((ch, i) => (
          <div key={ch.id} className="animate-slide-up" style={{ opacity: 0, animationFillMode: 'forwards', animationDelay: `${i * 0.05}s` }}>
          <Link
            href={`/challenges/${ch.id}`}
            style={{ textDecoration: 'none' }}
          >
            <div
              className="inn-card card-glow p-5 h-full"
              onMouseMove={cardSpotlight}
              style={{
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {/* Number badge */}
              <div className="flex items-center justify-between">
                <div
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'linear-gradient(135deg, var(--accent), #07c9be)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0,
                  }}
                >
                  {ch.number}
                </div>
                <ChevronRight size={16} style={{ color: 'var(--faint)' }} />
              </div>

              {/* Title */}
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)', lineHeight: 1.35 }}>{ch.title}</p>
                <p className="text-xs font-light mt-1.5" style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>{ch.shortDescription}</p>
              </div>

              {/* Key challenges preview */}
              {ch.keyChallenges.length > 0 && (
                <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--gray-100)' }}>
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--gray-500)' }}>Key challenges</p>
                  <div className="space-y-1">
                    {ch.keyChallenges.slice(0, 3).map((kc, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 5 }} />
                        <p className="text-xs font-light" style={{ color: 'var(--gray-500)', lineHeight: 1.4 }}>{kc}</p>
                      </div>
                    ))}
                    {ch.keyChallenges.length > 3 && (
                      <p className="text-xs font-light" style={{ color: 'var(--faint)' }}>+{ch.keyChallenges.length - 3} more</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Link>
          </div>
        ))}
      </div>

      <Pagination page={safeP} totalPages={totalPages} onChange={setPage} />
    </div>
  )
}
