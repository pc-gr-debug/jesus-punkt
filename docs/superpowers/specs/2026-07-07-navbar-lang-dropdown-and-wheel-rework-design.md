# Navbar language dropdown + Werte wheel rework — Design

Date: 2026-07-07 · Status: approved by Mykhailo (chat)

## Goal

1. Re-introduce the language switch as part of the navbar menu itself (previous standalone `.lang-switch` pill was removed 2026-07-07).
2. Make the Werte scroll wheel feel more fluid and detailed; fix the mobile layout where the centered active bubble left a vacant slot ("nothing above it").

## 1 · Desktop: language dropdown inside the nav pill

New last item **inside** `.nav-pill`, after the six page links:

```html
<span class="nav-pill__divider" aria-hidden="true"></span>
<div class="nav-pill__lang">
  <button class="nav-pill__lang-btn" type="button" aria-haspopup="true" aria-expanded="false" aria-label="Sprache">
    <span class="nav-pill__lang-code">DE</span><span class="nav-pill__lang-caret" aria-hidden="true"></span>
  </button>
  <div class="nav-pill__lang-menu">
    <a class="nav-pill__lang-link is-active" href="…" hreflang="de" lang="de" data-lang-link>Deutsch</a>
    <a class="nav-pill__lang-link" href="/en/…" hreflang="en" lang="en" data-lang-link>English</a>
    <a class="nav-pill__lang-link" href="/uk/…" hreflang="uk" lang="uk" data-lang-link>Українська</a>
  </div>
</div>
```

- **Divider**: 1px × 1rem hairline (`--line`), self-centered.
- **Button**: typography of the old `.lang-switch__link` (700 0.6875rem `--font-ui`, letter-spacing 0.06em, `--nav-muted` → ink on hover). CSS-drawn caret (two 1.5px ink borders rotated 45°) that flips when open. Label text is set by JS from `<html lang>` — `/en/` pages show `EN` with no build change; no-JS fallback shows `DE`.
- **Menu**: absolute below the button (`top: calc(100% + 0.5rem); right: 0`), white 88% + `backdrop-filter: blur(1.25rem)` + inset 1px `--line-ink` + `--shadow-soft`, `--radius`. Links 700 0.8125rem `--font-ui`, hover = ink + `--sand` fill (`--radius-sm`); active language = ink + gold `--accent` dot after the label (site-wide current-page convention, no background).
- **Behavior** (`js/main.js`): opens on `mouseenter` of `.nav-pill__lang` and on button click; closes on `mouseleave`, outside click, `Escape`, and link click. Hidden state = `opacity 0 / translateY(-0.25rem) / visibility hidden / pointer-events none`, `--t-med --ease`.
- **Glider**: unchanged, page links only.
- Per-page hrefs as before (`/en/<page>/` etc.); Impressum points home (`/`, `/en/`, `/uk/`).
- The dead `.lang-switch` CSS block in `components.css` is deleted.

## 2 · Mobile: restore the panel language row

Restore the exact previous `.nav-panel__lang` block (Deutsch / English / Українська) between `.nav-panel__links` and `.nav-panel__cta` on all 8 pages. Its CSS (staggered entrance at 0.44s) and the i18n build handling still exist — pure markup restore.

## 3 · Werte wheel: richer stepped motion

Stays stepped (7 stops). Scoped vars on `.werte`: `--wheel-t: 800ms`, `--wheel-ease: cubic-bezier(0.34, 1.25, 0.64, 1)` (gentle overshoot).

- **Sync rule**: `.wheel` rotation, `.wheel__item` transform (position + counter-rotation), and the `.wheel::after` counter-rotated face all share `--wheel-t --wheel-ease` with **zero delay** — any delay on these desynchronizes the counter-rotation and bubbles tilt.
- **Ripple**: `setActive` writes each item's ring distance from the active value (0–3) to `--d`. The delayed, rippling properties live where they can't fight the rotation:
  - `.wheel__item` opacity: falloff `calc(1 - var(--d, 0) * 0.18)` (active 1 → far side 0.46), transition-delay `calc(var(--d, 0) * 45ms)`.
  - `.bubble` (new transition target): scale moves off the item onto the bubble — `scale(calc(1.03 - var(--d, 1) * 0.03))` (neighbors 1.0, far 0.94), active override 1.18 (mobile 1.3) + accent background + `--shadow-soft`, all with the same `--d`-based delay. Motion propagates outward from the active bubble.
- **Ring guide**: `.wheel::before` — `inset: 0`, `border-radius: 50%`, 1px solid ink at 12% (`rgba(38, 35, 28, 0.12)`), through the bubble centers. Rotation-invariant, needs no counter-rotation.
- **Ticks**: `.wheel::after`, `inset: -2.1%`, counter-rotated by `--wheel-turn` (static "clock face"), background = inline-SVG data URI, 7 gold (`#C9A227`, decorative) dots of r=1 (viewBox 100) at the **midpoints between slots** (angles 25.714° + k·51.429°; at-slot dots would hide under bubbles at rest). Coords: (70.83, 6.76), (96.79, 39.32), (87.53, 79.93), (50, 98), (12.47, 79.93), (3.21, 39.32), (29.17, 6.76).
- **Reduced motion**: `.wheel::before, .wheel::after { content: none; }` added to the existing block; opacity already forced to 1 there.

## 4 · Mobile close-ranks (≤48rem)

Active bubble centered (existing `translateY(0)` override). The six inactive bubbles re-space to 60°:

- For inactive item `i` with active `idx`: ring order `k = (i − idx + 7) % 7` ∈ 1..6, target **visual** angle `v = (k − 1) · 60°` (next value straight above the center). Since visual = `--angle` + turn and turn = `−idx · 51.4286°`, JS sets `--angle = v + idx · 51.4286°`.
- JS keeps a per-item **unwrapped** current angle and shifts each target by ±360° to land nearest it — every morph takes the shortest path (no 300° swings at the wrap seam).
- Desktop / breakpoint change: `matchMedia('(max-width: 48rem)')` listener restores `--angle = i · 51.4286°` resp. re-applies close-ranks for the current index.
- The existing item transform transition (`--wheel-t --wheel-ease`) animates the morph.

## 5 · Build tool

`tools/i18n-build.py` active-state regex gains the new class: `(?:nav-panel__lang-link|lang-switch__link|nav-pill__lang-link)`. "DE/EN/UK/Deutsch/English/Українська" are already in `IGNORE`; `Sprache` is already in both dictionaries. `data-lang-link` tags return early, so menu hrefs are never locale-prefixed (existing behavior).

## Files

- `index.html` + 7 subpage `index.html` — nav markup (bulk script, per-page hrefs); Werte section is homepage-only and needs **no markup change** (face is pure CSS).
- `styles/components.css` — delete `.lang-switch` block; add divider + dropdown styles.
- `styles/home.css` — wheel motion vars, `--d` falloff/ripple, bubble scale move, `::before`/`::after` face, mobile close-ranks `is-active` override kept, reduced-motion additions.
- `js/main.js` — dropdown behavior; `--d` writes; close-ranks angle assignment with unwrap tracking; label from `LANG`.
- `tools/i18n-build.py` — one regex extension.

## Verification

`tools/screenshot.js` over `python3 -m http.server`: desktop header (closed + open dropdown via `js` hook), mobile panel open, wheel at ≥2 scroll positions on desktop and phone widths; layout-health check (no horizontal scroll).
