# Prüfstand / Test status

Version 0.2.0 · 16-10-2026

## Ausgeführte Prüfungen

- `npm test`: 30 bestandene Unit-Tests für Adressen, Gestaltung, PNG-Grenzen und Seitenanalyse.
- `npm run build`: Firefox- und Chromium-Paket erfolgreich erstellt.
- `npm run lint:firefox`: keine Fehler, Warnungen oder Hinweise.
- `npm run test:browser`: 50 bestandene Prüfpunkte mit Chromium 156.0.8078.4, keine unbehandelten JavaScript-Fehler. PNG und gerastertes SVG aller angebotenen Formen sowie lange Unicode-Adressen unabhängig decodiert. Auch Logoexporte, Privatmodus, Speicherfehler, verzögerte Schreibzugriffe, Uploads und schnelle Sprachwechsel geprüft. axe meldet keine ernsten oder kritischen Befunde.
- Echte entpackte Chromium-Erweiterung: Installation, CSP, PNG-/SVG-Downloads, persistente Vorlage nach Wiederöffnung, Offlineexport und tatsächliches PNG-Schreiben über `navigator.clipboard.write` bestanden. Keine produktseitigen HTTP-Anfragen. Keine Zwischenablageinhalte gelesen.
- Kontrollierte API-Mocks prüfen Seitenfarben, Tabwechsel während einer Aufnahme und Fehler-/Wettlaufsituationen. Die Seitenanalyse wurde zusätzlich auf echtem Chromium-DOM mit berechneten CSS-Farben einschließlich `oklch` geprüft.
- `npm audit --audit-level=high`: keine gemeldeten Schwachstellen zum Prüfzeitpunkt. Neue Meldungen können später hinzukommen.
- Echte temporäre Installation in Firefox 158.0 auf macOS: Erweiterungssymbol, vollständige Tabadresse mit Parametern und Sprungmarke, vier CSS-Farben plus Schwarz, Logoübernahme aus lokaler sichtbarer Tabaufnahme, PNG-/SVG-Downloads und PNG-Bildkopie erfolgreich.
- Beide nativen Firefox-Downloads unabhängig mit jsQR decodiert: exakte ursprüngliche Zieladresse einschließlich Parametern und Sprungmarke.
- Der native Kopiertest bestätigt nach dem Klick das PNG-Format in der Zwischenablage. Er liest keine vorherigen Zwischenablageinhalte.

Simulierte Browser-APIs ersetzen keine echte Installation. Die beiden echten Installationsprüfungen sind oben gesondert ausgewiesen. Der Chromium-Test öffnet die Erweiterungsseite direkt; die tatsächliche Symbolinteraktion und sichtbare Seitenaufnahme wurden nativ in Firefox geprüft.

## Selbst prüfen

```sh
npm ci
npm test
npm run build
npm run test:install
npm run test:browser
npm run lint:firefox
npm run check:public
npm run package
```

Der optionale native Firefox-Test benötigt Python 3, Firefox und geckodriver. Er nutzt ein eigenes temporäres Profil, lokale Beispieldaten und einen eigenen Downloadordner. Auf macOS wird Firefox über LaunchServices gestartet. Er ersetzt den aktuellen Zwischenablageinhalt durch einen eigenen Demo-QR-Code:

```sh
python3 tests/native-firefox.py --driver /pfad/zu/geckodriver
```

Prüfergebnisse und Profile gehören nicht in Git. `test-results` ist ausgeschlossen. Beim unabhängigen Exporttest wird ein vorhandener Playwright-Chromium benötigt:

```sh
node tests/native-exports.mjs DOWNLOADORDNER ERWARTETE_URL
```

## Bekannte Grenzen

- Storeinstallation, Signierung und Storeprüfung stehen auf allen drei Plattformen aus.
- Microsoft Edge wurde bisher nicht separat installiert geprüft. Ein gemeinsamer Chromium-Build allein bestätigt keine vollständige Edge-Kompatibilität.
- Die Ergebnisse gelten für die genannten Umgebungen; andere Betriebssysteme und ältere Browser wurden nicht flächendeckend geprüft.
- Ein erfolgreicher Decoderlauf garantiert keinen Scan bei jeder Druckgröße, Kamera oder Beleuchtung. Fertige Exporte vor Veröffentlichung mit dem Zielgerät prüfen.
- Automatische Logoerkennung ist auf sichtbare, geeignete Elemente begrenzt. Geschützte Browserseiten, verdeckte Logos und komplexe CSS-Konstruktionen können ohne Treffer bleiben. Ein eigener Upload ist möglich.

## English

The checks above apply to version 0.2.0 on the stated date. All 30 unit tests and 50 browser checks passed, with no unhandled JavaScript errors. Both builds, the strict Firefox package linter, and the dependency audit passed. The real unpacked Chromium 156.0.8078.4 extension passed CSP, PNG/SVG decoding, preset persistence, offline export, and actual PNG clipboard writing. The Chromium test opens the extension page directly. A real temporary Firefox 158.0 installation additionally verified action-button interaction, the current full URL, four CSS colors plus black, local logo capture, actual PNG/SVG downloads, and PNG clipboard writing. The two downloaded files decoded to the exact original URL independently. API mocks separately cover tab/capture races and error paths; they are not described as real browser interactions.

Native tests use an isolated profile and synthetic local content; the clipboard test replaces clipboard content with its own demo QR. It never reads previous contents. Store review and signing remain pending for all three stores. Edge has not been independently verified. Decoder success is not a guarantee for every physical scan; test final exports with the intended device and size.
