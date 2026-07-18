# Pipeline — jesus-punkt.de

Stand 2026-07-17. Plain runbook: what runs where, who edits what, what is still open.

## Repo & hosting

- Code: github.com/pc-gr-debug/jesus-punkt, branch main. One clean commit per work session.
- Hosting: Vercel project "jesus-punkt" (team Jesus Punkt), live at https://jesus-punkt.de (cutover 2026-07-18; jesus-punkt.vercel.app stays as the deployment URL).
- Deploy: `vercel deploy --prod --yes` from the repo root.
- Since 2026-07-18 the project is git-connected: every push to main also deploys automatically.
- Local preview: `python3 -m http.server` from the repo root (root-absolute paths — never file://).

## Build (tools/vercel-build.sh — runs on every deploy, in this order)

- `python3 tools/ct-events.py` — pulls events + flyers from the public jp.church.tools calendars, anonymously. Writes data/ct/events.json, data/ct/flyer.json, flyer images. Failure = keeps the checked-in snapshot, never breaks the build.
- `python3 tools/yt-sermons.py` — pulls the latest sermons from the YouTube uploads playlist. Needs YT_API_KEY + YT_PLAYLIST_ID; without them the checked-in fallback ships.
- `python3 tools/content-bake.py` — bakes the CMS content (data/content/*.json) into the marked HTML elements.
- `python3 tools/i18n-build.py --origin https://jesus-punkt.de --patch-de` — generates /en/ and /uk/, injects hreflang and per-locale canonicals. A new German string without dictionary entry = warning + German fallback.

## Daily refresh

- .github/workflows/vercel-rebuild.yml runs at 04:00 UTC and POSTs the VERCEL_DEPLOY_HOOK secret.
- Working since 2026-07-18: deploy hook "daily-rebuild" (ref main) on the project, URL stored as repo secret VERCEL_DEPLOY_HOOK. Hook builds check out github.com/pc-gr-debug/jesus-punkt@main — unpushed local work does not ship this way.

## Content — who edits what

- Events: ChurchTools, public calendars. A calendar set public appears on the site automatically. New entries are online after the next deploy (daily, latest).
- Weekly flyer: image on the appointment titled exactly "Flyer", or on the next Gottesdienst.
- Special flyers (long-notice events): appointment titled "Flyer Eventname", placed on the event day, up to 12 months ahead, image attached. Site strips the word "Flyer", shows the name with a Vormerken badge in "Besondere Events" (home + events page) until that day, then it disappears. Max 3 at once. No specials = the sections stay completely hidden.
- Sermons: upload/stream via the YouTube channel; the site reads the uploads playlist.
- Rare texts (bank details, team, section intros, the 7 Werte): /admin/ (Sveltia CMS), commits into data/content/*.json, live after the next deploy.
- Translations: data/i18n/en.json and uk.json map exact German strings to en/uk. Impressum + Datenschutz stay German-only.
- Forms (Kontakt, Spendenbescheinigung): AJAX POST to Web3Forms (api.web3forms.com/submit), which mails to info@jesus-punkt.de. Each form carries its own access_key as a hidden input (Kontakt 3eb60d80-…, Spendenbescheinigung a31c4d24-…, both registered to info@jesus-punkt.de). No server-side function, no env vars — the old /api/contact SMTP function was retired 2026-07-18 without ever going live (SMTP_PASS was never set).

## /admin/ login (Sveltia CMS)

- GitHub OAuth app, owner pc-gr-debug. Homepage URL https://jesus-punkt.de, callback URL https://jesus-punkt.de/api/callback.
- The handshake runs through the repo's own Vercel functions api/auth.js + api/callback.js.
- Vercel env needed: GH_OAUTH_ID (client id), GH_OAUTH_SECRET (client secret). Redeploy after setting.
- Since the 2026-07-18 cutover jesus-punkt.de serves the Vercel project; /api/auth/ 302s to GitHub correctly (full login round-trip still needs a human test).
- Editors need write access to the GitHub repo.

## Env vars (Vercel project jesus-punkt, Production)

- YT_PLAYLIST_ID — set (UUGJVox4diQQw41RG4NT1hhw).
- YT_API_KEY — set (2026-07-17; recovered from the old GitHub-Actions secret, verified against the Data API).
- GH_OAUTH_ID / GH_OAUTH_SECRET — set (OAuth app Ov23livdJg9FhDIjtPhW, owner pc-gr-debug).
- (SMTP_PASS is no longer needed — forms moved to Web3Forms 2026-07-18.)

## Domains & DNS (all in Vercel, team Jesus Punkt)

- jesus-punkt.de: nameservers = Vercel. MX (5x Google), SPF, DKIM (krs._domainkey), site-verification = Google Workspace mail — never touch these.
- jesus-punkt.de: cutover done 2026-07-18 — the old apex A 104.19.154.92 and www CNAME lnszc5ey3e.wpdns.site (WordPress) are deleted; the ALIAS records (apex + wildcard → cname.vercel-dns-017.com) serve the project. www.jesus-punkt.de 308s to the apex.
- jesuspunkt.de: done. Vercel project "jesuspunkt-redirect" 308-redirects apex + www + every path to https://jesus-punkt.de.
- Recommended addition: TXT _dmarc "v=DMARC1; p=none; rua=mailto:info@jesus-punkt.de".

## Cutover to jesus-punkt.de — DONE 2026-07-18

- Domains attached to the project (apex + www as 308 redirect), the two WordPress DNS records deleted, mail records untouched.
- Verified live: home, /en/, /uk/, /kontakt/, /spenden/, /admin/, /sitemap.xml all 200; Kontakt form probe through Web3Forms succeeded from the live domain; /api/auth/ 302s to GitHub; jesuspunkt.de still 308s to the apex; MX/SPF/DKIM answer correctly from the Vercel nameservers.

## Open (post-cutover)

- Google Search Console: add the https://jesus-punkt.de property, submit /sitemap.xml (needs the Google account).
- Cancel WordPress hosting; rotate the old domain transfer auth codes.
- Human test of the full /admin/ GitHub login round-trip.
- Recommended DNS addition: TXT _dmarc "v=DMARC1; p=none; rua=mailto:info@jesus-punkt.de".
- Before real launch: Raveo webfont license, real team/gallery/hero photos, Vereinsregister number on /impressum/.
