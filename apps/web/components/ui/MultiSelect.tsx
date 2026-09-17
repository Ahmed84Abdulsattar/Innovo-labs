'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, X } from 'lucide-react'

interface MultiSelectProps {
  options: string[]
  value: string[]
  onChange: (val: string[]) => void
  placeholder?: string
  disabled?: boolean
}

export default function MultiSelect({
  options, value, onChange, placeholder = 'Select…', disabled = false,
}: MultiSelectProps) {
  const [open, setOpen]           = useState(false)
  const [dropPos, setDropPos]     = useState({ top: 0, left: 0, width: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const dropRef    = useRef<HTMLDivElement>(null)

  // Position the portal-rendered dropdown relative to the trigger
  const updatePos = useCallback(() => {
    if (!triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    setDropPos({
      top:   r.bottom + window.scrollY + 4,
      left:  r.left   + window.scrollX,
      width: r.width,
    })
  }, [])

  const handleOpen = () => {
    if (disabled) return
    updatePos()
    setOpen(v => !v)
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        dropRef.current    && !dropRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Reposition on scroll/resize
  useEffect(() => {
    if (!open) return
    const update = () => updatePos()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, updatePos])

  const toggle = (opt: string) =>
    onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt])

  const remove = (opt: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(value.filter(v => v !== opt))
  }

  const dropdown = open ? createPortal(
    <div
      ref={dropRef}
      style={{
        position: 'absolute',
        top:   dropPos.top,
        left:  dropPos.left,
        width: dropPos.width,
        background: 'var(--surface)',
        border: '1px solid var(--aqua-border)',
        borderRadius: 10,
        boxShadow: '0 8px 32px rgba(15,151,144,0.15)',
        zIndex: 99999,
        maxHeight: 280,
        overflowY: 'auto',
      }}>
      {/* "Select all / Clear" helper row */}
      {value.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          style={{
            width: '100%', textAlign: 'left', padding: '8px 16px',
            fontSize: 11, fontWeight: 600, color: '#ef4444',
            background: 'none', border: 'none', borderBottom: '1px solid var(--gray-100)',
            cursor: 'pointer',
          }}>
          Clear all ({value.length} selected)
        </button>
      )}
      {options.map(opt => {
        const checked = value.includes(opt)
        return (
          <label
            key={opt}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 16px', cursor: 'pointer',
              borderBottom: '1px solid var(--gray-100)',
              background: checked ? 'var(--aqua-pale)' : 'var(--surface)',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (!checked) (e.currentTarget as HTMLElement).style.background = 'var(--aqua-pale)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = checked ? 'var(--aqua-pale)' : 'var(--surface)' }}>
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(opt)}
              style={{ accentColor: 'var(--accent)', width: 15, height: 15, cursor: 'pointer', flexShrink: 0 }}
            />
            <span style={{ fontSize: 13, fontWeight: checked ? 500 : 300, color: checked ? 'var(--accent)' : 'var(--text-primary)' }}>
              {opt}
            </span>
            {checked && (
              <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--accent)', fontWeight: 600 }}>✓</span>
            )}
          </label>
        )
      })}
    </div>,
    document.body
  ) : null

  return (
    <div ref={triggerRef} style={{ position: 'relative' }}>
      {/* Trigger */}
      <div
        onClick={handleOpen}
        className="inn-input"
        style={{
          minHeight: 52,
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 6,
          padding: '8px 36px 8px 12px',
          opacity: disabled ? 0.5 : 1,
          userSelect: 'none',
          borderColor: open ? 'var(--accent)' : undefined,
          boxShadow: open ? '0 0 0 3px rgba(15,151,144,0.1)' : undefined,
        }}>
        {value.length === 0 && (
          <span style={{ color: 'var(--gray-400)', fontSize: 13, fontWeight: 300 }}>{placeholder}</span>
        )}
        {value.map(v => (
          <span key={v}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium"
            style={{ background: 'var(--aqua-light)', color: 'var(--accent)', border: '1px solid var(--aqua-border)' }}>
            {v}
            {!disabled && (
              <button
                type="button"
                onClick={e => remove(v, e)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--accent)' }}>
                <X size={10} />
              </button>
            )}
          </span>
        ))}
        <ChevronDown size={14}
          style={{
            position: 'absolute', right: 10, top: '50%',
            transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`,
            color: 'var(--accent)', transition: '0.2s', pointerEvents: 'none',
          }} />
      </div>

      {dropdown}
    </div>
  )
}
