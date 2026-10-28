/**
 * Shared "finishing" for downloads: borders around the artwork, image
 * formats and saving files. Used by both the city view and track posters.
 */

export const borderStyles = [
  {id: 'none', name: 'None'},
  {id: 'border', name: 'Border'},
  {id: 'polaroid', name: 'Polaroid'},
];

// A polaroid's bottom lip is much thicker than the other three sides.
const POLAROID_BOTTOM = 3.6;

/**
 * Border thickness for an artwork of the given size. `size` is a fraction of
 * the shorter side (0.04 = 4%).
 */
export function getBorderInsets(border, width, height) {
  if (!border || border.style === 'none') return {top: 0, right: 0, bottom: 0, left: 0};
  let side = Math.round(Math.min(width, height) * (border.size || 0.04));
  let bottom = border.style === 'polaroid' ? Math.round(side * POLAROID_BOTTOM) : side;
  return {top: side, right: side, bottom, left: side};
}

/**
 * Paints the border (and the polaroid caption) onto a 2D context of size
 * width x height. Returns the rectangle left for the artwork.
 */
export function drawBorder(ctx, border, width, height, insets = getBorderInsets(border, width, height)) {
  let inner = {x: insets.left, y: insets.top, w: width - insets.left - insets.right, h: height - insets.top - insets.bottom};
  if (border && border.style !== 'none') {
    ctx.save();
    ctx.fillStyle = border.color || '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    if (border.style === 'polaroid' && border.caption) {
      let size = Math.round(insets.bottom * 0.32);
      ctx.save();
      ctx.fillStyle = border.captionColor || '#2b2b2b';
      ctx.font = `${size}px ${border.captionFont || '"Caveat", "Segoe Print", cursive'}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      ctx.fillText(border.caption, width / 2, inner.y + inner.h + insets.bottom / 2);
      ctx.restore();
    }
  }
  return inner;
}

/**
 * Puts an already rendered canvas inside a border. With no border the
 * source is returned as is.
 */
export function addBorder(source, border) {
  if (!border || border.style === 'none') return source;
  // Grow the image so the artwork keeps its full resolution.
  let insets = getBorderInsets(border, source.width, source.height);
  let canvas = document.createElement('canvas');
  canvas.width = source.width + insets.left + insets.right;
  canvas.height = source.height + insets.top + insets.bottom;
  let ctx = canvas.getContext('2d');
  let inner = drawBorder(ctx, border, canvas.width, canvas.height, insets);
  ctx.drawImage(source, inner.x, inner.y);
  return canvas;
}

export const imageFormats = [
  {id: 'png', name: 'PNG', mime: 'image/png', extension: 'png'},
  {id: 'jpeg', name: 'JPEG', mime: 'image/jpeg', extension: 'jpg', quality: 0.93},
  {id: 'webp', name: 'WebP', mime: 'image/webp', extension: 'webp', quality: 0.95},
  {id: 'avif', name: 'AVIF', mime: 'image/avif', extension: 'avif', quality: 0.9},
];

let supported = null;

/**
 * Formats this browser can encode. Browsers silently fall back to PNG for
 * anything they cannot write, so we test each one. (No browser can encode
 * HEIC/HEIF; AVIF is its open cousin and shows up where available.)
 */
export function getSupportedFormats() {
  if (supported) return supported;
  let canvas = document.createElement('canvas');
  canvas.width = canvas.height = 2;
  supported = imageFormats.filter(f => {
    try {
      return canvas.toDataURL(f.mime).startsWith('data:' + f.mime);
    } catch {
      return false;
    }
  });
  return supported;
}

export function getFormat(id) {
  return imageFormats.find(f => f.id === id) || imageFormats[0];
}

export function canvasToBlob(canvas, format) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Your browser could not create an image this large. Try a smaller size.'));
    }, format.mime, format.quality);
  });
}

export function downloadBlob(blob, fileName) {
  let url = URL.createObjectURL(blob);
  let a = document.createElement('a');
  a.href = url;
  a.download = sanitizeFileName(fileName);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Safari needs the URL a little longer than the click.
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export function sanitizeFileName(name) {
  return (name || 'artwork').replace(/[#%&{}\\/?*><$!'":@+`|=\s]+/g, '-').replace(/-+/g, '-').slice(0, 120);
}
