/**
 * Just enough of the CanvasRenderingContext2D API to run renderPoster() and
 * get an SVG document out of it, so that the PNG and the SVG exports are drawn
 * by the same code.
 *
 * Supported: fillStyle, strokeStyle, lineWidth, lineCap, lineJoin, globalAlpha,
 * font, textAlign, textBaseline, letterSpacing, save/restore, translate/rotate,
 * beginPath/moveTo/lineTo/closePath/rect, fill/stroke/fillRect/clip,
 * fillText/measureText and drawImage (with an image that has `dataUrl`).
 */
export default class SvgContext {
  constructor(width, height, measureContext) {
    this.width = width;
    this.height = height;
    this.isSvg = true;
    this.measureContext = measureContext;
    this.parts = [];
    this.defs = [];
    this.nextId = 0;
    this.state = defaultState();
    this.stack = [];
    this.path = '';
  }

  // ---- state
  get fillStyle() { return this.state.fillStyle; }
  set fillStyle(v) { this.state.fillStyle = v; }
  get strokeStyle() { return this.state.strokeStyle; }
  set strokeStyle(v) { this.state.strokeStyle = v; }
  get lineWidth() { return this.state.lineWidth; }
  set lineWidth(v) { this.state.lineWidth = v; }
  get lineCap() { return this.state.lineCap; }
  set lineCap(v) { this.state.lineCap = v; }
  get lineJoin() { return this.state.lineJoin; }
  set lineJoin(v) { this.state.lineJoin = v; }
  get globalAlpha() { return this.state.globalAlpha; }
  set globalAlpha(v) { this.state.globalAlpha = v; }
  get font() { return this.state.font; }
  set font(v) { this.state.font = v; }
  get textAlign() { return this.state.textAlign; }
  set textAlign(v) { this.state.textAlign = v; }
  get textBaseline() { return this.state.textBaseline; }
  set textBaseline(v) { this.state.textBaseline = v; }
  get letterSpacing() { return this.state.letterSpacing; }
  set letterSpacing(v) { this.state.letterSpacing = v; }

  save() {
    // Clip groups opened after save() are closed by the matching restore().
    this.stack.push(this.state);
    this.state = {...this.state, openGroups: 0};
  }

  restore() {
    let groups = this.state.openGroups || 0;
    for (let i = 0; i < groups; ++i) this.parts.push('</g>');
    let previous = this.stack.pop();
    if (previous) this.state = previous;
  }

  translate(x, y) {
    let [a, b, c, d, e, f] = this.state.transform;
    this.state.transform = [a, b, c, d, e + a * x + c * y, f + b * x + d * y];
  }

  rotate(angle) {
    let [a, b, c, d, e, f] = this.state.transform;
    let cos = Math.cos(angle), sin = Math.sin(angle);
    this.state.transform = [a * cos + c * sin, b * cos + d * sin, c * cos - a * sin, d * cos - b * sin, e, f];
  }

  setLineDash() {}

  // ---- paths
  beginPath() {
    this.path = '';
  }

  moveTo(x, y) {
    let [px, py] = this.apply(x, y);
    this.path += 'M' + fmt(px) + ' ' + fmt(py);
  }

  lineTo(x, y) {
    let [px, py] = this.apply(x, y);
    this.path += 'L' + fmt(px) + ' ' + fmt(py);
  }

  closePath() {
    this.path += 'Z';
  }

  rect(x, y, w, h) {
    this.moveTo(x, y);
    this.lineTo(x + w, y);
    this.lineTo(x + w, y + h);
    this.lineTo(x, y + h);
    this.closePath();
  }

  fill() {
    if (!this.path) return;
    this.parts.push(`<path d="${this.path}" fill="${this.state.fillStyle}"${this.alphaAttr('fill-opacity')}/>`);
  }

  stroke() {
    if (!this.path) return;
    let s = this.state;
    this.parts.push(`<path d="${this.path}" fill="none" stroke="${s.strokeStyle}" stroke-width="${fmt(s.lineWidth * this.scaleFactor())}" stroke-linecap="${s.lineCap}" stroke-linejoin="${s.lineJoin}"${this.alphaAttr('stroke-opacity')}/>`);
  }

  fillRect(x, y, w, h) {
    let saved = this.path;
    this.beginPath();
    this.rect(x, y, w, h);
    this.fill();
    this.path = saved;
  }

