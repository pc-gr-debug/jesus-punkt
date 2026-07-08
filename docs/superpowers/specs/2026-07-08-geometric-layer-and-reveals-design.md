# Werte padding fixes + geometric layer + appearance reveals — Design

Date: 2026-07-08 · Status: approved by Mykhailo (chat)

## 1 · Padding fixes

- `.werte` loses its `padding-block: 0 9.375rem` override → falls back to `.section`'s `--section-pad` (6→9.375rem fluid). The redundant `padding-block` in the reduced-motion block is dropped too.
- `.werte__stage` gets **one** rule for all widths: `padding-block: clamp(5rem, 12svh, 7.5rem)`; the ≤48rem `padding-block: 2rem 1.5rem` line is deleted (the rest of that mobile rule stays). Phone wheel cap shrinks 44svh→40svh to fund the vertical room. Known caveat: ~667px-tall phones may clip the value text slightly; 812px+ fits.

## 2 · Geometric layer (subtle, reuses existing language)

Shared ornament primitives in `components.css`, all `aria-hidden`, `pointer-events: none`:

- `.orn` — absolutely positioned circle base; `.orn--ring` 1px solid `rgba(38,35,28,0.08)`; `.orn--ring-dashed` 1px dashed at 0.10; `.orn--ring-gold` 1px solid `rgba(201,162,39,0.18)` for the dark footer; `.orn--dot` 0.375rem `--gold` dot at 0.5 opacity (the wheel-tick motif).
- Hosting sections get `.has-orn { position: relative; overflow: clip; }`. The sermons section is **never** clipped (full-bleed carousel needs visible overflow) — its ornament, if any, uses only positive insets.
- **Zig eyebrow accent** (the "zigzag lines"): `.section-head__title::after` — 4rem × 0.4rem strip, `--accent`, masked with the existing `.zig` conic-gradient pattern at `0.8rem` tile. Centered variants (`.werte__head`) get `margin-inline: auto`. Site-wide via CSS only.

Placement (homepage `index.html`, ~4 small `div.orn` additions):

| Where | Ornament |
|---|---|
| `.hero` (clip) | 34rem ring breaking top-right + gold dot on its arc |
| `#veranstaltungen` (clip) | 16rem ring breaking bottom-left |
| `#kleingruppen` tint (clip) | 20rem dashed ring breaking the right edge |
| `.footer` (clip) | 24rem gold-hairline ring breaking top-right |
| `.page-hero` (all 7 subpages) | CSS-only `::after` 18rem ring top-right + clip — zero markup changes |

## 3 · Appearance reveals (site-wide)

CSS in `base.css`:

```css
.reveal { opacity: 0; transform: translateY(0.75rem); }
.reveal.is-in { opacity: 1; transform: none;
  transition: opacity 600ms var(--ease) var(--rv-d, 0s), transform 600ms var(--ease) var(--rv-d, 0s); }
```

JS in `main.js` (inside the existing IIFE; skipped entirely under `prefers-reduced-motion` or without `IntersectionObserver`):

- Targets, selected automatically (no markup changes on any page): `.section-head`, `.hero__copy > div`, `.hero__actions`, `.page-hero__inner > div`, `[data-ct]:not(.carousel__track)`, `.carousel`, `.sermons__foot`, `.groups__copy > div`, `.lead-card`, `.info-card`, `.team-card`.
  - `[data-ct]` containers reveal as blocks because `js/data.js` replaces their children (per-child reveal would be lost on render).
  - The sermons `.carousel__track` is excluded — carousel JS owns its inline `transform`; its stable `.carousel` wrapper reveals instead.
- Observer: `rootMargin: '0px 0px -10% 0px'`, reveal once, unobserve.
- Stagger: entries in the same observer batch sharing a parent get `--rv-d = index × 70ms`.
- Cleanup: on `transitionend` (opacity) — with a fallback timeout — `.reveal`/`.is-in`/`--rv-d` are stripped so component hover transitions return untouched.
- No-JS: no classes are ever added → everything visible statically.

## Files

`styles/home.css` (padding, wheel cap), `styles/components.css` (orn primitives, zig accent, page-hero ring), `styles/base.css` (reveal states), `js/main.js` (observer), `index.html` (4 ornament divs). i18n untouched (ornaments are empty aria-hidden divs).

## Verification

Screenshots at 1440 / 600 / 375: hero + events + kleingruppen + footer ornaments, zig accents, no horizontal overflow; reveal state before/after via CDP; mobile-verify checklist (hover-independence, `-webkit-backdrop-filter` n/a, transforms only).
