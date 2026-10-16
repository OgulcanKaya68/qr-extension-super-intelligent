# Store-Veröffentlichung / Store publishing

Stand / Updated: 2026-10-16. **Vorbereitung, keine Veröffentlichung. / Preparation, not a published listing.**

## Aktueller Status

| Plattform | Status | Paket |
|---|---|---|
| Firefox Add-ons | Entwicklerkonto, Einreichung und Signierung ausstehend | Firefox-ZIP |
| Chrome Web Store | Entwicklerkonto und Einreichung ausstehend | Chromium-ZIP |
| Microsoft Edge Add-ons | Entwicklerkonto und Einreichung ausstehend | Chromium-ZIP |

Es gibt keine bestätigten Storelinks. Nach tatsächlicher Freigabe die echten Installationslinks in beide READMEs und die Anleitungen eintragen. Bis dahin führt der öffentliche Einstieg zum [GitHub-Projekt](https://github.com/OgulcanKaya68/qr-extension-super-intelligent).

## Bildmaterial / Store artwork

| Datei / File | Format | Verwendung / Use |
|---|---|---|
| [Deutscher Screenshot](store-assets/screenshot-de-1280x800.png) | 1280 × 800, PNG RGB ohne Alpha | Deutsche Storebeschreibung / German listing |
| [English screenshot](store-assets/screenshot-en-1280x800.png) | 1280 × 800, PNG RGB without alpha | Englische Storebeschreibung / English listing |
| [Kleine Promo / Small promo](store-assets/promo-440x280.png) | 440 × 280, PNG RGB ohne Alpha | Sprachneutrales eigenes Symbol mit Farbfeldern / Language-neutral icon and swatches |
| [Store-Icon / Store icon](store-assets/icon-128.png) | 128 × 128, PNG mit Transparenz | Eigenes 96-Pixel-Motiv mit 16 Pixeln transparentem Rand / Own 96-pixel artwork with 16-pixel transparent padding |
| [Quelldateien-Prüfsummen / Source checksums](store-assets/assets.json) | JSON | Zuordnung zu den verwendeten UI-Aufnahmen und dem Build-Icon / Traceability to UI captures and build icon |

Die Screenshots zeigen die tatsächliche DE/EN-Oberfläche mit generischen Beispieldaten, ergänzt um Beschreibungstext. Das Promo enthält keine Browsermarken oder Freigabesiegel. Die Bilddateien belegen keine Storefreigabe.

Nach UI- oder Iconänderungen zuerst die aktuellen Screenshots erzeugen und dann das Bildmaterial neu bauen:

```sh
npm ci
npm run build
npm run test:install
npm run test:browser
node scripts/store-assets.mjs
```

Das Skript verwendet vorhandenes Playwright/Chromium aus `.browser-cache`; ein anderer vorhandener Cache lässt sich über `PLAYWRIGHT_BROWSERS_PATH` einstellen. Es lädt keine externen Bildquellen oder Schriften. Vor Einreichung alle Bilder visuell prüfen, insbesondere Lesbarkeit bei halber Größe, aktuelle UI, exakten Produktnamen und generische Daten. Die Quellenprüfsummen in `assets.json` dokumentieren, ob das Material zu den aktuellen Eingabebildern gehört.

Chrome verlangt ein Icon, ein kleines Promo und mindestens einen Screenshot; vorgesehen sind hier 1280 × 800 Pixel für Screenshots sowie 440 × 280 für das Promo. Edge akzeptiert ebenfalls 1280 × 800 für Screenshots; dort sind Screenshot und kleines Promo optionale Ergänzungen zum erforderlichen Logo. Im konkreten Storeformular die aktuellen Anforderungen und Sprachzuordnungen nochmals kontrollieren. [Chrome: Bildvorgaben](https://developer.chrome.com/docs/webstore/images) · [Edge: Veröffentlichung und Bildformate](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension)

**English:** The supplied screenshots combine real localized UI captures using sample data with short feature descriptions. The neutral promo uses only the project's own icon and color swatches. No browser logos or approval claims are included. Run the commands above after updating UI captures or the icon. The renderer uses the existing `.browser-cache`, supports `PLAYWRIGHT_BROWSERS_PATH`, and loads no remote fonts or images. Review every final image, including at half size, and check the actual submission form before uploading. These files do not establish store approval.

## Konten und Kosten

- **Mozilla:** eigenes Mozilla-Konto mit AMO-Entwicklerzugang einrichten. Die Veröffentlichung und Signierung sind kostenlos. Für reguläre dauerhafte Firefox-Installation ist eine signierte Version erforderlich; öffentliches Hosting auf GitHub ersetzt dies nicht. [Einreichung](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/) · [Signierung](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/)
- **Chrome:** eigenes Google-Entwicklerkonto einrichten. Es fällt eine einmalige Registrierungsgebühr an. Maßgeblich sind Betrag und Bedingungen im tatsächlichen Registrierungsdialog; hier wird kein Betrag zugesagt. [Registrierung](https://developer.chrome.com/docs/webstore/register)
- **Edge:** privates Microsoft-Konto und individuelles Partner-Center-Konto verwenden, kein Uni-/Arbeitskonto. Die Registrierung für Edge-Erweiterungen ist kostenlos. Den öffentlichen Publisher-Anzeigenamen bewusst wählen. [Registrierung](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/create-dev-account)

Der Nutzer legt die Konten selbst an und bestätigt Gebühren und Vereinbarungen selbst. Zugangsdaten, Identitätsdokumente, private Anschrift und Zahlungsangaben gehören nicht in dieses Repository.

## Identität, Recht und Datenschutz

- Trader-/Non-Trader-Status im jeweiligen Store anhand der tatsächlichen Tätigkeit wahrheitsgemäß erklären. Kostenloser Vertrieb oder Open Source begründen nicht automatisch einen Non-Trader-Status. Falls später kostenpflichtige Funktionen kommen, Einordnung erneut prüfen. [Chrome: Status und Verifizierung](https://developer.chrome.com/docs/webstore/program-policies/trader-disclosure)
- Stores können rechtlichen Namen, Anschrift, Telefonnummer oder andere Nachweise verlangen und Pflichtangaben öffentlich anzeigen. Vor Absenden die konkreten Dialoge prüfen; erforderliche Angaben dort übermitteln, keine Ersatzdaten erfinden.
- Für Veröffentlichungen mit Bezug zu Österreich einschlägige Informations- und Offenlegungspflichten anhand des tatsächlichen Auftritts klären. Ein GitHub-Repository ist keine pauschale Befreiung. Es ist keine zusätzliche Landingpage vorgesehen. Diese Checkliste dokumentiert keine abgeschlossene individuelle Rechtsprüfung. [WKO: Website-Impressum](https://www.wko.at/internetrecht/website-impressum) · [USP: Informationspflichten](https://www.usp.gv.at/themen/betrieb-und-umwelt/laufender-betrieb/weitere-informationen-laufender-betrieb/e-commerce-kompetenz/anleitungen-um-das-geschaeft-online-zu-bringen/rechtliche-pflichten-fuer-websites.html)
- Die Datenschutzerklärung verlinken und Storefragen anhand des tatsächlichen Builds beantworten: lokale Verarbeitung, keine Übertragung durch das Produkt, URL-Verarbeitung, lokale Vorlagen, temporäre sichtbare Tabaufnahme für optionale Logoerkennung. Keine pauschale Behauptung „verarbeitet keine Daten“.
- MIT für eigenen Code, MIT-Hinweis von `qrcode-generator` und Apache-2.0-Hinweise von `jsQR` erhalten. Fremde Logos und Markenrechte sind davon unabhängig.

## Einreichung vorbereiten

- Finalen Namen **QR Extension Super Intelligent**, Version, öffentliche Herausgeberkennung und minimale Berechtigungen abgleichen.
- `activeTab`, `storage`, `scripting`, `clipboardWrite` einzeln begründen. Letzteres schreibt nur nach Klick ein PNG-Bild; keine Lese- oder Überwachungsfunktion für die Zwischenablage. Keine dauerhafte Berechtigung für alle Webseiten; keine passiven Content-Skripte, keine externen Produktdienste.
- Build, Unit-/Browserprüfungen und Firefox-Linter ausführen; Ergebnisse und Browsergrenzen im Prüfbericht festhalten. ZIP-Inhalte, sensible Daten und Drittanbieterlizenzen erneut kontrollieren.
- Quellenpaket mit Lockfile, Buildbefehlen und benötigter Node-Version für reproduzierbaren Review bereithalten. Keine Abhängigkeiten, Caches, Testprofile oder privaten Unterlagen hochladen.
- Screenshots nur mit generischer Beispielseite und eigenen Demo-Grafiken erstellen. DE/EN-Texte, Datenschutzlink, Supportlink und Storebilder vorbereiten.
- Reviewer-Hinweis: kein Login; Seitenfarben und Logoerkennung durch Nutzeraktion; gesamte Tabaufnahme nur temporär im Arbeitsspeicher, Logoausschnitt lokal; Logo-Exporte und PNG-Kopien mit lokaler Decodierprüfung. Letzte Gestaltung inklusive Logo wird außerhalb privater Tabs lokal behalten; keine dauerhaften Schreibzugriffe aus privaten Tabs. Uploads PNG/JPEG/WebP bis 4 MiB und 4096 Pixel, Normalisierung auf PNG bis 256 Pixel/64 KiB, keine SVG-Uploads.
- Nach Freigabe die Installation des signierten Storepakets, Exporte und Vorlagen erneut prüfen. Links und Versionsstand aktualisieren; bei Fehlern die letzte geprüfte Version als Rückfall bereithalten.
- Sicherheitsmeldungen auf GitHub aktivieren und Hinweise auf neue Meldungen einschalten. [GitHub: private Meldungen](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository)

## Beschreibungsvorlagen

**Deutsch, Kurztext:** QR-Codes mit Seitenfarben, Logo und Projektvorlagen. Ohne Konto. PNG/SVG und Bildkopie.

**Deutsch, Langtext:** QR Extension Super Intelligent erstellt QR-Codes für Webseiten und Unterseiten direkt im Browser. Übernimm die aktuelle Adresse, wähle Seitenfarben oder eigene Farben und passe Punktform und Exportgröße an. Auf Wunsch lässt sich ein sichtbares Seitenkopf-Logo lokal übernehmen oder ein eigenes Bild hochladen. Speichere Gestaltungen einschließlich Logo als Projektvorlagen und exportiere PNG oder SVG oder kopiere das QR-Bild zum Einfügen. Die Verarbeitung erfolgt lokal, ohne Backend und Telemetrie. Seitenfarben basieren auf CSS; Logoerkennung ist nicht auf jeder Seite verfügbar. Enthaltene Logos vor Nutzung auf Rechte und Exporte vor Druck mit einer Kamera prüfen. Der Name bezeichnet keine KI-Funktion.

**English, short:** QR codes with page colors, logos, and project presets. No account. PNG/SVG and image copying.

**English, full:** QR Extension Super Intelligent creates QR codes for websites and individual pages in your browser. Use the current URL, choose suggested page colors or your own colors, and adjust dot style and export size. Optionally capture a visible header logo locally or upload your own image. Save designs including logos as project presets, export PNG or SVG, or copy the QR image to paste it elsewhere. Processing is local, without a backend or telemetry. Color suggestions use CSS; logo detection is not available on every page. Check logo usage rights and scan exports before printing. The name does not indicate an AI feature.

## English publishing checklist

- All three store submissions and developer accounts remain pending. No store install URL is confirmed. Add real links only after approval.
- Mozilla requires a Mozilla account and signing for permanent installation in regular Firefox. Publishing and signing are free. Chrome registration has a one-time fee; check the actual payment dialog. Edge extension registration is free and uses a personal Microsoft account plus an individual Partner Center account. The publisher display name is public. Official links are provided above.
- The owner creates accounts and accepts charges and agreements. Never commit credentials, identity documents, private addresses, or payment information.
- Declare trader status accurately. Free or open-source distribution does not automatically determine non-trader status. Review any required identity disclosures in the actual store interface. Do not assume hosting on GitHub removes Austrian disclosure obligations.
- Match privacy answers to the final build: no product transmission, local URL processing and presets, user-triggered page analysis, and temporary in-memory visible-tab capture for optional logo extraction. The last design including its logo is kept locally outside private tabs; private tabs never persist settings or logos. PNG clipboard writing is user-triggered with no clipboard reading or monitoring. Validate and normalize uploads according to the documented limits.
- Preserve MIT and Apache-2.0 notices. Third-party logo rights remain separate.
- Run release checks, review the package contents, provide reproducible source/build instructions, and use generic demo screenshots. Publish only actual verification results.
- Following approval, test store installation and exports, add verified store links, and keep a known working release available. Enable private vulnerability reporting on GitHub.
