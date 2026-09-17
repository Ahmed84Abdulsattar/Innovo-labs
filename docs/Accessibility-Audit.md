# Accessibility Audit (code-level, WCAG 2.1 AA orientation)

**Date:** 4 August 2026 · **Scope:** static/code-level review of the Next.js UI.
**Note:** This is a code inspection, not a full assistive-technology test. Real
screen-reader / keyboard-only / contrast testing on the running app is still
recommended (a good task for the vendor's Accessibility Testing line).

---

## Summary

| Area | Status |
|---|---|
| Document language (`<html lang>`) | ✅ Set (`lang="en"`) |
| Image alt text | ✅ All 15 `<img>` have `alt` |
| Semantic interactive elements | ✅ 211 native `<button>` vs only 6 clickable `<div>` |
| Theme / dark mode contrast | ✅ Addressed in prior fixes (value tracker, credits card) |
| **Form label association** | ⚠️ **Gap** — 159 `<label>` but 0 use `htmlFor` |
| ARIA on custom widgets | ⚠️ Sparse (5 aria-* total) — custom dropdowns/tabs need roles |
| Clickable `<div>`s | ✅ The 6 are modal/dropdown **backdrops** (click-outside-to-close), not fake buttons — acceptable; add Escape-to-close as an enhancement |

---

## Findings

### 1. ⚠️ Form labels are not programmatically associated (WCAG 1.3.1, 4.1.2)
There are 159 `<label>` elements and **zero** `htmlFor` attributes, meaning labels
are visually adjacent to their inputs but not linked in the accessibility tree. A
screen-reader user tabbing to an input may not hear its label.

**Fix (two options):**
- Wrap the input inside the label: `<label>Name <input …/></label>`, **or**
- Give each input an `id` and the label a matching `htmlFor`:
  `<label htmlFor="name">Name</label><input id="name" …/>`

This is the highest-value accessibility improvement and is mechanical to apply.

### 2. ⚠️ Custom widgets need ARIA roles/states
Only 5 `aria-*` attributes exist across the app. The custom **dropdowns,
multi-selects, and tab bars** (which are `<div>`/`<button>` based) should expose:
- Tabs: `role="tablist"` / `role="tab"` / `aria-selected` on the tab bar
- Dropdowns/menus: `role="listbox"`/`option`, `aria-expanded`, `aria-controls`
- Toggle buttons: `aria-pressed` (already used in one place — extend it)

### 3. ✅ The six clickable `<div>`s are backdrops (not a defect)
On inspection, all six are modal/dropdown **backdrop overlays** (`position: fixed;
inset: 0`) that close the popup when you click outside, plus `stopPropagation`
wrappers. These are not interactive controls, so they do not need to be
keyboard-focusable. The correct enhancement is **Escape-to-close** on the parent
modal (the real controls inside are already `<button>`s).

### 4. ✅ What's already good
- **Semantic buttons everywhere** — 211 native `<button>` elements; the app did
  not fall into the "clickable div" anti-pattern (only 6 exceptions).
- **All images have alt text.**
- **`lang` attribute set**, `suppressHydrationWarning` used correctly for the
  theme no-flash script.
- **Dark-mode contrast** issues previously reported were fixed.

---

## Recommended priority
1. Add `htmlFor`/`id` (or wrap) to form labels — biggest win, low effort.
2. Add ARIA roles to tabs and custom dropdowns.
3. Convert the 6 clickable divs to buttons.
4. Hand the running app to the vendor for real AT testing (screen reader,
   keyboard-only, automated axe/Lighthouse scan, colour-contrast verification).
