import { build } from 'esbuild';
import { mkdir, readFile, writeFile, copyFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));

// Ein schlichtes selbst gezeichnetes Funktionszeichen, kein generierter Bildinhalt.
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const typeBytes = Buffer.from(type);
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([length, typeBytes, data, checksum]);
}
function icon(size) {
  const rows = [];
  // Das 128px-Storeicon trägt 96px Bildinhalt mit 16px transparentem Rand.
  // https://developer.chrome.com/docs/webstore/images#extension-icon
  const padding = size === 128 ? 16 : 0;
  const artwork = size - padding * 2;
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    for (let x = 0; x < size; x++) {
      if (x < padding || y < padding || x >= size - padding || y >= size - padding) continue;
      const gx = Math.floor((x - padding) / artwork * 25), gy = Math.floor((y - padding) / artwork * 25);
      let ink = false;
      for (const [ox, oy] of [[3, 3], [15, 3], [3, 15]]) {
        const dx = gx - ox, dy = gy - oy;
        if (dx >= 0 && dx < 7 && dy >= 0 && dy < 7) ink = dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
      }
      if (gx >= 15 && gx < 22 && gy >= 15 && gy < 22) ink = (gx + gy) % 3 !== 0;
      row.set(ink ? [24, 59, 49, 255] : [245, 246, 243, 255], 1 + x * 4);
    }
    rows.push(row);
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4); header[8] = 8; header[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(Buffer.concat(rows))), chunk('IEND', Buffer.alloc(0))]);
}

const common = {
  manifest_version: 3, name: 'QR Extension Super Intelligent', version: pkg.version,
  default_locale: 'en',
  description: '__MSG_description__',
  permissions: ['activeTab', 'storage', 'scripting', 'clipboardWrite'],
  action: { default_popup: 'popup.html', default_title: '__MSG_actionTitle__', default_icon: { 16: 'icons/16.png', 32: 'icons/32.png' } },
  icons: { 48: 'icons/48.png', 96: 'icons/96.png', 128: 'icons/128.png' },
  content_security_policy: { extension_pages: "script-src 'self'; object-src 'none'; connect-src 'none'; img-src 'self' data: blob:; style-src 'self'; base-uri 'none'; form-action 'none'" },
};

for (const target of ['firefox', 'chromium']) {
  const dir = path.join(root, 'build', target);
  await mkdir(path.join(dir, 'icons'), { recursive: true });
  const manifest = structuredClone(common);
  if (target === 'firefox') manifest.browser_specific_settings = { gecko: {
    id: 'qr-extension-super-intelligent@ogulcankaya68', strict_min_version: '142.0',
    data_collection_permissions: { required: ['none'] },
  } };
  await writeFile(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await copyFile(path.join(root, 'src/popup.html'), path.join(dir, 'popup.html'));
  await copyFile(path.join(root, 'src/popup.css'), path.join(dir, 'popup.css'));
  await build({ entryPoints: [path.join(root, 'src/popup.js')], outfile: path.join(dir, 'popup.js'), bundle: true, format: 'iife', target: ['firefox140', 'chrome120'], minify: false, sourcemap: false, legalComments: 'eof' });
  for (const size of [16, 32, 48, 96, 128]) await writeFile(path.join(dir, `icons/${size}.png`), icon(size));
  for (const [locale, description, title] of [
    ['en', 'Create QR codes with page colors, logos and saved project presets. Local, no account.', 'QR code for this page'],
    ['de', 'QR-Codes mit Seitenfarben, Logos und gespeicherten Projektvorlagen. Lokal, ohne Konto.', 'QR-Code für diese Seite'],
  ]) {
    await mkdir(path.join(dir, '_locales', locale), { recursive: true });
    await writeFile(path.join(dir, '_locales', locale, 'messages.json'), JSON.stringify({ description: { message: description }, actionTitle: { message: title } }, null, 2) + '\n');
  }
  await writeFile(path.join(dir, 'DRITTANBIETER.txt'), `${await readFile(path.join(root, 'DRITTANBIETER.txt'), 'utf8')}\n\njsQR 1.4.0\nhttps://github.com/cozmo/jsQR\n${await readFile(path.join(root, 'docs/licenses/jsqr-LICENSE.txt'), 'utf8')}`);
  await copyFile(path.join(root, 'LICENSE'), path.join(dir, 'LICENSE'));
  console.log(`Erstellt: build/${target} (${(await readdir(dir)).length} Einträge)`);
}
