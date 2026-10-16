import LocalQr from './qr.js';
import { DEFAULT_DESIGN, normalizeDesign, validateUrl, validateDesign, buildQrOptions, exportFilename, safePreset, safeLogo } from './core.js';
import { analyzePage } from './page-analysis.js';
import { readLogoFile, cropVisibleLogo, validateLogoRect } from './logo.js';
import { applyLanguage, initialLanguage, t } from './i18n.js';

const api = globalThis.browser ?? globalThis.chrome;
const hasExtension = Boolean(api?.runtime?.id && api?.storage?.local);
const STORAGE_KEY = 'projektQrState';
const elements = Object.fromEntries([
  'url', 'refresh-url', 'qr-preview', 'preview-placeholder', 'url-message',
  'foreground', 'foreground-hex', 'background', 'background-hex', 'size', 'design-message',
  'preset-select', 'preset-update', 'preset-delete', 'preset-details', 'preset-name', 'preset-save', 'preset-message',
  'download-png', 'download-svg', 'copy-image', 'clipboard-message', 'status', 'language',
  'palette-list', 'palette-target', 'palette-message', 'analyze-page',
  'logo-from-page', 'logo-upload', 'logo-remove', 'logo-preview', 'logo-message', 'logo-candidates', 'privacy-notice',
].map((id) => [id, document.getElementById(id)]));

const validationKeys = new Map([
  ['Öffne eine Webseite oder füge eine Adresse ein.', 'urlRequired'],
  ['Bitte eine vollständige Adresse mit https:// oder http:// eingeben.', 'urlInvalid'],
  ['Hier sind nur Webseiten mit https:// oder http:// möglich.', 'urlProtocol'],
  ['Bitte eine Adresse ohne eingebetteten Benutzernamen oder Passwort verwenden.', 'urlCredentials'],
  ['Die Adresse ist zu lang. Bitte auf höchstens 1200 UTF-8-Bytes kürzen.', 'urlTooLong'],
  ['Lokale Adresse: Auf deinem Handy zeigt localhost auf das Handy. Nutze zum Testen eine erreichbare Netzwerk- oder Vorschauadresse.', 'urlLocal'],
  ['Bitte gültige Farben, eine Punktform und eine angebotene Exportgröße wählen.', 'designInvalid'],
  ['Für zuverlässiges Scannen: dunklere Punkte und einen helleren Hintergrund wählen (Kontrast mindestens 7:1).', 'designContrast'],
]);
const persistentStatus = new Set(['storageReadError', 'storageWriteError', 'storageNotLoaded', 'previewMode']);
const displayedMessages = new Map();
let state = { design: { ...DEFAULT_DESIGN }, presets: [], selectedPresetId: '', language: initialLanguage() };
let activeTab = null;
let privateMode = Boolean(api?.extension?.inIncognitoContext);
let storageLoaded = false;
let storageBusy = false;
let lastStoredSnapshot = null;
let autoSavePending = false;
let initializing = true;
let generation = 0;
let urlRevision = 0;
let renderTimer;
let currentQr = null;
let previewObjectUrl = null;
let exporting = false;
let paletteRevision = 0;
let paletteLoading = false;
let pageColors = [];
let logoRevision = 0;
let logoProcessing = false;
let logoCandidates = [];
let deferredLogo = null;

function message(id, key = '', kind = '', params = {}) {
  displayedMessages.set(id, { key, kind, params });
  elements[id].textContent = key ? t(key, params) : '';
  elements[id].className = `message${kind ? ` is-${kind}` : ''}`;
}

function validationMessage(id, raw, kind) {
  message(id, raw ? validationKeys.get(raw) ?? 'checkInputs' : '', kind);
}

function clearTransientStatus() {
  if (!persistentStatus.has(displayedMessages.get('status')?.key)) message('status');
}

function copyBackend() {
  // Chromium kann die gleichnamige, auf ChromeOS-Apps begrenzte API trotzdem
  // exponieren. Nur Firefox mit seiner Runtime-API verwendet diesen Pfad.
  // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/getBrowserInfo
  // https://developer.chrome.com/docs/apps/reference/clipboard
  if (typeof api?.runtime?.getBrowserInfo === 'function' && typeof api?.clipboard?.setImageData === 'function') return 'firefox';
  if (typeof navigator.clipboard?.write === 'function' && typeof globalThis.ClipboardItem === 'function'
    && (typeof ClipboardItem.supports !== 'function' || ClipboardItem.supports('image/png'))) return 'web';
  return null;
}

