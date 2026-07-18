# Domain-Umzug: jesus-punkt.de → neue Website

Stand 2026-07-10. Beide Domains (**jesus-punkt.de**, **jesuspunkt.de**) liegen beim bisherigen
Anbieter; Arne hat die Transfer-Auth-Codes per Chat geschickt (⚠️ als Passwörter behandeln,
nach dem Transfer neu generieren lassen — sie stehen bewusst NICHT in diesem Repo).
E-Mail läuft über **Google Workspace** — die DNS-Einträge dafür MÜSSEN mit umziehen, sonst
kommt keine Mail mehr an (Arnes wichtigster Hinweis).

## Reihenfolge (so bleibt E-Mail und Website durchgehend erreichbar)

### 1 · Vercel vorbereiten (vor dem Transfer)
1. Vercel → Domains → *Transfer in* für `jesus-punkt.de` (Auth-Code aus dem Chat), dann `jesuspunkt.de`.
2. **Sofort** nach dem Transfer (oder schon währenddessen im Vercel-DNS-Editor) die
   Google-Workspace-Records anlegen — Host `@`, TTL 3600:
   | Typ | Prio | Value |
   |---|---|---|
   | MX | 1 | `aspmx.l.google.com.` |
   | MX | 5 | `alt1.aspmx.l.google.com.` |
   | MX | 5 | `alt2.aspmx.l.google.com.` |
   | MX | 10 | `alt3.aspmx.l.google.com.` |
   | MX | 10 | `alt4.aspmx.l.google.com.` |
   | TXT | — | `v=spf1 include:_spf.google.com ~all` |
   | TXT | — | `google-site-verification=6AvR3fcwhpegPk47vwPxUThfT5fa2LrtbXaG08sM4bs` |
   und mit Host **`krs._domainkey`**: TXT `k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDiZP9TCVdHJJDJt3mEH0eNPQQrEjosOblpQwYc2TVtvBNVWyOzXjZ48BHCwhPD8JSbNMXFNOErcp4TVZTOJOs94bGpzGrKV6NeZg5TPqe455JX1820O/5foPX4hYDX1U7p+XwkUM99alxld9pgc4kkh0Ush3luuE1Oshy5Tss3JQIDAQAB`
   (kein Google-Workspace-Preset verwenden — Arne ist unsicher, ob es zu ihrer Instanz passt; die Werte oben sind die bestätigten.)
3. Test: `dig MX jesus-punkt.de` gegen die Vercel-Nameserver, Probemail an info@jesus-punkt.de.

### 2 · ✅ Formular-Endpoint gesichert (erledigt 2026-07-18)
**Entscheidung (2026-07-18, ersetzt die vom 2026-07-17): Web3Forms statt
eigener Vercel-Function.** Beide Formulare (Kontakt, Spendenbescheinigung)
posten per AJAX direkt an `api.web3forms.com/submit`; der jeweilige
`access_key` (registriert auf info@jesus-punkt.de) liegt als Hidden-Input im
Markup. Kein eigener Server, keine Env-Variablen, funktioniert unabhängig von
der Domain — der Cutover kann die Formulare nicht mehr kaputt machen.

WordPress wird nicht mehr gebraucht und kann nach dem Cutover gekündigt werden.

### 3 · ✅ Website auf die Domain gelegt (erledigt 2026-07-18)
1. Die Seite läuft als Vercel-Projekt `jesus-punkt` (Team Jesus Punkt) —
   Build-Pipeline in `tools/vercel-build.sh`
   (ct-events → yt-sermons → content-bake → i18n-build, Origin `https://jesus-punkt.de`).
2. Cutover durchgeführt: `jesus-punkt.de` dem Projekt zugewiesen,
   `www.jesus-punkt.de` als 308-Redirect auf den Apex, die zwei Alt-Records
   (`@ A 104.19.154.92`, `www CNAME lnszc5ey3e.wpdns.site.`) gelöscht — der
   ALIAS auf das Vercel-Projekt greift. Mail-Records (MX/SPF/DKIM) unangetastet
   und per dig gegen die Vercel-Nameserver verifiziert.
3. `jesuspunkt.de`: erledigt (2026-07-17) — Vercel-Projekt `jesuspunkt-redirect`
   leitet Apex + www per 308 auf `https://jesus-punkt.de` um (Pfad bleibt erhalten).

### 4 · Nacharbeiten
- Google Search Console: neue Property, Sitemap.
- ChurchTools-Frist prüfen: `tools/ct-events.py` läuft unverändert (liest jp.church.tools direkt).
- Repo idealerweise vorher in eine Gemeinde-GitHub-Org umziehen (CMS-Zugänge, Bus-Faktor)
  — GH Pages + Actions ziehen mit um, die DNS-CNAME-Ziele ändern sich auf `<org>.github.io`.
- Transfer-Auth-Codes beim alten Anbieter invalidieren/rotieren.
