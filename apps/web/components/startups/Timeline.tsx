'use client'
import { useState } from 'react'
import { CheckCircle2, Clock, Zap, TrendingUp, XCircle, Plus, Lock, Unlock, Trash2 } from 'lucide-react'
import { TIMELINE_STEPS, RATINGS, COLLABORATION_STATUSES } from '@/lib/shared/constants'
import { canAddTimelineEvent, canUnlockTimeline } from '@/lib/shared/permissions'
import type { CollaborationStatus, Rating, Startup } from '@/lib/shared/types'
import { useApp } from '@/lib/client/context'

const STATUS_ICON: Partial<Record<CollaborationStatus, React.ElementType>> = {
  'Identified':     Clock,
  'Assessed':       CheckCircle2,
  'Business Review':TrendingUp,
  'Pilot':          Zap,
  'Onboarded':      CheckCircle2,
  'Rejected':       XCircle,
}

const STATUS_COLOR: Partial<Record<CollaborationStatus, { dot: string; bg: string; border: string; text: string }>> = {
  'Identified':     { dot: '#94a3b8', bg: 'var(--surface-2)', border: 'var(--border)', text: 'var(--gray-500)' },
  'Assessed':       { dot: 'var(--chip-cyan)', bg: 'var(--su-blue-bg2)', border: 'var(--su-blue-border)', text: '#0369a1' },
  'Business Review':{ dot: 'var(--accent)', bg: 'var(--aqua-pale)', border: 'var(--aqua-border)', text: 'var(--accent)' },
  'Pilot':          { dot: 'var(--chip-violet)', bg: 'var(--su-violet-bg)', border: 'var(--su-violet-border)', text: '#6d28d9' },
  'Onboarded':      { dot: 'var(--chip-green)', bg: 'var(--aqua-pale)', border: 'var(--su-green-border)', text: 'var(--chip-green)' },
  'Rejected':       { dot: '#ef4444', bg: 'var(--su-red-bg)', border: 'var(--su-red-border)', text: '#ef4444' },
}

function RatingPill({ rating }: { rating: string }) {
  const bg:   Record<string,string> = { 'Underwhelming':'var(--su-red-bg2)','Has Potential':'var(--su-amber-bg)','Promising':'var(--su-blue-bg)','Impressive':'var(--su-green-bg)' }
  const text: Record<string,string> = { 'Underwhelming':'var(--su-red-tx)','Has Potential':'var(--su-amber-tx)','Promising':'var(--su-blue-tx)','Impressive':'var(--su-green-tx)' }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
      style={{ background: bg[rating]||'var(--gray-100)', color: text[rating]||'var(--text-secondary)' }}>
      {rating}
    </span>
  )
}

