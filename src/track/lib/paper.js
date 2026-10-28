// Paper sizes in millimetres, portrait.
export const paperSizes = [
  {id: 'a4', name: 'A4', width: 210, height: 297},
  {id: 'a3', name: 'A3', width: 297, height: 420},
  {id: 'a2', name: 'A2', width: 420, height: 594},
  {id: 'a1', name: 'A1', width: 594, height: 841},
  {id: '30x40', name: '30 × 40 cm', width: 300, height: 400},
  {id: '50x70', name: '50 × 70 cm', width: 500, height: 700},
  {id: '12x16', name: '12 × 16 in', width: 304.8, height: 406.4},
  {id: '18x24', name: '18 × 24 in', width: 457.2, height: 609.6},
  {id: '24x36', name: '24 × 36 in', width: 609.6, height: 914.4},
  {id: 'square', name: 'Square 50 × 50 cm', width: 500, height: 500},
];

export function getPaper(id, landscape) {
  let paper = paperSizes.find(x => x.id === id) || paperSizes[1];
  if (landscape && paper.width !== paper.height) {
    return {...paper, width: paper.height, height: paper.width};
  }
  return paper;
}

// Browsers refuse to allocate very large canvases (iOS Safari stops at ~16.7 megapixels),
// so we lower the resolution of very large prints rather than fail.
const MAX_PIXELS = 40e6;

export function getExportSize(paper, dpi) {
  let width = Math.round(paper.width / 25.4 * dpi);
  let height = Math.round(paper.height / 25.4 * dpi);
  let effectiveDpi = dpi;
  if (width * height > MAX_PIXELS) {
    let k = Math.sqrt(MAX_PIXELS / (width * height));
    width = Math.floor(width * k);
    height = Math.floor(height * k);
    effectiveDpi = Math.floor(dpi * k);
  }
  return {width, height, dpi: effectiveDpi};
}
