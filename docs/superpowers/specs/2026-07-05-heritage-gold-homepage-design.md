# Jesus Punkt — Heritage Gold Homepage · Design Spec

Date: 2026-07-05 · Source of truth: `Jesus Punkt — Website (Heritage Gold).fig` (fig-kiwi v106, decoded node tree)

> **Revision v2 (same day, client feedback):** fixed header with scrolled state · hero full screen (100dvh) · hover animation on every interactive element (primary buttons hover to accent, outline buttons hover to ink) · "lebt" badge vertically centered · sermon slider full-bleed with unclipped shadows and visible overflow · more block padding in sermon cards · kleingruppen rows without side strokes · rebuilt mobile experience with a fullscreen slide-down menu · new free-floating **Werte bubble field** before Next Steps (explicit client request beyond the fig) · all subpages built (ueber-uns, events, gemeindeleben, angebote, spenden, kontakt, impressum) on `styles/pages.css`.
Supporting sources: `Neue Seitenstruktur.docx` (site structure + verified content), `assets/content.json` (hard facts), akkermann stroy `CLAUDE.md` (engineering rules).

## 1. Scope

Build the **homepage only** as static HTML/CSS/JS, plus a **design system** (tokens + component styleguide) that future subpages compose. The fig contains a single 1440×3694 desktop frame; mobile is derived from the design system under the akkermann breakpoint rules. ChurchTools integration is planned (docs/churchtools-integration.md) with `data-ct` slot markers in the markup; the static build ships with realistic mock content.

Non-goals now: subpages (structure documented in docs/site-structure.md), CMS wiring, video clip section (not in this design).

## 2. Design tokens (exact values from the fig)

### Color

| Token | Value | Fig usage |
|---|---|---|
| `--ink` | `#26231C` | headings, body headings, primary button fill, nav logo text |
| `--ink-2` | `#5C544A` | section descriptions, sermon author |
| `--muted` | `#675E4C` | Next-Steps body text |
| `--gold` | `#C9A227` | logo circle, footer column headers (on dark) |
| `--gold-text` | `#7A5F12` | sermon dates, step numbers (AA on white) |
| `--gold-meta` | `#AC7A06` | event meta lines, kleingruppen schedules |
| `--accent` | `#F9C855` | headline highlight, active nav pill, next-event row, heading dot |
| `--sand` | `#F1E8D4` | hover fills (per token rules; not on the desktop frame itself) |
| `--creme` | `#FBF7EE` | button text on ink, footer text base |
| `--night` | `#1A1201` | footer background |
| `--paper` | `#FFFFFF` | page background |
| `--line` | `#D9D9D9` | card borders, carousel arrow borders, row hairlines |
| `--line-ink` | `rgba(38,35,28,.13)` | flyer card border |
| `--line-strong` | `rgba(38,35,28,.30)` | outline button border |
| `--surface` | `#F9F9F9` | kleingruppen row hover |
| `--surface-2` | `#EFEEEE` | non-highlighted event rows |

Normalizations (documented deviations — near-duplicate values in the fig treated as design slop):
`#EEEFEE` → `--surface-2`; event-time `#000000` → `--ink`; kleingruppen button `#1A1201` → `--ink` (night stays footer-only); footer creme opacities .82/.72/.6/.16 kept as rgba of `--creme`.

### Type (Raveo = display, Sinkin Sans = body, Arimo = UI)

| Style | Font | Size/LH/LS | Color |
|---|---|---|---|
| h1 hero | Raveo Bold | 78 / 0.96 / 0 | ink |
| h2 section | Raveo Bold | 40 / 1.04 / −2.5% | ink |
| h2 next-steps | Raveo Bold | 60 / 1.04 / −2.5%, centered | ink |
| h3 card/event/kleingruppe title | Raveo Bold | 24 / 1.0 (18 for kleingruppen) | ink |
| Hero eyebrow | Raveo Bold | 16 / 0.96 | ink |
| Section description | Sinkin Sans 300 | 14 / 1.6 | ink-2 (Next-Steps: Sinkin 400, muted-set) |
| Nav item | Sinkin Sans 400 | 12 / 1.0 | `#7F7568`, active `#000` on accent |
| Button label | Arimo Bold | 15 / 1.0 | creme on ink / ink on outline |
| Event time | Raveo Bold | 24 | ink |
| Event date/meta | Raveo Bold/Regular | 12 | gold-meta |
| Sermon date | Raveo Bold | 14 | gold-text |
| Kleingruppen schedule | Raveo Bold | 14, Title Case | gold-meta |
| Step number | Arimo Bold | 13 | gold-text |
| Step title | Arimo Bold | 19 | ink |
| Step body | Arimo Regular | 14.5 | muted |
| Footer column header | Raveo Bold | 14 / ls +14% | gold |
| Footer link | Raveo Regular | 14 / 1.7 | creme@.82 |
| Legal row | Arimo Regular | 13.5 | creme@.6 |

### Space & shape

Container 1140 (71.25rem). Section padding 100px block (Next Steps: 160 top). Heading→content gap 40. Card radius 8; buttons radius 8 (lg, pad 16/32) and 6 (md, pad 14/22); nav pill radius 8, item pad 12/24. Grids: events 525+80+535, kleingruppen 608+80+452, sermons 3×366.7+2×20, steps 4×267+3×24.

## 3. Sections (top → bottom)

