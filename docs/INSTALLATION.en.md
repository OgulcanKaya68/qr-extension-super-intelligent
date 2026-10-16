# Installation and usage

[Deutsch](../ANLEITUNG.md) · [Back to the project](../README.en.md)

## Installation status

Firefox, Chrome, and Edge store releases are pending. Using the extension needs no extension account. The following steps load a development version rather than an approved store installation.

Visit [GitHub releases](https://github.com/OgulcanKaya68/qr-extension-super-intelligent/releases). If an approved package is available, download the ZIP for your browser and extract it. The planned 0.3.0 filenames are `qr-extension-super-intelligent-firefox-0.3.0-unsigniert.zip` and `qr-extension-super-intelligent-chromium-0.3.0-unsigniert.zip`; Chrome and Edge use the Chromium package. It must contain `manifest.json`. **Source code (zip)** contains source files and requires the build steps below. If no package is available yet, build from source.

## Firefox

1. Open current Firefox Desktop and visit `about:debugging#/runtime/this-firefox`.
2. Select **Load Temporary Add-on…**.
3. Choose `manifest.json` from the extracted Firefox package; for a local build, use `build/firefox`.
4. Pin **QR Extension Super Intelligent** from the extensions menu.
5. Open a regular website and click the extension icon.

A temporary add-on must be loaded again after restarting Firefox. Permanent installation in regular Firefox requires Mozilla signing. Store links will be added after approval. [Temporary installation](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/) · [Signing](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/)

## Chrome and Edge

1. Visit `chrome://extensions` or `edge://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the extracted Chromium folder containing `manifest.json`; for a local build, use `build/chromium`.
5. Pin the icon and open it on a normal website. Keep the extracted folder while the extension is loaded.

Chrome and Edge use the Chromium build. See the [test report](PRUEFUNG.md) for browsers actually checked. [Chrome: load unpacked](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)

## Create a QR code

1. The popup uses the full current URL. Review it or edit it directly.
2. Request page colors. Up to four common CSS colors with at least 7:1 contrast against white appear as swatches; colors below that threshold are filtered out. Black is always available.
3. Choose a swatch, dot style, and output size. The QR background always remains white; there is no free color picker.
4. Optionally request a visible logo from the page header. Detection starts only after your click. Check the crop in the preview.
5. If no suitable logo is found, upload your own PNG, JPEG, or WebP, up to 4 MiB, 4096 pixels per side, and 16 million pixels in total. The image is normalized locally to at most 256 pixels and processed as a size-limited PNG. SVG uploads are not supported. Remove the logo from the current design whenever needed.
6. Download PNG or SVG, or use the copy action to write a PNG image to the clipboard. Paste into an app that accepts images. When using a logo, high error correction and an independent local decode check run before export or copying; unreadable variants are blocked.
7. Scan the result with a phone and verify its destination before sharing or printing.

QR codes contain the entire URL, including query parameters and fragments. Recipients can read those details. `localhost` on a phone refers to the phone itself. A QR code cannot change its destination after printing: create a new code or use a redirect you manage.

## Project presets

- Set colors, dot style, size, and an optional logo, then explicitly save a new project preset.
- Select it on another page; the current destination URL stays unchanged.
- Update or delete presets. Removing a logo from the current design changes an existing preset only when you update it.
- Store up to 100 presets. Stored logos are size-limited PNGs. Use a smaller file if necessary; storage failures are reported.
- Presets belong to the current browser profile. There is no cross-browser synchronization or hosted backup.
- Outside private tabs, the last design including its logo is also kept locally. The extension does not persist settings or logos from private tabs; saving presets is unavailable there.

## Copy an image

- The copy action only writes the current QR image as PNG. It neither reads previous clipboard content nor monitors the clipboard.
- Copying replaces existing clipboard content. The browser may show a permission or security prompt.
- If the destination app cannot paste images, or copying fails, download the PNG and insert it as an image file instead.
- The copied image contains the full destination URL and the logo, if used. Other applications with clipboard access may process it; their behavior is outside the extension's control.

## Troubleshooting

- **No page colors or logo:** protected pages may prohibit analysis. Colors below 7:1 contrast against white are filtered out. Canvas graphics, hidden logos, and logos outside the visible header may not be detected. Black remains available as a code color; you can upload a logo.
- **Wrong crop:** remove the logo or upload a file. Make the desired page header visible before trying again.
- **Export blocked:** reduce/remove the logo or try a shorter URL. Available code colors already meet the contrast threshold, and the background is fixed to white.
- **Preset not saved:** delete unused presets or use a smaller logo. An error means saving must not be assumed successful.
- **Old code after development changes:** reload the extension from its management page and reopen the popup.

Use only logos you have the necessary rights to use. Detecting an image does not grant permission.

## Build from source

Download or clone the repository, then open a terminal in its directory. Use Node.js with npm; the project specifies supported versions.

```sh
npm ci
npm test
npm run build
npm run test:install
npm run test:browser
npm run lint:firefox
npm run package
```

Dependency and test-browser installation uses the internet. QR generation runs locally. Browser builds are written to `build/firefox` and `build/chromium`; unsigned ZIPs go to `releases`. Refer to the [test report](PRUEFUNG.md) for verification actually performed.
