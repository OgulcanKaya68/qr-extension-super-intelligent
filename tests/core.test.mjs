import test from 'node:test';
import assert from 'node:assert/strict';
import qrcode from 'qrcode-generator';
import { PNG } from 'pngjs';
import {
  DEFAULT_DESIGN,
  normalizeDesign,
  isScannableForeground,
  validateUrl,
  validateDesign,
  buildQrOptions,
  exportFilename,
  safePreset,
  safeLogo,
} from '../src/core.js';

test('Unterseiten, Parameter, Kodierung und Fragment bleiben exakt erhalten', () => {
  const url = 'https://Example.at:443/projekt/%2f/Kontakt?b=2&a=%2B&a=1#abschnitt%20zwei';
  const result = validateUrl(`  ${url}  `);
  assert.equal(result.valid, true);
  assert.equal(result.url, url);
});

test('HTTP und internationale Pfade sind zulässig', () => {
  for (const url of ['http://example.at/seite', 'https://example.at/über-uns?name=Ögi#größe']) {
    assert.equal(validateUrl(url).valid, true, url);
    assert.equal(validateUrl(url).url, url);
  }
});

test('Browserseiten, lokale Dateien und ausführbare Schemata werden abgewiesen', () => {
  for (const input of ['', 'example.at', 'keine adresse', 'https://', 'about:blank',
    'file:///private/datei.html', 'javascript:alert(1)', 'data:text/html,test',
    'ftp://example.at/datei', 'chrome://extensions/']) {
    const result = validateUrl(input);
    assert.equal(result.valid, false, input);
    assert.ok(result.error, `Fehlermeldung fehlt für ${input}`);
  }
});

test('Die URL-Grenze zählt UTF-8-Bytes und nicht Zeichen', () => {
  const prefix = 'https://example.at/';
  const atLimit = prefix + 'a'.repeat(1200 - Buffer.byteLength(prefix));
  const unicodeOverLimit = prefix + 'ä'.repeat(600);
  assert.equal(Buffer.byteLength(atLimit), 1200);
  assert.equal(validateUrl(atLimit).valid, true);
  assert.equal(validateUrl(`${atLimit}a`).valid, false);
  assert.ok(unicodeOverLimit.length < 1200);
  assert.equal(validateUrl(unicodeOverLimit).valid, false);
});

test('Lokale Entwicklungsadressen sind nutzbar und erhalten einen Hinweis', () => {
  const result = validateUrl('http://localhost:5173/kontakt');
  assert.equal(result.valid, true);
  assert.ok(result.warning);
  assert.equal(result.url, 'http://localhost:5173/kontakt');
});

test('Standardgestaltung und alle angebotenen Formen und Größen sind gültig', () => {
  assert.equal(validateDesign(DEFAULT_DESIGN).valid, true);
  for (const shape of ['square', 'rounded', 'dots']) {
    for (const size of [512, 1024, 2048]) {
      assert.equal(validateDesign({ ...DEFAULT_DESIGN, shape, size }).valid, true);
    }
  }
});

test('Nur Vordergrundfarben mit mindestens 7:1 Kontrast zu Weiß sind scanbar', () => {
  for (const color of ['#aaaaaa', '#ffffff', '#f0f0f0', '#5a5a5a']) assert.equal(isScannableForeground(color), false, color);
  for (const color of ['#000000', '#183b31', '#102030', '#595959']) assert.equal(isScannableForeground(color), true, color);
  assert.equal(validateDesign({ ...DEFAULT_DESIGN, foreground: '#aaaaaa' }).valid, false);
  assert.equal(validateDesign({ ...DEFAULT_DESIGN, foreground: '#183b31' }).valid, true);
});

test('Die Kontrastschranke liegt bei 7:1 und nicht bei 4,5:1', () => {
  assert.equal(validateDesign({
    ...DEFAULT_DESIGN, foreground: '#595959',
  }).valid, true);
  assert.equal(validateDesign({
    ...DEFAULT_DESIGN, foreground: '#5a5a5a',
  }).valid, false);
  assert.equal(validateDesign({
    ...DEFAULT_DESIGN, foreground: '#767676',
  }).valid, false);
});

