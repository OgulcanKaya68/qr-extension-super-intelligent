# Ankündigungen / Announcement drafts

Diese Vorlagen postet der Projektinhaber selbst. Vor dem Posten den aktuellen Release- und Storestatus kontrollieren. Es werden keine Nachrichten automatisch an fremde Konten oder Communitys gesendet.

The project owner posts these drafts manually. Check the actual release and store status first. No messages are sent automatically to other accounts or communities.

## Deutsch: kurzer Post

Ich habe **QR Extension Super Intelligent** entwickelt: eine kostenlose Browser-Erweiterung für QR-Codes mit Seitenfarben, optionalem Logo und gespeicherten Projektvorlagen. Ohne Konto, lokal verarbeitet, mit PNG-/SVG-Export, QR-Bildkopie und offenem Quellcode unter MIT.

Der Quellcode und die Installationsanleitung sind auf GitHub. Die Veröffentlichungen für Firefox, Chrome und Edge sind noch in Vorbereitung; aktuell erfolgt die Installation als Entwicklungsversion. Ich freue mich über Feedback zur Bedienung und zur Logoerkennung.

Projekt: https://github.com/OgulcanKaya68/qr-extension-super-intelligent

## Deutsch: ausführlicher Projektpost

Für Webseiten und Unterseiten brauchte ich QR-Codes, deren Gestaltung ich pro Projekt wiederverwenden kann. Daraus ist **QR Extension Super Intelligent** entstanden.

- Aktuelle Adresse übernehmen.
- Bis zu vier kontrastgeprüfte CSS-Seitenfarben als anklickbare Vorschläge, Schwarz immer zusätzlich.
- Codefarbe, Punktform und Ausgabegröße anpassen; der QR-Hintergrund bleibt weiß.
- Optional ein sichtbares Seitenkopf-Logo lokal übernehmen oder ein eigenes Bild hochladen.
- Gestaltungen mit Logo als Projektvorlagen speichern.
- PNG und SVG herunterladen.
- Das QR-Bild direkt kopieren und in unterstützten Apps einfügen.

Die Erweiterung benötigt kein Nutzerkonto. QR-Erstellung und Prüfungen laufen lokal, ohne Backend oder Telemetrie. Seitenfarben stammen aus CSS; Logoerkennung klappt nicht auf jeder Seite. Den Export sollte man vor Druck und Veröffentlichung selbst scannen.

Der Quellcode steht unter MIT, Oberfläche und Anleitung gibt es auf Deutsch und Englisch. Der Name ist der Produktname; es ist kein KI-Dienst eingebaut.

Firefox, Chrome und Edge sind als Storeziele vorgesehen; die Storefreigaben stehen noch aus. Auf GitHub findest du den aktuellen Stand und die Schritte zum Laden als Entwicklungsversion:

https://github.com/OgulcanKaya68/qr-extension-super-intelligent

Was würde dir bei QR-Codes für deine eigenen Webprojekte noch helfen?

## English: short post

I built **QR Extension Super Intelligent**, a free browser extension for QR codes with page colors, optional logos, and saved project presets. No user account, local processing, PNG/SVG export, QR image copying, and MIT-licensed source code.

Source and installation instructions are on GitHub. Firefox, Chrome, and Edge store releases are still being prepared; installation currently uses a development version. Feedback on the workflow and logo detection is welcome.

Project: https://github.com/OgulcanKaya68/qr-extension-super-intelligent

## English: longer project post

I wanted reusable QR designs for websites and their individual pages, so I built **QR Extension Super Intelligent**.

- Use the current URL.
- Pick from up to four contrast-checked CSS page-color swatches, with black always available.
- Adjust the code color, dot style, and output size; the QR background stays white.
- Optionally capture a visible header logo locally or upload your own image.
- Save designs, including logos, as project presets.
- Download PNG and SVG.
- Copy the QR image directly and paste into supported apps.

No user account is needed. Generation and checks run locally, without a backend or telemetry. Color suggestions come from CSS, and logo detection cannot work on every page. Scan exports yourself before printing or publishing.

The source is MIT licensed, with German and English UI and documentation. The name is a product name; there is no AI service built in.

Firefox, Chrome, and Edge store releases are planned and still pending. The current status and development-installation instructions are on GitHub:

https://github.com/OgulcanKaya68/qr-extension-super-intelligent

What would make QR codes more useful for your own web projects?

## Release-Vorlage 0.3.0 / Release draft 0.3.0

### Deutsch

**QR Extension Super Intelligent 0.3.0** ergänzt einen stets weißen QR-Hintergrund und beschränkt die Codefarben auf geprüfte Farbfelder mit mindestens 7:1 Kontrast; Schwarz bleibt immer dabei. Das kompaktere Popup zeigt die Hauptbedienung ohne Scrollen. Logo und Projektvorlagen lassen sich einklappen.

**Installation:** Die angehängten Firefox- und Chromium-ZIPs sind unsignierte Entwicklungspakete. Firefox nur temporär laden; Chrome und Edge entpackt laden. Keine Storefreigabe behauptet. Details in der [Anleitung](../ANLEITUNG.md), ausgeführte Prüfungen im [Prüfbericht](PRUEFUNG.md), Grenzen und Änderungen im [Changelog](../CHANGELOG.md).

**Bekannte Grenzen:** CSS-Farben entsprechen nicht zwingend dominanten Bildfarben. Logoerkennung braucht einen sichtbaren geeigneten Seitenkopf. Geschützte Seiten können die Analyse verhindern. Lesbarkeit vor Druck selbst testen; fremde Logo- und Markenrechte beachten.

### English

**QR Extension Super Intelligent 0.3.0** adds a fixed white QR background and limits code colors to verified swatches with at least 7:1 contrast; black is always available. The compact popup fits its main controls without scrolling. Logo and project preset sections are collapsible.

**Installation:** Attached Firefox and Chromium ZIPs are unsigned development packages. Load Firefox temporarily; load Chrome and Edge unpacked. Store approval is not claimed. See the [installation guide](INSTALLATION.en.md), [actual test report](PRUEFUNG.md), and [changelog](../CHANGELOG.md).

**Known limits:** CSS suggestions may differ from dominant image colors. Logo detection needs a suitable visible header. Protected pages may block analysis. Scan before printing and respect third-party logo and trademark rights.