  clip() {
    let id = 'clip' + (this.nextId++);
    this.defs.push(`<clipPath id="${id}"><path d="${this.path}"/></clipPath>`);
    this.parts.push(`<g clip-path="url(#${id})">`);
    this.state.openGroups = (this.state.openGroups || 0) + 1;
  }

  // ---- text and images
  measureText(text) {
    this.measureContext.font = this.state.font;
    if ('letterSpacing' in this.measureContext) this.measureContext.letterSpacing = this.state.letterSpacing;
    return this.measureContext.measureText(text);
  }

  fillText(text, x, y) {
    let s = this.state;
    let font = parseFont(s.font);
    let anchor = s.textAlign === 'center' ? 'middle' : (s.textAlign === 'right' || s.textAlign === 'end') ? 'end' : 'start';
    let baseline = s.textBaseline === 'middle' ? 'central' : s.textBaseline === 'top' ? 'hanging' : 'auto';
    let spacing = Number.parseFloat(s.letterSpacing) || 0;
    // Canvas adds letter spacing after every character, including the last one,
    // which shifts centred text left by half of it. Mirror that.
    let shift = anchor === 'middle' ? -spacing / 2 : anchor === 'end' ? -spacing : 0;
    let [a, b, c, d, e, f] = s.transform;
    let transform = (a !== 1 || b !== 0 || c !== 0 || d !== 1 || e !== 0 || f !== 0)
      ? ` transform="matrix(${[a, b, c, d, e, f].map(fmt).join(' ')})"` : '';
    this.parts.push(`<text x="${fmt(x + shift)}" y="${fmt(y)}"${transform} fill="${s.fillStyle}"${this.alphaAttr('fill-opacity')} font-family="${escapeXml(font.family)}" font-size="${fmt(font.size)}" font-weight="${font.weight}"${font.style ? ` font-style="${font.style}"` : ''} text-anchor="${anchor}" dominant-baseline="${baseline}"${spacing ? ` letter-spacing="${fmt(spacing)}"` : ''}>${escapeXml(text)}</text>`);
  }

  drawImage(image, x, y, w, h) {
    if (!image || !image.dataUrl) return;
    let [px, py] = this.apply(x, y);
    let k = this.scaleFactor();
    this.parts.push(`<image href="${image.dataUrl}" x="${fmt(px)}" y="${fmt(py)}" width="${fmt(w * k)}" height="${fmt(h * k)}" preserveAspectRatio="none"${this.alphaAttr('opacity')}/>`);
  }

  // ---- output
  toString() {
    // `physicalSize` (e.g. {width: '297mm', height: '420mm'}) makes the file open at print size.
    let size = this.physicalSize || {width: fmt(this.width), height: fmt(this.height)};
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size.width}" height="${size.height}" viewBox="0 0 ${fmt(this.width)} ${fmt(this.height)}">
<defs>${this.styles || ''}${this.defs.join('')}</defs>
${this.parts.join('\n')}
</svg>`;
  }

  apply(x, y) {
    let [a, b, c, d, e, f] = this.state.transform;
    return [a * x + c * y + e, b * x + d * y + f];
  }

  scaleFactor() {
    let [a, b] = this.state.transform;
    return Math.sqrt(a * a + b * b);
  }

  alphaAttr(name) {
    let alpha = this.state.globalAlpha;
    return alpha < 1 ? ` ${name}="${fmt(alpha)}"` : '';
  }
}

function defaultState() {
  return {
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    letterSpacing: '0px',
    transform: [1, 0, 0, 1, 0, 0],
    openGroups: 0
  };
}

function parseFont(font) {
  // e.g. `italic 700 42px "Barlow Condensed", sans-serif`
  let match = font.match(/^\s*(italic\s+)?(\d{3}|bold|normal)?\s*([\d.]+)px\s+(.+)$/);
  if (!match) return {family: 'sans-serif', size: 10, weight: 400};
  return {
    style: match[1] ? 'italic' : '',
    weight: match[2] === 'bold' ? 700 : (match[2] === 'normal' || !match[2]) ? 400 : match[2],
    size: Number.parseFloat(match[3]),
    family: match[4].replace(/"/g, "'")
  };
}

function fmt(x) {
  return Math.round(x * 100) / 100;
}

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
