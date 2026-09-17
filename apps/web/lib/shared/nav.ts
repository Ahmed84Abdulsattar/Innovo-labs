// ── Back-navigation helper ────────────────────────────────────────────────
// Detail pages can be reached from several places (a list, the Innovation
// Concierge results, a linked record). The "Back" button should return to
// wherever the user actually came from — passed as a `from` query param —
// and fall back to the section list otherwise.
//
// `from` is treated as untrusted input: only same-origin absolute paths are
// honoured (guards against open-redirect via a crafted `from`).
export interface BackTarget { href: string; label: string }

export function backTarget(from: string | null | undefined, fallback: BackTarget): BackTarget {
  if (!from) return fallback

  let decoded: string
  try { decoded = decodeURIComponent(from) } catch { return fallback }

  // Same-origin internal path only: must start with a single "/".
  if (!decoded.startsWith('/') || decoded.startsWith('//')) return fallback

  const path = decoded.split('?')[0]

  if (path.startsWith('/innovation-concierge/results')) return { href: decoded, label: 'Back to results' }
  if (path.startsWith('/innovation-concierge'))         return { href: decoded, label: 'Back to Concierge' }
  if (path === '/initiatives')                          return { href: decoded, label: 'Back to Initiatives' }
  if (path === '/startups')                             return { href: decoded, label: 'Back to Startups' }
  if (path.startsWith('/initiatives/'))                 return { href: decoded, label: 'Back to initiative' }
  if (path.startsWith('/startups/'))                    return { href: decoded, label: 'Back to startup' }

  return { href: decoded, label: fallback.label }
}
