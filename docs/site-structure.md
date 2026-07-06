# Jesus Punkt — Site Structure

Source: `Neue Seitenstruktur.docx` (2026) + `assets/content.json`. This is the routing plan the homepage nav/footer already point at. Every subpage composes components from `design-system.html` — no new visual language per page.

## Sitemap

```
/                       Startseite (built — Heritage Gold design)
/ueber-uns/             Über uns
  /ueber-uns/team/        Unser Team
  /ueber-uns/glaube/      Gemeinde und Glaube (Werte + Glaubensverständnis)
  /ueber-uns/chronik/     Chronik
/events/                Events
  /events/veranstaltungen/  Veranstaltungen (Kalender)
  /events/predigten/        Predigten (Archiv)
/gemeindeleben/         Gemeindeleben
  /gemeindeleben/kindergottesdienst/
  /gemeindeleben/jugend/      Die Jugend (ELEVATE YOUTH)
  /gemeindeleben/hauskreise/  Hauskreise (früher „Kleingruppen")
  /gemeindeleben/next-steps/  Next Steps
/angebote/              Angebote
  /angebote/weisses-kreuz/    Weißes Kreuz Beratungsstelle
  /angebote/hochzeitssprecher/
  /angebote/beerdigungen/
/spenden/               Spenden
/kontakt/               Kontakt
/impressum/  /datenschutz/
```

## Content directives from the docx (per page)

- **Startseite**: Hero mit Gottesdienst (So 10:00, Kruseshofer Str. 20, vor Ort + YouTube) · Veranstaltungen mit ChurchTools-aktualisierbarem Sonntags-Flyer + „weitere Veranstaltungen" („Veranstaltungen unserer Freunde" entfällt) · Predigten · Kleingruppen · Next Steps · Footer. (Clip- und Themen-Rubriken stehen im Dokument, sind im finalen Heritage-Gold-Design aber nicht enthalten — erst bauen, wenn ein Design dafür existiert.)
- **Unser Team**: aktuelle Fotos (Drive-Ordner). Gemeindeleitung ohne Günther & Loni; Philipp Strauch mit aktuellem Foto + Bezeichnung **Pastor**. Bereiche: Lobpreis — Tymur Sheikh · Website — Arne Brockmann · Gottesdienst — Philipp Strauch · Hausmeister — Yurii Uglov (neu) · Kindergottesdienst — Lydia Wegner & Anja Maas · Jugend — Claus Wittnebel & Philipp Strauch · Hauswirtschaft — Ulrike Huhn · Finanzen — Günther Seidt · Technik — Saskia Lobert. Henry Köhler (Rangers) entfernen.
- **Gemeinde und Glaube**: die 7 Werte (Authentisch, Relevant, Hingegeben, Gastfreundlich, Begeistert, Großzügig, Wertschätzend) + volles Glaubensverständnis (Text im docx/content.json).
- **Chronik**: bestehende Chronik + Ergänzungen: Übergabe der Leitung an Philipp Strauch (Okt 2025), Dworniks, Fuhrers, Simeon Schütz, Friederike & Claus, Philipps Werdegang (Volltexte im docx).
- **Die Jugend**: ELEVATE YOUTH, freitags 18:30–21:30 (außer Ferien), 13–29 Jahre. Kalender mit ChurchTools synchronisieren (nur Opendoor-Termine). Grüntöne anpassbar. Facebook-Link löschen; Instagram reparieren (Saskia verwaltet den Account).
- **Royal Rangers**: Seite + Navigationspunkt **inaktiv** (zurzeit keine Rangers).
- **Hauskreise**: neue Bezeichnung für Kleingruppen; bessere Galerie-Bilder aus dem Drive.
- **Next Steps**: kein fester Terminhinweis (grüner Text weg); aktuelle Termine über einen bei ChurchTools hochgeladenen Flyer wie beim Gottesdienst. Die vier Fragen mit Symbolen bleiben, ohne Sonntags-Aufzählung.
- **Angebote**: Links für Hochzeitssprecher und Beerdigungen reparieren.
- **Spenden**: Kontoinhaber VIA Movement e.V.; Anschrift mit Mobil +49 156 79133367 aktualisieren; PayPal-Button deutlich größer, besseres PayPal-Logo.
- **Kontakt**: fehlerhafte Karten-Einbettung unten links ersetzen; Nummer von Günther & Loni entfernen → Mobil +49 156 79133367; Zugang zu info@jesus-punkt.de klären.

## Engineering pattern for new pages

1. Copy the shell: header (nav pill with the page's item in accent state), footer, `<main>`.
2. One `styles/<page>.css` per page; only tokens/components allowed.
3. Dynamic content (calendars, flyers, groups, sermons) via the `data-ct` slots — see churchtools-integration.md.
4. Keep URLs trailing-slash directories (`/ueber-uns/team/index.html`) so static hosting maps cleanly.