export default function Timeline({ startup, canEdit }: { startup: Startup; canEdit: boolean }) {
  const { currentUser, reload } = useApp()
  const [adding, setAdding]             = useState(false)
  const [forceUnlocked, setForceUnlocked] = useState(false)
  const [newStatus, setNewStatus]       = useState<CollaborationStatus>('Assessed')
  const [newRating, setNewRating]       = useState<Rating | ''>('')
  const [newFeedback, setNewFeedback]   = useState('')

  const superAdmin   = canUnlockTimeline(currentUser)
  const lockCheck    = canAddTimelineEvent(startup, currentUser)
  // Super admin can force-unlock; otherwise respect the lock
  const effectivelyAllowed = lockCheck.allowed || (superAdmin && forceUnlocked)
  const canActuallyAdd     = canEdit && effectivelyAllowed
  const stepDef            = TIMELINE_STEPS.find(s => s.status === newStatus)

  const handleAdd = async () => {
    if (!effectivelyAllowed) return
    try {
      const res = await fetch('/api/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startupId: startup.id,
          status:   newStatus,
          rating:   newRating || undefined,
          feedback: newFeedback || undefined,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      reload()
    } catch (err) {
      console.error('Failed to add timeline event', err)
    }
    setAdding(false)
    setForceUnlocked(false)
    setNewRating('')
    setNewFeedback('')
  }

  const handleDelete = async (eventId: string) => {
    try {
      const res = await fetch('/api/timeline', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, startupId: startup.id }),
      })
      if (!res.ok) throw new Error(await res.text())
      reload()
    } catch (err) {
      console.error('Failed to delete timeline event', err)
    }
  }

  return (
    <div className="inn-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--gray-100)' }}>
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full" style={{ background: 'linear-gradient(180deg,#9ef3ee,var(--accent))' }} />
          <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Collaboration timeline</h3>
          <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>{startup.timeline.length} events</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Super admin — unlock button when timeline is locked */}
          {superAdmin && !lockCheck.allowed && !forceUnlocked && (
            <button onClick={() => setForceUnlocked(true)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
              style={{ background: 'var(--su-amber-bg)', color: 'var(--su-amber-tx)', border: '1px solid var(--su-amber-border)', cursor: 'pointer' }}>
              <Unlock size={12} /> Unlock timeline
            </button>
          )}
          {superAdmin && forceUnlocked && !lockCheck.allowed && (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg"
                style={{ background: 'var(--su-green-bg)', color: 'var(--su-green-tx)', border: '1px solid var(--su-green-border)' }}>
                <Unlock size={11} /> Unlocked by Super Admin
              </span>
              <button onClick={() => setForceUnlocked(false)}
                className="text-xs font-light" style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Re-lock
              </button>
            </div>
          )}
          {canEdit && (
            effectivelyAllowed ? (
              <button onClick={() => setAdding(v => !v)} className={adding ? 'btn-secondary text-xs' : 'btn-aqua text-xs'}>
                <Plus size={13} /> {adding ? 'Cancel' : 'Add event'}
              </button>
            ) : !superAdmin ? (
              <div className="flex items-center gap-1.5 text-xs font-light" style={{ color: 'var(--faint)' }}>
                <Lock size={12} /> Locked
              </div>
            ) : null
          )}
        </div>
      </div>

      {/* Lock banner */}
      {lockCheck.reason && !forceUnlocked && (
        <div className="flex items-center gap-2 px-6 py-3 border-b" style={{ background: 'var(--su-red-bg)', borderColor: 'var(--su-red-border)' }}>
          <Lock size={13} style={{ color: '#ef4444', flexShrink: 0 }} />
          <p className="text-xs font-light" style={{ color: '#ef4444' }}>{lockCheck.reason}</p>
        </div>
      )}
      {lockCheck.reason && forceUnlocked && superAdmin && (
        <div className="flex items-center gap-2 px-6 py-3 border-b" style={{ background: 'var(--su-amber-bg3)', borderColor: 'var(--su-amber-border)' }}>
          <Unlock size={13} style={{ color: 'var(--su-amber-tx)', flexShrink: 0 }} />
          <p className="text-xs font-light" style={{ color: 'var(--su-amber-tx)' }}>Timeline unlocked by Super Admin — changes will be permanent.</p>
        </div>
      )}

      {/* Add event form */}
      {adding && canActuallyAdd && (
        <div className="px-6 py-5 border-b animate-slide-up"
          style={{ opacity: 0, animationFillMode: 'forwards', borderColor: 'var(--aqua-border)', background: 'var(--aqua-pale)' }}>
          <p className="text-xs font-medium tracking-widest mb-4" style={{ color: 'var(--accent)' }}>NEW TIMELINE EVENT</p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Status</label>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value as CollaborationStatus)} className="inn-select">
                {COLLABORATION_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            {stepDef?.hasRating && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Rating</label>
                <select value={newRating} onChange={e => setNewRating(e.target.value as Rating|'')} className="inn-select">
                  <option value="">Select rating</option>
                  {RATINGS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
            )}
          </div>
          {stepDef?.hasFeedback && (
            <div className="mb-4">
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Feedback / notes</label>
              <textarea rows={2} value={newFeedback} onChange={e => setNewFeedback(e.target.value)}
                placeholder="Notes on this stage…" className="inn-input resize-none" />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => setAdding(false)} className="btn-secondary text-xs">Cancel</button>
            <button onClick={handleAdd} className="btn-aqua text-xs">Save event</button>
          </div>
        </div>
      )}

      {/* Events */}
      <div className="px-6 py-5">
        {startup.timeline.length === 0 && (
          <p className="text-sm font-light text-center py-4" style={{ color: 'var(--faint)' }}>No timeline events yet.</p>
        )}
        <div style={{ position: 'relative' }}>
          {startup.timeline.length > 1 && (
            <div style={{ position: 'absolute', left: 11, top: 24, bottom: 24, width: 2, background: 'linear-gradient(180deg,#9ef3ee40,var(--accent)40)', borderRadius: 2 }} />
          )}
          <div className="space-y-5">
            {[...startup.timeline].reverse().map((event, idx) => {
              const colors = STATUS_COLOR[event.status] || STATUS_COLOR['Identified']!
              const Icon   = STATUS_ICON[event.status] || Clock
              const isLast = idx === 0
              return (
                <div key={event.id} className="flex gap-4" style={{ position: 'relative' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: isLast ? colors.dot : 'var(--surface)', border: `2px solid ${colors.dot}`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1, boxShadow: isLast ? `0 0 0 4px ${colors.dot}20` : 'none' }}>
                    <Icon size={12} style={{ color: isLast ? '#fff' : colors.dot }} />
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="text-sm font-medium" style={{ color: colors.text }}>
                        {TIMELINE_STEPS.find(s => s.status === event.status)?.label || event.status}
                      </span>
                      <span className="text-[11px] font-light" style={{ color: 'var(--faint)' }}>
                        {new Date(event.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="text-[11px] font-light" style={{ color: 'var(--faint)' }}>by {event.createdByName.split(' ')[0]}</span>
                      {superAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDelete(event.id)}
                          title="Delete this event (Super Admin)"
                          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 4, color: '#fca5a5', transition: 'color 0.15s' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#ef4444'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#fca5a5'}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    {(event.rating || event.feedback) && (
                      <div className="rounded-xl p-4 space-y-2" style={{ background: colors.bg, border: `1px solid ${colors.border}` }}>
                        {event.rating && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-medium tracking-wider" style={{ color: colors.text }}>RATING</span>
                            <RatingPill rating={event.rating} />
                          </div>
                        )}
                        {event.feedback && (
                          <div>
                            <p className="text-[10px] font-medium tracking-wider mb-1" style={{ color: colors.text }}>FEEDBACK</p>
                            <p className="text-xs font-light leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{event.feedback}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
