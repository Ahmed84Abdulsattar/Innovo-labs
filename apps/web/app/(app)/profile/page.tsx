'use client'
import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useApp } from '@/lib/client/context'
import { useIdeas } from '@/lib/client/hooks/useIdeas'
import { useInitiatives } from '@/lib/client/hooks/useInitiatives'
import { uploadImageToStorage } from '@/lib/client/upload-image'
import PageHeader from '@/components/layout/PageHeader'
import { Lightbulb, CheckCircle2, Star, TrendingUp, Clock, XCircle, Zap, Camera, Trash2, X, Users, Rocket, ArrowUpRight } from 'lucide-react'

function prepareImage(file: File): Promise<string> {
  // Under 3 MB — use the original bytes, zero quality loss
  if (file.size <= 3 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload  = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }
  // Over 3 MB — resize to 2000px with high-quality step-down
  return new Promise((resolve, reject) => {
    const maxPx = 2000
    const img   = new Image()
    const url   = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(maxPx / img.width, maxPx / img.height, 1)
      const w = Math.round(img.width  * scale)
      const h = Math.round(img.height * scale)
      let src: HTMLCanvasElement | HTMLImageElement = img
      let sw = img.width, sh = img.height
      while (sw / 2 > w || sh / 2 > h) {
        const tmp = document.createElement('canvas')
        tmp.width  = Math.max(Math.round(sw / 2), w)
        tmp.height = Math.max(Math.round(sh / 2), h)
        const tc = tmp.getContext('2d')!
        tc.imageSmoothingEnabled = true
        tc.imageSmoothingQuality = 'high'
        tc.drawImage(src, 0, 0, tmp.width, tmp.height)
        sw = tmp.width; sh = tmp.height; src = tmp
      }
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(src, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.97))
    }
    img.onerror = reject
    img.src = url
  })
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: any; credits: number }> = {
  'Submitted':              { label: 'Submitted',             color: 'var(--chip-cyan)', bg: 'var(--aqua-pale)', icon: Lightbulb,    credits: 1  },
  'Under Review':           { label: 'Under Review',          color: 'var(--chip-violet)', bg: 'var(--su-violet-bg)', icon: Clock,        credits: 1  },
  'Accepted':               { label: 'Accepted',              color: 'var(--chip-green)', bg: 'var(--su-green-bg)', icon: CheckCircle2, credits: 11 },
  'Converted to Initiative':{ label: 'Converted',             color: 'var(--accent)', bg: 'var(--aqua-light)', icon: Zap,          credits: 11 },
  'Declined':               { label: 'Declined',              color: 'var(--text-muted)', bg: 'var(--gray-100)', icon: XCircle,      credits: 1  },
}

