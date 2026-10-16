import { safeLogo } from './core.js';

function failure(code) { const error = new Error(code); error.code = code; return error; }

async function pngFromBitmap(bitmap, crop) {
  const source = crop ?? { x: 0, y: 0, width: bitmap.width, height: bitmap.height };
  const factor = Math.min(1, 256 / Math.max(source.width, source.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(source.width * factor));
  canvas.height = Math.max(1, Math.round(source.height * factor));
  const context = canvas.getContext('2d');
  if (!context) throw failure('logoReadFailed');
  context.drawImage(bitmap, source.x, source.y, source.width, source.height, 0, 0, canvas.width, canvas.height);
  let data = canvas.toDataURL('image/png');
  // Hochauflösende oder verrauschte Logos bei Bedarf weiter verkleinern.
  while (!safeLogo(data) && canvas.width > 48 && canvas.height > 16) {
    const next = document.createElement('canvas');
    next.width = Math.max(1, Math.floor(canvas.width * 0.75)); next.height = Math.max(1, Math.floor(canvas.height * 0.75));
    const nextContext = next.getContext('2d');
    if (!nextContext) throw failure('logoReadFailed');
    nextContext.drawImage(canvas, 0, 0, next.width, next.height);
    canvas.width = next.width; canvas.height = next.height;
    context.drawImage(next, 0, 0);
    data = canvas.toDataURL('image/png');
  }
  if (!safeLogo(data)) throw failure('logoTooLarge');
  return data;
}

export async function readLogoFile(file) {
  if (!file || file.size > 4 * 1024 * 1024) throw failure('logoTooLarge');
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw failure('logoInvalid');
  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const valid = file.type === 'image/png' ? bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71
    : file.type === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  if (!valid) throw failure('logoInvalid');
  if (file.type === 'image/png' && bytes.length >= 24) {
    const header = new DataView(bytes.buffer);
    if (header.getUint32(16) > 4096 || header.getUint32(20) > 4096) throw failure('logoTooLarge');
  }
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    if (bitmap.width > 4096 || bitmap.height > 4096 || bitmap.width * bitmap.height > 16_000_000) throw failure('logoTooLarge');
    return await pngFromBitmap(bitmap);
  } catch (error) {
    throw error.code ? error : failure('logoReadFailed');
  } finally { bitmap?.close(); }
}

export function validateLogoRect(rect, viewport) {
  if (!rect || !viewport || ![rect.x, rect.y, rect.width, rect.height, viewport.width, viewport.height].every(Number.isFinite)) return false;
  return viewport.width > 0 && viewport.height > 0 && rect.x >= 0 && rect.y >= 0 && rect.width >= 8 && rect.height >= 8
    && rect.width <= 500 && rect.height <= 300 && rect.width * rect.height <= viewport.width * viewport.height * 0.35
    && rect.x + rect.width <= viewport.width + 1 && rect.y + rect.height <= viewport.height + 1;
}

export async function cropVisibleLogo(screenshot, rect, viewport) {
  if (typeof screenshot !== 'string' || !screenshot.startsWith('data:image/png;base64,') || screenshot.length > 50_000_000 || !validateLogoRect(rect, viewport)) throw failure('logoReadFailed');
  const raw = atob(screenshot.slice(22));
  const bytes = Uint8Array.from(raw, (character) => character.charCodeAt(0));
  let bitmap;
  try {
    bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const sx = bitmap.width / viewport.width, sy = bitmap.height / viewport.height;
    if (Math.abs(sx - sy) > Math.max(sx, sy) * 0.05) throw failure('logoReadFailed');
    return await pngFromBitmap(bitmap, { x: rect.x * sx, y: rect.y * sy, width: rect.width * sx, height: rect.height * sy });
  } catch (error) { throw error.code ? error : failure('logoReadFailed'); }
  finally { bitmap?.close(); }
}
