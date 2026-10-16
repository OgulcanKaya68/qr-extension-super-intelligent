# Prüfstand / Test status

Version 0.3.0 · 16-10-2026

## Ausgeführte Prüfungen

- `npm test`: 31 bestandene Unit-Tests, einschließlich der festen weißen QR-Fläche und der 7:1-Kontrastgrenze für Codefarben.
- `npm run build`: Firefox- und Chromium-Pakete erfolgreich erstellt.
- `npm run lint:firefox`: keine Fehler, Warnungen oder Hinweise.
- `npm run check:public`: 52 öffentliche Dateien geprüft; keine privaten Pfade oder üblichen Schlüssel-/Tokenmuster, Berechtigungen geprüft.
- `npm audit --audit-level=high`: keine bekannten Schwachstellen zum Prüfzeitpunkt.
- `npm run test:browser`: 53 bestandene Prüfpunkte mit Chromium 156.0.8078.4, keine unbehandelten JavaScript-Fehler. Das kompakte Popup blieb bei 470 × 600 Pixeln ohne Scrollen. Sichere Farbfelder, weißer PNG-/SVG-Hintergrund, Exporte, Logos, Vorlagen, Datenschutzgrenzen, Offlinebetrieb, Zwischenablage, axe und installierte Chromium-Erweiterung geprüft.
- Unabhängige Decodierung: erzeugte PNG- und SVG-Dateien enthalten die erwartete vollständige URL. Der weiße Hintergrund wurde zusätzlich pixelbasiert geprüft.
- `node scripts/store-assets.mjs`: DE-/EN-Storegrafiken und Promo erstellt; nur illustrative dunkle QR-Farben mit ausreichendem Kontrast sowie Schwarz.
- `npm run package`: Firefox- und Chromium-ZIP für 0.3.0 erstellt. Die Firefox-ZIP wurde mit addons-linter geprüft.

Die Browserautomatisierung dieser Version lief in Chromium. Eine native Firefox-Prüfung dieser Version wurde noch nicht ausgeführt; frühere native Prüfergebnisse zu 0.2.0 gelten nicht als Nachweis für 0.3.0. Die Playwright-Firefox-Engine konnte in dieser Umgebung kein Testprofil starten. Storeprüfung, Signierung und Freigabe sind bis zur tatsächlichen AMO-Entscheidung ausstehend.

## Selbst prüfen

```sh
npm ci
npm test
npm run build
npm run test:install
npm run test:browser
npm run lint:firefox
npm run check:public
npm audit --audit-level=high
node scripts/store-assets.mjs
npm run package
```

Store- und Browser-Artefakte werden nicht als Testergebnis ausgegeben. `test-results`, Browserprofile und lokale Prüfdaten gehören nicht in Git.

## Bekannte Grenzen

- Die Storeversion muss von Mozilla signiert und freigegeben werden, bevor reguläre Firefox-Installation verfügbar ist.
- Chrome, Edge und ältere Browser wurden nicht für diese Version separat installiert geprüft.
- Ein erfolgreicher Decoderlauf garantiert keinen Scan bei jeder Druckgröße, Kamera oder Beleuchtung. Fertige Exporte vor Veröffentlichung mit dem Zielgerät prüfen.
- Automatische Logoerkennung ist auf sichtbare, geeignete Elemente begrenzt. Geschützte Browserseiten, verdeckte Logos und komplexe CSS-Konstruktionen können ohne Treffer bleiben.

## English

Version 0.3.0 passed 31 unit tests, a Firefox package lint with no findings, a public-content scan, a dependency audit with no known vulnerabilities, and 53 browser checks in Chromium 156.0.8078.4. The compact popup fit 470 × 600 pixels without scrolling. Tests covered safe foreground colors, a white PNG/SVG background, independent QR decoding, logos, presets, offline behavior, clipboard writing, accessibility checks, privacy boundaries, and an installed Chromium extension. Store images and unsigned Firefox/Chromium packages were generated; the Firefox package passed addons-linter.

Native Firefox has not yet been tested for version 0.3.0; earlier 0.2.0 results do not establish this version. Playwright Firefox could not start its test profile in this environment. Mozilla signing and review remain pending until the actual AMO decision. Chrome, Edge, older browsers, and physical scanning conditions are not covered by these results.
