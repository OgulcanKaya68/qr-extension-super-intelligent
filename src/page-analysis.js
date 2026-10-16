/**
 * Liest ausschließlich Gestaltung im aktuellen Viewport. Keine Inhalte oder URLs
 * verlassen die Seite. Alle Hilfen bleiben absichtlich in dieser Funktion:
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/scripting/executeScript
 */
export function analyzePage() {
  const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
  const viewport = {
    width: Math.max(0, finite(window.innerWidth)),
    height: Math.max(0, finite(window.innerHeight)),
  };
  const scroll = { x: finite(window.scrollX), y: finite(window.scrollY) };
  const result = { colors: [], logos: [], viewport, scroll };
  if (!viewport.width || !viewport.height || !document.documentElement) return result;

  // Das Canvas enthält nur einzelne CSS-Farbwerte, niemals Seitenbilder.
  // Der Browser übernimmt auch die Umrechnung von oklch()/display-p3 nach sRGB.
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true, colorSpace: 'srgb' });
  const normalized = new Map();
  const histogram = new Map();
  const logoCandidates = [];
  const styles = new WeakMap();
  const styleOf = (element) => {
    if (!styles.has(element)) styles.set(element, window.getComputedStyle(element));
    return styles.get(element);
  };
  const colorOf = (value) => {
    if (!value || !context || value === 'none' || value === 'currentColor') return null;
    if (normalized.has(value)) return normalized.get(value);
    let color = null;
    if (typeof CSS === 'undefined' || CSS.supports('color', value)) {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = '#010203';
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      const rgba = context.getImageData(0, 0, 1, 1).data;
      if (rgba[3] === 255) {
        color = `#${[rgba[0], rgba[1], rgba[2]].map((part) => part.toString(16).padStart(2, '0')).join('')}`;
      }
    }
    normalized.set(value, color);
    return color;
  };
  const visibleRect = (element) => {
    const rect = element.getBoundingClientRect();
    if (![rect.left, rect.top, rect.width, rect.height].every(Number.isFinite)
      || rect.width <= 0 || rect.height <= 0) return null;
    const x = Math.max(0, rect.left);
    const y = Math.max(0, rect.top);
    const right = Math.min(viewport.width, rect.left + rect.width);
    const bottom = Math.min(viewport.height, rect.top + rect.height);
    if (right <= x || bottom <= y) return null;
    // Auch opacity:0 auf einem Vorfahren macht dessen Kinder unsichtbar.
    let ancestor = element;
    let depth = 0;
    while (ancestor && depth < 64) {
      const style = styleOf(ancestor);
      if (style.display === 'none' || style.visibility === 'hidden'
        || style.visibility === 'collapse' || Number(style.opacity) === 0) return null;
      ancestor = ancestor.parentElement;
      depth += 1;
    }
    if (ancestor) return null;
    if (typeof element.checkVisibility === 'function'
      && !element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return null;
    return { x, y, width: right - x, height: bottom - y, original: rect };
  };
  const addColors = (element, style) => {
    const colors = new Map();
    const add = (value, weight) => {
      const color = colorOf(value);
      if (color && color !== '#000000') colors.set(color, Math.max(colors.get(color) || 0, weight));
    };
    const tag = element.tagName.toLowerCase();
    add(style.backgroundColor, tag === 'button' ? 1.5 : 1);
    // Vererbte Textfarbe auf leeren Layout-Containern nicht mehrfach mitzählen.
    let hasText = false;
    for (let index = 0; index < Math.min(element.childNodes.length, 24); index += 1) {
      const node = element.childNodes[index];
      if (node.nodeType === 3 && node.nodeValue.slice(0, 200).trim()) {
        hasText = true;
        break;
      }
    }
    if (hasText || /^(input|textarea|select|button)$/.test(tag)) add(style.color, 1);
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
      if (parseFloat(style[`border${side}Width`]) > 0
        && !['none', 'hidden'].includes(style[`border${side}Style`])) add(style[`border${side}Color`], 0.35);
    }
    if (element.namespaceURI === 'http://www.w3.org/2000/svg') {
      add(style.fill, 1);
      if (parseFloat(style.strokeWidth) > 0) add(style.stroke, 0.5);
    }
    for (const [color, weight] of colors) histogram.set(color, (histogram.get(color) || 0) + weight);
  };
  const considerLogo = (element, rect) => {
    const tag = element.tagName.toLowerCase();
    if (tag !== 'img' && tag !== 'svg') return;
    if (rect.original.width > 500 || rect.original.height > 300
      || rect.width < 20 || rect.height < 16
      || rect.width * rect.height > viewport.width * viewport.height * 0.35) return;
    // Ein angeschnittenes Bild ergibt meist ein unbrauchbares Logo.
    if (rect.width < rect.original.width * 0.95 || rect.height < rect.original.height * 0.95) return;
    const attr = (name) => (element.getAttribute(name) || '').slice(0, 160);
    const description = `${attr('alt')} ${attr('aria-label')} ${attr('id')} ${attr('class')}`;
    const namedLogo = /logo|brand|marke|logotype|wordmark/i.test(description);
    const inHeader = Boolean(element.closest('header,[role="banner"],nav'));
    const anchor = element.closest('a[href]');
    const homeLink = Boolean(anchor && (anchor.getAttribute('rel') === 'home'
      || (anchor.pathname === '/' && anchor.origin === window.location.origin)));
    if (!namedLogo && !(inHeader && homeLink)) return;
    if (!inHeader && !homeLink && rect.y > Math.min(240, viewport.height * 0.35)) return;
    // Ein sichtbares DOM-Rechteck kann trotzdem vollständig hinter einem Dialog liegen.
    if (typeof document.elementFromPoint === 'function') {
      const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      if (!hit || !(hit === element || element.contains(hit) || hit.contains(element))) return;
    }
    const label = (attr('alt') || attr('aria-label') || 'Logo der Seite').replace(/\s+/g, ' ').trim().slice(0, 80);
    logoCandidates.push({
      x: rect.x, y: rect.y, width: rect.width, height: rect.height,
      label: label || 'Logo der Seite',
      score: (namedLogo ? 5 : 0) + (inHeader ? 3 : 0) + (homeLink ? 2 : 0) + (rect.y < 160 ? 1 : 0),
    });
  };

  const walker = document.createTreeWalker(document.documentElement, 1);
  let element = document.documentElement;
  let visited = 0;
  let visible = 0;
  while (element && visited < 2000 && visible < 1000) {
    visited += 1;
    const rect = visibleRect(element);
    if (rect) {
      visible += 1;
      addColors(element, styleOf(element));
      considerLogo(element, rect);
    }
    element = walker.nextNode();
  }

  // Repräsentanten bleiben tatsächlich gefundene Farben, keine gemittelten Werte.
  const distance = (a, b) => {
    const channels = (hex) => [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
    const first = channels(a);
    return Math.hypot(...channels(b).map((channel, index) => channel - first[index]));
  };
  const groups = [];
  for (const [color, weight] of [...histogram].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
    const group = groups.find((item) => distance(item.color, color) < 26);
    if (group) group.weight += weight;
    else groups.push({ color, weight });
  }
  result.colors = groups.sort((a, b) => b.weight - a.weight || a.color.localeCompare(b.color))
    .slice(0, 4).map((item) => item.color);
  result.logos = logoCandidates.sort((a, b) => b.score - a.score).filter((candidate, index, all) =>
    all.findIndex((other) => Math.abs(other.x - candidate.x) < 2 && Math.abs(other.y - candidate.y) < 2
      && Math.abs(other.width - candidate.width) < 2 && Math.abs(other.height - candidate.height) < 2) === index)
    .slice(0, 3).map(({ x, y, width, height, label }) => ({ x, y, width, height, label }));
  return result;
}
