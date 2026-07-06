# Fix Round — Design Spec (2026-07-06)

Approved by client 2026-07-06. Scope: homepage layout fixes, section rhythm, Werte wheel,
header rework, per-page heroes, events calendar, Über-uns team cards, Gemeindeleben declutter
+ galleries, Spenden/Kontakt cleanup, footer, hamburger digits, responsive hardening,
mock-data layer, curation strategy doc.

Decisions locked with the client:
- Werte wheel = **pinned scroll section** (sticky stage, scroll steps through all 7 values).
- Nav = **text highlight active + sliding gold hover pill** (no resting background).
- Events page calendar = **month slider + agenda list** (no day grid).
- Data = **mock JSON now**, one fetch layer, ChurchTools endpoints swapped in later.

---

## 1 · Data layer — `js/data.js`

New dependency-free module loaded on every page after `main.js`.

- Fetches from `/data/mock/*.json`: `events.json`, `flyer.json`, `sermons.json`,
  `groups.json`, new `team.json`.
- Renders into existing `data-ct` slots (`events`, `flyer`, `sermons`, `groups`, new `team`,
  new `calendar`). Markers stay in the DOM (attribute lives on the container that gets
  `innerHTML` replaced).
- Static markup remains authored in HTML as fallback; JS replaces it on successful fetch.
  Fetch failure → static content stands, no console spam beyond one `console.warn`.
- Swap to live ChurchTools = change URL map at the top of the file only.
- `events.json` gains enough future entries (≥ 3 months) to exercise the calendar.
- `team.json` schema:
  ```json
  { "people": [ { "id": "philipp-strauch", "name": "Philipp Strauch",
      "roles": ["Pastor", "Gottesdienst", "Jugendbereich"],
      "photo": null, "featured": true,
      "note": "Leitet die Gemeinde seit Oktober 2025. …" } ] }
  ```

## 2 · Homepage — Veranstaltungen

- `.events__grid`: two equal columns (1fr 1fr) so the flyer matches the events column width.
- Exactly **3** rows rendered from data: slot 1 = next `type: "gottesdienst"` event
  (row keeps `event-row--highlight`), slots 2–3 = next two non-Gottesdienst events by date.
- "Alle Termine im Kalender →" textlink unchanged.

## 3 · Section rhythm

- `--section-pad: clamp(6rem, 10.42vw, 9.375rem)` (96px phone → 150px @1440).
- No per-section overrides; tint sections inherit the same rhythm.

## 4 · Sieben Werte wheel (homepage, replaces bubble field)

- Markup: `.werte` section becomes a tall scroll wrapper (`height: 350vh` on desktop)
  containing `.werte__stage` (`position: sticky; top: 0; height: 100dvh`).
- Stage layout: section head on top; below, two columns — left the wheel, right the
  description panel.
- Wheel: `.wheel` ring (~28rem diameter desktop) with 7 `.wheel__item` circles placed by
  `rotate(i·51.43deg) translateY(-radius)`; whole ring gets
  `transform: rotate(-active·51.43deg)` with `transition: transform 450ms var(--ease)`;
  each item counter-rotates to stay upright. Circles reuse the existing bubble color
  variants (sand/accent/paper/ink/gold/surface/outline).
- Active = item at 12 o'clock: scale ≈ 1.18, full opacity, gold ring; inactive ≈ 0.55 opacity.
- Description panel: number, name (h3), line — crossfade + small rise (~350ms) on change.
- JS: scroll listener maps sticky progress → index 0–6 (`floor(progress · 7)`, clamped);
  only writes styles when the index changes (stepped rotation, no per-frame jitter).
- Mobile (≤ 48rem): wrapper ~300vh; stage stacks — smaller wheel (~17rem) on top,
  description below; circles show number + name only.
- `prefers-reduced-motion`: wrapper collapses to normal section height, no sticky,
  no rotation — values render as a plain vertical list of the 7 bubbles + lines.
- No `overflow: hidden` on body/html; wheel overflow handled inside the stage.

## 5 · Header rework

- **Delete** the `.is-scrolled` full-width white strip. Header background stays transparent
  at all scroll positions.
- `.is-scrolled` (kept, still toggled at 8px) now upgrades the floating elements instead:
  - nav pill: white .75 → **.88**, hairline `1px` border ink@8%, `--shadow-soft`;
  - logo gets a `.header__chip` surface: white .75 + `backdrop-filter: blur(1.25rem)`,
    fully rounded, small padding;
  - burger gets the same chip treatment (mobile).
