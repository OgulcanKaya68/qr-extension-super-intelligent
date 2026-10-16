# Privacy: QR Extension Super Intelligent

Updated: 2026-10-16 · Version 0.2.0 · [Deutsch](../DATENSCHUTZ.md)

This notice describes the extension. GitHub, browser vendors, and future extension stores process data under their own policies.

## Local processing

- Opening the extension copies the current tab's full URL into the QR preview. You may enter a different address.
- On request, page analysis reads selected CSS colors and properties of visible logo candidates. It does not run passively in the background or create a browsing history.
- For optional logo extraction, your click triggers a temporary image of the visible tab in memory. The detected logo area is cropped from it. The full capture is neither saved as a file nor stored in presets, and it is never transmitted. Other visible page content may temporarily be present in this capture.
- An uploaded PNG, JPEG, or WebP is processed locally and converted to a size-limited PNG at most 256 pixels across. Input is limited to 4 MiB, 4096 pixels per side, and 16 million pixels in total. SVG uploads are not accepted. The file is not sent to a server.
- QR generation, preview, and independent decoding checks run locally. There is no backend, QR web service, telemetry, advertising, or product request to external servers. Libraries are bundled with the extension.

## Local storage

- Outside private tabs, the last design, including a selected logo, is kept automatically. Project presets are saved explicitly. Data is stored in `storage.local` in the current browser profile.
- The selected interface language is also stored locally. The browser language supplies the initial default.
- Designs contain colors, dot style, size, and optionally a selected logo crop or converted uploaded image. Presets also contain a name and internal ID. Neither the last design nor presets contain destination URLs or full-page captures.
- Detected color candidates, raw page-analysis results, logo candidates, and the temporary tab-capture image URL are not persisted.
- No settings or logos are persistently written from private tabs, and persistent preset saving is unavailable there.
- No URL history is stored. There is no hosted synchronization or backup service.
- Up to 100 presets are supported. A stored PNG logo is limited to 64 KiB and 90,000 Base64 characters. Storage failures are reported.
- People or software with access to your browser profile may read local data. The extension provides no additional encryption for that data.

## Permissions

| Permission | Purpose |
|---|---|
| `activeTab` | Access the current page following your interaction; temporarily capture the visible tab for optional logo extraction. |
| `scripting` | Find CSS colors and visible logo candidates on the current page, only on request. |
| `storage` | Store design settings, presets, and interface language locally. |
| `clipboardWrite` | Write the QR image to the clipboard as PNG after your click. |

There is no permanent all-websites permission, `history` permission, or clipboard-reading permission. Protected browser pages restrict or prevent page analysis and logo capture.

## Exports and sharing

- Requested PNG and SVG exports are saved through the browser to your device. They contain the full destination URL as a QR code and the logo, if used.
- On request, the QR image is written to the system clipboard as PNG, replacing the previous content. The extension does not read or monitor the clipboard. Copied images also contain the URL and optional logo. Other apps and operating-system clipboard history or synchronization are outside the extension's control.
- Recipients can read the complete URL, including parameters and fragments. Avoid confidential links or tokens you do not intend to share.
- Opening the decoded URL connects the scanning device to its destination. That site's processing is separate from the extension.
- Exported files remain after uninstalling the extension.

## Deletion and retention

- Delete individual presets in the extension. Remove a logo from the current design, then also update or delete any saved preset that contains it.
- Local data remains until changed, deleted, or removed from the browser profile. Regular uninstallation removes extension data according to browser behavior. Temporary Firefox installations may retain data after removal or restart. [Mozilla: temporary installation limitations](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/#limitations)
- For full removal, uninstall the extension and remove any remaining extension data using browser controls when testing temporary installations. Delete exported files separately.

## Contact

Project maintainer: [OgulcanKaya68 on GitHub](https://github.com/OgulcanKaya68). Ask general questions through [project issues](https://github.com/OgulcanKaya68/qr-extension-super-intelligent/issues). Do not post confidential URLs, tokens, personal screenshots, or logos with unclear usage rights in public reports. Report security issues privately following [SECURITY.md](../SECURITY.md).
