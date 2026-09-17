'use client'
import { Sun, Moon } from 'lucide-react'
import { useTheme, type Theme } from '@/lib/client/theme'

// Segmented light/dark control for the sidebar footer.
export default function ThemeToggle() {
  const { theme, mounted, setTheme } = useTheme()
  const active = mounted ? theme : 'light'
  const opts: { key: Theme; label: string; Icon: typeof Sun }[] = [
    { key: 'light', label: 'Light', Icon: Sun },
    { key: 'dark',  label: 'Dark',  Icon: Moon },
  ]

  return (
    <div style={{
      display: 'flex', gap: 3, padding: 3, borderRadius: 10,
      background: 'var(--sidebar-hover-bg)', border: '1px solid var(--sidebar-border)',
    }}>
      {opts.map(({ key, label, Icon }) => {
        const on = active === key
        return (
          <button key={key} type="button" onClick={() => setTheme(key)}
            aria-label={`${label} mode`} aria-pressed={on}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '6px 8px', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
              background: on ? 'var(--sidebar-active-bg)' : 'transparent',
              color: on ? 'var(--sidebar-active-text)' : 'var(--sidebar-icon)',
              transition: 'background 0.16s, color 0.16s',
            }}>
            <Icon size={14} strokeWidth={2} /> {label}
          </button>
        )
      })}
    </div>
  )
}
