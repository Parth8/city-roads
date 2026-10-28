import tinycolor from 'tinycolor2';

/**
 * A "paint" is either a CSS colour string or a gradient:
 *   {stops: ['#ff512f', '#dd2476'], angle: 45}
 * Gradients run across the whole poster at `angle` degrees (0 = left to right,
 * 90 = top to bottom), so neighbouring streets blend into each other.
 */

export const gradientPalettes = [
  {id: 'sunset', name: 'Sunset', stops: ['#ff512f', '#f09819', '#dd2476']},
  {id: 'miami', name: 'Miami', stops: ['#00c3ff', '#ff3cac']},
  {id: 'synth', name: 'Synth', stops: ['#f72585', '#7209b7', '#4cc9f0']},
  {id: 'aurora', name: 'Aurora', stops: ['#00f5a0', '#00d9f5', '#7b2ff7']},
  {id: 'lava', name: 'Lava', stops: ['#ff0000', '#ff7a00', '#ffd000']},
  {id: 'ocean', name: 'Ocean', stops: ['#2e3192', '#1bffff']},
  {id: 'rainbow', name: 'Rainbow', stops: ['#ff0040', '#ff8c00', '#ffe600', '#00d26a', '#00a2ff', '#8f00ff']},
  {id: 'candy', name: 'Candy', stops: ['#ff9a9e', '#fad0c4', '#a18cd1']},
  {id: 'mint', name: 'Mint', stops: ['#00b09b', '#96c93d']},
  {id: 'peach', name: 'Peach', stops: ['#ffecd2', '#fcb69f']},
  {id: 'glacier', name: 'Glacier', stops: ['#e0f7ff', '#7df9ff', '#2d6cdf']},
  {id: 'gold', name: 'Gold', stops: ['#b8860b', '#ffd200', '#fff3b0', '#c99700']},
  {id: 'chrome', name: 'Chrome', stops: ['#ffffff', '#8e9399', '#e8eaed', '#5f6368', '#d7dadc']},
  {id: 'martini', name: 'Martini', stops: ['#00a3e0', '#1c2a5c', '#e4002b']},
  {id: 'gulf', name: 'Gulf', stops: ['#9fd3ec', '#f37021']},
  {id: 'forest', name: 'Forest', stops: ['#134e5e', '#71b280']},
  {id: 'dusk', name: 'Dusk', stops: ['#0f2027', '#2c5364']},
  {id: 'neon', name: 'Neon', stops: ['#39ff14', '#00e5ff', '#ff00e6']},
];

export function isGradient(paint) {
  return Boolean(paint && typeof paint === 'object' && Array.isArray(paint.stops) && paint.stops.length);
}

export function gradient(stops, angle = 45) {
  return {stops: stops.slice(), angle};
}

/**
 * Turns a paint into something a canvas (or SvgContext) can fill or stroke
 * with. `box` is the area the gradient spans, in the current units.
 */
export function toStyle(ctx, paint, box) {
  if (!isGradient(paint)) return paint || 'transparent';
  if (paint.stops.length === 1) return paint.stops[0];
  let angle = (paint.angle || 0) * Math.PI / 180;
  let cos = Math.cos(angle), sin = Math.sin(angle);
  let cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  let half = (Math.abs(box.w * cos) + Math.abs(box.h * sin)) / 2;
  let g = ctx.createLinearGradient(cx - cos * half, cy - sin * half, cx + cos * half, cy + sin * half);
  let last = paint.stops.length - 1;
  paint.stops.forEach((color, i) => g.addColorStop(i / last, color));
  return g;
}

/**
 * A single colour that stands for the paint (e.g. to derive shadows or tints).
 */
export function mainColor(paint) {
  if (!isGradient(paint)) return paint || '#000000';
  return tinycolor.mix(paint.stops[0], paint.stops[paint.stops.length - 1], 50).toHexString();
}

export function toCss(paint) {
  if (!isGradient(paint)) return paint || 'transparent';
  if (paint.stops.length === 1) return paint.stops[0];
  // CSS angles start at "to top"; ours start at "to the right".
  return `linear-gradient(${(paint.angle || 0) + 90}deg, ${paint.stops.join(', ')})`;
}

export function mix(a, b, amount) {
  return tinycolor.mix(mainColor(a), mainColor(b), amount).toHexString();
}

export function clonePaint(paint) {
  return isGradient(paint) ? {stops: paint.stops.slice(), angle: paint.angle || 0} : paint;
}
