import renderPoster, {POSTER_WIDTH} from './renderPoster.js';
import SvgContext from './svgContext.js';
import getEmbeddedFontCss from './fontEmbed.js';
import {canvasToBlob} from '../../lib/artwork.js';

/**
 * Renders a poster at full output resolution and encodes it.
 * `poster` is laid out 1000 units wide; `output` gives the pixel size.
 */
export function posterToImage(poster, output, format) {
  let canvas = document.createElement('canvas');
  canvas.width = output.width;
  canvas.height = output.height;
  let ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Your browser could not create an image this large. Try a smaller size.'));
  let scale = output.width / POSTER_WIDTH;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  renderPoster(ctx, {...poster, height: output.height / scale});
  return canvasToBlob(canvas, format);
}

/**
 * Renders a poster as an SVG document with its fonts embedded, so it looks
 * the same in Illustrator, Inkscape or a print shop's software.
 */
export function posterToSvg(poster, output) {
  let {theme} = poster;
  let fonts = [400, 500, 600].map(weight => ({family: theme.bodyFont, weight}))
    .concat({family: theme.titleFont, weight: theme.titleWeight});
  if (poster.border && poster.border.style === 'polaroid' && poster.border.caption) {
    fonts.push({family: 'Caveat', weight: 500});
  }
  return getEmbeddedFontCss(fonts).then(css => {
    let height = POSTER_WIDTH * output.height / output.width;
    let svg = new SvgContext(POSTER_WIDTH, height, document.createElement('canvas').getContext('2d'));
    svg.physicalSize = output.physicalSize || {width: output.width, height: output.height};
    if (css) svg.styles = `<style>${css}</style>`;
    renderPoster(svg, {...poster, height});
    return new Blob([svg.toString()], {type: 'image/svg+xml'});
  });
}
