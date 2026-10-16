# QR Extension Super Intelligent: Version 0.3

- Stand: 16.10.2026. Kostenloses, öffentliches Open-Source-Projekt unter MIT.
- Ziel: QR-Codes für Webseiten und Unterseiten direkt in Firefox erstellen.
- Schwerpunkt: Gestaltung aus der aktuellen Webseite und gespeicherte Projektvorlagen.
- Firefox, Chrome und Edge auf Desktop. Öffentliche Store-Einreichungen benötigen eigene Entwicklerkonten.

## Umfang

- Beim Klick auf den Erweiterungsbutton aktuelle vollständige HTTP(S)-Adresse übernehmen.
- Adresse vor QR-Erzeugung anzeigen und bearbeiten lassen; Parameter und Sprungmarken erhalten.
- QR-Vorschau mit fest weißem, nicht auswählbarem Hintergrund; Codefarbe aus sicheren Farbfeldern, eckige/abgerundete/runde Module.
- PNG und SVG in 512, 1024 oder 2048 Pixeln exportieren.
- Benannte Projektvorlagen lokal speichern, auswählen und ausdrücklich aktualisieren.
- Letztes Design und zuletzt gewählte Vorlage lokal merken, keine URL-Historie.
- Bis zu vier häufige CSS-Seitenfarben aus sichtbaren Texten, Flächen und Buttons anbieten, sofern jede Farbe mindestens 7:1 Kontrast zu Weiß erreicht; schwächere Farben nicht anbieten. Schwarz immer ergänzen.
- Seitenlogo auf Knopfdruck als lokalen Ausschnitt übernehmen; PNG/JPEG/WebP-Upload als Alternative.
- Logo normalisieren, anzeigen, entfernen und mit Projektvorlagen speichern; keine entfernten Bildabrufe.
- PNG in die Zwischenablage kopieren, ausschließlich nach Klick und ohne Lesen der Zwischenablage.
- Oberfläche und Anleitungen auf Deutsch und Englisch; Sprachwahl lokal merken.
- Vorlagenlöschung mit Bestätigung. Keine dauerhaften Schreibvorgänge aus privaten Tabs.
- Ungültige Adresse, zu langer Inhalt und fehlender Speicherzugriff verständlich melden. Farben unter 7:1 werden nicht als auswählbare Farben angeboten.
- URL, Vorschau, Codefarbfelder, Punktform und Export bleiben bei eingeklappten Logo- und Projektvorlagenbereichen im kompakten Popup ohne Scrollen erreichbar.
- Kein Konto, keine Werbung, keine Laufzeit-Netzwerkanfragen.

## Abnahme

- PNG und gerastertes SVG ergeben beim unabhängigen Decodieren exakt die eingegebene Adresse.
- Formen/Farben und lange Adressen werden getestet.
- QR-Hintergrund ist stets #FFFFFF und nicht auswählbar; jedes angebotene Vordergrund-Farbfeld erreicht mindestens 7:1 Kontrast zu Weiß. Schwächere Seitenfarben fehlen; Schwarz ist immer vorhanden.
- URL, Vorschau, sichere Codefarben, Punktform und Export sind im kompakten Popup bei eingeklappten Logo-/Projektvorlagenbereichen ohne Scrollen erreichbar.
- Nach Schließen und Wiederöffnen sind Vorlagen vorhanden; neue aktuelle URL wird übernommen.
- Bei ungültiger Eingabe verschwindet der alte QR-Code und Downloads werden gesperrt.
- Keine Zieladresse in browser.storage.local.
- Tastaturbedienung, sichtbare Fokusmarkierung und beschriftete Felder.
- Firefox-Paket validiert; Anleitung beschreibt temporäre Installation und Neustart-Grenze.

## Veröffentlichung

- Öffentliches GitHub-Repository, MIT- und Drittanbieterhinweise, Datenschutz, Anleitungen und Support-/Sicherheitswege.
- Bereinigte, geprüfte Downloadpakete und Quellcode, nachvollziehbarer Build und CI.
- Storetexte und Ankündigungsentwürfe. Veröffentlichten Storestatus nur mit echten Freigabelinks behaupten.

## Bewusste Grenzen

- Statische Codes enthalten die direkte Zieladresse, keine Weiterleitung und keine Scan-Statistik.
- Keine freien Silhouettenformen, Fotosampling, laufende Überwachung oder KI-Dienste.
- Öffentliche Store-Freigaben und Registrierung persönlicher Entwicklerkonten erfolgen gesondert.
