# Tools

Beide Skripte laufen mit Node ≥ 20; Abhängigkeiten einmalig im Ordner installieren:
`npm install kiwi-schema puppeteer-core`

- **parse-fig.js** — dekodiert die entpackte `.fig`-Datei (ZIP → `canvas.fig`, fig-kiwi-Format)
  zu `fig-outline.txt` (lesbarer Node-Baum mit Farben/Typo/Auto-Layout), `fig-raw.json` und
  `fig-text.json`. Erwartet die entpackte Datei unter `./figfile/`. Bei Design-Updates:
  `unzip "…​.fig" -d figfile && node parse-fig.js`.
- **screenshot.js** — CDP-Screenshots über die System-Chrome-Installation mit exakten
  Viewport-Breiten (Achtung: `chrome --headless --screenshot` erzwingt min. 500px Fensterbreite,
  deshalb puppeteer-core). Aufruf: `node screenshot.js '[{"url":"…","w":390,"h":844,"out":"m390.png"}]'`