1. **Header (overlay)** — container row, 72 high: logo 70×40 left; right pill (white 75%, blur 20, r8): Über uns · Events · Gemeindeleben · Angebote · Spenden · Kontakt. Accent pill = hover/current-page state (fig shows it on "Über uns" as the exemplar).
2. **Hero** — 644 high. Layers: photo (cover, 48% opacity) → white 50% wash → linear gradient transparent→white (top→bottom). Content bottom-left: eyebrow "Sonntags 10:00 Uhr · Kruseshofer Str. 20 · 17036 Neubrandenburg", h1 "Jesus Punkt - Gemeinde, die lebt" with accent block behind "lebt" (163×78 @ x561/y110 → offset highlight), Livestream primary button right, bottom-aligned.
3. **Veranstaltungen** — h2 "Was als Nächstes ansteht" + 24px accent dot suffix (the "Punkt" motif — this section only), description ≤700px. Left: flyer card 525×297 (r8, line-ink border) `data-ct="flyer"`. Right 535: 3 event rows (r8, pad 20/16; time 72px col + title/meta; first row = next event, accent bg; others surface-2) `data-ct="events"` + right-aligned link "Alle Termine im Kalender →".
4. **Predigten** — header row: h2 "Verpasst? Hör in Ruhe nach" + description | carousel arrows 48×48 (r8, line border; chevron ink, disabled ink@.32). Track: sermon cards 366.7 (image 214 grey placeholder → thumbnail, body pad 20/16: date, title 24, author) — 3 visible, overflow pages via arrows; `data-ct="sermons"`. Hover: shadow 0 4 10 rgba(0,0,0,.25) (from card-1 exemplar). Below, right-aligned outline button "Zum Predigtarchiv".
5. **Kleingruppen** — left 608 list, 5 rows 83 high (name 18 + schedule, arrow right; hover: surface bg + arrow extends 31→62 and tints ink — from row-1 exemplar); right 452: h2 "Dein Leben, deine Kleingruppe", body, primary button "Finde deine Kleingruppe". `data-ct="groups"`.
6. **Next Steps** — centered h2 60 "Lust auf den nächsten Schritt?", lead (Sinkin 400). 4 columns: 01 Wer sind wir? / 02 Was glauben wir? / 03 Wo gehen wir hin? / 04 Bist du dabei? Button "Schritte gehen" (md primary) left-aligned per fig. *(Excluded from the design-system page per request.)*
7. **Footer** — night bg, pad 80/150/40. Brand col left (logo-dark + "Eine evangelische Freikirche in Neubrandenburg. Welcome Home."), 3 right-aligned columns: Gottesdienst (times/address), Kontakt (tel, mail, "YouTube · Facebook · Instagram"), Entdecken (nav links). Legal row bordered top creme@.16: © 2026 Jesus Punkt | Impressum · Datenschutz.

Sections are separated by whitespace only — the 1px rectangles in the fig have no fill (spacer artifacts).

## 4. Content policy

Copy comes from the fig; hard facts (phone, address, links, times) from `assets/content.json`. Fig mock strings with obvious slop are corrected in mock data only, structure untouched: "Für Jugendlichen zwischen 12 und 29" → "Für Jugendliche zwischen 13 und 29 Jahren" (docx is the age authority), Gebet row gets a sensible meta line, sermon cards get three distinct plausible sermons (from the v3 content) instead of one card repeated four times. These slots are all ChurchTools-fed later.

## 5. Interaction & motion

- Carousel: translateX paging on desktop (arrow buttons, disabled state at ends), scroll-snap swipe ≤48rem. No autoplay.
- Hovers from fig exemplars only (sermon shadow, kleingruppen row, nav pill, button sand hover per token rules). Transitions ≤200ms, `prefers-reduced-motion` respected.
- Mobile nav: hamburger (rightmost) → white dropdown panel; Esc and outside-click close it. No body scroll-lock (guardrail: no `overflow: hidden` on body/html).
- No scroll-reveal animations — not part of this design.

## 6. Architecture

```
styles/tokens.css   → design tokens only (this spec §2)
styles/base.css     → reset, @font-face, typography, container, buttons, focus
styles/components.css → header/nav, footer, cards, rows, carousel (shared across pages)
styles/home.css     → homepage section layouts
js/main.js          → nav toggle, carousel, current-year; ~100 lines, no deps
data/mock/*.json    → mock payloads shaped like the ChurchTools mapping layer
design-system.html  → living styleguide: tokens, type scale, buttons, nav, rows, cards, footer patterns
```

Subpages later: one HTML file + one page CSS each, reusing tokens/base/components — see docs/site-structure.md.

## 7. Fonts & licensing

Raveo (Bold/Regular) and Sinkin Sans (300/400) are converted to woff2 from the fonts installed in the designer's library; Arimo is the Google variable font (400–700, Apache 2.0). **Before production launch, confirm Raveo's webfont license** (commercial family); Sinkin Sans is free for embedding; Arimo is unrestricted. Fallback stacks degrade to Arial/Helvetica metrics.

## 8. Accessibility & quality bar

Semantic landmarks; one h1; keyboard-reachable carousel and nav with visible focus (2px ink outline, offset 3px); `aria-expanded`/`aria-controls` on the hamburger; carousel buttons labeled; contrast per token rules (gold never as text on light below AA); lazy-loaded below-fold images; `<html lang="de">`.
