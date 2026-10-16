import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';
import AxeBuilder from '@axe-core/playwright';
import { analyzePage } from '../src/page-analysis.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(root, '.browser-cache');
const { chromium, firefox } = await import('playwright');
const output = path.join(root, 'test-results');
await mkdir(output, { recursive: true });
const publicImages = path.join(root, 'docs', 'images');
await mkdir(publicImages, { recursive: true });
const initialUrl = 'https://beispiel.at/projekte/kontakt?farbe=gruen&ref=qr#formular';
const selectedEngine = process.env.TEST_ENGINE === 'firefox' ? firefox : chromium;
const engineName = selectedEngine === chromium ? 'Chromium' : 'Firefox';
const errors = [];
let checks = 0;
function passed(label) { checks++; console.log(`✓ ${label}`); }

const files = new Map([
  ['/', ['src/popup.html', 'text/html']],
  ['/popup.html', ['build/firefox/popup.html', 'text/html']],
  ['/popup.js', ['build/firefox/popup.js', 'text/javascript']],
  ['/popup.css', ['build/firefox/popup.css', 'text/css']],
  ['/decoder.js', ['node_modules/jsqr/dist/jsQR.js', 'text/javascript']],
]);
const server = createServer(async (request, response) => {
  const file = files.get(new URL(request.url, 'http://localhost').pathname);
  if (!file) { response.writeHead(404); response.end(); return; }
  response.writeHead(200, { 'content-type': file[1] });
  response.end(await readFile(path.join(root, file[0])));
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const base = `http://127.0.0.1:${server.address().port}`;
const active = [];

async function ready(page) {
  await page.waitForFunction(() => !document.querySelector('#download-png').disabled, null, { timeout: 15000 });
}

async function mock(page, options = {}) {
  await page.addInitScript(({ initialUrl, options }) => {
    window.__writes = [];
    window.__testUrl = initialUrl;
    window.__testTabId = 7;
    window.__clipboard = [];
    window.__captures = 0;
    if (options.pauseUpload) {
      const originalBitmap = window.createImageBitmap.bind(window);
      window.createImageBitmap = async (source, ...args) => {
        if (source instanceof File) {
          window.__uploadStarted = true;
          await new Promise((resolve) => { window.__releaseUpload = resolve; });
        }
        const bitmap = await originalBitmap(source, ...args);
        if (source instanceof File) window.__uploadDecoded = true;
        return bitmap;
      };
    }
    const tab = () => ({ id: window.__testTabId, windowId: 1, active: true,
      incognito: Boolean(options.privateMode), url: window.__testUrl });
    const analysis = { colors: ['#102030', '#f4f0e4', '#153a62', '#fff0cc'],
      logos: [{ x: 10, y: 10, width: 100, height: 40, label: 'Testlogo' }],
      viewport: { width: 410, height: 720 }, scroll: { x: 0, y: 0 } };
    window.browser = {
      runtime: { id: 'qr-extension-test', getBrowserInfo: options.webClipboard ? undefined : async () => ({ name: 'Firefox', version: 'test' }) },
      extension: { inIncognitoContext: Boolean(options.privateMode) },
      tabs: { query: async () => [tab()], get: async () => tab(),
        captureVisibleTab: async () => {
          window.__captures += 1;
          if (options.captureRace) window.__testTabId = 99;
          return options.screenshot;
        } },
      scripting: { executeScript: async () => [{ frameId: 0, result: analysis }] },
      clipboard: { setImageData: async (bytes, type) => {
        if (options.webClipboard) {
          window.__wrongClipboardApi = true;
          throw new Error('Access to extension API denied.');
        }
        if (options.clipboardFails) throw new Error('Test-Zwischenablagefehler');
        window.__clipboard.push({ bytes: Array.from(new Uint8Array(bytes)), type });
      } },
      storage: { local: {
        get: async () => {
          if (options.readFails) throw new Error('Test-Lesefehler');
          return JSON.parse(localStorage.getItem(options.storageKey || 'mockStorage') || '{}');
        },
        set: async (value) => {
          window.__attempts = (window.__attempts || 0) + 1;
          if (options.pauseWrite && window.__attempts === 1) {
            window.__writeStarted = true;
            await new Promise((resolve) => { window.__releaseWrite = resolve; });
          }
          if (options.writeDelay) await new Promise((resolve) => setTimeout(resolve, options.writeDelay));
          if (options.failFirstWrite && window.__attempts === 1) throw new Error('Test-Transaktionsfehler');
          if (options.writeFails) throw new Error('Test-Schreibfehler');
          window.__writes.push(value);
          localStorage.setItem(options.storageKey || 'mockStorage', JSON.stringify(value));
        },
      } },
    };
    if (options.webClipboard) Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      write: async (items) => {
        if (options.clipboardFails) throw new Error('Test-Zwischenablagefehler');
        const blob = await items[0].getType('image/png');
        window.__clipboard.push({ bytes: Array.from(new Uint8Array(await blob.arrayBuffer())), type: 'png' });
      },
    } });
  }, { initialUrl, options });
}