function hasCopySupport() {
  return copyBackend() !== null;
}

function isPageTab(tab) {
  if (!Number.isInteger(tab?.id) || !Number.isInteger(tab?.windowId) || typeof tab?.url !== 'string') return false;
  try { return ['http:', 'https:'].includes(new URL(tab.url).protocol); } catch { return false; }
}

function canAnalyze() {
  return hasExtension && typeof api?.scripting?.executeScript === 'function' && isPageTab(activeTab);
}

function updateButtons() {
  // Jede Rückkehr aus einem asynchronen Renderpfad berücksichtigt weiterhin die
  // Speichersperre. Ein älterer Callback darf die Transaktion nicht entsperren.
  for (const control of document.querySelectorAll('input, select, textarea, button')) control.disabled = storageBusy;
  const ready = Boolean(currentQr) && currentQr.revision === generation && !logoProcessing && !storageBusy && !exporting;
  for (const id of ['download-png', 'download-svg']) elements[id].disabled = !ready;
  elements['copy-image'].disabled = !ready || !hasCopySupport();
  const maySave = ready && hasExtension && storageLoaded && !privateMode;
  elements['preset-save'].disabled = !maySave;
  elements['preset-update'].disabled = !maySave || !state.selectedPresetId;
  elements['preset-delete'].disabled = storageBusy || logoProcessing || !hasExtension || !storageLoaded || privateMode || !state.selectedPresetId;
  elements['preset-select'].disabled = storageBusy || privateMode || !state.presets.length;
  elements['preset-name'].disabled = storageBusy || privateMode;
  elements['refresh-url'].disabled = storageBusy || !hasExtension || typeof api?.tabs?.query !== 'function';
  elements['analyze-page'].disabled = storageBusy || !canAnalyze() || paletteLoading;
  elements['logo-from-page'].disabled = storageBusy || logoProcessing || !canAnalyze() || typeof api?.tabs?.captureVisibleTab !== 'function';
  elements['logo-remove'].disabled = storageBusy || (!state.design.logo && !logoProcessing && !logoCandidates.length);
  elements['privacy-notice'].hidden = !privateMode;
}

function clearPreview(key = 'rendering') {
  currentQr = null;
  if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
  previewObjectUrl = null;
  elements['preview-placeholder'].textContent = t(key);
  elements['qr-preview'].replaceChildren(elements['preview-placeholder']);
  elements['qr-preview'].setAttribute('aria-label', t(key));
  updateButtons();
}

