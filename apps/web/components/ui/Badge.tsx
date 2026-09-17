import type { CollaborationStatus, Priority } from '@/lib/shared/types'

// Inline style approach for consistent rendering
const STATUS_STYLE: Record<CollaborationStatus, { bg: string; color: string; border: string }> = {
  'Identified':     { bg: 'var(--gray-100)', color: 'var(--text-secondary)', border: 'var(--gray-200)' },
  'Assessed':       { bg: 'var(--su-blue-bg2)', color: 'var(--chip-blue)', border: 'var(--su-blue-border)' },
  'Business Review':{ bg: 'var(--aqua-pale)', color: 'var(--chip-cyan)', border: 'var(--aqua-pale)' },
  'Pilot':          { bg: 'var(--su-violet-bg)', color: 'var(--chip-violet)', border: 'var(--su-violet-border)' },
  'Onboarded':      { bg: 'var(--su-green-bg2)', color: 'var(--chip-green)', border: 'var(--su-green-border)' },
  'Rejected':       { bg: 'var(--su-red-bg)', color: 'var(--chip-rose)', border: 'var(--su-red-border)' },
}

const PRIORITY_STYLE: Record<Priority, { bg: string; color: string; border: string }> = {
  High:   { bg: 'var(--su-red-bg)', color: 'var(--chip-rose)', border: 'var(--su-red-border)' },
  Medium: { bg: 'var(--su-amber-bg2)', color: 'var(--chip-amber)', border: 'var(--su-amber-border)' },
  Low:    { bg: 'var(--surface)', color: 'var(--text-muted)', border: 'var(--gray-200)' },
}

export function statusStyle(status: CollaborationStatus) { return STATUS_STYLE[status] }
export function priorityStyle(p: Priority) { return PRIORITY_STYLE[p] }

interface BadgeProps {
  label: string
  variant?: 'status' | 'priority' | 'dtrating' | 'bizrating' | 'dept' | 'sector' | 'tech' | 'default'
  className?: string
}

export default function Badge({ label, variant = 'default', className = '' }: BadgeProps) {
  let bg = 'var(--gray-100)', color = 'var(--text-secondary)', border = 'var(--gray-200)'

  if (variant === 'status') {
    const s = STATUS_STYLE[label as CollaborationStatus]
    if (s) { bg = s.bg; color = s.color; border = s.border }
  } else if (variant === 'priority') {
    const s = PRIORITY_STYLE[label as Priority]
    if (s) { bg = s.bg; color = s.color; border = s.border }
  } else if (variant === 'dept') {
    bg = 'var(--aqua-light)'; color = 'var(--accent)'; border = 'var(--aqua-border)'
  } else if (variant === 'sector') {
    bg = 'var(--gray-100)'; color = 'var(--text-secondary)'; border = 'var(--gray-200)'
  } else if (variant === 'tech') {
    bg = 'var(--aqua-pale)'; color = 'var(--accent)'; border = 'var(--aqua-light)'
  } else if (variant === 'dtrating' || variant === 'bizrating') {
    const map: Record<string, { bg: string; color: string; border: string }> = {
      'Underwhelming': { bg: 'var(--su-red-bg)', color: 'var(--chip-rose)', border: 'var(--su-red-border)' },
      'Has Potential': { bg: 'var(--su-amber-bg2)', color: 'var(--chip-amber)', border: 'var(--su-amber-border)' },
      'Promising':     { bg: 'var(--su-blue-bg2)', color: 'var(--chip-blue)', border: 'var(--su-blue-border)' },
      'Impressive':    { bg: 'var(--su-green-bg2)', color: 'var(--chip-green)', border: 'var(--su-green-border)' },
    }
    const s = map[label]
    if (s) { bg = s.bg; color = s.color; border = s.border }
  }

  return (
    <span
      className={`badge ${className}`}
      style={{ background: bg, color, border: `1px solid ${border}` }}
    >
      {label}
    </span>
  )
}
