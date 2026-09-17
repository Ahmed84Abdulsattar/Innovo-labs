'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Plus, X, Handshake, Upload, Image as ImageIcon } from 'lucide-react'
import { useApp } from '@/lib/client/context'
import { cardSpotlight } from '@/lib/client/hover'
import { isAdmin } from '@/lib/shared/permissions'
import PageHeader from '@/components/layout/PageHeader'
import Pagination from '@/components/ui/Pagination'
import {
  COLLAB_TYPES, COLLAB_STATUSES, STATUS_STYLE, TYPE_STYLE, MAX_COLLAB_IMAGES,
  type Collaboration, type CollabImage,
} from '@/lib/shared/data/collaborations-data'
import { compressImage } from '@/lib/client/compress-image'
import { uploadImageToStorage } from '@/lib/client/upload-image'

/* ── Responsive column hook ──────────────────────────────────────────────── */
function useCols() {
  const [cols, setCols] = useState(3)
  useEffect(() => {
    const fn = () => setCols(window.innerWidth < 640 ? 1 : window.innerWidth < 1024 ? 2 : 3)
    fn()
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return cols
}

/* ── Collaboration card ──────────────────────────────────────────────────── */
function CollabCard({ collab }: { collab: Collaboration }) {
  const ts = TYPE_STYLE[collab.type]   ?? { bg: 'var(--gray-100)', text: 'var(--gray-500)' }
  const ss = STATUS_STYLE[collab.status] ?? { bg: 'var(--gray-100)', text: 'var(--gray-500)', border: 'var(--border)' }
  const thumb = collab.images?.[0]?.dataUrl

  return (
    <Link href={`/collaborations/${collab.id}`} style={{ textDecoration: 'none', display: 'block', width: '100%', minWidth: 0 }}>
      <div
        className="inn-card card-glow"
        onMouseMove={cardSpotlight}
        style={{
          height: 360, width: '100%', display: 'flex', flexDirection: 'column',
          borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
        }}
      >
        {/* Top — image or gradient placeholder */}
        <div style={{ position: 'relative', height: 180, flexShrink: 0, overflow: 'hidden',
          background: thumb ? 'var(--gray-100)' : 'linear-gradient(135deg, var(--accent) 0%, #07c9be 100%)' }}>
          {thumb ? (
            <img
              src={thumb}
              alt={collab.partner}
              className="card-media"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Handshake size={48} style={{ color: 'rgba(255,255,255,0.35)' }} />
            </div>
          )}
          {/* image count badge — list endpoint sends only the first image + count */}
          {(collab.imageCount ?? collab.images?.length ?? 0) > 1 && (
            <div style={{ position: 'absolute', top: 10, right: 10,
              background: 'rgba(0,0,0,0.45)', color: '#fff',
              fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
              display: 'flex', alignItems: 'center', gap: 4 }}>
              <ImageIcon size={10} />
              {collab.imageCount ?? collab.images!.length}
            </div>
          )}
          {/* type badge */}
          <div style={{ position: 'absolute', top: 10, left: 10 }}>
            <span style={{ background: ts.bg, color: ts.text, fontSize: 10, fontWeight: 700,
              letterSpacing: '0.04em', padding: '3px 9px', borderRadius: 999 }}>
              {collab.type}
            </span>
          </div>
        </div>

        {/* Body */}
        <div style={{ height: 180, display: 'flex', flexDirection: 'column', padding: '14px 16px', gap: 6, overflow: 'hidden' }}>
          <h3 style={{
            margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)',
            lineHeight: 1.3, letterSpacing: '-0.01em', flexShrink: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{collab.partner}</h3>

          {collab.focusArea && (
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'var(--accent)', flexShrink: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {collab.focusArea}
            </p>
          )}

          <p style={{
            margin: 0, flex: 1, fontSize: 12, color: 'var(--gray-500)', lineHeight: 1.55,
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{collab.description}</p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingTop: 8, borderTop: '1px solid var(--gray-100)', flexShrink: 0 }}>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
              background: ss.bg, color: ss.text, border: `1px solid ${ss.border}`,
            }}>{collab.status}</span>
            <span style={{ fontSize: 11, color: 'var(--faint)' }}>
              {new Date(collab.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

/* ── Skeleton card ───────────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div style={{ height: 360, display: 'flex', flexDirection: 'column',
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ height: 180, background: 'var(--gray-100)' }} />
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ height: 15, borderRadius: 6, background: 'var(--gray-100)', width: '60%' }} />
        <div style={{ height: 11, borderRadius: 6, background: 'var(--surface-2)', width: '40%' }} />
        <div style={{ height: 11, borderRadius: 6, background: 'var(--surface-2)', width: '100%' }} />
        <div style={{ height: 11, borderRadius: 6, background: 'var(--surface-2)', width: '85%' }} />
      </div>
    </div>
  )
}

const blank = () => ({
  partner: '', type: 'University' as const, description: '',
  focusArea: '', status: 'Not Started' as const,
  detailedOverview: '', currentStatus: '', nextSteps: '',
})

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function CollaborationsPage() {
  const { currentUser } = useApp()
  const admin = isAdmin(currentUser)
  const cols  = useCols()

  const [collabs, setCollabs]   = useState<Collaboration[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(blank())
  const [formImages, setFormImages] = useState<CollabImage[]>([])
  const [imgLoading, setImgLoading] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [saveErr, setSaveErr]   = useState('')
  const [page, setPage]         = useState(1)
  const imgRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/collaborations')
      .then(r => r.json())
      .then(d => { setCollabs(d.collaborations || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const activeCount = collabs.filter(c => c.status === 'Ongoing').length

  const PER_PAGE   = 24
  const totalPages = Math.max(1, Math.ceil(collabs.length / PER_PAGE))
  const safeP      = Math.min(page, totalPages)
  const paged      = collabs.slice((safeP - 1) * PER_PAGE, safeP * PER_PAGE)
  const s = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    if (formImages.length + files.length > MAX_COLLAB_IMAGES) {
      setSaveErr(`A collaboration can have at most ${MAX_COLLAB_IMAGES} images.`)
      e.target.value = ''
      return
    }
    setSaveErr(''); setImgLoading(true)
    try {
      // Compress client-side, then upload to Storage and keep the URL in
      // `dataUrl` — display and the API payload stay identical, but the row
      // stores a short URL instead of base64.
      const newImgs: CollabImage[] = await Promise.all(
        files.map(async f => ({
          id: crypto.randomUUID(),
          dataUrl: await uploadImageToStorage(await compressImage(f), 'collab'),
        }))
      )
      setFormImages(prev => [...prev, ...newImgs])
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'Failed to process the selected images.')
    }
    setImgLoading(false)
    e.target.value = ''
  }

  const removeImage = (id: string) => setFormImages(prev => prev.filter(i => i.id !== id))

  const resetForm = () => {
    setForm(blank()); setFormImages([]); setSaveErr('')
    if (imgRef.current) imgRef.current.value = ''
  }

  const handleSave = async () => {
    if (!form.partner.trim() || !form.description.trim()) return
    setSaveErr(''); setSaving(true)
    try {
      const res = await fetch('/api/collaborations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, images: formImages }),
      })
      const data = await res.json()
      if (!res.ok) { setSaveErr(data.error || 'Failed to save'); setSaving(false); return }
      setCollabs(prev => [data.collaboration, ...prev])
      resetForm(); setShowForm(false)
    } catch { setSaveErr('Network error. Please try again.') }
    setSaving(false)
  }

  return (
    <div className="collabs-page page-enter" style={{ padding: cols === 1 ? '16px' : '32px 40px', maxWidth: 1200, margin: '0 auto' }}>
      <PageHeader
        title="Collaborations"
        eyebrow="Ecosystem"
        subtitle={`${activeCount} active · ${collabs.length} total`}
        actions={admin ? (
          <button type="button" onClick={() => setShowForm(v => !v)} className="btn-primary text-sm">
            <Plus size={15} /> New Collaboration
          </button>
        ) : undefined}
      />

      {/* ── Create form ──────────────────────────────────────────────────── */}
      {showForm && admin && (
        <div className="inn-card p-6 mb-8" style={{ borderColor: 'var(--aqua-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <p className="text-xs font-bold tracking-widest" style={{ color: 'var(--accent)' }}>NEW COLLABORATION</p>
            <button type="button" onClick={() => { setShowForm(false); resetForm() }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: cols === 1 ? '1fr' : '1fr 1fr', gap: 16 }}>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Partner *</label>
              <input type="text" value={form.partner} onChange={s('partner')} placeholder="e.g. MIT, US Embassy, Siemens" className="inn-input" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Type</label>
              <select value={form.type} onChange={s('type')} className="inn-select">
                {COLLAB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Focus Area</label>
              <input type="text" value={form.focusArea} onChange={s('focusArea')} placeholder="e.g. Sustainable Construction, BIM, AI" className="inn-input" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Status</label>
              <select value={form.status} onChange={s('status')} className="inn-select">
                {COLLAB_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Description *</label>
              <input type="text" value={form.description} onChange={s('description')} placeholder="Brief summary of this collaboration" className="inn-input" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Detailed Overview</label>
              <textarea value={form.detailedOverview} onChange={s('detailedOverview')} rows={3}
                placeholder="Full details about this collaboration…" className="inn-input" style={{ resize: 'vertical' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Current Status Notes</label>
              <textarea value={form.currentStatus} onChange={s('currentStatus')} rows={2}
                placeholder="What is happening right now?" className="inn-input" style={{ resize: 'vertical' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Next Steps</label>
              <textarea value={form.nextSteps} onChange={s('nextSteps')} rows={2}
                placeholder="What needs to happen next?" className="inn-input" style={{ resize: 'vertical' }} />
            </div>

            {/* Images */}
            <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--gray-100)', paddingTop: 16, marginTop: 4 }}>
              <label className="block text-xs font-medium mb-3" style={{ color: 'var(--gray-500)' }}>
                Images <span style={{ fontWeight: 300, color: 'var(--faint)' }}>(optional — displayed as carousel)</span>
              </label>

              {/* Previews */}
              {formImages.length > 0 && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                  {formImages.map((img, idx) => (
                    <div key={img.id} style={{ position: 'relative', width: 100, height: 70, borderRadius: 8, overflow: 'hidden',
                      border: '1px solid var(--border)', flexShrink: 0 }}>
                      <img src={img.dataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', top: 3, left: 4, background: 'rgba(0,0,0,0.45)',
                        borderRadius: 999, fontSize: 9, color: '#fff', padding: '1px 5px', fontWeight: 700 }}>
                        {idx + 1}
                      </div>
                      <button type="button" onClick={() => removeImage(img.id)}
                        style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(220,38,38,0.85)',
                          border: 'none', borderRadius: 999, width: 18, height: 18, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={10} style={{ color: '#fff' }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                border: '1.5px dashed var(--aqua-border)', background: 'var(--surface-2)', fontSize: 12,
                fontWeight: 500, color: 'var(--accent)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--aqua-pale)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-2)')}>
                <Upload size={14} />
                {imgLoading ? 'Uploading…' : formImages.length > 0 ? 'Add more images' : 'Upload images'}
                <input ref={imgRef} type="file" className="hidden" accept="image/*" multiple onChange={handleImages} />
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 20 }}>
            {saveErr
              ? <p className="text-xs font-medium" style={{ color: '#ef4444' }}>{saveErr}</p>
              : <p className="text-xs font-light" style={{ color: 'var(--faint)' }}>Fields marked * are required</p>
            }
            <div className="flex gap-2">
              <button type="button" onClick={() => { setShowForm(false); resetForm() }} className="btn-secondary text-xs">Cancel</button>
              <button type="button" onClick={handleSave} disabled={saving || !form.partner.trim() || !form.description.trim()}
                className="btn-aqua text-xs" style={{ opacity: saving || !form.partner.trim() || !form.description.trim() ? 0.5 : 1 }}>
                {saving ? 'Saving…' : 'Save Collaboration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Grid ─────────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 20 }}>
          {Array.from({ length: cols * 2 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : collabs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Handshake size={22} style={{ color: 'var(--faint)' }} />
          </div>
          <h3>No collaborations yet</h3>
          {admin && <p>Click "New Collaboration" to add one.</p>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 20 }}>
          {paged.map((c, i) => (
            <div key={c.id} className="animate-slide-up" style={{ opacity: 0, animationFillMode: 'forwards', animationDelay: `${i * 0.05}s` }}>
              <CollabCard collab={c} />
            </div>
          ))}
        </div>
      )}

      <Pagination page={safeP} totalPages={totalPages} onChange={setPage} />
    </div>
  )
}
