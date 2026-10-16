# Installation und Bedienung

[English](docs/INSTALLATION.en.md) · [Zurück zum Projekt](README.md)

## Installationsstatus

Die Store-Veröffentlichungen für Firefox, Chrome und Edge sind noch ausstehend. Für Nutzer ist kein Erweiterungskonto nötig. Die folgenden Schritte laden eine Entwicklungsversion; sie ersetzen keine Storefreigabe.

Öffne [GitHub-Releases](https://github.com/OgulcanKaya68/qr-extension-super-intelligent/releases). Wenn ein freigegebenes Paket angeboten wird, lade das zu deinem Browser passende ZIP herunter und entpacke es. Für 0.3.0 heißen die vorgesehenen Dateien `qr-extension-super-intelligent-firefox-0.3.0-unsigniert.zip` und `qr-extension-super-intelligent-chromium-0.3.0-unsigniert.zip`; Chrome und Edge verwenden das Chromium-Paket. Das ZIP muss `manifest.json` enthalten. **Source code (zip)** ist der Quellcode und benötigt zuerst den Build unten. Wenn noch kein Paket bereitsteht, baue aus dem Quellcode.

## Firefox

1. Aktuelles Firefox Desktop öffnen und `about:debugging#/runtime/this-firefox` aufrufen.
2. **Temporäres Add-on laden…** wählen.
3. `manifest.json` aus dem entpackten Firefox-Paket auswählen; beim eigenen Build liegt die Datei in `build/firefox`.
4. **QR Extension Super Intelligent** über das Erweiterungsmenü an die Symbolleiste anheften.
5. Eine normale Webseite öffnen und auf das Symbol klicken.

Nach einem Firefox-Neustart musst du ein temporäres Add-on erneut laden. Für eine reguläre dauerhafte Installation ist eine von Mozilla signierte Version erforderlich. Signierte Storelinks werden nach Freigabe im README ergänzt. [Mozilla: temporäre Installation](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/) · [Signierung](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/)

## Chrome und Edge

1. `chrome://extensions` beziehungsweise `edge://extensions` öffnen.
2. **Entwicklermodus** aktivieren.
3. **Entpackte Erweiterung laden** wählen.
4. Den entpackten Chromium-Ordner mit `manifest.json` auswählen; beim eigenen Build `build/chromium`.
5. Das Symbol anheften und auf einer normalen Webseite öffnen. Den entpackten Ordner behalten, solange die Erweiterung geladen bleibt.

Ein Chromium-Build wird für Chrome und Edge verwendet. Den tatsächlich geprüften Stand nennt der [Prüfbericht](docs/PRUEFUNG.md). [Chrome: entpackt laden](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)

## Einen QR-Code gestalten

1. Das Popup übernimmt die vollständige aktuelle Adresse. Prüfe sie oder bearbeite sie direkt.
2. **Seitenfarben aktualisieren** anklicken. Bis zu vier häufige CSS-Farben mit mindestens 7:1 Kontrast zu Weiß erscheinen als anklickbare Farbfelder; Schwarz ist immer dabei. Farben ohne ausreichenden Kontrast werden nicht angeboten.
3. Wähle ein Farbfeld, Punktform und Ausgabegröße. Der QR-Hintergrund bleibt immer weiß; eine Hintergrund- oder freie Farbauswahl gibt es nicht.
4. Optional: **Seitenlogo übernehmen** anklicken. Die Erkennung eines sichtbaren Logokandidaten aus dem Seitenkopf startet erst durch deinen Klick. Prüfe den Ausschnitt in der Vorschau.
5. Wird kein geeignetes Logo erkannt, verwende **Eigenes Bild hochladen** mit PNG, JPEG oder WebP bis 4 MiB, höchstens 4096 Pixel pro Seite und 16 Millionen Pixel insgesamt. Das Bild wird lokal auf höchstens 256 Pixel normalisiert und als begrenztes PNG verarbeitet. SVG-Uploads sind nicht möglich. Mit **Logo entfernen** löschst du es aus der aktuellen Gestaltung.
6. Als PNG oder SVG herunterladen oder mit der Kopierfunktion als PNG-Bild in die Zwischenablage schreiben. Anschließend in einer App einfügen, die eingefügte Bilder unterstützt. Bei einem Logo wird der QR-Code mit hoher Fehlerkorrektur erstellt und vor Export beziehungsweise Kopieren unabhängig lokal decodiert; unlesbare Varianten werden blockiert.
7. Die Datei mit einer Handy-Kamera scannen und das Ziel kontrollieren, bevor du sie teilst oder druckst.

QR-Codes enthalten die gesamte Adresse einschließlich Parametern und Sprungmarke. Diese Angaben kann jeder Empfänger auslesen. Lokale Entwicklungsadressen wie `localhost` verweisen auf einem Handy auf das Handy selbst. QR-Codes bieten keine nachträgliche Zieländerung: Ändert sich die Adresse, brauchst du einen neuen Code oder eine selbst verwaltete Weiterleitung.

## Projektvorlagen

- Sichere Codefarbe, Punktform, Größe und optionales Logo einstellen und ausdrücklich als neue Projektvorlage speichern. Der QR-Hintergrund bleibt weiß.
- Auf einer anderen Unterseite dieselbe Vorlage auswählen; die aktuelle Zieladresse bleibt erhalten.
- Vorlagen aktualisieren oder löschen. Das Entfernen eines Logos aus der aktuellen Gestaltung ändert eine bereits gespeicherte Vorlage erst beim Aktualisieren.
- Bis zu 100 Vorlagen speichern. Logos werden für lokale Vorlagen als PNG begrenzt; falls ein Logo zu groß ist, verwende eine kleinere Datei. Speicherfehler werden angezeigt.
- Vorlagen liegen im jeweiligen Browserprofil. Es gibt keine Synchronisierung zwischen Browsern und keine Cloud-Sicherung.
- Die letzte Gestaltung einschließlich Logo wird außerhalb privater Tabs ebenfalls lokal behalten. In privaten Tabs schreibt die Erweiterung keine Einstellungen oder Logos dauerhaft; das Speichern von Vorlagen steht dort nicht zur Verfügung.

## Bild kopieren

- Die Kopieraktion schreibt nur das aktuelle QR-Bild als PNG in die Zwischenablage. Sie liest deren bisherigen Inhalt nicht und überwacht sie nicht.
- Das ersetzt den bisherigen Zwischenablageninhalt. Der Browser kann eine Berechtigungs- oder Sicherheitsabfrage anzeigen.
- Wenn die Ziel-App keine Bilder aus der Zwischenablage annimmt oder das Kopieren fehlschlägt, PNG herunterladen und dort als Bilddatei einfügen.
- Auch das kopierte Bild enthält die vollständige Zieladresse und gegebenenfalls das Logo. Andere Programme mit Zwischenablagenzugriff können den eingefügten Inhalt verarbeiten; die Erweiterung kontrolliert deren Verhalten nicht.

## Wenn etwas nicht funktioniert

- **Seitenfarben oder Logo fehlen:** Browserseiten und manche geschützten Seiten erlauben keine Analyse. Farben mit weniger als 7:1 Kontrast zu Weiß werden ausgefiltert. Logos in Canvas, verdeckte Logos oder Logos außerhalb des sichtbaren Seitenkopfs können fehlen. Schwarz bleibt als Codefarbe verfügbar; alternativ lade ein Logo hoch.
- **Logo-Ausschnitt stimmt nicht:** Logo entfernen oder eine eigene Datei nutzen. Den gewünschten Seitenkopf zunächst sichtbar machen, danach erneut auslösen.
- **Export blockiert:** Logo verkleinern oder entfernen und eine kürzere Zieladresse probieren. Die angebotenen Farben erfüllen bereits den Kontrastgrenzwert; der Hintergrund ist weiß.
- **Vorlage wird nicht gespeichert:** Nicht benötigte Vorlagen löschen oder ein kleineres Logo verwenden; bei einer Fehlermeldung ist die Speicherung nicht als erfolgreich anzusehen.
- **Nach Codeänderungen alter Stand:** Erweiterung auf ihrer Verwaltungsseite neu laden und das Popup erneut öffnen.

Nutze nur Logos, für deren Verwendung du die nötigen Rechte hast. Die Erkennung einer Grafik erteilt keine Nutzungserlaubnis.

## Aus dem Quellcode bauen

Repository herunterladen oder klonen und ein Terminal im Projektordner öffnen. Node.js mit npm verwenden; die unterstützte Version ist im Projekt festgelegt.

```sh
npm ci
npm test
npm run build
npm run test:install
npm run test:browser
npm run lint:firefox
npm run package
```

Abhängigkeiten und Testbrowser werden dabei aus dem Internet geladen. Die QR-Erstellung selbst läuft lokal. Buildausgaben liegen in `build/firefox` und `build/chromium`, unsignierte ZIP-Pakete in `releases`. Der tatsächliche Prüfstand steht im [Prüfbericht](docs/PRUEFUNG.md).
