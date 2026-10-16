import { readFile, writeFile, copyFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(root, '.browser-cache');
const { chromium } = await import('playwright');
const output = path.join(root, 'docs', 'store-assets');
await mkdir(output, { recursive: true });

const sources = new Map();
async function imageSource(relative) {
  const bytes = await readFile(path.join(root, relative));
  const image = PNG.sync.read(bytes);
  sources.set(relative, { width: image.width, height: image.height, sha256: createHash('sha256').update(bytes).digest('hex') });
  return { src: `data:image/png;base64,${bytes.toString('base64')}`, width: image.width, height: image.height };
}

// Keine CDN-Schriften oder fremden Logos: nur tatsächliche UI-Aufnahmen,
// das eigene Erweiterungssymbol und lokal gesetzter Beschreibungstext.
const icon = await imageSource('build/chromium/icons/128.png');
if (icon.width !== 128 || icon.height !== 128) throw new Error('Zuerst npm run build ausführen: Das Store-Icon muss 128×128 Pixel haben.');

const copy = {
  de: {
    eyebrow: 'QR-CODES FÜR DEINE WEBPROJEKTE',
    intro: 'Dein Link. Dein Design.',
    features: ['Seitenfarben mit einem Klick', 'Logo übernehmen oder hochladen', 'Projektvorlagen lokal speichern'],
    formats: 'PNG · SVG · Bild kopieren',
    footer: 'Lokal erstellt. Ohne Konto.',
    caption: 'Tatsächliche Oberfläche · Beispieldaten',
  },
  en: {
    eyebrow: 'QR CODES FOR YOUR WEB PROJECTS',
    intro: 'Your link. Your design.',
    features: ['Page colors in one click', 'Use a page logo or upload your own', 'Save project presets locally'],
    formats: 'PNG · SVG · Copy image',
    footer: 'Created locally. No account.',
    caption: 'Actual interface · Sample data',
  },
};
const palette = ['#183b31', '#f4efdf', '#204c73', '#f8d277', '#000000'];
const escapeHtml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

function screenshotHtml(lang, screenshot) {
  const text = copy[lang];
  return `<!doctype html><html lang="${lang}"><meta charset="utf-8"><title>QR Extension Super Intelligent</title>
    <style>
      * { box-sizing: border-box; }
      html, body { width: 1280px; height: 800px; margin: 0; overflow: hidden; }
      body { background: #eef2ed; color: #17392f; font-family: Arial, Helvetica, sans-serif; }
      main { width: 1280px; height: 800px; display: grid; grid-template-columns: 720px 1fr; }
      .copy { padding: 58px 0 50px 64px; display: flex; flex-direction: column; align-items: flex-start; }
      .eyebrow { margin: 0 0 31px; font-size: 15px; font-weight: 700; letter-spacing: 1.4px; color: #3b6656; }
      h1 { margin: 0; font-size: 57px; letter-spacing: -2px; line-height: 1.07; font-weight: 800; }
      .intro { margin: 22px 0 38px; font-size: 28px; color: #426254; }
      ul { margin: 0 0 32px; padding: 0; display: grid; gap: 24px; list-style: none; }
      li { display: flex; align-items: center; gap: 15px; font-size: 24px; line-height: 1.35; }
      .point { width: 10px; height: 10px; background: #2c7358; border-radius: 3px; flex-shrink: 0; }
      .swatches { display: flex; gap: 11px; margin: 0 0 38px; }
      .swatches span { width: 43px; height: 43px; border: 1px solid #a7b7a9; border-radius: 8px; }
      .formats { margin: 0; font-size: 22px; font-weight: 700; color: #17392f; }
      .footer { margin-top: auto; font-size: 20px; color: #426254; }
      figure { margin: 0; padding: 20px 40px 15px 25px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
      figure img { width: auto; height: auto; max-width: 455px; max-height: 728px; box-shadow: 0 10px 36px #17392f20; border: 1px solid #cdd8ce; }
      figcaption { margin-top: 12px; font-size: 13px; line-height: 1; color: #496557; }
    </style>
    <main><section class="copy"><p class="eyebrow">${text.eyebrow}</p>
      <h1>QR Extension<br>Super Intelligent</h1><p class="intro">${text.intro}</p>
      <ul>${text.features.map((feature) => `<li><span class="point"></span>${escapeHtml(feature)}</li>`).join('')}</ul>
      <div class="swatches" aria-hidden="true">${palette.map((color) => `<span style="background:${color}"></span>`).join('')}</div>
      <p class="formats">${text.formats}</p><p class="footer">${text.footer}</p>
    </section><figure><img src="${screenshot.src}" alt="${text.caption}"><figcaption>${text.caption}</figcaption></figure></main></html>`;
}

function promoHtml() {
  return `<!doctype html><html><meta charset="utf-8"><title>QR Extension Super Intelligent</title><style>
    * { box-sizing: border-box; } html,body { width:440px; height:280px; margin:0; overflow:hidden; }
    body { background:#194a3a; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; }
    .icon { width:184px; height:184px; border-radius:22px; background:#f1f4eb; display:flex; align-items:center; justify-content:center; }
    img { width:184px; height:184px; image-rendering:pixelated; }
    .swatches { display:flex; gap:12px; }
    .swatches span { width:34px; height:34px; border-radius:7px; border:1px solid #ffffff66; }
    </style><div class="icon"><img src="${icon.src}" alt=""></div><div class="swatches">${palette.map((color) => `<span style="background:${color}"></span>`).join('')}</div></html>`;
}

const generated = [];
async function saveRgb(page, filename, html, width, height) {
  await page.setViewportSize({ width, height });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((img) => img.decode())); });
  const screenshot = PNG.sync.read(await page.screenshot({ type: 'png', animations: 'disabled' }));
  const encoded = PNG.sync.write(screenshot, { colorType: 2, inputColorType: 6 });
  if (encoded[25] !== 2 || screenshot.width !== width || screenshot.height !== height) throw new Error(`Ungültiges PNG-Format: ${filename}`);
  await writeFile(path.join(output, filename), encoded);
  generated.push({ file: filename, width, height, pngColorType: 2 });
  console.log(`Erstellt: docs/store-assets/${filename} (${width}×${height}, RGB ohne Alpha)`);
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ deviceScaleFactor: 1, viewport: { width: 1280, height: 800 } });
  // Auch die reine Asset-Erstellung darf keine externen Ressourcen laden.
  await context.route(/^https?:\/\//, (route) => route.abort());
  const page = await context.newPage();
  for (const lang of ['de', 'en']) {
    const screenshot = await imageSource(`docs/images/popup-${lang}.png`);
    await saveRgb(page, `screenshot-${lang}-1280x800.png`, screenshotHtml(lang, screenshot), 1280, 800);
  }
  await saveRgb(page, 'promo-440x280.png', promoHtml(), 440, 280);
  await context.close();
} finally { await browser.close(); }

await copyFile(path.join(root, 'build/chromium/icons/128.png'), path.join(output, 'icon-128.png'));
generated.push({ file: 'icon-128.png', width: 128, height: 128, alphaPreserved: true });
await writeFile(path.join(output, 'assets.json'), JSON.stringify({ generatedBy: 'scripts/store-assets.mjs', sources: Object.fromEntries(sources), assets: generated }, null, 2) + '\n');
console.log('Erstellt: docs/store-assets/icon-128.png und assets.json');
