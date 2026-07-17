# Pipeline — jesus-punkt.de

Stand 2026-07-17. Plain runbook: what runs where, who edits what, what is still open.

## Repo & hosting

- Code: github.com/pc-gr-debug/jesus-punkt, branch main. One clean commit per work session.
- Hosting: Vercel project "jesus-punkt" (team Jesus Punkt), live at https://jesus-punkt.vercel.app.
- Deploy: `vercel deploy --prod --yes` from the repo root.
- After the Vercel-GitHub connection exists: every push to main deploys automatically.
- Local preview: `python3 -m http.server` from the repo root (root-absolute paths — never file://).

## Build (tools/vercel-build.sh — runs on every deploy, in this order)

- `python3 tools/ct-events.py` — pulls events + flyers from the public jp.church.tools calendars, anonymously. Writes data/ct/events.json, data/ct/flyer.json, flyer images. Failure = keeps the checked-in snapshot, never breaks the build.
- `python3 tools/yt-sermons.py` — pulls the latest sermons from the YouTube uploads playlist. Needs YT_API_KEY + YT_PLAYLIST_ID; without them the checked-in fallback ships.
- `python3 tools/content-bake.py` — bakes the CMS content (data/content/*.json) into the marked HTML elements.
- `python3 tools/i18n-build.py --origin https://jesus-punkt.de --patch-de` — generates /en/ and /uk/, injects hreflang and per-locale canonicals. A new German string without dictionary entry = warning + German fallback.

## Daily refresh

- .github/workflows/vercel-rebuild.yml runs at 04:00 UTC and POSTs the VERCEL_DEPLOY_HOOK secret.
- The deploy hook can only be created after the Vercel-GitHub connection exists (Vercel: project jesus-punkt, Settings, Git, Deploy Hooks). Then: `gh secret set VERCEL_DEPLOY_HOOK` in the repo.
- Until then: content refresh = manual `vercel deploy --prod --yes`.

## Content — who edits what

- Events: ChurchTools, public calendars. A calendar set public appears on the site automatically. New entries are online after the next deploy (daily, latest).
- Weekly flyer: image on the appointment titled exactly "Flyer", or on the next Gottesdienst.
- Special flyers (long-notice events): appointment titled "Flyer Eventname", placed on the event day, up to 12 months ahead, image attached. Site strips the word "Flyer", shows the name with a Vormerken badge in "Besondere Events" (home + events page) until that day, then it disappears. Max 3 at once. No specials = the sections stay completely hidden.
- Sermons: upload/stream via the YouTube channel; the site reads the uploads playlist.
- Rare texts (bank details, team, section intros, the 7 Werte): /admin/ (Sveltia CMS), commits into data/content/*.json, live after the next deploy.
- Translations: data/i18n/en.json and uk.json map exact German strings to en/uk. Impressum + Datenschutz stay German-only.
- Forms (Kontakt, Spendenbescheinigung): currently POST to the old WordPress (js/contact.js ENDPOINT). Planned replacement: own /api/contact function sending via Google Workspace SMTP — see Cutover.

## /admin/ login (Sveltia CMS)

- GitHub OAuth app, owner pc-gr-debug. Homepage URL https://jesus-punkt.de, callback URL https://jesus-punkt.de/api/callback.
- The handshake runs through the repo's own Vercel functions api/auth.js + api/callback.js.
- Vercel env needed: GH_OAUTH_ID (client id), GH_OAUTH_SECRET (client secret). Redeploy after setting.
- Login works only after the domain cutover (jesus-punkt.de must serve the Vercel project).
- Editors need write access to the GitHub repo.

## Env vars (Vercel project jesus-punkt, Production)

- YT_PLAYLIST_ID — set (UUGJVox4diQQw41RG4NT1hhw).
- YT_API_KEY — missing; from Google Cloud Console, YouTube Data API v3.
- GH_OAUTH_ID / GH_OAUTH_SECRET — missing; from the GitHub OAuth app.
- SMTP_PASS — missing; Google app password for info@jesus-punkt.de, needed for the /api/contact form function.

## Domains & DNS (all in Vercel, team Jesus Punkt)

- jesus-punkt.de: nameservers = Vercel. MX (5x Google), SPF, DKIM (krs._domainkey), site-verification = Google Workspace mail — never touch these.
- jesus-punkt.de apex A 104.19.154.92 and www CNAME lnszc5ey3e.wpdns.site still point at the old WordPress — on purpose, until cutover.
- jesuspunkt.de: done. Vercel project "jesuspunkt-redirect" 308-redirects apex + www + every path to https://jesus-punkt.de.
- Recommended addition: TXT _dmarc "v=DMARC1; p=none; rua=mailto:info@jesus-punkt.de".

## Cutover to jesus-punkt.de (in this order)

- Replace the form backend: build /api/contact (SMTP_PASS must be set), swap ENDPOINT in js/contact.js, send one probe through each form. Alternative if WordPress stays: rehost it as alt.jesus-punkt.de first.
- Add the domains to the project: `vercel domains add jesus-punkt.de` and `vercel domains add www.jesus-punkt.de` (project jesus-punkt).
- Delete exactly two DNS records in the jesus-punkt.de zone: the apex A 104.19.154.92 and the www CNAME lnszc5ey3e.wpdns.site. The existing ALIAS records then serve the Vercel project.
- Check: https://jesus-punkt.de loads the new site, /en/ and /uk/ work, /admin/ login works, a test mail to info@jesus-punkt.de arrives.
- Google Search Console: add the property, submit https://jesus-punkt.de/sitemap.xml.
- Afterwards: cancel WordPress hosting (only if the forms were replaced), rotate the old domain transfer auth codes.

## Currently blocked / open

- git push to pc-gr-debug/jesus-punkt: local GitHub login (sibagatovmihail) has no write access. Fix: invite as collaborator, or `gh auth login` as pc-gr-debug.
- Vercel-GitHub connection: church Vercel account has no GitHub login connection (Account Settings, Login Connections). Needed for auto-deploys + deploy hook.
- Env values: YT_API_KEY, GH_OAUTH_ID, GH_OAUTH_SECRET, SMTP_PASS.
- /api/contact form function: planned, not built.
- Before launch: Raveo webfont license, real team/gallery/hero photos, Vereinsregister number on /impressum/.
