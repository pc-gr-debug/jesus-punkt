# CMS × ChurchTools — Integration Plan

Companion to `churchtools-integration.md` (endpoint map, proxy contracts, CT auth). That doc
answers *how the website reads ChurchTools*. This one answers the remaining question: **how does
every kind of content get edited, by whom, in a tool they can learn in minutes — without two
systems fighting over the same data?**

Ground rule (unchanged): **one editing surface per content type, no duplication.**

```
                       ┌───────────────────────────────┐
   weekly content      │  ChurchTools (already in use) │  Termine · Flyer · Hauskreise
   ────────────────►   │  calendars · files · groups   │
                       └──────────────┬────────────────┘
                                      │ read-only token
                       ┌──────────────▼────────────────┐
                       │  API proxy (Cloudflare Worker)│  /events /flyer /groups /sermons
                       │  cache 5–30 min · shapes JSON │◄─── YouTube Data API (Predigten)
                       └──────────────┬────────────────┘
                                      │ fetch at page load (js/data.js, data-ct slots)
                       ┌──────────────▼────────────────┐
   rare content        │  Static site (GitHub Pages)   │
   ────────────────►   │  repo: sibagatovmihail/…      │
   Git-based CMS       │  deploy: GitHub Actions       │  CMS commit → auto-deploy ≈ 1 min
   (browser editor)    └───────────────────────────────┘
```

---

## 1 · Who edits what (target state)

| Content | Changes | Edited in | Reaches the site via | Who |
|---|---|---|---|---|
| Termine / Kalender | weekly | ChurchTools Kalender | proxy `/events` (cache ≤ 5 min) | Sekretariat / Bereichsleiter |
| Sonntags-Flyer | weekly | Anhang am GoDi-Termin in CT | proxy `/flyer` | Sekretariat |
| Predigten | weekly | YouTube-Upload (Beschreibungs­konvention) | proxy `/sermons` | Technik-Team |
| Hauskreise | monthly | ChurchTools Gruppen | proxy `/groups` | Hauskreis-Koordination |
| **Team-Seite** (Namen, Rollen, Fotos) | few ×/year | **CMS** (`data/team.json` + Foto-Upload) | commit → deploy | Gemeindeleitung |
| **Statische Texte** (Hero, Werte, Glaube, Angebote, Spenden-IBAN, Kontakt) | few ×/year | **CMS** (`data/content/*.json`, DE·EN·UK side by side) | commit → bake → deploy | Website-Team |
| **Übersetzungen** (site-wide UI-Strings für `/en/` + `/uk/`) | when copy changes | **CMS** („Übersetzungen"-Collection) | commit → locale build → deploy | Website-Team / Übersetzer |
| Layout / Design / neue Seiten | rare | Repo (Entwickler) | PR → deploy | Entwickler |

**Deliberate change vs. the earlier sketch:** the team page moves to the **CMS permanently**, not
to CT persons. Reason: publishing member photos needs explicit consent (DSGVO); CT profile photos
are internal by default. A CMS-curated `team.json` — where a photo only exists because someone
deliberately uploaded it for the website — is the consent boundary itself. CT stays the source
for *who has which role*; the CMS entry mirrors it in seconds when it changes.

## 2 · CMS choice

Requirements: free · no server to run · edits the repo's JSON/Markdown directly (git = versioning,
rollback, same deploy pipeline) · form-style editor a non-technical person learns in minutes ·
image upload for team/gallery photos.

| | **Sveltia CMS** (recommended) | Pages CMS | Decap CMS |
|---|---|---|---|
| Hosting | one static `/admin/` page in this repo | hosted app (pagescms.org) | static `/admin/` page |
| Auth | GitHub OAuth via tiny Cloudflare Worker | GitHub App (zero infra) | OAuth worker (older) |
| Editor quality | modern, fast, i18n/German UI | clean, simple | dated, quirky |
| Third-party dependency | none (self-hosted) | pagescms.org uptime | none |
| Media uploads | ✓ into `img/` | ✓ | ✓ |

