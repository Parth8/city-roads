/**
 * What a poster is made for: a printed sheet (sized in millimetres and
 * rendered at a chosen dpi) or a screen (sized in pixels).
 */

// Paper sizes in millimetres, portrait.
export const paperSizes = [
  {id: 'a4', name: 'A4', width: 210, height: 297},
  {id: 'a3', name: 'A3', width: 297, height: 420},
  {id: 'a2', name: 'A2', width: 420, height: 594},
  {id: 'a1', name: 'A1', width: 594, height: 841},
  {id: '30x40', name: '30 × 40 cm', width: 300, height: 400},
  {id: '50x70', name: '50 × 70 cm', width: 500, height: 700},
  {id: '8x10', name: '8 × 10 in', width: 203.2, height: 254},
  {id: '12x16', name: '12 × 16 in', width: 304.8, height: 406.4},
  {id: '18x24', name: '18 × 24 in', width: 457.2, height: 609.6},
  {id: '24x36', name: '24 × 36 in', width: 609.6, height: 914.4},
  {id: 'square', name: 'Square 50 × 50 cm', width: 500, height: 500},
];

// Screen sizes in pixels.
export const screenSizes = [
  {id: 'iphone', group: 'Phone', name: 'iPhone', width: 1179, height: 2556},
  {id: 'iphone-max', group: 'Phone', name: 'iPhone Pro Max', width: 1320, height: 2868},
  {id: 'android', group: 'Phone', name: 'Android 20:9', width: 1080, height: 2400},
  {id: 'ipad', group: 'Tablet', name: 'iPad', width: 2048, height: 2732},
  {id: 'fhd', group: 'Desktop', name: 'Full HD 16:9', width: 1920, height: 1080},
  {id: 'qhd', group: 'Desktop', name: '1440p 16:9', width: 2560, height: 1440},
  {id: '4k', group: 'Desktop', name: '4K 16:9', width: 3840, height: 2160},
  {id: '5k', group: 'Desktop', name: '5K 16:9', width: 5120, height: 2880},
  {id: 'macbook', group: 'Desktop', name: 'MacBook 16:10', width: 2560, height: 1600},
  {id: 'macbook-pro', group: 'Desktop', name: 'MacBook Pro 16″', width: 3456, height: 2234},
  {id: 'ultrawide', group: 'Ultrawide', name: 'Ultrawide 21:9', width: 3440, height: 1440},
  {id: 'ultrawide-5k', group: 'Ultrawide', name: 'Ultrawide 5K2K', width: 5120, height: 2160},
  {id: 'super-ultrawide', group: 'Ultrawide', name: 'Super ultrawide 32:9', width: 5120, height: 1440},
  {id: 'dual-4k', group: 'Ultrawide', name: 'Dual 4K 32:9', width: 7680, height: 2160},
  {id: 'custom', group: 'Custom', name: 'Custom size', width: 0, height: 0},
];

// Browsers refuse to allocate very large canvases (iOS Safari stops at ~16.7 megapixels),
// so we lower the resolution of very large prints rather than fail.
const MAX_PIXELS = 40e6;
const MAX_SIDE = 16000;

/**
 * Resolves output settings into pixel dimensions.
 *
 * settings: {kind: 'print'|'screen', paper, landscape, dpi, screen, customWidth, customHeight}
 */
export function getOutput(settings) {
  if (settings.kind === 'screen') {
    let screen = screenSizes.find(x => x.id === settings.screen) || screenSizes[0];
    let width = screen.width, height = screen.height;
    if (screen.id === 'custom') {
      width = clamp(Math.round(settings.customWidth) || 1920, 200, MAX_SIDE);
      height = clamp(Math.round(settings.customHeight) || 1080, 200, MAX_SIDE);
    }
    let fit = limit(width, height);
    return {
      kind: 'screen',
      id: screen.id,
      name: screen.id === 'custom' ? `${width} × ${height}` : screen.name,
      width: fit.width,
      height: fit.height,
      reduced: fit.reduced,
      aspect: height / width
    };
  }

  let paper = paperSizes.find(x => x.id === settings.paper) || paperSizes[1];
  let mmWidth = paper.width, mmHeight = paper.height;
  if (settings.landscape && mmWidth !== mmHeight) [mmWidth, mmHeight] = [mmHeight, mmWidth];
  let dpi = settings.dpi || 300;
  let fit = limit(Math.round(mmWidth / 25.4 * dpi), Math.round(mmHeight / 25.4 * dpi));
  return {
    kind: 'print',
    id: paper.id,
    name: paper.name,
    width: fit.width,
    height: fit.height,
    reduced: fit.reduced,
    dpi: Math.floor(dpi * fit.width / Math.round(mmWidth / 25.4 * dpi)),
    physicalSize: {width: mmWidth + 'mm', height: mmHeight + 'mm'},
    aspect: mmHeight / mmWidth
  };
}

function limit(width, height) {
  let k = Math.min(1, Math.sqrt(MAX_PIXELS / (width * height)), MAX_SIDE / Math.max(width, height));
  if (k >= 1) return {width, height, reduced: false};
  return {width: Math.floor(width * k), height: Math.floor(height * k), reduced: true};
}

function clamp(x, min, max) {
  return Math.max(min, Math.min(max, x));
}