- **Sliding hover pill**: one absolutely-positioned `.nav-pill__glider` inside the pill.
  On `mouseenter` of a link: glider gets that link's `offsetLeft/offsetWidth`,
  `transition: left/width 300ms var(--ease), opacity 200ms`; first entry fades it in at
  position (no slide-in from 0); leaving the nav fades it out. `focus-visible` on links
  drives it identically. Gold `#F9C855`, same radius as before. Touch devices: glider inert.
- **Active page**: `.nav-pill__link.is-active` = `color: var(--ink)`, no background, plus a
  0.25rem gold dot rendered after the label (`::after`, inline-block, no layout shift —
  reserve via padding-right on all links). Hover glider passes under it normally.
- Design-system page gets the updated header demo.

## 6 · Per-page heroes — `.page-hero`

- Replaces `.page-head` on: ueber-uns, events, gemeindeleben, angebote, spenden, kontakt,
  impressum.
- Full-width banner, `min-height: 50dvh` (≥ 40dvh phone), image `object-fit: cover` under
  the hero wash treatment (white 50% wash @ 48% opacity), container-aligned `h1` + one-line
  description at the bottom of the banner, breathing room below → first section.
- Assets (placeholders until real photos delivered — compressed aggressively, metadata
  stripped): `img/hero-ueber-uns.jpg` ← community.jpg · `img/hero-events.jpg` ←
  worship-guitar.jpg · `img/hero-gemeindeleben.jpg` ← recent-1.jpg · angebote / spenden /
  kontakt / impressum ← dome crop (`img/hero-dome.jpg` reused, no copy).
- H1 keeps the `h2--dot` gold-dot styling.

## 7 · Events page

- Hero (above), then **Kalender** section: centered `‹ Monat Jahr ›` slider
  (icon-btn arrows), below it an agenda list grouped by day using `event-row`s, rendered
  from `events.json` for the shown month. Arrows disable beyond the data range.
  Empty month → friendly one-liner. Gottesdienst rows keep the highlight treatment.
- Flyer aside stays to the right of the agenda (`data-ct="flyer"`).
- **Predigten** section: replace `cards-grid` with the exact homepage full-bleed carousel
  (same markup/JS, ids namespaced); `section--tint` removed → default background.
  Carousel JS generalized to support one carousel per page (constructor over
  `[data-carousel]`).

## 8 · Über uns — team

- Lead card (Pastor): photo slot + name + role chips + note. Featured flag from data.
- `.team-card` grid (3-up desktop / 2-up tablet / 1-up phone): photo slot with 3/4 aspect
  (initials placeholder tile until photos exist), name, **all** roles as small chips.
- One card per person — duplicates merged in `team.json` (e.g. Philipp Strauch appears
  once with Pastor + Gottesdienst + Jugendbereich).
- Rendered from `data-ct="team"`; pairs like "Lydia Wegner & Anja Maas" split into
  individual people sharing the Kindergottesdienst role.
- Glaube + Chronik sections untouched except rhythm/gap pass.

## 9 · Curation strategy (docs only)

- Extend `docs/churchtools-integration.md` with a **Content-Pflege** section:
  ChurchTools = single source for weekly-changing content (events, flyer, sermons, groups,
  people/roles) — team already uses it daily, zero new training. Website reads it via the
  existing endpoint map. Rare static copy → developer for now; optional later add-on:
  git-based CMS (Sveltia CMS / Pages CMS, free, browser editor) for hero texts & Werte copy.
  Explicit non-goals: no full headless CMS (Strapi/Sanity) — second system to learn,
  hosting cost, sync drift with ChurchTools.

## 10 · Gemeindeleben

- **Kindergottesdienst** and **Elevate Jugend** each restructured to one pattern:
  eyebrow + h2 + trimmed intro (≤ 2 sentences kept from current copy) →
  compact **fact strip** (one row: Wann · Für wen · Leitung chips) →
  **gallery slider**.
- Gallery: `.gallery` scroll-snap slider (native `overflow-x` + `scroll-snap-type`,
  arrows via shared icon-btn, swipe on touch, `scrollbar-width: none`), 16/10 image tiles;
  placeholder images for now (available photos + neutral tinted tiles). One JS init per
  `[data-gallery]`.
