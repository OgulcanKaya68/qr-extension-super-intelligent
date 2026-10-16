# Mitwirken / Contributing

## Deutsch

- Fehler und kleine Verbesserungsvorschläge als [Issue](https://github.com/OgulcanKaya68/qr-extension-super-intelligent/issues) melden. Für größere Änderungen zuerst Umfang und Bedienung im Issue abstimmen.
- Nur Beispieldaten verwenden, etwa `https://example.com/projekt/kontakt`. Keine echten vertraulichen URLs, personenbezogenen Screenshots, Schlüssel, Testprofile oder privaten Dateipfade hochladen.
- Sicherheitslücken gemäß [SECURITY.md](SECURITY.md) vertraulich melden.
- Quellcode, Texte und Grafiken nur beitragen, wenn du die nötigen Rechte hast. Projektbeiträge stehen unter [MIT](LICENSE); vorhandene Drittanbieterhinweise bleiben erhalten.
- Deutsche und englische Oberfläche sowie Dokumentation zusammen aktualisieren. Berechtigungen, lokale Verarbeitung und fehlende URL-Historie müssen erhalten bleiben. Bei Datenänderungen beide Datenschutzhinweise aktualisieren.
- Keine externen Dienste, nachgeladenen Skripte, Telemetrie oder Installation von Abhängigkeiten zur Laufzeit einführen. Keine Zieladressen speichern oder protokollieren.
- Keine dauerhaften Schreibzugriffe aus privaten Tabs. Zwischenablage nur nach Nutzeraktion beschreiben, nie lesen oder überwachen. Uploadgrenzen und PNG-Normalisierung beibehalten.
- Änderungen mit passenden Tests prüfen. Prüfungen nicht abschwächen, um eine fehlerhafte Änderung durchzubringen. Keine grünen Testergebnisse behaupten, die nicht ausgeführt wurden.

```sh
npm ci
npm test
npm run build
npm run test:install
npm run test:browser
npm run lint:firefox
```

Ein Pull Request beschreibt Problem, Änderung, tatsächlich ausgeführte Prüfungen und bekannte Grenzen. Bei UI-Änderungen Screenshots mit generischen Beispieldaten ergänzen. Bei Logos Lesbarkeit, Entfernen, Upload, Speichern und fehlerhafte Eingaben prüfen; bei Seitenanalyse geschützte Seiten und fehlende Kandidaten berücksichtigen. Commit-Nachrichten: `typ: kurze Beschreibung`.

## English

- Report bugs and small improvements through [issues](https://github.com/OgulcanKaya68/qr-extension-super-intelligent/issues). Discuss scope and behavior before starting a major change.
- Use sample data such as `https://example.com/project/contact`. Never upload confidential URLs, personal screenshots, keys, browser profiles, or private file paths.
- Report vulnerabilities privately following [SECURITY.md](SECURITY.md).
- Contribute only code, text, and graphics you have the rights to share. Contributions use the project's [MIT license](LICENSE); preserve third-party notices.
- Update German and English UI and documentation together. Preserve minimal permissions, local processing, and the absence of URL history. Update both privacy notices whenever processing changes.
- Do not introduce external services, remotely loaded scripts, telemetry, or runtime dependency downloads. Do not store or log destination URLs.
- Do not persist data from private tabs. Write to the clipboard only on user action; never read or monitor it. Preserve upload limits and PNG normalization.
- Run the commands above and appropriate additional checks. Do not weaken tests or claim results without running them.

Describe the problem, change, checks actually run, and known limitations in your pull request. Use generic screenshots for UI changes. For logos, test readability, removal, uploads, storage, and malformed input. For page analysis, cover restricted pages and missing candidates. Keep commit messages in the project's `type: short description` format.