**Recommendation: Sveltia CMS.** It lives at `jesus-punkt.de/admin/`, has a German UI, no external
service to depend on — and its GitHub-OAuth helper is a ~40-line Cloudflare Worker that can live
in the **same Worker** we already need as the ChurchTools proxy (one deployment, two routes).
Fallback if OAuth setup annoys: Pages CMS works with this exact repo layout unchanged — the
`config.yml` content model below transfers 1:1 (minus the i18n columns).

The i18n decision below makes Sveltia's **first-class i18n support** load-bearing: with
`i18n: {locales: [de, en, uk], default_locale: de}` the editor shows the three languages side
by side per field — the maintainer translates in the same form he edits.

## 3 · Content model (what becomes editable)

New folder `data/content/`, one small JSON per page area; `admin/config.yml` defines the form
fields (German labels, hints, required flags):

```
data/content/          (state 2026-07-18 — one file per page, entries named like the site nav)
  home.json            hero title + highlight word, section titles + intros (Termine, Predigten,
                       Hauskreise, Werte)
  werte.json           the 7 values: { name, line } ×7   ← single source (see §4)
  ueber-uns.json       page hero, team intro, "Was wir glauben" paragraphs, Chronik intro
  gemeindeleben.json   page hero, KiGo + Jugend intros & fact rows, Hauskreis texts
  angebote.json        page hero + the 3 offer cards (title, text — links stay hardcoded)
  events.json          page hero + section intros (calendar, besondere Events)
  spenden.json         page hero, Kontoinhaber/Bank/IBAN/BIC/Verwendungszweck, side-card texts
  kontakt.json         page hero, phone, mail, card texts + SHARED strings: service time,
                       address, footer tagline/livestream line (hero eyebrow + footer of every page)
  hauskreise.json      enabled-toggle + groups list (flat, not localized)
  team.json            people: name, roles[], group, photo (consent!)
img/team/              CMS photo uploads (3:4, consent confirmed)
```

Sveltia config gotchas (learned 2026-07-18, the hard way):
- `i18n: true` is required on the **collection** AND each file — file-level alone silently
  disables i18n and every field renders empty.
- `i18n: duplicate` renders a **blank editor** in current Sveltia — non-translatable fields
  are plain `i18n: true` with identical values per locale instead (bake only reads `de`).
- The label-dump preview pane is disabled (`editor: preview: false`); per-field `hint`s name
  the exact page + section instead.
- Headless verification harness: `python3 -m http.server` + puppeteer overriding
  `showDirectoryPicker` with an OPFS-backed fake repo (needs a `.git` dir) — enters Sveltia's
  local-repo mode without OAuth, screenshots every entry, tests a save round-trip.

Editor rules encoded in the config: max lengths where layout is tight (value lines, card titles),
`pattern` for IBAN, required alt-texts for uploads, no rich text anywhere (plain strings only —
the design system owns all formatting).

**Every user-visible text field is localized.** Sveltia's i18n mode stores `{de, en, uk}` per
field (single-file structure); German is required, `en`/`uk` may stay empty — empty means the
locale trees fall back to German, exactly the i18n build's existing behavior. Deliberately not
localized: IBAN, phone, addresses, photos, and the German-only legal pages.

**Site-wide UI strings become a CMS collection too.** `data/i18n/en.json` + `uk.json`
(German string → translation maps) are migrated into one CMS-friendly
`data/i18n/translations.json` — a list of `{de, en, uk}` entries. `tools/i18n-build.py` reads
the list instead of the two maps (~15-line change; a one-off script migrates the existing
173×2 entries). The maintainer edits translations in the same admin UI („Übersetzungen",
searchable by the German string).

