import test from 'node:test';
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import { readLogoFile, validateLogoRect, cropVisibleLogo } from '../src/logo.js';

test('Nur begrenzte, vollständig im aktuellen Viewport liegende Logo-Ausschnitte sind zulässig', () => {
  const viewport = { width: 1000, height: 700 };
  const rect = { x: 10, y: 20, width: 150, height: 70 };
  assert.equal(validateLogoRect(rect, viewport), true);
  for (const change of [{ x: -1 }, { y: -1 }, { width: 0 }, { height: NaN },
    { width: Infinity }, { width: 501 }, { height: 301 }, { x: 950 }]) {
    assert.equal(validateLogoRect({ ...rect, ...change }, viewport), false);
  }
  assert.equal(validateLogoRect({ x: 0, y: 0, width: 250, height: 150 }, { width: 300, height: 200 }), false);
  assert.equal(validateLogoRect(rect, { width: 0, height: 700 }), false);
});

test('Upload lehnt SVG, gefälschte MIME-Typen und übergroße Dateien vor dem Decodieren ab', async () => {
  const png = PNG.sync.write(new PNG({ width: 16, height: 16 }));
  const inputs = [
    [new File(['<svg onload="alert(1)"/>'], 'logo.svg', { type: 'image/svg+xml' }), 'logoInvalid'],
    [new File([png], 'logo.jpg', { type: 'image/jpeg' }), 'logoInvalid'],
    [new File(['keine PNG-Daten'], 'logo.png', { type: 'image/png' }), 'logoInvalid'],
    [new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'gross.png', { type: 'image/png' }), 'logoTooLarge'],
  ];
  for (const [file, code] of inputs) await assert.rejects(readLogoFile(file), (error) => error.code === code);
});

test('Offensichtlich übergroße PNG-Abmessungen und fremde Screenshot-URLs scheitern früh', async () => {
  const bytes = PNG.sync.write(new PNG({ width: 16, height: 16 }));
  bytes.writeUInt32BE(5000, 16);
  await assert.rejects(readLogoFile(new File([bytes], 'gross.png', { type: 'image/png' })), (error) => error.code === 'logoTooLarge');
  await assert.rejects(cropVisibleLogo('https://example.at/screenshot.png', { x: 0, y: 0, width: 50, height: 50 },
    { width: 1000, height: 700 }), (error) => error.code === 'logoReadFailed');
});