export default function ProfilePage() {
  const { currentUser, updateProfilePhoto } = useApp()
  const { data: ideas = [] } = useIdeas()
  const { data: initiatives = [] } = useInitiatives()
  const fileRef    = useRef<HTMLInputElement>(null)
  const [uploading,  setUploading]  = useState(false)
  const [photoErr,   setPhotoErr]   = useState('')
  const [lightboxOpen, setLightbox] = useState(false)
  const [contribFilter, setContribFilter] = useState<'all' | 'idea' | 'initiative'>('all')

  const myIdeas = useMemo(
    () => ideas.filter(i => i.submittedBy === currentUser.id),
    [ideas, currentUser.id]
  )

  // Things this user is assigned to as a contributor (ideas + initiatives),
  // normalised into one clickable list with a type discriminator.
  const contributions = useMemo(() => {
    const uid = currentUser.id
    const fromIdeas = ideas
      .filter(i => (i.contributors ?? []).some(c => c.id === uid))
      .map(i => ({ kind: 'idea' as const, id: i.id, title: i.problemTitle, status: i.status, ref: i.ideaRef, href: `/ideas/${i.id}?from=/profile` }))
    const fromInitiatives = initiatives
      .filter(i => (i.contributors ?? []).some(c => c.id === uid))
      .map(i => ({ kind: 'initiative' as const, id: i.id, title: i.name, status: i.status, ref: i.initiativeId, href: `/initiatives/${i.id}?from=/profile` }))
    return [...fromIdeas, ...fromInitiatives]
  }, [ideas, initiatives, currentUser.id])

  const filteredContributions = contribFilter === 'all'
    ? contributions
    : contributions.filter(c => c.kind === contribFilter)
  const ideaContribCount = contributions.filter(c => c.kind === 'idea').length
  const initiativeContribCount = contributions.filter(c => c.kind === 'initiative').length

  const submitted = myIdeas.length
  const approved  = myIdeas.filter(i => i.status === 'Accepted' || i.status === 'Converted to Initiative').length
  const total     = submitted * 1 + approved * 10

  const initials = currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setPhotoErr('Max file size is 5 MB.'); return }
    setPhotoErr('')
    setUploading(true)
    try {
      // Resize/normalise client-side, then upload to Storage and persist the
      // URL — the row no longer carries the base64 image.
      const dataUrl = await prepareImage(file)
      const url     = await uploadImageToStorage(dataUrl, 'avatar')
      await updateProfilePhoto(url)
    } catch {
      setPhotoErr('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const roleLabel =
    currentUser.role === 'super_admin' ? 'Super Admin'
    : currentUser.role === 'innovation_admin' ? 'Admin'
    : currentUser.role === 'contributor' ? 'Contributor'
    : 'Viewer'

  return (
    <div className="p-4 md:p-8 page-enter">
      <PageHeader title="My Profile" eyebrow="Account" subtitle="Innovation credits & activity" />

      {/* ── Profile card ─────────────────────────────────────────────────── */}
      {/* Stacks vertically on mobile so the fixed-width credits badge can't
          squeeze the name/email column (which hid the email). */}
      <div className="inn-card p-6 mb-6 flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:text-left">
        {/* Avatar + upload */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            {/* Clickable avatar */}
            <div
              onClick={() => currentUser.profilePhoto && setLightbox(true)}
              style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent), var(--chip-cyan))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em',
                overflow: 'hidden',
                cursor: currentUser.profilePhoto ? 'zoom-in' : 'default',
              }}>
              {currentUser.profilePhoto
                ? <img src={currentUser.profilePhoto} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials}
            </div>
            {/* Camera button */}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              title="Change photo"
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 24, height: 24, borderRadius: '50%',
                background: '#122023', border: '2px solid #fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: uploading ? 'not-allowed' : 'pointer', padding: 0,
                opacity: uploading ? 0.5 : 1,
              }}>
              <Camera size={11} style={{ color: '#9ef3ee' }} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
          </div>
          {/* Delete button — only when photo exists */}
          {currentUser.profilePhoto && (
            <button
              onClick={async () => { setUploading(true); await updateProfilePhoto(null); setUploading(false) }}
              disabled={uploading}
              title="Remove photo"
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 10, color: 'var(--chip-rose)', background: 'none', border: 'none',
                cursor: uploading ? 'not-allowed' : 'pointer', padding: 0,
                opacity: uploading ? 0.5 : 1,
              }}>
              <Trash2 size={10} /> Remove
            </button>
          )}
          {photoErr && (
            <p style={{ fontSize: 10, color: 'var(--chip-rose)', margin: 0, maxWidth: 80, textAlign: 'center', lineHeight: 1.3 }}>{photoErr}</p>
          )}
        </div>

        {/* Lightbox */}
        {lightboxOpen && currentUser.profilePhoto && (
          <div
            onClick={() => setLightbox(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: 'rgba(10,18,20,0.85)', backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <button
              onClick={() => setLightbox(false)}
              style={{
                position: 'absolute', top: 20, right: 20,
                background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
                width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#fff',
              }}>
              <X size={18} />
            </button>
            <img
              src={currentUser.profilePhoto}
              alt="Profile photo"
              onClick={e => e.stopPropagation()}
              style={{ width: '90vw', height: '85vh', borderRadius: 12, objectFit: 'contain', display: 'block', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}
            />
          </div>
        )}

        <div className="w-full sm:flex-1 min-w-0">
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            {currentUser.name}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', margin: 0, wordBreak: 'break-word' }}>
            {currentUser.email}
          </p>
          <div className="justify-center sm:justify-start" style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', padding: '3px 10px', borderRadius: 999, background: 'var(--accent)14', color: 'var(--accent)' }}>
              {roleLabel}
            </span>
            {currentUser.department && (
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', padding: '3px 10px', borderRadius: 999, background: 'var(--gray-100)', color: 'var(--gray-500)' }}>
                {currentUser.department}
              </span>
            )}
          </div>
        </div>

        {/* Total credits badge — fixed dark slate in both themes so the aqua number stays readable */}
        <div style={{ textAlign: 'center', padding: '16px 28px', borderRadius: 16, background: 'linear-gradient(135deg, #122023, #1e3a3d)', flexShrink: 0 }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: '#9ef3ee', lineHeight: 1, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
            {total}
          </div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--gray-500)', margin: '4px 0 0', textTransform: 'uppercase' }}>
            Innovation Credits
          </p>
        </div>
      </div>

      {/* ── Credit breakdown ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          {
            icon: Lightbulb,
            label: 'Ideas Submitted',
            value: submitted,
            credits: submitted * 1,
            creditPer: '1 credit each',
            accent: 'var(--chip-cyan)',
            bg: 'var(--aqua-pale)',
          },
          {
            icon: CheckCircle2,
            label: 'Ideas Approved',
            value: approved,
            credits: approved * 10,
            creditPer: '10 credits each',
            accent: 'var(--chip-green)',
            bg: 'var(--su-green-bg)',
          },
          {
            icon: Star,
            label: 'Total Innovation Credits',
            value: total,
            credits: null,
            creditPer: 'A + B combined',
            accent: 'var(--accent)',
            bg: 'var(--aqua-light)',
          },
        ].map(({ icon: Icon, label, value, credits, creditPer, accent, bg }, i) => (
          <div key={label} className="inn-card p-5 animate-slide-up" style={{ opacity: 0, animationFillMode: 'forwards', animationDelay: `${i * 0.07}s` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} strokeWidth={1.5} style={{ color: accent }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--faint)', textTransform: 'uppercase' }}>{creditPer}</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
              {credits !== null ? credits : value}
            </div>
            {credits !== null && (
              <div style={{ fontSize: 13, color: accent, fontWeight: 600, marginTop: 2 }}>
                {value} idea{value !== 1 ? 's' : ''}
              </div>
            )}
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginTop: 6 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* ── My ideas list ────────────────────────────────────────────────── */}
      <div className="inn-card overflow-hidden">
        <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--gray-100)' }}>
          <div className="flex items-center gap-2">
            <TrendingUp size={14} style={{ color: 'var(--accent)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>My Idea History</h2>
          </div>
        </div>

        {myIdeas.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Lightbulb size={22} style={{ color: 'var(--faint)' }} />
            </div>
            <h3>No ideas submitted yet</h3>
            <p>Ideas you submit will appear here.</p>
          </div>
        ) : (
          <div>
            {myIdeas.map((idea, idx) => {
              const meta    = STATUS_META[idea.status] ?? STATUS_META['Submitted']
              const Icon    = meta.icon
              const earned  = idea.status === 'Accepted' || idea.status === 'Converted to Initiative' ? 11 : 1

              return (
                <Link key={idea.id} href={`/ideas/${idea.id}?from=/profile`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-[var(--aqua-pale)] transition-colors animate-slide-up group"
                  style={{ borderBottom: idx < myIdeas.length - 1 ? '1px solid var(--gray-100)' : 'none', opacity: 0, animationFillMode: 'forwards', animationDelay: `${idx * 50}ms`, textDecoration: 'none', color: 'inherit' }}>

                  {/* Status icon */}
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={14} strokeWidth={1.5} style={{ color: meta.color }} />
                  </div>

                  {/* Title + date */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                      {idea.problemTitle}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--faint)', margin: '2px 0 0' }}>
                      {new Date(idea.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>

                  {/* Status badge */}
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', padding: '3px 9px', borderRadius: 999, background: meta.bg, color: meta.color, flexShrink: 0 }}>
                    {meta.label}
                  </span>

                  {/* Credits earned */}
                  <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 52 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>+{earned}</span>
                    <p style={{ fontSize: 9, color: 'var(--faint)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>pts</p>
                  </div>

                  <ArrowUpRight size={15} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--accent)', flexShrink: 0 }} />
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* ── My contributions ─────────────────────────────────────────────── */}
      <div className="inn-card overflow-hidden mt-6">
        <div className="px-6 py-4 border-b flex items-center justify-between gap-3 flex-wrap" style={{ borderColor: 'var(--gray-100)' }}>
          <div className="flex items-center gap-2">
            <Users size={14} style={{ color: 'var(--accent)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>My Contributions</h2>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{contributions.length}</span>
          </div>
          {/* Filter */}
          {contributions.length > 0 && (
            <div className="flex items-center gap-1">
              {([
                { key: 'all' as const,        label: `All (${contributions.length})` },
                { key: 'idea' as const,       label: `Ideas (${ideaContribCount})` },
                { key: 'initiative' as const, label: `Initiatives (${initiativeContribCount})` },
              ]).map(f => (
                <button key={f.key} type="button" onClick={() => setContribFilter(f.key)}
                  className="text-xs font-medium px-2.5 py-1 rounded-full transition-colors"
                  style={{
                    background: contribFilter === f.key ? 'var(--accent)' : 'var(--surface-2)',
                    color: contribFilter === f.key ? '#fff' : 'var(--text-muted)',
                    border: '1px solid var(--border)', cursor: 'pointer',
                  }}>
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {contributions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Users size={22} style={{ color: 'var(--faint)' }} /></div>
            <h3>No contributions yet</h3>
            <p>Ideas and initiatives you're assigned to as a contributor will appear here.</p>
          </div>
        ) : (
          <div>
            {filteredContributions.map((c, idx) => {
              const Icon = c.kind === 'idea' ? Lightbulb : Rocket
              return (
                <Link key={`${c.kind}-${c.id}`} href={c.href}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-[var(--aqua-pale)] transition-colors group"
                  style={{ borderBottom: idx < filteredContributions.length - 1 ? '1px solid var(--gray-100)' : 'none', textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--aqua-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={14} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                      {c.title}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--faint)', margin: '2px 0 0' }}>
                      {c.kind === 'idea' ? 'Idea' : 'Initiative'}{c.ref ? ` · ${c.ref}` : ''}
                    </p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', padding: '3px 9px', borderRadius: 999, background: 'var(--gray-100)', color: 'var(--gray-500)', flexShrink: 0 }}>
                    {c.status}
                  </span>
                  <ArrowUpRight size={15} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--accent)', flexShrink: 0 }} />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