**The translation to-do loop closes itself.** The i18n build already reports untranslated
German strings at deploy; that report now auto-appends the missing strings as entries with
empty `en`/`uk` to `translations.json` (workflow commit with `[skip ci]`). New or changed copy
therefore shows up in the CMS as visibly empty fields the maintainer fills when he gets to it —
no developer in the loop, German fallback until then.

## 4 · How CMS content reaches the pages: bake at deploy, not fetch at runtime

Static copy must not become JS-rendered (SEO, no-JS fallback, no flash). Instead the **existing
Pages workflow** gets one more step — the same pattern as the path-prefixer already in
`.github/workflows/pages.yml`:

1. Elements carry markers: `<h3 data-content="werte.0.name">Authentisch</h3>` (checked-in HTML
   keeps real copy as fallback — repo stays readable).
2. A ~40-line dependency-free Python step replaces each marked element's text from
   `data/content/*.json` during deploy. Wrong path → build fails loudly, site never half-renders.
3. `js/main.js` reads the Werte lines from a `<script type="application/json">` block the bake
   step injects — removing today's duplication of the 7 value lines (HTML + `LINES` array).
4. **Locale trees:** the bake writes the German values into the source markup *before*
   `tools/i18n-build.py` runs, and merges the fields' `{en, uk}` values into that run's
   translation table. CMS-managed strings can therefore never produce fallback warnings — the
   warning report stays meaningful for markup-only strings.

Local dev keeps working with the checked-in fallback copy; the bake only runs in CI. Flow:
**CMS save → commit on `main` → Actions bake + deploy → live in ≈ 1 minute.** Every change is a
commit: who/what/when, one-click revert.

## 5 · Visual editing: the same content, on the real page

Decision (2026-07-08): forms alone are too abstract — the CMS gets a second, **visual** surface.
Both surfaces edit the same `data/content/*.json`; nothing is duplicated.

- **Sveltia stays the base** — structured fields, validation, photo uploads, and the
  side-by-side translation columns. Its preview pane gets the site's real CSS
  (`tokens/base/components` via preview styles), so entries already *look* like the site.
  True live preview of the real page is explicitly out of Sveltia's scope — hence:
- **In-context edit mode** (own overlay, ~300–500 lines, dependency-free). The bake markers
  (`data-content="werte.0.name"`) are exact content addresses in the real DOM — precisely what
  visual editing needs. `/admin/` gains an „Auf der Seite bearbeiten" mode: the live site loads
  in an iframe with an edit flag, every marked element becomes editable in place (the same
  field config enforces max-lengths live; plain text by construction). „Speichern" writes the
  diff to `data/content/*.json` and commits through the Worker's GitHub route → bake → deploy →
  live in ≈ 1 minute. Editing feels like the website; publishing stays git.
- **Visual translating (overlay v2):** the markers survive into the generated `/en/` + `/uk/`
  trees, so the same overlay on the English page edits the `en` values — translating by
  clicking text on the actual English site. Ships after the German overlay proves itself; the
  form columns cover translations from day one.
- Commercial visual CMSes were checked (2026-07-08) and rejected: CloudCannon does in-context
  editing natively but has no free tier ($45+/site/month); Tina's contextual editing wants a
  React app, which this hand-coded static site is not.

## 6 · ChurchTools side (delta to churchtools-integration.md)

Everything in that doc stands, with two updates:

- **Proxy host = Cloudflare Worker** (not Vercel functions): GitHub Pages hosts no functions, and
  a Worker is independent of wherever the static site lives — it survives the later move to
  jesus-punkt.de unchanged. Free tier (100k req/day) is orders of magnitude above need. Routes:
  `/events`, `/flyer`, `/flyer/file`, `/groups`, `/sermons` + `/oauth` (Sveltia). Env:
  `CT_BASE_URL`, `CT_TOKEN`, `CT_CAL_IDS`, `YT_API_KEY`, `GH_OAUTH_ID/SECRET`.