test('Der QR-Hintergrund bleibt beim Laden alter Farben und beim Rendern weiß', () => {
  const normalized = normalizeDesign({ ...DEFAULT_DESIGN, foreground: '#102030', background: '#183b31' });
  assert.equal(normalized.foreground, '#102030');
  assert.equal(normalized.background, '#ffffff');
  assert.equal(buildQrOptions('https://example.at/', { ...normalized, background: '#e5e5e5' }).backgroundOptions.color, '#ffffff');
  assert.equal(normalizeDesign({ ...DEFAULT_DESIGN, foreground: '#aaaaaa', background: '#000000' }).foreground, DEFAULT_DESIGN.foreground);
});

test('Ungültige Gestaltungswerte passieren die strikte Prüfung nicht', () => {
  for (const change of [
    { foreground: 'rot' }, { shape: 'star' },
    { size: 100 }, { size: 0 }, { size: Number.NaN },
  ]) {
    assert.equal(validateDesign({ ...DEFAULT_DESIGN, ...change }).valid, false);
  }
  assert.equal(validateDesign({ ...DEFAULT_DESIGN, background: '#gggggg' }).valid, true);
});

test('Normalisierung fängt beschädigte gespeicherte Felder ab und verwirft Zusatzdaten', () => {
  assert.deepEqual(normalizeDesign(null), DEFAULT_DESIGN);
  assert.deepEqual(normalizeDesign({
    foreground: 'kaputt', background: '#ffffff', shape: 'star', size: -1,
    url: 'https://private.example/geheim',
  }), DEFAULT_DESIGN);
  const normalized = normalizeDesign({ ...DEFAULT_DESIGN, shape: 'dots', ignored: true });
  assert.equal(normalized.shape, 'dots');
  assert.equal('ignored' in normalized, false);
});

test('QR-Konfiguration übernimmt URL und Exportgröße; der Hintergrund ist immer weiß', () => {
  const url = 'https://example.at/kontakt?a=%2B#team';
  const options = buildQrOptions(url, DEFAULT_DESIGN);
  assert.equal(options.data, url);
  assert.equal(options.width, DEFAULT_DESIGN.size);
  assert.equal(options.height, DEFAULT_DESIGN.size);
  assert.equal(options.qrOptions.errorCorrectionLevel, 'Q');
  assert.equal(options.qrOptions.mode, 'Byte');
  assert.equal(options.dotsOptions.color, DEFAULT_DESIGN.foreground);
  assert.equal(options.backgroundOptions.color, '#ffffff');
});

test('Der freie Rand umfasst mindestens vier Module auch bei langen UTF-8-Adressen', () => {
  // DENSO verlangt vier freie Module auf jeder Seite:
  // https://www.qrcode.com/en/howto/code.html
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
  for (const url of ['https://example.at/', 'https://example.at/' + 'ü'.repeat(300)]) {
    const reference = qrcode(0, 'Q');
    reference.addData(url, 'Byte');
    reference.make();
    for (const size of [512, 1024, 2048]) {
      const options = buildQrOptions(url, { ...DEFAULT_DESIGN, size });
      const moduleWidth = (size - 2 * options.margin) / reference.getModuleCount();
      assert.ok(options.margin >= 4 * moduleWidth, `${size}px, ${url.length} Zeichen`);
      assert.ok(size > 2 * options.margin, 'Der Rand darf die Nutzfläche nicht aufbrauchen');
    }
  }
});

test('Finder-Muster bleiben bei jeder Punktform eckig', () => {
  for (const shape of ['square', 'rounded', 'dots']) {
    const options = buildQrOptions('https://example.at/', { ...DEFAULT_DESIGN, shape });
    assert.equal(options.cornersSquareOptions.type, 'square');
    assert.equal(options.cornersDotOptions.type, 'square');
  }
});

test('Ungültige Eingaben erzeugen keine exportierbare QR-Konfiguration', () => {
  assert.throws(() => buildQrOptions('javascript:alert(1)', DEFAULT_DESIGN));
  assert.throws(() => buildQrOptions('https://example.at/', { ...DEFAULT_DESIGN, shape: 'star' }));
  assert.throws(() => buildQrOptions('https://example.at/', {
    ...DEFAULT_DESIGN, foreground: '#eeeeee',
  }));
});

