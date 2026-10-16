import qrcode from 'qrcode-generator';

qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];

export const DEFAULT_DESIGN = Object.freeze({
  foreground: '#183b31', background: '#ffffff', shape: 'square', size: 1024, logo: null,
});
const SHAPES = ['square', 'rounded', 'dots'];
const SIZES = [512, 1024, 2048];
const COLOR = /^#[0-9a-f]{6}$/i;
const MAX_URL_BYTES = 1200;
const isColor = (value) => typeof value === 'string' && COLOR.test(value);
export const MAX_LOGO_BYTES = 64 * 1024;

export function safeLogo(value) {
  if (typeof value !== 'string' || value.length > 87500 || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) return null;
  let bytes;
  try { bytes = Uint8Array.from(atob(value.slice(22)), (character) => character.charCodeAt(0)); }
  catch { return null; }
  if (bytes.length < 33 || bytes.length > MAX_LOGO_BYTES || ![137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte)) return null;
  if (String.fromCharCode(...bytes.slice(12, 16)) !== 'IHDR') return null;
  const view = new DataView(bytes.buffer);
  const width = view.getUint32(16), height = view.getUint32(20);
  return width > 0 && height > 0 && width <= 256 && height <= 256 ? value : null;
}

export function normalizeDesign(input) {
  const source = input && typeof input === 'object' ? input : {};
  return {
    foreground: isColor(source.foreground) ? source.foreground.toLowerCase() : DEFAULT_DESIGN.foreground,
    background: isColor(source.background) ? source.background.toLowerCase() : DEFAULT_DESIGN.background,
    shape: SHAPES.includes(source.shape) ? source.shape : DEFAULT_DESIGN.shape,
    size: SIZES.includes(source.size) ? source.size : DEFAULT_DESIGN.size,
    logo: safeLogo(source.logo),
  };
}

export function validateUrl(raw) {
  const url = typeof raw === 'string' ? raw.trim() : '';
  if (!url) return { valid: false, url, error: 'Öffne eine Webseite oder füge eine Adresse ein.', warning: '' };
  let parsed;
  try { parsed = new URL(url); }
  catch { return { valid: false, url, error: 'Bitte eine vollständige Adresse mit https:// oder http:// eingeben.', warning: '' }; }
  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
    return { valid: false, url, error: 'Hier sind nur Webseiten mit https:// oder http:// möglich.', warning: '' };
  }
  if (parsed.username || parsed.password) {
    return { valid: false, url, error: 'Bitte eine Adresse ohne eingebetteten Benutzernamen oder Passwort verwenden.', warning: '' };
  }
  if (new TextEncoder().encode(url).length > MAX_URL_BYTES) {
    return { valid: false, url, error: 'Die Adresse ist zu lang. Bitte auf höchstens 1200 UTF-8-Bytes kürzen.', warning: '' };
  }
  const local = /^(localhost|127(?:\.\d{1,3}){3}|\[::1\])$/i.test(parsed.hostname) || parsed.hostname.endsWith('.localhost');
  return {
    valid: true, url, error: '',
    warning: local ? 'Lokale Adresse: Auf deinem Handy zeigt localhost auf das Handy. Nutze zum Testen eine erreichbare Netzwerk- oder Vorschauadresse.' : '',
  };
}

function luminance(hex) {
  const channels = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function validateDesign(design) {
  if (!design || !isColor(design.foreground) || !isColor(design.background) || !SHAPES.includes(design.shape) || !SIZES.includes(design.size)
    || (design.logo != null && !safeLogo(design.logo))) {
    return { valid: false, error: 'Bitte gültige Farben, eine Punktform und eine angebotene Exportgröße wählen.' };
  }
  const dark = luminance(design.foreground);
  const light = luminance(design.background);
  if (dark >= light || (light + 0.05) / (dark + 0.05) < 7) {
    return { valid: false, error: 'Für zuverlässiges Scannen: dunklere Punkte und einen helleren Hintergrund wählen (Kontrast mindestens 7:1).' };
  }
  return { valid: true, error: '' };
}

export function buildQrOptions(url, design) {
  const link = validateUrl(url);
  const style = validateDesign(design);
  if (!link.valid || !style.valid) throw new Error(link.error || style.error);
  const correction = design.logo ? 'H' : 'Q';
  const matrix = qrcode(0, correction);
  matrix.addData(link.url, 'Byte');
  matrix.make();
  const margin = Math.ceil(design.size * 4 / (matrix.getModuleCount() + 8));
  return {
    type: 'svg', width: design.size, height: design.size, data: link.url, margin,
    qrOptions: { typeNumber: 0, mode: 'Byte', errorCorrectionLevel: correction },
    dotsOptions: { color: design.foreground, type: design.shape },
    cornersSquareOptions: { color: design.foreground, type: 'square' },
    cornersDotOptions: { color: design.foreground, type: 'square' },
    backgroundOptions: { color: design.background },
    logo: safeLogo(design.logo),
  };
}

function slug(text) {
  return text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90).replace(/-$/g, '');
}

export function exportFilename(raw, presetName = '', extension = 'png') {
  if (!['png', 'svg'].includes(extension)) throw new Error('Unbekanntes Exportformat.');
  const checked = validateUrl(raw);
  if (!checked.valid) throw new Error(checked.error);
  const parsed = new URL(checked.url);
  let path;
  try { path = decodeURIComponent(parsed.pathname); } catch { path = parsed.pathname; }
  const label = slug([presetName, parsed.hostname, path].filter(Boolean).join('-')) || 'webseite';
  return `${label}-qr.${extension}`;
}

export function safePreset(input) {
  if (!input || typeof input !== 'object' || typeof input.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(input.id)
    || typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 50 || !validateDesign(input.design).valid) return null;
  return { id: input.id, name: input.name.trim(), design: normalizeDesign(input.design) };
}
