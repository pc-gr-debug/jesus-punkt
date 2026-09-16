# ChurchTools & Website — Kurzanleitung fürs Team

**Grundregel: Was in den öffentlichen Kalendern steht, steht auf der Website. Sonst nichts.**
Die Website liest ChurchTools 1× täglich (gegen 06:00) und bei jeder Website-Änderung.

## Termine (Startseite „Was als Nächstes ansteht" + Events-Kalender)

- Sichtbar sind Termine aus **allen öffentlich geschalteten Kalendern** (aktuell: **„Öffentlicher
  Kalender"** und **„Kinder & Jugend"**). Wird ein weiterer Kalender in ChurchTools auf „öffentlich"
  gestellt, erscheint er automatisch mit auf der Website — ein privater Kalender **nie**. Das ist der Schalter.
- Titel-Konventionen (steuern Darstellung + Übersetzung EN/UK):
  | Titel enthält… | erscheint als |
  |---|---|
  | „Gottesdienst" | Gottesdienst · Standardtext „Kruseshofer Str. 20 · vor Ort und im Livestream" |
  | „Elevate" | Elevate Jugend · „Für Jugendliche zwischen 13 und 29 Jahren" |
  | „Gebet" | Gebet · „Gemeinsames Gebet · alle sind willkommen" |
  | „Hauskreis" | Hauskreis-Abend · „In Wohnzimmern in ganz Neubrandenburg" |
  | (alles andere) | Original-Titel, **Untertitel** des Termins wird als Beschreibung angezeigt |
- Der **nächste Gottesdienst** wird automatisch gelb hervorgehoben.
- **Ort des Gottesdienstes ändern** (z.&nbsp;B. Gottesdienst auf dem Marktplatz statt in der
  Kruseshofer Str.): am Gottesdienst-Termin das **Adressfeld** (Ort-Auswahl in ChurchTools)
  setzen. Die Website übernimmt diesen Ort automatisch in den Anzeigetext. Kein Adressfeld
  gesetzt → es bleibt beim Standardtext „Kruseshofer Str. 20 · vor Ort und im Livestream".

## Flyer (Startseite)

Dem Termin ein **Bild** geben — zwei Wege, beide im Öffentlichen Kalender:

1. **Empfohlen:** einen Termin **„Flyer"** anlegen (z.&nbsp;B. als Serie am Sonntag) und dort das
   aktuelle Flyer-Bild als Termin-Bild setzen. Bild tauschen = Website-Flyer tauschen.
2. Oder: das Bild direkt am nächsten **Gottesdienst**-Termin setzen.

Kein Bild gesetzt → die Website zeigt den zuletzt hinterlegten Stand.

## Besondere Events (Flyer mit langem Vorlauf)

Für Events, auf die man sich früh vorbereiten soll (Sommerfest, Konferenz, …):

1. Im Öffentlichen Kalender einen Termin **„Flyer *Eventname*"** anlegen — z.&nbsp;B. „Flyer Sommerfest",
   **am Event-Tag selbst** (bis zu 12 Monate im Voraus).
2. Das Flyer-Bild als Termin-Bild setzen — fertig.

Die Website zeigt nur den Eventnamen (das Wort „Flyer" wird entfernt) und wirbt **ab sofort
bis zum Datum des Termins** — der Flyer verschwindet also automatisch, wenn das Event vorbei
ist. Werbestart steuern = den Termin einfach erst dann anlegen, wenn die Werbung losgehen soll.

Diese Flyer erscheinen im Bereich **Besondere Events** (max. 3 gleichzeitig, das
nächstliegende zuerst) — auf der Events-Seite als Karte mit „Vormerken"-Badge, auf der
Startseite als Block (Titel + Flyer). Der normale Wochen-Flyer (Punkt oben) läuft
unabhängig davon weiter — nur der nackte Titel „Flyer" zählt als Wochen-Flyer, alles mit
Namenszusatz als Besonderes Event.

### Der ausführliche Weg: im Website-CMS

ChurchTools kann nur *ein Bild pro Termin* und keine Detailtexte. Für ein Event mit
**mehreren Flyern** oder mit Infozeilen (Datum, Gäste, „bitte etwas mitbringen") deshalb:
`/admin/` → **Inhalte → Besondere Events** → Event hinzufügen.

Pro Event: Titel (wird gelb markiert), beliebig viele Detailzeilen, beliebig viele Flyer,
optional ein Link und ein „Anzeigen bis"-Datum (danach verschwindet der Block von allein).
Jeder Flyer steht erst einmal vollständig und mittig auf dem Bildschirm; erst danach
schiebt sich beim Weiterscrollen der nächste darüber, wobei der hintere kleiner und der
vordere größer wird. Die Infos daneben bleiben stehen; von Block zu Block wechseln Infos
und Flyer die Seite. Ein Klick (oder Tipp) auf einen Flyer öffnet ihn in voller Größe —
von dort lässt sich durch alle Flyer desselben Events blättern. Reihenfolge = Reihenfolge
der Liste im CMS (Einträge zum Umsortieren ziehen).

Beide Wege funktionieren gleichzeitig: die CMS-Blöcke stehen oben, die ChurchTools-Flyer
dahinter.

## Termine, die nicht in ChurchTools stehen

Normalfall bleibt: **Termine in ChurchTools pflegen.** Für Ausnahmen (ein Termin, der dort
nicht geführt wird) gibt es `/admin/` → **Inhalte → Termine von Hand**. Datum, Uhrzeit, Art,
Titel und Zusatzzeile eintragen — der Termin taucht dann in der Liste auf der Startseite und
im Monatskalender auf, einsortiert nach Datum. Steht in ChurchTools am selben Tag schon ein
Termin mit demselben Titel, wird der Eintrag ignoriert (keine Doppelungen).

## Was (noch) NICHT aus ChurchTools kommt

- **Hauskreise-Liste**: folgt mit dem API-User (Phase 1, siehe `churchtools-integration.md`).
- **Predigten**: kommen aus YouTube.
- **Team-Seite & Texte**: werden im Website-CMS gepflegt (`/admin/` — Foto nur mit Einverständnis!).

## Vorlauf

Die Website aktualisiert sich **1× täglich**. Ein heute eingetragener Termin ist spätestens morgen
früh online. Eilfall: das Website-Team kann jederzeit manuell neu veröffentlichen.
