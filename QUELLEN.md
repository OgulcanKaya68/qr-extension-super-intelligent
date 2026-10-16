# Technische Quellen

Geprüft am 16-10-2026. Die festgelegten Paketversionen stehen in `package.json` und `package-lock.json`.

| Thema | Quelle | Verwendung |
|---|---|---|
| Tab-Adresse nach Nutzeraktion | [MDN: activeTab permission](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/activeTab_permission) | Zugriff auf den aktuellen Tab nach Klick statt allgemeiner Hostberechtigungen. |
| Lokale Vorlagen | [MDN: storage.local](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/local) | Gestaltung im lokalen Browserprofil speichern. |
| Seitenanalyse | [MDN: scripting.executeScript](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/scripting/executeScript) | Nach Anforderung sichtbare CSS-Farben und Logoabmessungen ermitteln. |
| Lokale Logoübernahme | [MDN: tabs.captureVisibleTab](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/captureVisibleTab) | Nach Klick sichtbaren Tab vorübergehend aufnehmen und Logo lokal ausschneiden. |
| Bild kopieren | [MDN: clipboard.setImageData](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/clipboard/setImageData), [MDN: Clipboard.write](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/write) | PNG nach Nutzeraktion schreiben, ohne Zwischenablage zu lesen. |
| Firefox-Manifest | [MDN: browser_specific_settings](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings) | Add-on-ID, Mindestversion und Angabe zur Datenerhebung. Für neue Mozilla-Einreichungen ist die Angabe zur Datenerhebung erforderlich. |
| Testinstallation | [Mozilla: Temporary installation in Firefox](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/) | Temporäres Laden und dessen Grenzen nach Browser-Neustart. |
| Dauerhafte Verteilung | [Mozilla: Signing and distribution overview](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/) | Signierung sowie gelistete oder nicht gelistete Verteilung. |
| QR-Erzeugung und UTF-8 | [qrcode-generator: Repository](https://github.com/kazuhikoarase/qrcode-generator) | QR-Matrix und Fehlerkorrektur, ausdrücklich mit UTF-8-Byte-Kodierung. MIT-Lizenz und Copyright im Paket erhalten. |
| Unabhängige Decodierung | [jsQR: Repository](https://github.com/cozmo/jsQR) | QR-Vorschau mit Logo vor Export unabhängig decodieren. Apache-2.0-Lizenz im Paket erhalten. |
| SVG und PNG | [MDN: SVG](https://developer.mozilla.org/en-US/docs/Web/SVG), [MDN: HTMLCanvasElement.toBlob](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob) | Kleine eigene Darstellung der berechneten QR-Module und lokaler Rasterexport. |
| Freier Rand | [DENSO WAVE: Securing Margin](https://www.qrcode.com/en/howto/code.html) | Mindestens vier freie Module auf jeder Seite eines QR-Codes. |
| Chromium-Testinstallation | [Google: Load an unpacked extension](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked) | Entwicklerinstallation des Chromium-Ordners. |

## Eigene Produktentscheidungen

- Fehlerkorrektur Q ohne Logo und H mit Logo, drei Punktformen und drei Ausgabegrößen.
- Ein Mindestkontrast von 7:1 und dunkle Punkte auf hellem Hintergrund als konservative Gestaltungsschranke; das ist keine Garantie für jedes Lesegerät.
- Maximal 1200 UTF-8-Bytes je URL als Grenze dieser Version.
- Direkte Zieladressen ohne Weiterleitungsserver, Nutzerkonto oder Ablaufdatum des Dienstes. Die Zielwebseite selbst muss erreichbar bleiben.
- Seitenlogos werden aus einem vorübergehenden sichtbaren Tababbild lokal ausgeschnitten; Uploads werden als begrenztes PNG neu kodiert. Keine externen Logo- oder QR-Dienste.
- Die eigene Darstellung verwendet eine UTF-8-QR-Matrix und wird in den Exporttests unabhängig decodiert.

Die automatisierten Prüfungen ersetzen keinen Scan der fertigen Grafik in ihrer tatsächlichen Anzeige- oder Druckgröße.
