import qrcode from 'qrcode-generator';
import jsQR from 'jsqr';

qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
const SVG_NS = 'http://www.w3.org/2000/svg';

// Die Bibliothek berechnet Daten und Fehlerkorrektur; diese kleine Ansicht zeichnet
// nur die angebotenen Modulformen. Der freie Rand ist immer genau vier Module breit.
export default class LocalQr {
  constructor(options) {
    this.options = options;
    const matrix = qrcode(0, options.qrOptions.errorCorrectionLevel);
    matrix.addData(options.data, 'Byte');
    matrix.make();
    const count = matrix.getModuleCount();
    const area = count + 8;
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('width', String(options.width));
    svg.setAttribute('height', String(options.height));
    svg.setAttribute('viewBox', `0 0 ${area} ${area}`);
    const background = document.createElementNS(SVG_NS, 'rect');
    background.setAttribute('width', String(area));
    background.setAttribute('height', String(area));
    background.setAttribute('fill', options.backgroundOptions.color);
    svg.append(background);
    const modules = document.createElementNS(SVG_NS, 'path');
    modules.setAttribute('fill', options.dotsOptions.color);
    const paths = [];
    for (let row = 0; row < count; row++) {
      for (let column = 0; column < count; column++) {
        if (!matrix.isDark(row, column)) continue;
        const x = column + 4, y = row + 4;
        const finder = (row < 7 && (column < 7 || column >= count - 7)) || (row >= count - 7 && column < 7);
        const shape = finder ? 'square' : options.dotsOptions.type;
        if (shape === 'dots') {
          paths.push(`M${x + 0.5} ${y}a.5 .5 0 1 0 0 1a.5 .5 0 1 0 0-1z`);
        } else if (shape === 'rounded') {
          paths.push(`M${x + 0.22} ${y}h.56a.22 .22 0 0 1 .22 .22v.56a.22 .22 0 0 1-.22 .22h-.56a.22 .22 0 0 1-.22-.22v-.56a.22 .22 0 0 1 .22-.22z`);
        } else {
          paths.push(`M${x} ${y}h1v1h-1z`);
        }
      }
    }
    modules.setAttribute('d', paths.join(''));
    svg.append(modules);
    if (options.logo) {
      const outerSize = count * 0.18;
      const padding = Math.max(0.6, outerSize * 0.08);
      const start = (area - outerSize) / 2;
      const backing = document.createElementNS(SVG_NS, 'rect');
      backing.setAttribute('x', String(start)); backing.setAttribute('y', String(start));
      backing.setAttribute('width', String(outerSize)); backing.setAttribute('height', String(outerSize));
      backing.setAttribute('rx', '0.4'); backing.setAttribute('fill', options.backgroundOptions.color);
      svg.append(backing);
      const image = document.createElementNS(SVG_NS, 'image');
      image.setAttribute('x', String(start + padding)); image.setAttribute('y', String(start + padding));
      image.setAttribute('width', String(outerSize - padding * 2)); image.setAttribute('height', String(outerSize - padding * 2));
      image.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      image.setAttribute('href', options.logo);
      svg.append(image);
    }
    this.svgBlob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' });
  }

  async rasterize(size = this.options.width) {
    const objectUrl = URL.createObjectURL(this.svgBlob);
    try {
      const image = new Image();
      image.src = objectUrl;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Bildexport ist nicht verfügbar.');
      context.drawImage(image, 0, 0, size, size);
      return canvas;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async isReadable() {
    const canvas = await this.rasterize(Math.min(this.options.width, 1024));
    const context = canvas.getContext('2d');
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    return jsQR(pixels.data, pixels.width, pixels.height)?.data === this.options.data;
  }

  async getRawData(extension) {
    if (extension === 'svg') return this.svgBlob;
    if (extension !== 'png') throw new Error('Unbekanntes Exportformat.');
    const canvas = await this.rasterize();
    return new Promise((resolve, reject) => canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Bildexport ist fehlgeschlagen.'));
    }, 'image/png'));
  }
}