function setControls() {
  for (const field of ['foreground', 'background']) {
    if (/^#[0-9a-f]{6}$/i.test(state.design[field])) elements[field].value = state.design[field];
    elements[`${field}-hex`].value = state.design[field];
  }
  elements.size.value = String(state.design.size);
  for (const button of document.querySelectorAll('[data-shape]')) {
    button.setAttribute('aria-pressed', String(button.dataset.shape === state.design.shape));
  }
  const logo = safeLogo(state.design.logo);
  elements['logo-preview'].hidden = !logo;
  if (logo) elements['logo-preview'].src = logo;
  else elements['logo-preview'].removeAttribute('src');
  renderPalette();
  updateButtons();
}

function refreshPresets() {
  const blank = document.createElement('option');
  blank.value = ''; blank.textContent = t('freeDesign');
  elements['preset-select'].replaceChildren(blank);
  for (const preset of state.presets) {
    const option = document.createElement('option');
    option.value = preset.id; option.textContent = preset.name;
    elements['preset-select'].append(option);
  }
  elements['preset-select'].value = state.selectedPresetId;
  updateButtons();
}

function storageSnapshot(source) {
  const presets = source.presets.map(safePreset).filter(Boolean).slice(0, 100);
  // Explizite Positivliste: keine Zieladresse, Seitenfarben, Fundstellen oder
  // Bildschirmaufnahmen werden Bestandteil des gespeicherten Zustands.
  return {
    schemaVersion: 2, language: initialLanguage(source.language),
    design: normalizeDesign(source.design),
    selectedPresetId: presets.some((preset) => preset.id === source.selectedPresetId) ? source.selectedPresetId : '',
    presets,
  };
}

async function readStorage() {
  if (!hasExtension || privateMode) return;
  try {
    const result = await api.storage.local.get(STORAGE_KEY);
    const saved = result[STORAGE_KEY];
    if (saved && typeof saved === 'object' && Number(saved.schemaVersion) > 2) throw new Error('storage-version');
    storageLoaded = true;
    if (!saved || typeof saved !== 'object') {
      lastStoredSnapshot = storageSnapshot(state);
      return;
    }
    const ids = new Set();
    const presets = (Array.isArray(saved.presets) ? saved.presets : []).map(safePreset).filter((preset) => {
      if (!preset || ids.has(preset.id)) return false;
      ids.add(preset.id); return true;
    }).slice(0, 100);
    const design = normalizeDesign(saved.design);
    state = {
      design: validateDesign(design).valid ? design : { ...DEFAULT_DESIGN },
      presets, selectedPresetId: presets.some((preset) => preset.id === saved.selectedPresetId) ? saved.selectedPresetId : '',
      language: initialLanguage(saved.language),
    };
    lastStoredSnapshot = storageSnapshot(state);
  } catch {
    storageLoaded = false;
    message('status', 'storageReadError', 'error');
  }
}

async function writeState(candidate, commit = false) {
  if (!hasExtension || privateMode || storageBusy) return false;
  if (!storageLoaded) { message('status', 'storageNotLoaded', 'error'); return false; }
  const snapshot = storageSnapshot(candidate);
  storageBusy = true;
  updateButtons();
  try {
    // storage.local.set ist eine Promise-API in beiden Zielbrowsern.
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/StorageArea/set
    await api.storage.local.set({ [STORAGE_KEY]: snapshot });
    lastStoredSnapshot = snapshot;
    if (commit) state = { design: snapshot.design, presets: snapshot.presets, selectedPresetId: snapshot.selectedPresetId, language: snapshot.language };
    if (['storageWriteError', 'storageNotLoaded'].includes(displayedMessages.get('status')?.key)) message('status');
    return true;
  } catch {
    message('status', 'storageWriteError', 'error');
    return false;
  } finally {
    storageBusy = false;
    const pendingLogo = deferredLogo;
    deferredLogo = null;
    if (pendingLogo) applyLogo(pendingLogo.data, pendingLogo.revision);
    updateButtons();
    // Ein Render kann während der Sprachspeicherung fertig geworden sein.
    // Sein eigener Autosave durfte die laufende Transaktion nicht überholen.
    if (autoSavePending && currentQr?.revision === generation && !logoProcessing) {
      queueMicrotask(() => void flushAutosave());
    }
  }
}

async function flushAutosave() {
  if (!autoSavePending || initializing || storageBusy || logoProcessing) return;
  if (!validateDesign(state.design).valid) return;
  autoSavePending = false;
  if (hasExtension && storageLoaded && !privateMode) await writeState(state);
}

function queueRender() {
  clearTimeout(renderTimer);
  const revision = ++generation;
  clearPreview(logoProcessing ? 'logoLoading' : 'rendering');
  const link = validateUrl(elements.url.value);
  const design = validateDesign(state.design);
  validationMessage('url-message', link.error || link.warning, link.error ? 'error' : link.warning ? 'warning' : '');
  validationMessage('design-message', design.error, design.error ? 'error' : '');
  elements.url.setAttribute('aria-invalid', String(!link.valid && Boolean(elements.url.value)));
  for (const field of ['foreground', 'background']) {
    elements[`${field}-hex`].setAttribute('aria-invalid', String(!/^#[0-9a-f]{6}$/i.test(state.design[field])));
  }
  if (logoProcessing) return;
  if (!link.valid || !design.valid) { clearPreview('checkInputs'); return; }
  renderTimer = setTimeout(() => void renderQr(link.url, { ...state.design }, revision), 120);
}

async function renderQr(url, design, revision) {
  let objectUrl;
  try {
    const qr = new LocalQr(buildQrOptions(url, design));
    if (design.logo && !await qr.isReadable()) {
      const error = new Error('logoScanFailed'); error.code = 'logoScanFailed'; throw error;
    }
    if (revision !== generation) return;
    const blob = await qr.getRawData('svg');
    if (!blob) throw failure('renderFailed');
    if (revision !== generation) return;
    objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.alt = t('qrAlt'); image.src = objectUrl;
    await image.decode();
    if (revision !== generation) return;
    elements['qr-preview'].replaceChildren(image);
    elements['qr-preview'].setAttribute('aria-label', t('qrAlt'));
    previewObjectUrl = objectUrl;
    objectUrl = null;
    currentQr = { qr, url, design, revision };
    updateButtons();
    await flushAutosave();
  } catch (error) {
    if (revision !== generation) return;
    clearPreview('noPreview');
    message(error.code === 'logoScanFailed' ? 'logo-message' : 'status', error.code === 'logoScanFailed' ? 'logoScanFailed' : 'renderFailed', 'error');
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

function cancelLogoWork() {
  logoRevision += 1;
  logoProcessing = false;
  logoCandidates = [];
  deferredLogo = null;
  elements['logo-candidates'].replaceChildren();
  elements['logo-candidates'].hidden = true;
}

function rememberActiveTab(tab) {
  activeTab = tab ?? null;
  if (tab?.incognito && !privateMode) {
    privateMode = true;
    autoSavePending = false;
    state.presets = []; state.selectedPresetId = ''; state.design.logo = null;
    cancelLogoWork(); setControls(); refreshPresets();
  }
  elements['privacy-notice'].hidden = !privateMode;
}

async function queryActiveTab() {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  return tab ?? null;
}

async function loadCurrentUrl() {
  if (storageBusy) return;
  const revision = ++urlRevision;
  cancelLogoWork();
  clearTransientStatus();
  if (!hasExtension || typeof api?.tabs?.query !== 'function') {
    message('status', 'previewMode'); queueRender(); return;
  }
  try {
    const tab = await queryActiveTab();
    if (revision !== urlRevision) return;
    rememberActiveTab(tab);
    elements.url.value = typeof tab?.url === 'string' ? tab.url : '';
    if (!tab?.url && !persistentStatus.has(displayedMessages.get('status')?.key)) message('status', 'noActiveUrl');
    queueRender();
    void refreshPageColors();
  } catch {
    if (revision !== urlRevision) return;
    elements.url.value = '';
    queueRender();
    message('status', 'urlUnavailable', 'error');
  }
}

function sameTab(first, second) {
  return isPageTab(first) && isPageTab(second) && first.id === second.id
    && first.windowId === second.windowId && first.url === second.url && Boolean(first.incognito) === Boolean(second.incognito);
}

function failure(code) { const error = new Error(code); error.code = code; return error; }

function cleanAnalysis(result) {
  if (!result || typeof result !== 'object') throw failure('analysisFailed');
  const colors = [...new Set((Array.isArray(result.colors) ? result.colors : [])
    .filter((color) => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color))
    .map((color) => color.toLowerCase()).filter((color) => color !== '#000000'))].slice(0, 4);
  const viewport = { width: result.viewport?.width, height: result.viewport?.height };
  const scroll = { x: result.scroll?.x, y: result.scroll?.y };
  const geometryValid = [viewport.width, viewport.height, scroll.x, scroll.y].every(Number.isFinite)
    && viewport.width > 0 && viewport.height > 0 && viewport.width <= 32768 && viewport.height <= 32768;
  const logos = geometryValid ? (Array.isArray(result.logos) ? result.logos : []).slice(0, 3)
    .map((rect) => ({ x: rect?.x, y: rect?.y, width: rect?.width, height: rect?.height }))
    .filter((rect) => validateLogoRect(rect, viewport)) : [];
  return { colors, logos, viewport, scroll, geometryValid };
}

async function executeAnalysis(tab) {
  if (!isPageTab(tab) || typeof api?.scripting?.executeScript !== 'function') throw failure('analysisUnavailable');
  // Die übergebene Funktion ist in sich geschlossen und liest nur den Hauptframe.
  // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/scripting/executeScript
  const results = await api.scripting.executeScript({ target: { tabId: tab.id }, func: analyzePage });
  const main = results?.find((result) => result.frameId === 0) ?? results?.[0];
  if (!main || main.error) throw failure('analysisFailed');
  return cleanAnalysis(main.result);
}

function renderPalette() {
  elements['palette-list'].replaceChildren();
  for (const color of [...pageColors, '#000000']) {
    const button = document.createElement('button');
    button.type = 'button'; button.style.backgroundColor = color;
    button.setAttribute('aria-label', t('colorSwatch', { color }));
    button.setAttribute('aria-pressed', String(state.design[elements['palette-target'].value] === color));
    button.title = color;
    button.disabled = storageBusy;
    button.addEventListener('click', () => {
      if (storageBusy) return;
      const target = elements['palette-target'].value === 'background' ? 'background' : 'foreground';
      state.design[target] = color;
      setControls(); autoSavePending = true; clearTransientStatus(); queueRender();
    });
    elements['palette-list'].append(button);
  }
}

async function refreshPageColors() {
  if (storageBusy) return;
  const revision = ++paletteRevision;
  paletteLoading = true; updateButtons();
  try {
    const tab = await queryActiveTab();
    rememberActiveTab(tab);
    const result = await executeAnalysis(tab);
    const after = await queryActiveTab();
    if (!sameTab(tab, after)) throw failure('analysisUnavailable');
    if (revision !== paletteRevision) return;
    pageColors = result.colors;
    renderPalette();
    message('palette-message', pageColors.length ? 'paletteFound' : 'paletteEmpty');
  } catch (error) {
    if (revision !== paletteRevision) return;
    pageColors = []; renderPalette();
    message('palette-message', !hasExtension || error.code === 'analysisUnavailable' ? 'analysisUnavailable' : 'analysisFailed');
  } finally {
    if (revision === paletteRevision) { paletteLoading = false; updateButtons(); }
  }
}

function sameGeometry(first, second) {
  return first.geometryValid && second.geometryValid
    && ['width', 'height'].every((key) => first.viewport[key] === second.viewport[key])
    && ['x', 'y'].every((key) => first.scroll[key] === second.scroll[key])
    && first.logos.every((rect) => second.logos.some((other) =>
      ['x', 'y', 'width', 'height'].every((key) => Math.abs(rect[key] - other[key]) < 0.5)));
}

function beginLogoWork() {
  cancelLogoWork();
  logoProcessing = true;
  message('logo-message', 'logoLoading');
  clearTransientStatus(); queueRender();
  return logoRevision;
}

function applyLogo(data, revision) {
  if (revision !== logoRevision) return;
  const logo = safeLogo(data);
  if (!logo) throw failure('logoInvalid');
  // Eine Sprachwahl darf einen bereits laufenden Upload nicht verlieren.
  // Nur das geprüfte PNG, niemals die Bildschirmaufnahme, wartet im Speicher.
  if (storageBusy) { deferredLogo = { data: logo, revision }; return; }
  logoProcessing = false;
  logoCandidates = [];
  elements['logo-candidates'].replaceChildren(); elements['logo-candidates'].hidden = true;
  state.design.logo = logo;
  autoSavePending = true;
  setControls(); message('logo-message', 'logoReady', 'success'); queueRender();
}

function showLogoCandidates() {
  elements['logo-candidates'].replaceChildren();
  elements['logo-candidates'].hidden = !logoCandidates.length;
  logoCandidates.forEach((data, index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.setAttribute('aria-label', t('logoChoice', { index: index + 1 }));
    const image = new Image(); image.alt = ''; image.src = data;
    button.append(image); button.disabled = storageBusy;
    button.addEventListener('click', () => {
      if (storageBusy) return;
      cancelLogoWork(); applyLogo(data, logoRevision);
    });
    elements['logo-candidates'].append(button);
  });
}

async function importPageLogo() {
  if (storageBusy || logoProcessing) return;
  const revision = beginLogoWork();
  let screenshot = '';
  try {
    const tab = await queryActiveTab();
    if (revision !== logoRevision) return;
    if (!isPageTab(tab) || typeof api?.tabs?.captureVisibleTab !== 'function') throw failure('permissionUnavailable');
    const analyzed = await executeAnalysis(tab);
    if (revision !== logoRevision) return;
    if (!analyzed.logos.length) throw failure('logoUnavailable');
    const before = await queryActiveTab();
    if (revision !== logoRevision) return;
    if (!sameTab(tab, before)) throw failure('pageChanged');
    // Nur der explizite Klick startet eine Aufnahme; sofort danach werden nur
    // validierte Logo-Rechtecke ausgeschnitten. Das Vollbild bleibt flüchtig.
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/captureVisibleTab
    screenshot = await api.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
    if (revision !== logoRevision) return;
    const after = await queryActiveTab();
    if (!sameTab(tab, after)) throw failure('pageChanged');
    const checked = await executeAnalysis(after);
    if (revision !== logoRevision) return;
    const last = await queryActiveTab();
    if (!sameTab(tab, last) || !sameGeometry(analyzed, checked)) throw failure('pageChanged');
    const candidates = [];
    for (const rect of analyzed.logos) {
      const data = await cropVisibleLogo(screenshot, rect, analyzed.viewport);
      if (revision !== logoRevision) return;
      if (safeLogo(data)) candidates.push(data);
    }
    if (!candidates.length) throw failure('logoUnavailable');
    if (candidates.length === 1) applyLogo(candidates[0], revision);
    else {
      logoProcessing = false; logoCandidates = candidates;
      showLogoCandidates(); message('logo-message', 'logoCandidates'); queueRender();
    }
  } catch (error) {
    if (revision !== logoRevision) return;
    logoProcessing = false;
    const allowed = ['logoUnavailable', 'logoReadFailed', 'logoTooLarge', 'pageChanged', 'permissionUnavailable'];
    message('logo-message', allowed.includes(error.code) ? error.code : 'permissionUnavailable', 'error');
    queueRender();
  } finally {
    screenshot = '';
    if (revision === logoRevision) updateButtons();
  }
}

async function importFileLogo(file) {
  if (!file || storageBusy) return;
  const revision = beginLogoWork();
  try { applyLogo(await readLogoFile(file), revision); }
  catch (error) {
    if (revision !== logoRevision) return;
    logoProcessing = false;
    message('logo-message', ['logoInvalid', 'logoTooLarge', 'logoReadFailed'].includes(error.code) ? error.code : 'logoReadFailed', 'error');
    queueRender();
  }
}

async function savePreset(update) {
  if (storageBusy || logoProcessing || !currentQr || currentQr.revision !== generation) return;
  if (privateMode) { message('preset-message', 'privateModeSave'); return; }
  if (!hasExtension) { message('preset-message', 'installToSave', 'warning'); return; }
  if (!storageLoaded) { message('preset-message', 'storageNotLoaded', 'error'); return; }
  const checked = validateDesign(state.design);
  if (!checked.valid) { validationMessage('preset-message', checked.error, 'error'); return; }
  let preset;
  let candidate;
  if (update) {
    const old = state.presets.find((item) => item.id === state.selectedPresetId);
    if (!old) return;
    preset = { ...old, design: normalizeDesign(state.design) };
    candidate = { ...state, presets: state.presets.map((item) => item.id === preset.id ? preset : item) };
  } else {
    const name = elements['preset-name'].value.trim();
    if (!name || name.length > 50) { message('preset-message', 'presetNameInvalid', 'error'); return; }
    if (state.presets.some((item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      message('preset-message', 'presetDuplicate', 'error'); return;
    }
    if (state.presets.length >= 100) { message('preset-message', 'presetLimit', 'error'); return; }
    preset = { id: crypto.randomUUID(), name, design: normalizeDesign(state.design) };
    candidate = { ...state, selectedPresetId: preset.id, presets: [...state.presets, preset] };
  }
  autoSavePending = false;
  message('preset-message', 'saving');
  // Der Kandidat bleibt getrennt vom aktiven Zustand, bis der Schreibvorgang
  // erfolgreich ist. Ein späterer Autosave kann keine verworfene Vorlage retten.
  if (!await writeState(candidate, true)) message('preset-message', 'presetSaveFailed', 'error');
  else {
    elements['preset-name'].value = ''; elements['preset-details'].open = false;
    message('preset-message', update ? 'presetUpdated' : 'presetSaved', 'success', { name: preset.name });
  }
  refreshPresets();
}

async function deletePreset() {
  if (storageBusy || logoProcessing || privateMode || !storageLoaded) return;
  const preset = state.presets.find((item) => item.id === state.selectedPresetId);
  if (!preset || !globalThis.confirm(t('confirmDelete', { name: preset.name }))) return;
  const candidate = { ...state, selectedPresetId: '', presets: state.presets.filter((item) => item.id !== preset.id), design: { ...state.design, logo: null } };
  autoSavePending = false;
  message('preset-message', 'saving');
  if (!await writeState(candidate, true)) { message('preset-message', 'deleteFailed', 'error'); return; }
  cancelLogoWork(); setControls(); refreshPresets(); message('logo-message');
  message('preset-message', 'presetDeleted', 'success', { name: preset.name });
  queueRender();
}

function exportSnapshotReady(snapshot) {
  return snapshot && currentQr === snapshot && generation === snapshot.revision && !logoProcessing && !storageBusy;
}

async function download(extension) {
  const snapshot = currentQr;
  if (!exportSnapshotReady(snapshot) || exporting) return;
  exporting = true; updateButtons();
  try {
    const blob = await snapshot.qr.getRawData(extension);
    if (!blob) throw failure('downloadFailed');
    if (!exportSnapshotReady(snapshot)) { message('status', 'downloadChanged'); return; }
    const presetName = state.presets.find((preset) => preset.id === state.selectedPresetId)?.name ?? '';
    const filename = exportFilename(snapshot.url, presetName, extension);
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl; anchor.download = filename;
    document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
    if (!persistentStatus.has(displayedMessages.get('status')?.key)) message('status', 'downloadStarted', '', { format: extension.toUpperCase() });
  } catch { message('status', 'downloadFailed', 'error'); }
  finally { exporting = false; updateButtons(); }
}

async function copyImage() {
  const snapshot = currentQr;
  if (!exportSnapshotReady(snapshot) || exporting) return;
  const backend = copyBackend();
  if (!backend) { message('clipboard-message', 'copyUnavailable', 'warning'); updateButtons(); return; }
  exporting = true; updateButtons();
  try {
    const png = snapshot.qr.getRawData('png').then((blob) => {
      if (!blob) throw failure('copyFailed');
      if (!exportSnapshotReady(snapshot)) throw failure('copyChanged');
      return blob;
    });
    // Auch ein synchron abgewiesener ClipboardItem-Konstruktor darf keinen
    // unbehandelten Fehler aus dem noch laufenden PNG-Export hinterlassen.
    void png.catch(() => {});
    if (backend === 'firefox') {
      // Firefox erwartet kodierte PNG-Bytes als ArrayBuffer, keine Pixeldaten.
      // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/clipboard/setImageData
      const data = await (await png).arrayBuffer();
      if (!exportSnapshotReady(snapshot)) throw failure('copyChanged');
      await api.clipboard.setImageData(data, 'png');
    } else {
      // Der Schreibaufruf beginnt direkt im Klick; die PNG-Berechnung liefert
      // den Blob an ClipboardItem nach. Ohne Klick gibt es keinen Clipboardzugriff.
      // https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/write
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
    }
    message('status', exportSnapshotReady(snapshot) ? 'copySuccess' : 'copyChanged', exportSnapshotReady(snapshot) ? 'success' : 'warning');
  } catch (error) { message('status', error.code === 'copyChanged' ? 'copyChanged' : 'copyFailed', 'error'); }
  finally { exporting = false; updateButtons(); }
}

elements.url.addEventListener('input', () => {
  if (storageBusy) return;
  urlRevision += 1;
  cancelLogoWork(); message('logo-message'); clearTransientStatus(); queueRender();
});
elements['refresh-url'].addEventListener('click', () => void loadCurrentUrl());
for (const field of ['foreground', 'background']) {
  for (const id of [field, `${field}-hex`]) elements[id].addEventListener('input', () => {
    if (storageBusy) return;
    state.design[field] = elements[id].value.trim();
    if (id === field) elements[`${field}-hex`].value = state.design[field];
    else if (/^#[0-9a-f]{6}$/i.test(state.design[field])) elements[field].value = state.design[field];
    renderPalette(); autoSavePending = true; clearTransientStatus(); queueRender();
  });
}
for (const button of document.querySelectorAll('[data-shape]')) button.addEventListener('click', () => {
  if (storageBusy) return;
  state.design.shape = button.dataset.shape;
  setControls(); autoSavePending = true; clearTransientStatus(); queueRender();
});
elements.size.addEventListener('change', () => {
  if (storageBusy) return;
  state.design.size = Number(elements.size.value);
  autoSavePending = true; clearTransientStatus(); queueRender();
});
elements['preset-select'].addEventListener('change', () => {
  if (storageBusy || privateMode) return;
  cancelLogoWork(); message('logo-message');
  state.selectedPresetId = elements['preset-select'].value;
  const preset = state.presets.find((item) => item.id === state.selectedPresetId);
  if (preset) state.design = normalizeDesign(preset.design);
  setControls(); message('preset-message'); clearTransientStatus(); autoSavePending = true; queueRender();
});
elements['preset-save'].addEventListener('click', () => void savePreset(false));
elements['preset-update'].addEventListener('click', () => void savePreset(true));
elements['preset-delete'].addEventListener('click', () => void deletePreset());
elements['download-png'].addEventListener('click', () => void download('png'));
elements['download-svg'].addEventListener('click', () => void download('svg'));
elements['copy-image'].addEventListener('click', () => void copyImage());
elements['analyze-page'].addEventListener('click', () => void refreshPageColors());
elements['palette-target'].addEventListener('change', renderPalette);
elements['logo-from-page'].addEventListener('click', () => void importPageLogo());
elements['logo-upload'].addEventListener('change', () => {
  const file = elements['logo-upload'].files?.[0];
  elements['logo-upload'].value = '';
  void importFileLogo(file);
});
elements['logo-remove'].addEventListener('click', () => {
  if (storageBusy) return;
  cancelLogoWork(); state.design.logo = null;
  setControls(); message('logo-message', 'logoRemoved'); autoSavePending = true; queueRender();
});
elements.language.addEventListener('change', () => {
  if (storageBusy) return;
  state.language = initialLanguage(elements.language.value);
  applyLanguage(state.language);
  for (const [id, entry] of displayedMessages) message(id, entry.key, entry.kind, entry.params);
  refreshPresets(); setControls(); showLogoCandidates();
  queueRender();
  // Sprache sofort speichern: Das Popup kann vor dem QR-Debounce geschlossen
  // werden. Der letzte bestätigte Snapshot verhindert, dass dabei ein noch
  // ungeprüfter Design-/Logoentwurf mitgeschrieben wird.
  if (hasExtension && storageLoaded && !privateMode && lastStoredSnapshot) {
    void writeState({ ...lastStoredSnapshot, language: state.language });
  }
});

async function init() {
  document.querySelector('main').inert = true;
  applyLanguage(state.language);
  renderPalette(); updateButtons();
  try {
    if (hasExtension && typeof api?.tabs?.query === 'function') {
      try { rememberActiveTab(await queryActiveTab()); }
      catch { message('status', 'urlUnavailable', 'error'); }
    }
    await readStorage();
    applyLanguage(state.language);
    for (const [id, entry] of displayedMessages) message(id, entry.key, entry.kind, entry.params);
    setControls(); refreshPresets();
    if (typeof activeTab?.url === 'string') elements.url.value = activeTab.url;
    if (!hasExtension) message('status', 'previewMode');
    else if (!activeTab?.url && !displayedMessages.get('status')?.key) message('status', 'noActiveUrl');
    if (!hasCopySupport()) message('clipboard-message', 'copyUnavailable', 'warning');
    queueRender();
  } finally {
    initializing = false;
    document.querySelector('main').inert = false;
    updateButtons();
  }
  if (hasExtension) void refreshPageColors();
  else message('palette-message', 'analysisUnavailable');
}

void init();