- **`js/data.js` stays the single client**: go-live = point its URL map at the Worker
  (`https://api.jesus-punkt.de/…`), set `NOW = null`, delete nothing — the mock files remain the
  documented contract + local fixtures. The proxy emits **ISO `start` + `type`** (today's mock
  schema), not the pre-formatted strings from the older doc — date formatting stays client-side
  in `data.js` where it already works (calendar needs real dates anyway).

## 7 · Rollout phases

| Phase | Scope | Effort | Blockers |
|---|---|---|---|
| **0 — done** | mock data layer, `data-ct` slots incl. calendar + team, Pages auto-deploy | — | — |
| **1 — CT live** | Worker proxy: `/events` `/flyer` `/flyer/file` `/groups`; CT read-only user + token; team conventions (Flyer-Anhang, Kalender öffentlich, Feld „Treffzeit"); switch `data.js` URL map | 1–2 days | API user (§8) — instance is jp.church.tools |
| **2 — Predigten** | `/sermons` via YouTube Data API (uploads playlist → title/date/speaker/thumbnail); description convention "Name · Rolle" | 0.5–1 day | YT API key |
| **3 — CMS** *(repo side done 2026-07-09: `/admin/` + config, localized `data/content/` for home/werte/spenden/kontakt/team, bake step + i18n merge live — login blocked on OAuth app + auth Worker; Übersetzungen-collection & auto-append still open)* | Sveltia `/admin/` + OAuth route on the Worker; localized `data/content/*.json` (DE·EN·UK) + `config.yml`; „Übersetzungen"-Collection (migrate `data/i18n/*` → `translations.json`, adapt `i18n-build.py`, auto-append missing strings); bake step incl. locale merge; move team.json under CMS with photo upload + consent field; 1-page German editor guide with screenshots | 3–4 days | GitHub OAuth app |
| **3.5 — Edit mode** | in-context overlay on the `data-content` markers (edit on the real page, commit via Worker); v2: same overlay on `/en/`+`/uk/` for visual translating | 1–2 days | Phase 3 (markers + OAuth live) |
| **4 — Domain** | jesus-punkt.de → Pages custom domain; prefix step auto-skips (root); Worker on `api.jesus-punkt.de`; repo → church GitHub org, editors invited with write access | 0.5 day | DNS access |

Sequencing note: **Phase 1 delivers the most visible value** (the docx goal: „einmal in
ChurchTools pflegen") and needs no CMS. Phase 3 is independent and can run in parallel once the
Worker exists.

## 8 · Open decisions (carried + new)

1. ~~CT instance URL~~ **jp.church.tools** (confirmed 2026-07-08). Still open: who creates the read-only API user (info@ access is still via Günther).
2. Which calendars are public: Gottesdienst, Elevate/Opendoor, Gebet, Hauskreise?
3. YouTube: who owns the Google Cloud project for the API key?
4. GitHub org for the Gemeinde (repo currently under the personal account) — needed before
   editors get CMS access; also decides who approves the OAuth app.
5. Photo consent process for the team page: form or verbal + checkbox in the CMS entry?

## 9 · Risks & mitigations

- **Drift between CMS copy and checked-in fallback** → bake step fails the build on unknown
  markers; quarterly `diff` check is one command.
- **CT schema/API changes** → only the Worker knows CT shapes; contracts to the client are ours.
- **Worker down** → client keeps pre-rendered fallback content (existing behavior, already tested).
- **Editor breaks layout with long text** → field max-lengths in `config.yml`; no rich text.
- **Token leakage** → token only in Worker env; read-only CT user; rotate on personnel change.
- **Custom overlay bit-rots** → it is an enhancement layer only; Sveltia edits 100% of the
  content without it, so it can be switched off at any time.
- **Auto-appended translation entries retrigger the deploy** → the append commit uses
  `[skip ci]`; it carries no content change.
- **Bus factor** → everything is in the repo (incl. this plan); any web developer can take over
  with `git clone` + one page of docs.
