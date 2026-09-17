import 'client-only' // Build fails if this browser-only module is ever pulled into a server bundle.
import type { MouseEvent } from 'react'

// Cursor-following spotlight for `.card-glow` cards. Updates the --mx / --my
// custom properties the radial highlight reads. Cheap: only mutates CSS
// variables (no layout / paint thrash), so it's safe to attach to onMouseMove.
export function cardSpotlight(e: MouseEvent<HTMLElement>) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
  el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
}
