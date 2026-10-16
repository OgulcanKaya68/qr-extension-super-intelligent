import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { analyzePage } from '../src/page-analysis.js';

function fixture(elements, { width = 1000, height = 700 } = {}) {
  const palette = new Map([
    ['transparent', [0, 0, 0, 0]], ['#010203', [1, 2, 3, 255]],
    ['rgb(0, 0, 0)', [0, 0, 0, 255]], ['rgb(255, 255, 255)', [255, 255, 255, 255]],
    ['rgb(210, 30, 40)', [210, 30, 40, 255]], ['rgb(211, 31, 41)', [211, 31, 41, 255]],
    ['rgb(25, 85, 220)', [25, 85, 220, 255]], ['rgb(35, 190, 90)', [35, 190, 90, 255]],
    ['oklch(55% .2 265)', [53, 94, 220, 255]],
  ]);
  const baseStyle = { display: 'block', visibility: 'visible', opacity: '1', backgroundColor: 'transparent', color: 'rgb(0, 0, 0)' };
  let reads = 0;
  const nodes = elements.map((entry) => ({
    tagName: entry.tag || 'DIV', namespaceURI: entry.svg ? 'http://www.w3.org/2000/svg' : '',
    childNodes: entry.text ? [{ nodeType: 3, nodeValue: entry.text }] : [],
    parentElement: null, style: { ...baseStyle, ...entry.style },
    getBoundingClientRect() { reads += 1; return { left: 20, top: 20, width: 100, height: 40, ...entry.rect }; },
    getAttribute(name) { return entry.attrs?.[name] ?? null; },
    closest(selector) { return selector === 'a[href]' ? null : entry.header ? {} : null; },
    contains() { return false; },
  }));
  const root = { ...nodes[0], tagName: 'HTML', childNodes: [], style: baseStyle,
    getBoundingClientRect() { return { left: 0, top: 0, width, height }; },
    closest() { return null; }, getAttribute() { return null; } };
  for (let i = 0; i < nodes.length; i += 1) nodes[i].parentElement = elements[i].parent === undefined ? root : nodes[elements[i].parent];
  const context = { fillStyle: '#010203', clearRect() {}, fillRect() {},
    getImageData() { return { data: palette.get(this.fillStyle) || [0, 0, 0, 0] }; } };
  const document = {
    documentElement: root,
    createElement(name) { assert.equal(name, 'canvas'); return { getContext() { return context; } }; },
    createTreeWalker() { let index = 0; return { nextNode() { return nodes[index++] || null; } }; },
  };
  const globals = { document, CSS: { supports: (_property, value) => palette.has(value) },
    window: { innerWidth: width, innerHeight: height, scrollX: 0, scrollY: 120,
      location: { origin: 'https://example.test' }, getComputedStyle: (node) => node.style } };
  return { run: () => JSON.parse(JSON.stringify(vm.runInNewContext(`(${analyzePage.toString()})()`, globals))), reads: () => reads };
}

test('häufige Seitenfarben bleiben echte Farben; Schwarz, Transparenz und nahe Duplikate entfallen', () => {
  const page = fixture([
    { style: { backgroundColor: 'rgb(210, 30, 40)' } },
    { style: { backgroundColor: 'rgb(211, 31, 41)' } },
    { style: { backgroundColor: 'rgb(210, 30, 40)' } },
    { style: { backgroundColor: 'rgb(25, 85, 220)' } },
    { text: 'Schwarz' },
    { style: { backgroundColor: 'transparent' } },
  ]);
  assert.deepEqual(page.run().colors, ['#d21e28', '#1955dc']);
});

test('unsichtbare, außerhalb liegende und über Eltern ausgeblendete Elemente zählen nicht', () => {
  const page = fixture([
    { style: { opacity: '0', backgroundColor: 'rgb(210, 30, 40)' } },
    { parent: 0, style: { backgroundColor: 'rgb(210, 30, 40)' } },
    { rect: { top: 1000 }, style: { backgroundColor: 'rgb(210, 30, 40)' } },
    { style: { visibility: 'hidden', backgroundColor: 'rgb(210, 30, 40)' } },
    { style: { backgroundColor: 'oklch(55% .2 265)' } },
  ]);
  assert.deepEqual(page.run().colors, ['#355edc']);
});

test('Logokandidaten geben begrenzte Bildschirmkoordinaten, aber keine Seiten-URLs oder HTML zurück', () => {
  const page = fixture([
    { tag: 'IMG', header: true, attrs: { alt: '  Marke   Logo ', src: 'https://secret.test/logo.png' } },
    { tag: 'SVG', svg: true, header: true, attrs: { class: 'brand' }, rect: { left: 200 } },
    { tag: 'IMG', header: true, attrs: { alt: 'logo' }, rect: { width: 501 } },
    { tag: 'IMG', attrs: { alt: 'logo' }, rect: { left: NaN } },
    { tag: 'IMG', attrs: { alt: 'logo' }, rect: { top: -30 } },
    { tag: 'IMG', attrs: { alt: 'logo' }, rect: { top: 400 } },
  ]);
  const result = page.run();
  assert.deepEqual(result.logos, [
    { x: 20, y: 20, width: 100, height: 40, label: 'Marke Logo' },
    { x: 200, y: 20, width: 100, height: 40, label: 'Logo der Seite' },
  ]);
  assert.deepEqual(result.viewport, { width: 1000, height: 700 });
  assert.deepEqual(result.scroll, { x: 0, y: 120 });
  assert.equal(JSON.stringify(result).includes('secret'), false);
});

test('Analyse bleibt auf 2000 besuchte oder 1000 sichtbare Elemente begrenzt', () => {
  const visible = fixture(Array.from({ length: 10000 }, () => ({ text: 'Text' })));
  visible.run();
  assert.ok(visible.reads() <= 1000);
  const outside = fixture(Array.from({ length: 10000 }, () => ({ rect: { top: 1000 } })));
  outside.run();
  assert.ok(outside.reads() <= 2000);
});

test('ohne Viewport gibt es weder erfundene Farben noch Logo-Rechtecke', () => {
  assert.deepEqual(fixture([], { width: 0 }).run(), {
    colors: [], logos: [], viewport: { width: 0, height: 700 }, scroll: { x: 0, y: 120 },
  });
});

test('ein flächenfüllendes Banner wird trotz Logo-Beschriftung nicht zum Screenshot-Kandidaten', () => {
  const page = fixture([{ tag: 'IMG', header: true, attrs: { alt: 'Firmenlogo' },
    rect: { left: 0, top: 0, width: 250, height: 150 } }], { width: 300, height: 200 });
  assert.deepEqual(page.run().logos, []);
});
