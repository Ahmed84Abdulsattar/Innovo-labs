'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { Plus, Search, X, Newspaper, ChevronLeft, ChevronRight, ChevronDown, Upload, Trash2, Film } from 'lucide-react'
import { useApp } from '@/lib/client/context'
import { cardSpotlight } from '@/lib/client/hover'
import { isAdmin } from '@/lib/shared/permissions'
import PageHeader from '@/components/layout/PageHeader'
import { NEWS_CATEGORIES, CATEGORY_STYLE, type NewsArticle, type NewsCategory } from '@/lib/shared/data/news-data'
import { uploadVideo } from '@/lib/client/supabase-browser'
import { compressImage } from '@/lib/client/compress-image'
import { uploadImageToStorage } from '@/lib/client/upload-image'

const PER_PAGE = 12

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

/* ── Category multi-select dropdown ─────────────────────────────────────── */
function CategoryDropdown({ selected, onChange }: {
  selected: NewsCategory[]
  onChange: (v: NewsCategory[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const toggle = (c: NewsCategory) =>
    onChange(selected.includes(c) ? selected.filter(x => x !== c) : [...selected, c])

  const label = selected.length === 0 ? '— Select categories —'
    : selected.length === 1 ? selected[0]
    : `${selected[0]} +${selected.length - 1} more`

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)} className="inn-select"
        style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
        <span style={{ color: selected.length === 0 ? 'var(--faint)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <ChevronDown size={13} style={{ flexShrink: 0, color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          {NEWS_CATEGORIES.map(cat => {
            const on = selected.includes(cat)
            const cs = CATEGORY_STYLE[cat]
            return (
              <button key={cat} type="button" onClick={() => toggle(cat)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', background: on ? 'var(--aqua-pale)' : 'var(--surface)',
                  border: 'none', borderBottom: '1px solid var(--gray-100)', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => { if (!on) (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)' }}
                onMouseLeave={e => { if (!on) (e.currentTarget as HTMLElement).style.background = '#fff' }}>
                <div style={{ width: 15, height: 15, borderRadius: 4, flexShrink: 0,
                  border: `2px solid ${on ? cs.dot : 'var(--gray-300)'}`,
                  background: on ? cs.dot : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {on && <div style={{ width: 5, height: 5, borderRadius: 1, background: 'var(--surface)' }} />}
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color: on ? cs.text : 'var(--text-secondary)' }}>{cat}</span>
                <span style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: cs.dot, flexShrink: 0 }} />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}


/* ── Article card — fixed 380 px height, position:absolute image ─────────── */
function ArticleCard({ article }: { article: NewsArticle }) {
  const cat = article.categories?.[0]
  const cs  = (cat && CATEGORY_STYLE[cat]) ?? { bg: 'var(--gray-100)', text: 'var(--gray-500)', dot: 'var(--faint)' }
  const src = article.thumbnailUrl || article.thumbnailDataUrl || null

  return (
    <Link href={`/news/${article.id}`} style={{ textDecoration: 'none', display: 'block', width: '100%', minWidth: 0 }}>
      <div
        className="inn-card card-glow"
        onMouseMove={cardSpotlight}
        style={{
          height: 380, width: '100%', display: 'flex', flexDirection: 'column',
          borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
        }}
      >
        {/* Thumbnail — fixed 200px, img is position:absolute to bypass Tailwind img reset */}
        <div style={{ position: 'relative', height: 200, flexShrink: 0, background: 'var(--gray-100)', overflow: 'hidden' }}>
          {src ? (
            <img
              src={src}
              alt={article.title}
              className="card-media"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Newspaper size={36} style={{ color: 'var(--faint)' }} />
            </div>
          )}
          <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 4, zIndex: 1 }}>
            {cat && (
              <span style={{ background: cs.bg, color: cs.text, fontSize: 10, fontWeight: 700,
                letterSpacing: '0.04em', padding: '3px 9px', borderRadius: 999 }}>
                {cat}
              </span>
            )}
            {(article.categories?.length ?? 0) > 1 && (
              <span style={{ background: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: 10,
                fontWeight: 700, padding: '3px 7px', borderRadius: 999 }}>
                +{article.categories.length - 1}
              </span>
            )}
          </div>
        </div>

        {/* Body — fixed 180px */}
        <div style={{ height: 180, display: 'flex', flexDirection: 'column', padding: '14px 16px 14px', gap: 6, overflow: 'hidden' }}>
          <h3 style={{
            margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
            lineHeight: 1.4, letterSpacing: '-0.01em', flexShrink: 0,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{article.title}</h3>

          <p style={{
            margin: 0, flex: 1, fontSize: 12, color: 'var(--gray-500)', lineHeight: 1.55,
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{article.excerpt}</p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingTop: 8, borderTop: '1px solid var(--gray-100)', flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
              {article.source || 'Innovo Labs'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--faint)', flexShrink: 0 }}>
              {new Date(article.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
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
    <div style={{ height: 380, display: 'flex', flexDirection: 'column',
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ height: 200, background: 'var(--gray-100)' }} />
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ height: 14, borderRadius: 6, background: 'var(--gray-100)', width: '75%' }} />
        <div style={{ height: 12, borderRadius: 6, background: 'var(--surface-2)', width: '100%' }} />
        <div style={{ height: 12, borderRadius: 6, background: 'var(--surface-2)', width: '85%' }} />
      </div>
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function NewsPage() {
  const { currentUser } = useApp()
  const admin = isAdmin(currentUser)
  const cols  = useCols()

  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState<NewsCategory | ''>('')
  const [page, setPage]         = useState(1)

  /* form state */
  const [fTitle, setFTitle]       = useState('')
  const [fExcerpt, setFExcerpt]   = useState('')
  const [fContent, setFContent]   = useState('')
  const [fCats, setFCats]         = useState<NewsCategory[]>([])
  const [fSource, setFSource]     = useState('')
  const [fDate, setFDate]         = useState(new Date().toISOString().slice(0, 10))
  const [fThumb, setFThumb]       = useState('')
  const [fThumbLoading, setFTL]   = useState(false)
  const [fThumbErr, setFTE]       = useState(false)
  const [fVideo, setFVideo]       = useState('')
  const [fVideoName, setFVideoName] = useState('')
  const [fVideoLoading, setFVL]   = useState(false)
  const [fVideoErr, setFVE]       = useState('')
  const [fSaveErr, setFSE]        = useState('')
  const [fSaving, setFSaving]     = useState(false)
  const thumbRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/news')
      .then(r => r.json())
      .then(d => { setArticles(d.articles || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return articles.filter(a =>
      (!filter || (a.categories || []).includes(filter)) &&
      (!q || a.title.toLowerCase().includes(q) || (a.excerpt || '').toLowerCase().includes(q) || (a.source || '').toLowerCase().includes(q))
    )
  }, [articles, filter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safeP      = Math.min(page, totalPages)
  const paginated  = filtered.slice((safeP - 1) * PER_PAGE, safeP * PER_PAGE)

  useEffect(() => setPage(1), [filter, search])

  const categoryCounts = useMemo(() => {
    const m: Record<string, number> = {}
    articles.forEach(a => (a.categories || []).forEach(c => { m[c] = (m[c] || 0) + 1 }))
    return m
  }, [articles])

  const resetForm = () => {
    setFTitle(''); setFExcerpt(''); setFContent(''); setFCats([])
    setFSource(''); setFDate(new Date().toISOString().slice(0, 10))
    setFThumb(''); setFTE(false); setFSE('')
    setFVideo(''); setFVideoName(''); setFVE('')
    if (thumbRef.current) thumbRef.current.value = ''
    if (videoRef.current) videoRef.current.value = ''
  }

  const handleThumb = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    setFTL(true); setFTE(false)
    try { setFThumb(await compressImage(f, 1280, 720)) } catch { setFTE(true) }
    setFTL(false)
  }

  const handleVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    const MAX_MB = 500
    if (f.size > MAX_MB * 1024 * 1024) { setFVE(`File too large — max ${MAX_MB} MB`); return }
    setFVL(true); setFVE('')
    try {
      const url = await uploadVideo(f)
      setFVideo(url)
      setFVideoName(f.name)
    } catch (err: any) {
      setFVE(err.message || 'Upload failed')
    }
    setFVL(false)
  }

  const handleSave = async () => {
    if (!fTitle.trim() || !fExcerpt.trim() || fCats.length === 0) return
    if (!fThumb) { setFTE(true); return }
    setFTE(false); setFSE(''); setFSaving(true)
    try {
      // Upload thumbnail to Supabase Storage so the list view can show it
      // without loading large base64 blobs for every card.
      let thumbnailUrl: string | null = null
      try {
        thumbnailUrl = await uploadImageToStorage(fThumb, 'thumb')
      } catch (upErr: any) {
        setFSE(upErr.message || 'Thumbnail upload failed'); setFSaving(false); return
      }

      const res = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: fTitle.trim(), excerpt: fExcerpt.trim(),
          content: fContent.trim() || null,
          categories: fCats,
          thumbnailUrl,
          videoDataUrl: fVideo || null,
          source: fSource.trim() || null,
          publishedAt: new Date(fDate).toISOString(),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setFSE(data.error || 'Failed to save'); setFSaving(false); return }
      setArticles(prev => [data.article, ...prev])
      resetForm(); setShowForm(false)
    } catch { setFSE('Network error. Please try again.') }
    setFSaving(false)
  }

  const canSave = fTitle.trim() && fExcerpt.trim() && fCats.length > 0 && fThumb && !fThumbLoading && !fSaving

  return (
    <div className="page-enter" style={{ padding: cols === 1 ? '16px' : '32px 40px', maxWidth: 1200, margin: '0 auto' }}>
      <PageHeader
        title="News"
        eyebrow="Knowledge Hub"
        subtitle={`${articles.length} article${articles.length !== 1 ? 's' : ''} · Innovation & Construction Technology`}
        actions={admin ? (
          <button type="button" onClick={() => setShowForm(v => !v)} className="btn-primary text-sm">
            <Plus size={15} /> Add Article
          </button>
        ) : undefined}
      />

      {/* ── Add Article form ─────────────────────────────────────────────── */}
      {showForm && admin && (
        <div className="inn-card p-6 mb-8" style={{ borderColor: 'var(--aqua-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <p className="text-xs font-bold tracking-widest" style={{ color: 'var(--accent)' }}>NEW ARTICLE</p>
            <button type="button" onClick={() => { setShowForm(false); resetForm() }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: cols === 1 ? '1fr' : '1fr 1fr', gap: 16 }}>
            {/* Title */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Title *</label>
              <input type="text" value={fTitle} onChange={e => setFTitle(e.target.value)}
                placeholder="Article headline" className="inn-input" />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Category *</label>
              <CategoryDropdown selected={fCats} onChange={setFCats} />
              {fCats.length === 0 && fSaveErr && (
                <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>Select at least one category</p>
              )}
            </div>

            {/* Source */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Source / Publisher</label>
              <input type="text" value={fSource} onChange={e => setFSource(e.target.value)}
                placeholder="e.g. Construction Dive" className="inn-input" />
            </div>

            {/* Excerpt */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>
                Short excerpt * <span style={{ fontWeight: 300, color: 'var(--faint)' }}>(shown on card)</span>
              </label>
              <textarea value={fExcerpt} onChange={e => setFExcerpt(e.target.value)} rows={2}
                placeholder="2–3 sentence summary" className="inn-input" style={{ resize: 'vertical' }} />
            </div>

            {/* Content */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Full content</label>
              <textarea value={fContent} onChange={e => setFContent(e.target.value)} rows={6}
                placeholder="Full article text. Use blank lines between paragraphs." className="inn-input" style={{ resize: 'vertical' }} />
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Published date</label>
              <input type="date" value={fDate} onChange={e => setFDate(e.target.value)} className="inn-input" />
            </div>

            {/* Thumbnail */}
            <div style={{ gridColumn: cols === 1 ? '1' : '1 / -1' }}>
              <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: 16, marginTop: 4 }}>
                <label className="block text-xs font-medium mb-3" style={{ color: 'var(--gray-500)' }}>
                  Thumbnail image *
                  {fThumbErr && <span style={{ color: '#ef4444', marginLeft: 8, fontWeight: 600 }}>Required</span>}
                </label>
                {fThumb ? (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div style={{ width: 180, height: 102, borderRadius: 10, overflow: 'hidden',
                      flexShrink: 0, border: '1px solid var(--border)', background: 'var(--gray-100)' }}>
                      <img src={fThumb} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <p className="text-xs font-medium" style={{ color: 'var(--su-green-tx)' }}>Thumbnail selected</p>
                      <button type="button" onClick={() => { setFThumb(''); if (thumbRef.current) thumbRef.current.value = '' }}
                        className="btn-ghost text-xs" style={{ color: '#ef4444' }}>
                        <Trash2 size={12} /> Remove
                      </button>
                      <label className="btn-secondary text-xs" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Upload size={12} /> Replace
                        <input ref={thumbRef} type="file" className="hidden" accept="image/*" onChange={handleThumb} />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                      padding: '28px 20px', borderRadius: 12, cursor: 'pointer',
                      border: `2px dashed ${fThumbErr ? '#ef4444' : 'var(--aqua-border)'}`,
                      background: fThumbErr ? 'var(--su-red-bg)' : 'var(--surface-2)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--aqua-pale)')}
                    onMouseLeave={e => (e.currentTarget.style.background = fThumbErr ? 'var(--su-red-bg)' : 'var(--surface-2)')}
                  >
                    <Upload size={22} style={{ color: fThumbErr ? '#ef4444' : 'var(--accent)' }} />
                    <p className="text-sm font-medium" style={{ color: fThumbErr ? '#ef4444' : 'var(--accent)', margin: 0 }}>
                      {fThumbLoading ? 'Loading…' : 'Click to upload thumbnail'}
                    </p>
                    <p className="text-xs font-light" style={{ color: 'var(--faint)', margin: 0 }}>JPG, PNG, WebP · 1280×720 recommended</p>
                    <input ref={thumbRef} type="file" className="hidden" accept="image/*" onChange={handleThumb} />
                  </label>
                )}
              </div>
            </div>

            {/* Video */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: 16, marginTop: 4 }}>
                <label className="block text-xs font-medium mb-3" style={{ color: 'var(--gray-500)' }}>
                  Video <span style={{ fontWeight: 300, color: 'var(--faint)' }}>(optional · MP4, WebM · max 200 MB)</span>
                  {fVideoErr && <span style={{ color: '#ef4444', marginLeft: 8, fontWeight: 600 }}>{fVideoErr}</span>}
                </label>
                {fVideo ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <video src={fVideo} controls style={{ width: '100%', maxHeight: 260, borderRadius: 10, background: '#000', border: '1px solid var(--border)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Film size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fVideoName}</span>
                      <button type="button" onClick={() => { setFVideo(''); setFVideoName(''); if (videoRef.current) videoRef.current.value = '' }}
                        className="btn-ghost text-xs" style={{ color: '#ef4444', marginLeft: 'auto', flexShrink: 0 }}>
                        <Trash2 size={12} /> Remove
                      </button>
                      <label className="btn-secondary text-xs" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <Upload size={12} /> Replace
                        <input ref={videoRef} type="file" className="hidden" accept="video/*" onChange={handleVideo} />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                      padding: '24px 20px', borderRadius: 12, cursor: 'pointer',
                      border: '2px dashed var(--border)', background: 'var(--surface-2)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--aqua-pale)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                  >
                    <Film size={22} style={{ color: fVideoLoading ? 'var(--accent)' : 'var(--faint)' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--text-muted)', margin: 0 }}>
                      {fVideoLoading ? 'Uploading video…' : 'Click to upload video'}
                    </p>
                    <p className="text-xs font-light" style={{ color: 'var(--faint)', margin: 0 }}>MP4, WebM, MOV · max 200 MB</p>
                    <input ref={videoRef} type="file" className="hidden" accept="video/*" onChange={handleVideo} />
                  </label>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 20 }}>
            {fSaveErr
              ? <p className="text-xs font-medium" style={{ color: '#ef4444' }}>{fSaveErr}</p>
              : <p className="text-xs font-light" style={{ color: 'var(--faint)' }}>Fields marked * are required</p>
            }
            <div className="flex gap-2">
              <button type="button" onClick={() => { setShowForm(false); resetForm() }} className="btn-secondary text-xs">Cancel</button>
              <button type="button" onClick={handleSave} disabled={!canSave} className="btn-aqua text-xs"
                style={{ opacity: canSave ? 1 : 0.5 }}>
                {fSaving ? 'Publishing…' : 'Publish Article'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Search & filter chips ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--faint)', pointerEvents: 'none' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search articles…" className="inn-input" style={{ paddingLeft: 36 }} />
          {search && (
            <button type="button" onClick={() => setSearch('')}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--faint)' }}>
              <X size={13} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 2 }}>
          <button type="button" onClick={() => setFilter('')}
            style={{ padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              flexShrink: 0, whiteSpace: 'nowrap', border: 'none',
              background: filter === '' ? 'var(--accent)' : 'var(--gray-100)',
              color: filter === '' ? '#fff' : 'var(--gray-500)' }}>
            All ({articles.length})
          </button>
          {NEWS_CATEGORIES.map(cat => {
            const cs = CATEGORY_STYLE[cat]
            const active = filter === cat
            return (
              <button key={cat} type="button" onClick={() => setFilter(active ? '' : cat)}
                style={{ padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  flexShrink: 0, whiteSpace: 'nowrap', border: 'none',
                  background: active ? cs.dot : cs.bg, color: active ? '#fff' : cs.text }}>
                {cat} ({categoryCounts[cat] || 0})
              </button>
            )
          })}
        </div>
      </div>

      {/* count + page indicator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {filtered.length === 0 ? 'No articles found'
            : `${filtered.length} article${filtered.length !== 1 ? 's' : ''}${filter ? ` in ${filter}` : ''}${search ? ` matching "${search}"` : ''}`}
        </p>
        {totalPages > 1 && <p style={{ fontSize: 12, color: 'var(--faint)' }}>Page {safeP} of {totalPages}</p>}
      </div>

      {/* ── Grid ─────────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 20 }}>
          {Array.from({ length: cols * 2 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Newspaper size={22} style={{ color: 'var(--faint)' }} />
          </div>
          <h3>No articles match your filters</h3>
          <button type="button" onClick={() => { setSearch(''); setFilter('') }}
            className="btn-ghost text-xs" style={{ marginTop: 8 }}>Clear filters</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 20 }}>
          {paginated.map((a, i) => (
            <div key={a.id} className="animate-slide-up" style={{ opacity: 0, animationFillMode: 'forwards', animationDelay: `${i * 0.05}s` }}>
              <ArticleCard article={a} />
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 40 }}>
          <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safeP === 1}
            className="btn-secondary text-xs" style={{ opacity: safeP === 1 ? 0.4 : 1 }}>
            <ChevronLeft size={14} /> Prev
          </button>
          <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safeP) <= 1)
              .reduce<(number | '…')[]>((acc, p, i, arr) => {
                if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('…')
                acc.push(p); return acc
              }, [])
              .map((p, i) => p === '…'
                ? <span key={`e${i}`} style={{ fontSize: 12, color: 'var(--faint)', padding: '0 4px' }}>…</span>
                : <button key={p} type="button" onClick={() => setPage(p as number)}
                    style={{ width: 32, height: 32, borderRadius: 8, fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', border: 'none',
                      background: safeP === p ? 'var(--accent)' : 'var(--gray-100)',
                      color: safeP === p ? '#fff' : 'var(--gray-500)' }}>{p}</button>
              )}
          </div>
          <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safeP === totalPages}
            className="btn-secondary text-xs" style={{ opacity: safeP === totalPages ? 0.4 : 1 }}>
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
