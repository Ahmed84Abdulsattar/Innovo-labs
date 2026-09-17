'use client'
// ── Theme (light / dark) ──────────────────────────────────────────────────
// The actual <html data-theme> attribute is set BEFORE React hydrates by the
// inline script in app/layout.tsx (no flash of the wrong theme). This provider
// just mirrors that value into React state and persists user choices.
import { createContext, useContext, useEffect, useState, useCallback } from 'react'

export type Theme = 'light' | 'dark'
const STORAGE_KEY = 'innovo-theme'

interface ThemeCtx {
  theme: Theme
  /** true once mounted on the client — use to avoid SSR/CSR icon mismatch */
  mounted: boolean
  setTheme: (t: Theme) => void
  toggle: () => void
}

const Ctx = createContext<ThemeCtx | null>(null)

function apply(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  // On mount, read whatever the no-flash script already resolved.
  useEffect(() => {
    const current = (document.documentElement.getAttribute('data-theme') as Theme) || 'light'
    setThemeState(current)
    setMounted(true)

    // If the user hasn't chosen explicitly, keep following the OS preference.
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        const next: Theme = e.matches ? 'dark' : 'light'
        apply(next); setThemeState(next)
      }
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const setTheme = useCallback((t: Theme) => {
    apply(t)
    try { localStorage.setItem(STORAGE_KEY, t) } catch {}
    setThemeState(t)
  }, [])

  const toggle = useCallback(() => {
    setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark')
  }, [setTheme])

  return <Ctx.Provider value={{ theme, mounted, setTheme, toggle }}>{children}</Ctx.Provider>
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
