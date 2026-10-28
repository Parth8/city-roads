/**
 * Draws whatever `draw` paints, blurred by `radius` poster units.
 *
 * Canvas: `draw` paints into an offscreen canvas with the same transform; we
 * blur that at a reduced resolution (fast, and indistinguishable for soft
 * blurs) and composite it back. SVG: the drawing goes into a group with a
 * Gaussian blur filter.
 */
export function drawBlurred(ctx, radius, draw) {
  if (ctx.isSvg) {
    ctx.beginBlur(radius);
    draw(ctx);
    ctx.endBlur();
    return;
  }

  let matrix = ctx.getTransform();
  let pixels = radius * Math.hypot(matrix.a, matrix.b);
  let {width, height} = ctx.canvas;
  let layer = createCanvas(width, height);
  let layerCtx = layer.getContext('2d');
  layerCtx.setTransform(matrix);
  draw(layerCtx);

  // Work at a lower resolution: a 20px blur does not need full detail.
  let shrink = Math.max(1, Math.min(8, pixels / 3));
  let small = createCanvas(Math.max(1, Math.round(width / shrink)), Math.max(1, Math.round(height / shrink)));
  let smallCtx = small.getContext('2d');
  smallCtx.imageSmoothingQuality = 'high';
  let smallRadius = pixels / shrink;
  if (supportsCanvasFilter()) {
    smallCtx.filter = `blur(${smallRadius}px)`;
    smallCtx.drawImage(layer, 0, 0, small.width, small.height);
  } else {
    smallCtx.drawImage(layer, 0, 0, small.width, small.height);
    boxBlur(smallCtx, small.width, small.height, smallRadius);
  }

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(small, 0, 0, width, height);
  ctx.restore();
}

let filterSupport = null;

function supportsCanvasFilter() {
  if (filterSupport !== null) return filterSupport;
  // Safari exposes no `filter` on 2D contexts; check that blurring really spreads a pixel.
  let canvas = createCanvas(5, 5);
  let ctx = canvas.getContext('2d');
  if (!('filter' in ctx)) return (filterSupport = false);
  ctx.filter = 'blur(1px)';
  ctx.fillRect(2, 2, 1, 1);
  filterSupport = ctx.getImageData(0, 2, 1, 1).data[3] > 0;
  return filterSupport;
}

/**
 * Three box blurs approximate a Gaussian blur. Used where canvas filters are
 * not available.
 */
function boxBlur(ctx, width, height, radius) {
  let r = Math.max(1, Math.round(radius / 1.7));
  let image = ctx.getImageData(0, 0, width, height);
  let data = image.data;
  let buffer = new Float32Array(data.length);
  for (let pass = 0; pass < 3; ++pass) {
    blurLines(data, buffer, width, height, r, 4, width * 4);
    blurLines(buffer, data, height, width, r, width * 4, 4);
  }
  ctx.putImageData(image, 0, 0);
}

// Blurs `count` lines of `length` pixels; `step` moves along a line, `lineStep` to the next one.
function blurLines(src, dst, length, count, r, step, lineStep) {
  let size = 2 * r + 1;
  for (let line = 0; line < count; ++line) {
    let base = line * lineStep;
    for (let c = 0; c < 4; ++c) {
      let sum = 0;
      for (let i = -r; i <= r; ++i) sum += src[base + clamp(i, length) * step + c];
      for (let i = 0; i < length; ++i) {
        dst[base + i * step + c] = sum / size;
        sum += src[base + clamp(i + r + 1, length) * step + c] - src[base + clamp(i - r, length) * step + c];
      }
    }
  }
}

function clamp(i, length) {
  return i < 0 ? 0 : i >= length ? length - 1 : i;
}

function createCanvas(width, height) {
  let canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}
