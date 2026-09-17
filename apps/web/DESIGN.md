# Design System: Innovo Labs

## 1. Visual Theme & Atmosphere
A restrained, clean product interface with deliberate visual hierarchy. The atmosphere is clinical yet warm — like a well-lit operations room. Light surfaces (#f7f9fa ground, #ffffff cards) with a single teal accent carried through sparingly. Density is balanced for daily-use dashboards: generous enough to breathe, compact enough to scan. Motion is fluid CSS — no theatrics. Asymmetric section structure over centered monotony.

Baseline: DESIGN_VARIANCE 6, MOTION_INTENSITY 5, VISUAL_DENSITY 4.

## 2. Color Palette & Roles
- **Deep Slate** (#122023) — primary brand, main CTAs, sidebar background, btn-primary fill
- **Slate Mid** (#1a2e33) — hover state for primary actions
- **Slate Sidebar** (#0f1c1f) — sidebar shell, darkest surface
- **Aqua Accent** (#9ef3ee) — primary text on dark slate (btn-primary label, highlights in dark contexts)
- **Aqua Dark** (#0f9790) — accent on light surfaces, active pills, focus rings, section labels, icon tint
- **Aqua Mid** (#5dddd7) — hover state for aqua elements
- **Aqua Light** (#e0faf8) — tag backgrounds, subtle tint fills
- **Aqua Pale** (#f0fffe) — hover state for tinted areas
- **Canvas** (#f7f9fa) — page background, table rows on hover
- **Surface** (#ffffff) — card fills, input backgrounds
- **Steel Gray 200** (#dde6e8) — card borders
- **Steel Gray 300** (#c4d4d8) — dividers, separator lines
- **Steel Gray 500** (#5a7a82) — secondary text, inactive pill labels, filter labels
- **Text Primary** (#0f1c1f) — headings, data labels, critical content
- **Text Secondary** (#3d5a62) — supporting text, table cells
- **Text Muted** (#7a9ba3) — captions, metadata, placeholder hints

Single accent rule: #0f9790 (Aqua Dark) is the only accent on light surfaces. No purple, no neon, no gradients across text.

## 3. Typography Rules
- **Font:** Poppins (300, 400, 500, 600, 700) — already installed via Google Fonts. Do not substitute.
- **Display/Page Titles:** 22–28px, weight 700, letter-spacing -0.03em, color #0f1c1f
- **Section Subtitles:** 14–15px, weight 600, letter-spacing -0.01em, color #0f1c1f
- **Body/Descriptions:** 13px, weight 300, color #7a9ba3, max-width 480–65ch
- **Labels/Eyebrows:** 10–11px, weight 700, letter-spacing 0.09–0.12em, uppercase, color #0f9790
- **Pill/Tag text:** 11–12px, weight 500–600
- **Table headers:** 11px, weight 600, letter-spacing 0.06em, uppercase, color #7a9ba3
- Serif fonts are banned. Monospace reserved for code and metrics only.

## 4. Component Stylings
- **Buttons (primary):** Dark slate fill (#122023), aqua text (#9ef3ee), 8px radius, 9px/18px padding. Hover: translateY(-1px) + shadow. Active: scale(0.98) translateY(0).
- **Buttons (secondary):** White fill, #e2eaec border, #3d5a62 text. Hover: border darkens to slate.
- **Buttons (aqua):** #9ef3ee fill, slate text. For high-emphasis actions in dark contexts.
- **Pills (filter toggles):** 999px radius, 6px/15px padding, 12px text. Inactive: #f8fafc bg, #e4eaed border, #5a7a82 text. Active: accent fill + glow shadow (color at 28% opacity). Hover inactive: border and text tint to accent. Active: scale(0.97) translateY(1px) on press.
- **Cards (inn-card):** White bg, 1px #e2eaec border, 12px radius. Inset top highlight. Hover: border shifts to rgba(15,151,144,0.25), shadow deepens to aqua tint.
- **Double-bezel cards:** Outer shell at rgba(226,234,236,0.35) with 1px border and 3px padding, 16px radius. Inner white content area at 13px radius. Used for major section containers.
- **Inputs:** White bg, 1px #e2eaec border, 8px radius, 9px/12px padding. Focus: 2px offset ring in #0f9790, box-shadow 0 0 0 3px rgba(15,151,144,0.10).
- **Tags:** #e0faf8 bg, #0f9790 text, 1px rgba(15,151,144,0.2) border, 999px radius for pill-style.
- **Badges/eyebrows:** Pill-shaped, rgba(15,151,144,0.08) bg, rgba(15,151,144,0.2) border, #0f9790 text, 10px 700 uppercase 0.1em tracking.

## 5. Layout Principles
Grid-first, single-column for wizard/form flows. For content-heavy pages, 2-column or asymmetric grid. Max-width: 100% within the sidebar shell (no additional container needed). Section gaps: 20–24px. Internal card padding: 28px. Avoid centering main content blocks. Step-numbered sections communicate sequence without headers. No 3-column equal card grids — use auto-fill grids with minimum column widths.

## 6. Motion & Interaction
- **Entry:** `pageReveal` keyframe (opacity 0 + translateY(10px) → opacity 1 + translateY(0)), 0.45s cubic-bezier(0.16,1,0.3,1). Sections stagger with 60ms delay increments.
- **Stagger:** CSS animation-delay cascade on child elements (0.05s, 0.11s, 0.17s per section).
- **Hover transitions:** All interactive elements use `transition: all 0.3s cubic-bezier(0.16,1,0.3,1)` or `0.16s` for pills.
- **Active press:** `transform: translateY(1px) scale(0.97)` on pills, `transform: scale(0.98) translateY(0)` on buttons.
- **Smooth reveals:** Conditional sub-sections animate in with a 0.25s slide-down fade (`translateY(-6px)` → `translateY(0)`, opacity 0 → 1).
- Animate only `transform` and `opacity`. Never `top`, `left`, `width`, `height`.

## 7. Anti-Patterns (Banned)
- No emojis anywhere
- No Inter font (Poppins only in this project)
- No pure black (#000000) — use #0f1c1f or #122023
- No neon glows or outer box-shadow glows
- No oversaturated accents — the aqua is desaturated enough
- No gradient text on headings
- No custom mouse cursors
- No 3-column equal card grids
- No side-stripe borders (border-left accent stripes)
- No glassmorphism decoratively
- No AI copywriting: "Elevate", "Seamless", "Unleash", "Next-Gen"
- No scroll arrows or filler UI text
- No nested cards within cards
- No modals as first solution — prefer inline/progressive disclosure
