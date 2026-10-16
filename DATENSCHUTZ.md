# Datenschutz: QR Extension Super Intelligent

Stand: 16-10-2026 · Version 0.2.0 · [English](docs/PRIVACY.en.md)

Diese Beschreibung betrifft die Erweiterung. GitHub, Browserhersteller und spätere Erweiterungsstores verarbeiten Daten nach ihren eigenen Bestimmungen.

## Was lokal verarbeitet wird

- Beim Öffnen über das Erweiterungssymbol wird die vollständige Adresse des aktuellen Tabs für die QR-Vorschau übernommen. Alternativ kannst du eine Adresse selbst eingeben.
- Auf Anforderung liest die Seitenanalyse ausgewählte CSS-Farben und Eigenschaften sichtbarer Logokandidaten aus. Sie läuft nicht passiv im Hintergrund und erstellt keinen Browserverlauf.
- Bei der optionalen Logoübernahme wird nach deinem Klick der sichtbare Tab vorübergehend als Bild im Arbeitsspeicher aufgenommen. Daraus wird der erkannte Logobereich ausgeschnitten. Die vollständige Aufnahme wird weder als Datei noch in Vorlagen gespeichert und nicht übertragen. Auch andere sichtbare Seiteninhalte können vorübergehend Teil dieser Aufnahme sein.
- Bei einem Upload wird deine gewählte PNG-, JPEG- oder WebP-Datei lokal verarbeitet und für die Gestaltung in eine begrenzte PNG-Grafik mit höchstens 256 Pixeln umgewandelt. Eingaben sind auf 4 MiB, höchstens 4096 Pixel pro Seite und insgesamt 16 Millionen Pixel begrenzt; SVG-Uploads werden nicht angenommen. Die Datei wird nicht hochgeladen.
- QR-Erstellung, Vorschau und der unabhängige Lesbarkeitstest laufen lokal. Es gibt keinen Backendserver, keinen QR-Webdienst, keine Telemetrie, keine Werbung und keine Produktanfragen an externe Server. Die Bibliotheken werden im Paket mitgeliefert.

## Was gespeichert wird

- Außerhalb privater Tabs wird die letzte Gestaltung einschließlich eines ausgewählten Logos automatisch lokal behalten. Projektvorlagen werden ausdrücklich gespeichert. Die Daten liegen in `storage.local` im aktuellen Browserprofil.
- Die gewählte Oberflächensprache wird ebenfalls lokal gespeichert. Beim ersten Öffnen dient die Browsersprache als Vorgabe.
- Die Gestaltung enthält Farben, Punktform, Größe und gegebenenfalls den ausgewählten Logoausschnitt beziehungsweise die umgewandelte Uploadgrafik. Vorlagen enthalten zusätzlich einen Namen und eine interne ID. Weder die letzte Gestaltung noch Vorlagen enthalten Zieladressen oder komplette Seitenaufnahmen.
- Erkannte Farbkandidaten, Rohdaten der Seitenanalyse, Logokandidaten und die temporäre Bildadresse der Tabaufnahme werden nicht dauerhaft gespeichert.
- In privaten Tabs schreibt die Erweiterung keine Einstellungen oder Logos dauerhaft und erlaubt kein dauerhaftes Speichern von Projektvorlagen.
- Eine URL-Historie wird nicht gespeichert. Vorlagen werden nicht über einen eigenen Dienst synchronisiert oder gesichert.
- Es sind höchstens 100 Vorlagen vorgesehen. Ein gespeichertes Logo ist als PNG auf 64 KiB und auf 90.000 Base64-Zeichen begrenzt. Fehler durch fehlenden Speicher werden angezeigt.
- Lokal gespeicherte Daten können von Personen oder Software mit Zugriff auf dein Browserprofil gelesen werden. Die Erweiterung bietet hierfür keine zusätzliche Verschlüsselung.

## Berechtigungen

| Berechtigung | Zweck |
|---|---|
| `activeTab` | Nach deiner Interaktion auf die aktuelle Seite zugreifen; für die optionale Logoübernahme vorübergehend den sichtbaren Tab aufnehmen. |
| `scripting` | Auf Anforderung CSS-Farben und sichtbare Logokandidaten der aktuellen Seite ermitteln. |
| `storage` | Gestaltung, Vorlagen und Oberflächensprache lokal speichern. |
| `clipboardWrite` | Auf deinen Klick das QR-Bild als PNG in die Zwischenablage schreiben. |

Es gibt keine dauerhafte Berechtigung für alle Webseiten, keine `history`-Berechtigung und keine Berechtigung zum Lesen der Zwischenablage. Auf geschützten Browserseiten sind Seitenanalyse und Logoübernahme eingeschränkt oder nicht verfügbar.

## Exporte und Weitergabe

- PNG- und SVG-Exporte werden über den Browser auf deinem Gerät gespeichert. Sie enthalten die vollständige Zieladresse als QR-Code und bei Verwendung das Logo.
- Auf Wunsch wird das QR-Bild als PNG in die Systemzwischenablage geschrieben. Der vorherige Inhalt wird ersetzt; die Erweiterung liest oder überwacht die Zwischenablage nicht. Kopierte Bilder enthalten ebenfalls die Zieladresse und gegebenenfalls das Logo. Andere Apps sowie eine vom Betriebssystem bereitgestellte Zwischenablagenhistorie oder -synchronisierung liegen außerhalb der Kontrolle dieser Erweiterung.
- Jeder Empfänger kann die Zieladresse einschließlich Parametern und Sprungmarke auslesen. Verwende keine vertraulichen Links oder Tokens, die du nicht teilen möchtest.
- Erst das Öffnen der ausgelesenen Adresse verbindet das scannende Gerät mit der Zielwebseite. Deren Datenverarbeitung ist unabhängig von dieser Erweiterung.
- Exportierte Dateien bleiben nach dem Entfernen der Erweiterung erhalten.

## Löschen und Aufbewahrung

- Einzelne Projektvorlagen lassen sich in der Erweiterung löschen. Ein Logo lässt sich aus der aktuellen Gestaltung entfernen; aktualisiere oder lösche zusätzlich die betreffende gespeicherte Vorlage.
- Lokale Daten bleiben bis zu ihrer Änderung, Löschung oder der Entfernung der Erweiterungsdaten im Browserprofil erhalten. Reguläre Deinstallation entfernt Erweiterungsdaten gemäß Browserverhalten; temporäre Firefox-Installationen können Daten nach Entfernung oder Neustart behalten. [Mozilla: Einschränkungen temporärer Installation](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/#limitations)
- Für vollständige Entfernung das Add-on deinstallieren und bei temporärer Nutzung verbliebene Erweiterungsdaten über die Browserfunktionen entfernen. Bereits exportierte Dateien separat löschen.

## Kontakt

Projektverantwortung: [OgulcanKaya68 auf GitHub](https://github.com/OgulcanKaya68). Allgemeine Fragen über die [Projekt-Issues](https://github.com/OgulcanKaya68/qr-extension-super-intelligent/issues). Keine vertraulichen Adressen, Tokens, persönlichen Screenshots oder Logos mit unklaren Rechten in öffentliche Meldungen aufnehmen. Sicherheitsprobleme gemäß [SECURITY.md](SECURITY.md) vertraulich melden.
