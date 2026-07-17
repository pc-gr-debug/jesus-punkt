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

### 2 · ⚠️ Formular-Endpoint sichern (BEVOR die Domain umzeigt!)
**Entscheidung (2026-07-10): das WordPress bleibt** — Kontakt- und
Spendenbescheinigungs-Formular posten weiter an den Brizy-Endpoint
(`…/wp-admin/admin-ajax.php`). Sobald jesus-punkt.de auf die neue statische Seite
zeigt, ist der Endpoint unter diesem Namen aber nicht mehr erreichbar. Deshalb vor Cutover:

1. Mit Arne/altem Host klären: WordPress bleibt gehostet und bekommt eine neue Adresse,
   z. B. **`alt.jesus-punkt.de`** (im Vercel-DNS ein A/CNAME-Record auf den alten Server;
   WordPress-Site-URL + vHost + TLS-Zertifikat müssen dort auf den neuen Namen umgestellt
   werden — das kann nur der WP-Admin).
2. In `js/contact.js` die eine `ENDPOINT`-Konstante auf die neue Adresse tauschen.
3. Kurz beide Formulare testen (je eine Probe-Nachricht).

WordPress darf danach gern unsichtbar bleiben — es dient nur noch als Formular-Postfach.

### 3 · Website auf die Domain legen *(Stand 2026-07-17: Hosting = Vercel-Projekt `jesus-punkt`, nicht mehr GitHub Pages)*
1. Die Seite läuft als Vercel-Projekt `jesus-punkt` (Team Jesus Punkt) auf
   `https://jesus-punkt.vercel.app` — Build-Pipeline in `tools/vercel-build.sh`
   (ct-events → yt-sermons → content-bake → i18n-build, Origin bereits `https://jesus-punkt.de`).
2. Cutover = `jesus-punkt.de` + `www.jesus-punkt.de` dem Projekt zuweisen
   (`vercel domains add …`) **und** im Vercel-DNS die zwei Alt-Records löschen:
   `@ A 104.19.154.92` (altes WordPress) und `www CNAME lnszc5ey3e.wpdns.site.` —
   dann greift der vorhandene ALIAS auf das Vercel-Projekt.
   ⚠️ Erst NACH Schritt 2 (Formular-Endpoint) — sonst gehen die Formulare kaputt.
3. `jesuspunkt.de`: erledigt (2026-07-17) — Vercel-Projekt `jesuspunkt-redirect`
   leitet Apex + www per 308 auf `https://jesus-punkt.de` um (Pfad bleibt erhalten).

### 4 · Nacharbeiten
- Google Search Console: neue Property, Sitemap.
- ChurchTools-Frist prüfen: `tools/ct-events.py` läuft unverändert (liest jp.church.tools direkt).
- Repo idealerweise vorher in eine Gemeinde-GitHub-Org umziehen (CMS-Zugänge, Bus-Faktor)
  — GH Pages + Actions ziehen mit um, die DNS-CNAME-Ziele ändern sich auf `<org>.github.io`.
- Transfer-Auth-Codes beim alten Anbieter invalidieren/rotieren.