- Elevate keeps the Instagram textlink inside the fact strip area.
- Hauskreise section: untouched except gap pass.
- **Next-Steps section deleted here and on the homepage** (incl. `flyer-nextsteps` slot and
  the homepage CTA `/gemeindeleben/#next-steps`). `.step` styles removed from CSS if no
  page uses them; design-system entry removed accordingly.

## 11 · Small fixes

- **Footer**: `padding-block` up to ~6rem top / 3rem bottom (from current), grid row-gap up;
  plain-text `footer__item` spans lose link affordances (no hover color/underline/cursor) —
  only real `<a>`s keep them.
- **Hero eyebrow**: parts separated with `·` (CSS `::before` on parts 2+, replaces `&ensp;`).
- **Hamburger panel**: `nav-panel__num` spans deleted (HTML all pages + CSS).
- **Spenden**: PayPal card deleted (incl. `.paypal-btn` CSS); row becomes Überweisung +
  "Fragen zur Spende?" side by side; Anschrift row keeps two cards.
- **Kontakt**: 2×2 grid — [Kontakt: Telefon + E-Mail merged] [Gottesdienst/Livestream]
  [Adresse + Route] [Social] — uniform `--space-md` gaps.
- **Gap consistency**: all inline `style="margin-top: …"` moved into CSS
  (`.section-head + *` rhythm rule or explicit classes); `info-grid`/`feature-grid`/
  `cards` share one gap token scale.
- `design-system.html` updated: header/nav behavior, page-hero, team card, agenda list,
  gallery, wheel (static demo), removed step component.
- `CLAUDE.md` updated: header rules (no white strip), Werte wheel replaces bubble field,
  Next Steps removed, data layer note.

## 12 · Responsive hardening

- Verify every touched component at > 64rem, ≤ 64, ≤ 48, ≤ 37.5, ≤ 30rem over HTTP with
  the CDP screenshot tool: no horizontal scroll, wheel/carousel/gallery usable via touch
  sizing, agenda rows wrap with long titles, team grid tolerates 1–12 people, events list
  tolerates 2–6 entries, hero text readable on all placeholder images.
- `prefers-reduced-motion` honored by wheel, glider, carousel, gallery.

## Out of scope

Live ChurchTools API calls, real member photos, real gallery photos, IBAN/PayPal-link/
Vereinsregister TODOs, Raveo license, archived `site/`.

---

## Addendum — Round 2 (2026-07-06, same day)

Client feedback applied on top of the round above:
- Logo carries **no surface** on scroll (only pill + burger do); nav links padding-block 1rem;
  **burger from ≤64rem** (six links overflowed below ~1024px).
- Werte wheel: **all bubbles sand, active = accent**; smaller clamped names + hyphens (no
  overflow); stage `padding-block: clamp(3rem, 10vh, 5.75rem)`; on phones the wheel is wider
  than the screen on purpose (stage clips it).
- Homepage flyer moved **below** the event rows (single column). Hero eyebrow stacks as a
  clean column ≤48rem (no dangling dots). `groups__grid` and `feature-grid` stack at ≤64rem.
- Team section = **snap slider** (gallery pattern, 15rem cards); pastor photo rectangular 3:4.
- **Punkt divider** (three gold dots between fading hairlines) replaces all
  `section--tint` background alternation; flyer caption on /events/ removed.

## Addendum — Round 3 (2026-07-06)

- Hamburger menu: stagger delay now applies ONLY to the entrance animation
  (`--d` custom property) — hover reacts instantly.
- Homepage events: flyer beside the rows on desktop again (left column,
  stretch); it drops **below** the rows only when the grid collapses ≤48rem.
- Punkt divider **removed**. Replaced by the client-clarified concept:
  tinted (`--creme`) sections framed by `.zig--top`/`.zig--bottom` strips
  (conic-gradient mask, 45° mountain profile) — background changes never on
  a straight line. Applied: home Kleingruppen, Über-uns Glaube,
  Gemeindeleben Jugend.
- Werte: stage `padding-block: clamp(4rem, 12vh, 7.5rem)`; wheel capped
  50vh; sticky uses `safe center` + mobile `padding-top: var(--header-h)`;
  **on phones the active bubble moves to the ring's center** (scale 1.3).
- Team slider + galleries: track is now full-bleed (100vw breakout, same
  technique as the carousel).
- Lead card: photo flush left against the card borders, 15rem wide, same
  3:4 footprint as team-card photos; body carries the padding.