test('Exportdateinamen nennen Projekt und Unterseite, ohne Parameter oder Fragment zu verraten', () => {
  for (const extension of ['png', 'svg']) {
    const filename = exportFilename(
      'https://example.at/kontakt?token=QUERYGEHEIM#HASHGEHEIM',
      'Mein Projekt', extension,
    );
    assert.ok(filename.endsWith(`.${extension}`));
    assert.match(filename, /kontakt/i);
    assert.match(filename, /projekt/i);
    assert.doesNotMatch(filename, /QUERYGEHEIM|HASHGEHEIM|token|[/?#\\\x00-\x1f]/);
  }
});

test('Dateinamen bleiben sicher bei ungünstigen Vorlagennamen', () => {
  const filename = exportFilename('https://example.at/kontakt', '../Projekt:\\ Test?', 'png');
  assert.doesNotMatch(filename, /[/:?\\\x00-\x1f]/);
  assert.notEqual(filename, '.png');
  assert.throws(() => exportFilename('https://example.at/', '', 'exe'));
  assert.throws(() => exportFilename('file:///geheim', '', 'png'));
});

test('Beschädigte gespeicherte Vorlagen werden verworfen', () => {
  const valid = { id: 'projekt-1', name: 'Projekt', design: { ...DEFAULT_DESIGN } };
  for (const value of [null, [], 'test', {},
    { ...valid, id: '../projekt' }, { ...valid, id: '' },
    { ...valid, id: 'a'.repeat(81) }, { ...valid, name: ' ' },
    { ...valid, name: 'a'.repeat(51) }, { ...valid, design: null },
    { ...valid, design: { ...DEFAULT_DESIGN, foreground: 'kaputt' } },
  ]) {
    assert.equal(safePreset(value), null);
  }
});

test('Gültige Vorlagen speichern nur Gestaltung, ID und bereinigten Namen', () => {
  const result = safePreset({
    id: 'projekt-1', name: '  Mein Projekt  ',
    design: { ...DEFAULT_DESIGN, url: 'https://private.example/geheim' },
    url: 'https://private.example/geheim', history: ['https://private.example'],
  });
  assert.deepEqual(result, { id: 'projekt-1', name: 'Mein Projekt', design: DEFAULT_DESIGN });
});

function logoData(width = 64, height = 64) {
  const image = new PNG({ width, height });
  for (let offset = 0; offset < image.data.length; offset += 4) {
    image.data[offset] = 30; image.data[offset + 1] = 90;
    image.data[offset + 2] = 180; image.data[offset + 3] = 255;
  }
  return `data:image/png;base64,${PNG.sync.write(image).toString('base64')}`;
}

test('Logo-Vorlagen enthalten ausschließlich begrenzte lokale PNG-Daten', () => {
  const logo = logoData();
  assert.equal(safeLogo(logo), logo);
  assert.equal(safeLogo(logoData(256, 256)), logoData(256, 256));
  for (const invalid of [null, '', 'https://example.at/logo.png', 'data:image/svg+xml,<svg/>',
    logo.replace('image/png', 'image/jpeg'), 'data:image/png;base64,AAAA',
    `data:image/png;base64,${Buffer.alloc(65537).toString('base64')}`, logoData(257, 20)]) {
    assert.equal(safeLogo(invalid), null);
  }
  assert.equal(validateDesign({ ...DEFAULT_DESIGN, logo: 'https://example.at/logo.png' }).valid, false);
  assert.equal(normalizeDesign({ ...DEFAULT_DESIGN, logo: 'https://example.at/logo.png' }).logo, null);
  assert.equal(safePreset({ id: 'logo-projekt', name: 'Logo', design: { ...DEFAULT_DESIGN, logo } }).design.logo, logo);
});

test('Ein Logo erhöht die Fehlerkorrektur; ohne Logo bleibt das bisherige Verhalten erhalten', () => {
  const logo = logoData();
  assert.equal(buildQrOptions('https://example.at/', { ...DEFAULT_DESIGN, logo }).qrOptions.errorCorrectionLevel, 'H');
  assert.equal(buildQrOptions('https://example.at/', DEFAULT_DESIGN).qrOptions.errorCorrectionLevel, 'Q');
});

test('Adressen mit eingebetteten Zugangsdaten werden nicht zum QR-Code verarbeitet', () => {
  for (const address of ['https://name:passwort@example.at/seite', 'https://name@example.at/']) {
    assert.equal(validateUrl(address).valid, false);
    assert.throws(() => buildQrOptions(address, DEFAULT_DESIGN));
  }
});
