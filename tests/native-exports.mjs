import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(root, '.browser-cache');
const { chromium } = await import('playwright');
const [directory, expected] = process.argv.slice(2);
assert(directory && expected, 'Aufruf: node tests/native-exports.mjs DOWNLOADORDNER ERWARTETE_URL');
const files = await readdir(directory);
const png = PNG.sync.read(await readFile(path.join(directory, files.find((f) => f.endsWith('.png')))));
assert.equal(jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data, expected);
console.log('✓ Nativer Firefox-Download: PNG unabhängig und exakt decodiert.');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.addScriptTag({ path: path.join(root, 'node_modules/jsqr/dist/jsQR.js') });
  const decoded = await page.evaluate(async (source) => {
    const objectUrl = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml' }));
    try {
      const image = new Image(); image.src = objectUrl; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      return window.jsQR(pixels.data, pixels.width, pixels.height)?.data;
    } finally { URL.revokeObjectURL(objectUrl); }
  }, await readFile(path.join(directory, files.find((f) => f.endsWith('.svg'))), 'utf8'));
  assert.equal(decoded, expected);
  console.log('✓ Nativer Firefox-Download: SVG unabhängig und exakt decodiert.');
} finally { await browser.close(); }