async function downloadAndDecode(page, decoder, extension, expected, label) {
  const pending = page.waitForEvent('download');
  await page.locator(`#download-${extension}`).click();
  const download = await pending;
  const filename = path.join(output, `${label}.${extension}`);
  await download.saveAs(filename);
  assert(!download.suggestedFilename().includes('farbe'));
  let decoded;
  if (extension === 'png') {
    const png = PNG.sync.read(await readFile(filename));
    decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data;
  } else {
    const svg = await readFile(filename, 'utf8');
    assert.doesNotMatch(svg, /<(?:script|foreignObject|iframe)\b|(?:href|src)\s*=\s*["']https?:/i);
    decoded = await decoder.evaluate(async (svg) => {
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const image = new Image(); image.src = url; await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      return window.jsQR(pixels.data, pixels.width, pixels.height)?.data;
    }, svg);
  }
  assert.equal(decoded, expected, `QR-Inhalt (${label})`);
  passed(`${label}: ${extension.toUpperCase()} unabhängig decodiert`);
}

function syntheticLogo(width = 64, height = 64) {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const offset = (y * width + x) * 4;
    const mark = x > width * .2 && x < width * .8 && y > height * .2 && y < height * .8;
    png.data[offset] = mark ? 20 : 255;
    png.data[offset + 1] = mark ? 80 : 255;
    png.data[offset + 2] = mark ? 150 : 255;
    png.data[offset + 3] = 255;
  }
  return PNG.sync.write(png);
}

async function clipboardAndDecode(page, expected, label) {
  const previous = await page.evaluate(() => window.__clipboard.length);
  await page.locator('#copy-image').click();
  await page.waitForFunction((count) => window.__clipboard.length > count, previous);
  const saved = await page.evaluate(() => window.__clipboard.at(-1));
  assert.equal(saved.type, 'png');
  const image = PNG.sync.read(Buffer.from(saved.bytes));
  assert.equal(jsQR(new Uint8ClampedArray(image.data), image.width, image.height)?.data, expected);
  passed(`${label}: Zwischenablage erhält unabhängig decodierbare PNG-Bilddaten`);
}

try {
  const fox = await selectedEngine.launch({ headless: true }); active.push(fox);
  console.log(`Browser-Engine: ${engineName} ${fox.version()}`);
  const context = await fox.newContext({ viewport: { width: 410, height: 720 }, locale: 'de-AT', acceptDownloads: true });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await mock(page);
  await page.goto(`${base}/popup.html`);
  await ready(page);
  assert.equal(await page.locator('#url').inputValue(), initialUrl);
  passed(`${engineName}-Engine: aktuelle vollständige Adresse übernommen (Browser-API simuliert)`);
  const decoder = await context.newPage();
  await decoder.goto(base);
  await decoder.addScriptTag({ url: `${base}/decoder.js` });

  for (const shape of ['square', 'rounded', 'dots']) {
    await page.locator(`[data-shape="${shape}"]`).click();
    await ready(page);
    await downloadAndDecode(page, decoder, 'png', initialUrl, `${engineName}-${shape}`);
    await downloadAndDecode(page, decoder, 'svg', initialUrl, `${engineName}-${shape}`);
  }
  const longUrl = `https://beispiel.at/über-uns/${'unterseite-'.repeat(45)}?grüße=österreich#kontakt`;
  await page.locator('#url').fill(longUrl); await ready(page);
  await downloadAndDecode(page, decoder, 'png', longUrl, `${engineName}-lang-unicode`);
  await downloadAndDecode(page, decoder, 'svg', longUrl, `${engineName}-lang-unicode`);
  for (const size of ['512', '2048']) {
    await page.locator('#size').selectOption(size); await ready(page);
    await downloadAndDecode(page, decoder, 'png', longUrl, `${engineName}-lang-${size}`);
  }
  await page.locator('#size').selectOption('1024'); await ready(page);
  await page.locator('#foreground-hex').fill('#102030');
  await page.locator('#background-hex').fill('#f4f0e4'); await ready(page);
  await downloadAndDecode(page, decoder, 'png', longUrl, `${engineName}-projektfarben`);
  await downloadAndDecode(page, decoder, 'svg', longUrl, `${engineName}-projektfarben`);
  await page.locator('#background-hex').fill('#ffffff'); await ready(page);
  await page.locator('#foreground-hex').fill('#f0f0f0');
  assert.equal(await page.locator('#download-png').isDisabled(), true);
  assert.equal(await page.locator('#qr-preview img').count(), 0);
  assert.match(await page.locator('#design-message').textContent(), /Kontrast/);
  await page.locator('#foreground-hex').fill('#183b31'); await ready(page);
  await page.locator('#url').fill('javascript:alert(1)');
  assert.equal(await page.locator('#download-svg').isDisabled(), true);
  assert.equal(await page.locator('#qr-preview img').count(), 0);
  passed('Ungültige URL und schlechter Kontrast sperren Exporte und entfernen alte Vorschau');

  await page.locator('#url').fill(initialUrl); await ready(page);
  await page.locator('#preset-details summary').click();
  await page.locator('#preset-name').fill('Mein Portfolio');
  await page.locator('#preset-save').click();
  await page.waitForFunction(() => document.querySelector('#preset-message').textContent.includes('gespeichert'));
  await page.reload(); await ready(page);
  assert.equal(await page.locator('#preset-select option:checked').textContent(), 'Mein Portfolio');
  assert.equal(await page.locator('[data-shape="dots"]').getAttribute('aria-pressed'), 'true');
  const stored = await page.evaluate(() => localStorage.getItem('mockStorage'));
  assert(!stored.includes('beispiel.at'));
  assert(!stored.includes('farbe='));
  passed('Vorlage überlebt Wiederöffnen; gespeicherter Zustand enthält keine Zieladresse');

  await page.locator('#foreground-hex').fill('#102030'); await ready(page);
  await page.locator('#preset-update').click();
  await page.waitForFunction(() => document.querySelector('#preset-message').textContent.includes('aktualisiert'));
  await page.reload(); await ready(page);
  assert.equal(await page.locator('#foreground-hex').inputValue(), '#102030');
  await page.locator('#preset-select').selectOption('');
  await page.locator('#foreground-hex').fill('#183b31'); await ready(page);
  const presetId = await page.locator('#preset-select option').nth(1).getAttribute('value');
  await page.locator('#preset-select').selectOption(presetId); await ready(page);
  assert.equal(await page.locator('#foreground-hex').inputValue(), '#102030');
  passed('Vorlage ausdrücklich aktualisiert und erneut ausgewählt');

  const axe = await new AxeBuilder({ page }).analyze();
  assert.deepEqual(axe.violations.filter((v) => ['critical', 'serious'].includes(v.impact)).map((v) => v.id), []);
  passed(`${engineName}-Oberfläche ohne ernste oder kritische axe-Befunde`);
  await page.screenshot({ path: path.join(output, `${engineName}-popup.png`), fullPage: true });
  assert(await page.evaluate(() => document.body.scrollWidth <= 410));
  passed('410px-Oberfläche ohne horizontales Überlaufen');

  const fail = await context.newPage(); await mock(fail, { readFails: true });
  await fail.goto(`${base}/popup.html`); await ready(fail);
  await fail.locator('#foreground-hex').fill('#112233'); await ready(fail);
  assert.equal(await fail.evaluate(() => window.__writes.length), 0);
  assert.equal(await fail.locator('#preset-save').isDisabled(), true);
  passed('Lesefehler schützt bestehende Vorlagen vor überschreibendem Autosave');

  const writeFail = await context.newPage(); await mock(writeFail, { writeFails: true });
  await writeFail.goto(`${base}/popup.html`); await ready(writeFail);
  await writeFail.locator('#preset-details summary').click();
  await writeFail.locator('#preset-name').fill('Nicht gespeichert');
  await writeFail.locator('#preset-save').click();
  await writeFail.waitForFunction(() => document.querySelector('#preset-message').textContent.includes('nicht dauerhaft'));
  assert.equal(await writeFail.locator('#preset-select option').count(), 2);
  passed('Schreibfehler meldet fehlgeschlagene Speicherung und rollt neue Vorlage zurück');

  const transaction = await context.newPage();
  await mock(transaction, { writeDelay: 350, failFirstWrite: true });
  await transaction.goto(`${base}/popup.html`); await ready(transaction);
  await transaction.locator('#preset-details summary').click();
  await transaction.locator('#preset-name').fill('Fehlgeschlagene Transaktion');
  await transaction.locator('#preset-save').click();
  assert.equal(await transaction.locator('#foreground-hex').isDisabled(), true);
  await transaction.waitForFunction(() => document.querySelector('#preset-message').textContent.includes('nicht dauerhaft'));
  await transaction.locator('#foreground-hex').fill('#183b31'); await ready(transaction);
  await transaction.waitForFunction(() => window.__writes.length === 1);
  const transactionSaved = await transaction.evaluate(() => localStorage.getItem('mockStorage'));
  assert(!transactionSaved.includes('Fehlgeschlagene Transaktion'));
  passed('Vorlagentransaktion sperrt parallele Änderungen; späterer Autosave schreibt keine verworfene Vorlage');

  const previewContext = await fox.newContext({ locale: 'de-AT' });
  const preview = await previewContext.newPage(); await preview.goto(`${base}/popup.html`);
  await preview.locator('#url').fill(initialUrl); await ready(preview);
  assert.equal(await preview.locator('#refresh-url').isDisabled(), true);
  passed('Manuelle Vorschau funktioniert ohne installierte Erweiterung');
  await previewContext.close();

  const probe = await context.newPage();
  await probe.setContent(`<style>body{margin:0;background:#fff}header{height:55px}.brand{display:block;width:120px;height:40px;background:oklch(55% .2 265)}.color{height:60px;background:#153a62;color:#fff}.hidden{display:none;background:#ff00ff}</style><header><svg class="brand" aria-label="Testlogo"></svg></header><div class="color">Text</div><div class="color">Mehr Text</div><div class="hidden">Unsichtbar</div>`);
  const analyzed = await probe.evaluate(analyzePage);
  assert(analyzed.colors.includes('#153a62'));
  assert(!analyzed.colors.includes('#ff00ff'));
  assert(analyzed.colors.every((color) => /^#[0-9a-f]{6}$/.test(color) && color !== '#000000'));
  assert(analyzed.colors.some((color) => !['#153a62', '#ffffff'].includes(color)));
  assert.equal(analyzed.logos.length, 1);
  assert.deepEqual(analyzed.logos[0], { x: 0, y: 0, width: 120, height: 40, label: 'Testlogo' });
  passed(`${engineName}: echte DOM-Analyse erkennt sichtbare Farben einschließlich oklch und begrenztes SVG-Logo`);

  const logoBuffer = syntheticLogo();
  const screenshot = `data:image/png;base64,${syntheticLogo(410, 720).toString('base64')}`;
  const enhanced = await context.newPage();
  enhanced.on('pageerror', (error) => errors.push(error.message));
  await mock(enhanced, { storageKey: 'v02-features', screenshot });
  await enhanced.goto(`${base}/popup.html`); await ready(enhanced);
  await enhanced.locator('#analyze-page').click();
  await enhanced.waitForFunction(() => document.querySelectorAll('#palette-list button').length === 5);
  // Die zugängliche Beschriftung ist Teil der Bedienung, kein internes Datenattribut.
  const colorButton = (hex) => enhanced.getByRole('button', { name: new RegExp(hex, 'i') });
  assert.equal(await colorButton('#000000').count(), 1);
  await colorButton('#102030').click(); await ready(enhanced);
  assert.equal(await enhanced.locator('#foreground-hex').inputValue(), '#102030');
  await enhanced.locator('#palette-target').selectOption('background');
  await colorButton('#f4f0e4').click(); await ready(enhanced);
  assert.equal(await enhanced.locator('#background-hex').inputValue(), '#f4f0e4');
  passed('Vier erkannte Seitenfarben und Schwarz lassen sich auf Code und Hintergrund anwenden');

  await enhanced.locator('#logo-details summary').click();
  await enhanced.locator('#logo-upload').setInputFiles({ name: 'eigenes-logo.png', mimeType: 'image/png', buffer: logoBuffer });
  await enhanced.waitForFunction(() => !document.querySelector('#logo-preview').hidden);
  await ready(enhanced);
  for (const shape of ['square', 'rounded', 'dots']) {
    await enhanced.locator(`[data-shape="${shape}"]`).click(); await ready(enhanced);
    for (const type of ['png', 'svg']) await downloadAndDecode(enhanced, decoder, type, initialUrl, `${engineName}-logo-${shape}`);
  }
  await enhanced.locator('#url').fill(longUrl); await enhanced.locator('#size').selectOption('512'); await ready(enhanced);
  for (const type of ['png', 'svg']) await downloadAndDecode(enhanced, decoder, type, longUrl, `${engineName}-logo-lang-512`);
  await clipboardAndDecode(enhanced, longUrl, 'Firefox-Clipboard-API (simuliert)');

  await enhanced.locator('#preset-details summary').click();
  await enhanced.locator('#preset-name').fill('Vorlage mit Logo'); await enhanced.locator('#preset-save').click();
  await enhanced.waitForFunction(() => document.querySelector('#preset-message').textContent.includes('gespeichert'));
  await enhanced.reload(); await ready(enhanced);
  assert.equal(await enhanced.locator('#preset-select option:checked').textContent(), 'Vorlage mit Logo');
  assert.equal(await enhanced.locator('#logo-remove').isDisabled(), false);
  assert.match(await enhanced.locator('#logo-preview').getAttribute('src'), /^data:image\/png;base64,/);
  const logoSaved = await enhanced.evaluate(() => localStorage.getItem('v02-features'));
  assert(!logoSaved.includes('beispiel.at'));
  enhanced.once('dialog', (dialog) => dialog.accept());
  await enhanced.locator('#preset-delete').click();
  await enhanced.waitForFunction(() => document.querySelector('#preset-select').options.length === 1);
  await enhanced.reload(); await ready(enhanced);
  assert.equal(await enhanced.locator('#preset-select option').count(), 1);
  passed('Logo-Vorlage überlebt Wiederöffnen, speichert keine Zieladresse und lässt sich dauerhaft löschen');

  await enhanced.locator('#language').selectOption('en');
  await enhanced.waitForFunction(() => document.documentElement.lang === 'en');
  assert.equal(await enhanced.locator('#download-png').textContent(), 'Download PNG');
  await enhanced.reload(); await ready(enhanced);
  assert.equal(await enhanced.locator('html').getAttribute('lang'), 'en');
  await enhanced.locator('#language').selectOption('de');
  assert.equal(await enhanced.locator('#download-png').textContent(), 'PNG herunterladen');
  passed('DE/EN übersetzt die Bedienung und merkt sich die explizite Sprachwahl');

  await enhanced.locator('#logo-details summary').click();
  for (const [name, mimeType, buffer, expected] of [
    ['logo.svg', 'image/svg+xml', Buffer.from('<svg onload="alert(1)"/>'), /gültiges|gültig/],
    ['logo.jpg', 'image/jpeg', logoBuffer, /gültiges|gültig/],
    ['gross.png', 'image/png', Buffer.alloc(4 * 1024 * 1024 + 1), /groß/],
  ]) {
    await enhanced.locator('#logo-upload').setInputFiles({ name, mimeType, buffer });
    await enhanced.waitForFunction(() => document.querySelector('#logo-message').classList.contains('is-error'));
    assert.match(await enhanced.locator('#logo-message').textContent(), expected);
  }
  passed('SVG, falscher MIME-Typ und übergroßer Upload werden verständlich abgewiesen');
  await enhanced.locator('#logo-from-page').click();
  await enhanced.waitForFunction(() => window.__captures === 1);
  await enhanced.waitForFunction(() => !document.querySelector('#logo-preview').hidden);
  await ready(enhanced);
  const capturedLogo = await enhanced.locator('#logo-preview').getAttribute('src');
  const capturedPng = PNG.sync.read(Buffer.from(capturedLogo.slice(22), 'base64'));
  assert.equal(capturedPng.width, 100); assert.equal(capturedPng.height, 40);
  passed('Seitenlogo übernimmt ausschließlich den lokal ausgeschnittenen sichtbaren Screenshotbereich');

  for (const webClipboard of [true, false]) {
    const copyPage = await context.newPage();
    await mock(copyPage, { storageKey: `copy-${webClipboard}`, webClipboard });
    await copyPage.goto(`${base}/popup.html`); await ready(copyPage);
    await clipboardAndDecode(copyPage, initialUrl, webClipboard ? 'Chromium-Clipboard-API (simuliert)' : 'Firefox-Clipboard-API (simuliert)');
    if (webClipboard) assert.equal(await copyPage.evaluate(() => Boolean(window.__wrongClipboardApi)), false);
  }
  const badCopy = await context.newPage();
  await mock(badCopy, { storageKey: 'bad-copy', clipboardFails: true });
  await badCopy.goto(`${base}/popup.html`); await ready(badCopy);
  await badCopy.locator('#copy-image').click();
  await badCopy.waitForFunction(() => document.querySelector('#status').classList.contains('is-error'));
  assert.equal(await badCopy.evaluate(() => window.__clipboard.length), 0);
  assert.equal(await badCopy.locator('#copy-image').isDisabled(), false);
  passed('Abgewiesene Zwischenablage meldet Fehler und lässt einen erneuten Versuch zu');

  const privatePage = await context.newPage();
  await mock(privatePage, { privateMode: true, storageKey: 'private-test' });
  await privatePage.goto(`${base}/popup.html`); await ready(privatePage);
  await privatePage.locator('#foreground-hex').fill('#102030'); await ready(privatePage);
  await privatePage.locator('#logo-details summary').click();
  await privatePage.locator('#logo-upload').setInputFiles({ name: 'privat.png', mimeType: 'image/png', buffer: logoBuffer });
  await privatePage.waitForFunction(() => !document.querySelector('#logo-preview').hidden);
  await ready(privatePage);
  assert.equal(await privatePage.evaluate(() => window.__writes.length), 0);
  assert.equal(await privatePage.evaluate(() => localStorage.getItem('private-test')), null);
  await privatePage.locator('#language').selectOption('en'); await ready(privatePage);
  assert.equal(await privatePage.locator('html').getAttribute('lang'), 'en');
  assert.equal(await privatePage.evaluate(() => window.__writes.length), 0);
  passed('Privater Tab erzeugt QR mit Logo ohne Speicherzugriffe zum Schreiben');

  const pendingUpload = await context.newPage();
  await mock(pendingUpload, { storageKey: 'language-pending-upload', pauseUpload: true, pauseWrite: true });
  await pendingUpload.goto(`${base}/popup.html`); await ready(pendingUpload);
  await pendingUpload.locator('#logo-details summary').click();
  await pendingUpload.locator('#logo-upload').setInputFiles({ name: 'noch-in-arbeit.png', mimeType: 'image/png', buffer: logoBuffer });
  await pendingUpload.waitForFunction(() => window.__uploadStarted);
  await pendingUpload.locator('#language').selectOption('en');
  await pendingUpload.waitForFunction(() => window.__writeStarted);
  await pendingUpload.evaluate(() => window.__releaseUpload());
  await pendingUpload.waitForFunction(() => window.__uploadDecoded);
  await pendingUpload.evaluate(() => window.__releaseWrite());
  await pendingUpload.waitForFunction(() => window.__writes.length > 0);
  const languageState = Object.values(await pendingUpload.evaluate(() => window.__writes[0]))[0];
  assert.equal(languageState.language, 'en');
  assert.equal(languageState.design.logo, null);
  await pendingUpload.waitForFunction(() => !document.querySelector('#logo-preview').hidden);
  await ready(pendingUpload);
  await pendingUpload.reload(); await ready(pendingUpload);
  assert.equal(await pendingUpload.locator('html').getAttribute('lang'), 'en');
  assert.equal(await pendingUpload.locator('#logo-remove').isDisabled(), false);
  passed('Sprachwechsel während Logo-Upload speichert nur bestätigte Daten und erhält das später geprüfte Logo');

  const raced = await context.newPage();
  await mock(raced, { screenshot, captureRace: true, storageKey: 'race-test' });
  await raced.goto(`${base}/popup.html`); await ready(raced);
  await raced.locator('#logo-details summary').click();
  await raced.locator('#logo-from-page').click();
  await raced.waitForFunction(() => document.querySelector('#logo-message').classList.contains('is-error'));
  assert.equal(await raced.locator('#logo-remove').isDisabled(), true);
  assert.equal(await raced.locator('#logo-preview').isHidden(), true);
  passed('Tabwechsel während Aufnahme verwirft den Logo-Ausschnitt');

  const documentation = await context.newPage();
  await mock(documentation, { storageKey: 'public-demo' });
  await documentation.goto(`${base}/popup.html`); await ready(documentation);
  await documentation.locator('#url').fill('https://example.com/projekte/kontakt');
  await documentation.locator('#foreground-hex').fill('#102030'); await ready(documentation);
  await documentation.locator('#logo-details summary').click();
  await documentation.locator('#logo-upload').setInputFiles({ name: 'demo-logo.png', mimeType: 'image/png', buffer: logoBuffer });
  await documentation.waitForFunction(() => !document.querySelector('#logo-preview').hidden);
  await ready(documentation);
  await documentation.locator('#logo-details summary').click();
  await documentation.screenshot({ path: path.join(publicImages, 'popup-de.png'), fullPage: true });
  await documentation.locator('#language').selectOption('en'); await ready(documentation);
  await documentation.screenshot({ path: path.join(publicImages, 'popup-en.png'), fullPage: true });
  const enhancedAxe = await new AxeBuilder({ page: documentation }).analyze();
  assert.deepEqual(enhancedAxe.violations.filter((v) => ['critical', 'serious'].includes(v.impact)).map((v) => v.id), []);
  passed('Öffentliche DE/EN-Screenshots verwenden ausschließlich synthetisches Logo und example.com; neue Oberfläche besteht axe');

  const extDir = path.join(root, 'build/chromium');
  const chromiumContext = await chromium.launchPersistentContext('', {
    channel: 'chromium', headless: true, acceptDownloads: true,
    locale: 'de-AT',
    viewport: { width: 410, height: 720 },
    args: [`--disable-extensions-except=${extDir}`, `--load-extension=${extDir}`],
  }); active.push(chromiumContext);
  console.log(`Installierte Chromium-Erweiterung: Browser ${chromiumContext.browser().version()}`);
  const manager = await chromiumContext.newPage();
  await manager.goto('chrome://extensions');
  const item = manager.locator('extensions-item').filter({ hasText: 'QR Extension Super Intelligent' });
  await item.waitFor();
  const id = await item.getAttribute('id');
  assert(id);
  const extension = await chromiumContext.newPage();
  extension.on('pageerror', (error) => errors.push(error.message));
  await extension.goto(`chrome-extension://${id}/popup.html`);
  await extension.locator('#url').fill(initialUrl); await ready(extension);
  assert(await extension.evaluate(() => Boolean(chrome.runtime.id)));
  const network = [];
  extension.on('request', (request) => { if (/^https?:/.test(request.url())) network.push(request.url()); });
  await extension.locator('[data-shape="rounded"]').click(); await ready(extension);
  await downloadAndDecode(extension, decoder, 'png', initialUrl, 'chromium-erweiterung');
  await downloadAndDecode(extension, decoder, 'svg', initialUrl, 'chromium-erweiterung');
  await extension.bringToFront();
  await extension.locator('#copy-image').click();
  await extension.waitForFunction(() => ['is-success', 'is-error'].some((name) => document.querySelector('#status').classList.contains(name)));
  assert.equal(await extension.locator('#status').getAttribute('class'), 'message is-success', await extension.locator('#status').textContent());
  assert.match(await extension.locator('#status').textContent(), /kopiert/i);
  passed('Echte Chromium-Erweiterung: navigator.clipboard.write mit PNG erfolgreich (Zwischenablage nicht gelesen)');
  await extension.locator('#preset-details summary').click();
  await extension.locator('#preset-name').fill('Chromium-Projekt');
  await extension.locator('#preset-save').click();
  await extension.waitForFunction(() => document.querySelector('#preset-message').textContent.includes('gespeichert'));
  await extension.reload();
  await extension.locator('#url').fill(initialUrl); await ready(extension);
  assert.equal(await extension.locator('#preset-select option:checked').textContent(), 'Chromium-Projekt');
  const saved = await extension.evaluate(async () => chrome.storage.local.get());
  assert(!JSON.stringify(saved).includes('beispiel.at'));
  assert.deepEqual(network, []);
  passed('Echte Chromium-Erweiterung: CSP, Exporte und browser.storage ohne Netzwerkanfragen');
  await chromiumContext.setOffline(true);
  await extension.locator('[data-shape="dots"]').click(); await ready(extension);
  await downloadAndDecode(extension, decoder, 'png', initialUrl, 'chromium-offline');
  passed('Installierte Erweiterung erstellt und exportiert QR-Codes auch im Offline-Test');
  await extension.screenshot({ path: path.join(output, 'chromium-popup.png'), fullPage: true });
  assert.deepEqual(errors, []);
  console.log(`Browserprüfung bestanden: ${checks} Prüfpunkte, keine unbehandelten JavaScript-Fehler.`);
} finally {
  for (const item of active.reverse()) await item.close();
  await new Promise((resolve) => server.close(resolve));
}
