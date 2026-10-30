import {drawBorder} from '../../lib/artwork.js';
import {toStyle, mainColor, mix} from './paint.js';
import {drawBlurred} from './effects.js';

/**
 * Draws a poster onto a 2D canvas context, or onto SvgContext which mimics one.
 * The artwork is laid out in poster units: always 1000 units wide, so styles
 * look the same at every size and resolution.
 *
 * poster: {
 *   width, height,           size in poster units (width is 1000)
 *   style,                   colours, widths and effects (see presets.js)
 *   layers,                  {track: true, streets: true, title: false, ...} what is shown
 *   text,                    {title, subtitle, tagline, coords, stats: [{label, value}]}
 *   view,                    {rotation, zoom, panX, panY}
 *   subject,                 prepareTrack() or preparePlace()
 *   features,                prepareFeatures() or null while loading
 *   selection,               {keys: Set, mode: 'highlight'|'isolate', blur}
 *   flag, border             country flag image, border settings
 * }
 */
export const POSTER_WIDTH = 1000;

const FADE_BUCKETS = 8;

/**
 * Returns where the map ended up, so the editor can turn pointer positions
 * into panning and find what was tapped: {rect, point(x, y) -> [px, py]}.
 */
export default function renderPoster(ctx, poster) {
  let {width, height} = poster;
  ctx.save();
  let inner = drawBorder(ctx, poster.border, width, height);
  // The artwork is always laid out 1000 units wide; scale it into the space the border leaves.
  let k = inner.w / POSTER_WIDTH;
  ctx.translate(inner.x, inner.y);
  ctx.scale(k, k);
  let map = renderArtwork(ctx, {...poster, width: POSTER_WIDTH, height: inner.h / k});
  ctx.restore();
  let r = map.rect;
  return {
    rect: {x: inner.x + r.x * k, y: inner.y + r.y * k, w: r.w * k, h: r.h * k},
    scale: map.transform.scale * k,
    point: (x, y) => [inner.x + map.transform.x(x, y) * k, inner.y + map.transform.y(x, y) * k]
  };
}

function renderArtwork(ctx, poster) {
  let {width, height, style} = poster;
  let layout = getLayout(poster);
  let box = {x: 0, y: 0, w: width, h: height};

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.clip();
  ctx.fillStyle = toStyle(ctx, style.background, box);
  ctx.fillRect(0, 0, width, height);

  let map = drawMap(ctx, poster, layout.map, box);
  layout.decorate(ctx);
  ctx.restore();
  return map;
}

// ---------------------------------------------------------------- layouts

function getLayout(poster) {
  let {width: W, height: H, layout} = poster;
  if (layout === 'fullbleed') return fullBleedLayout(poster, W, H);
  // Wide formats (banners, landscape screens) put the text next to the map.
  if (W / H >= 1.35) return sideLayout(poster, W, H);
  let compact = H < W * 1.05;
  if (layout === 'inset') return insetLayout(poster, W, H, compact);
  if (layout === 'data') return dataLayout(poster, W, H, compact);
  return minimalLayout(poster, W, H, compact);
}

function minimalLayout(poster, W, H, compact) {
  let {style, text, layers} = poster;
  let margin = 70;
  let lines = countVisible(layers, ['title', 'tagline', 'subtitle']);
  let textBlock = lines ? (compact ? 120 : 150) + lines * 45 + (layers.flag && poster.flag ? 45 : 0) : 70;
  let map = {x: margin, y: margin, w: W - 2 * margin, h: H - margin - textBlock};

  return {
    map,
    decorate(ctx) {
      let y = map.y + map.h + (compact ? 105 : 130);
      if (layers.title && text.title) {
        drawTitle(ctx, poster, W / 2, y, W - 2 * margin, 96, 'center');
      } else {
        y -= 50;
      }
      if (layers.tagline && text.tagline) {
        y += 46;
        drawText(ctx, text.tagline, W / 2, y, {...bodyFont(style, 19, 500), spacing: 0.08, align: 'center', paint: style.muted});
      }
      if (layers.subtitle && text.subtitle) {
        y += 42;
        let sub = text.subtitle.toUpperCase();
        let subFont = {...bodyFont(style, 22, 600), spacing: 0.14};
        let subWidth = measure(ctx, sub, subFont);
        drawText(ctx, sub, W / 2, y, {...subFont, align: 'center', paint: style.text});
        let gap = 22;
        let ruleLength = Math.min(170, (W - 2 * margin - subWidth) / 2 - gap);
        if (ruleLength > 20) {
          ctx.save();
          ctx.strokeStyle = mainColor(style.muted);
          ctx.globalAlpha = 0.7;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(W / 2 - subWidth / 2 - gap - ruleLength, y - 8);
          ctx.lineTo(W / 2 - subWidth / 2 - gap, y - 8);
          ctx.moveTo(W / 2 + subWidth / 2 + gap, y - 8);
          ctx.lineTo(W / 2 + subWidth / 2 + gap + ruleLength, y - 8);
          ctx.stroke();
          ctx.restore();
        }
      }
      if (layers.flag && poster.flag) {
        y += 24;
        drawFlag(ctx, poster.flag, W / 2, y, 30);
      }
      if (layers.north) drawNorthArrow(ctx, poster, map.x + 40, map.y + 60);
      drawAttribution(ctx, poster, W / 2, H - 26, 'center');
    }
  };
}

function insetLayout(poster, W, H, compact) {
  let {style, text, layers} = poster;
  let margin = 80;
  let lines = countVisible(layers, ['title', 'subtitle', 'coords']);
  let textBlock = lines ? (compact ? 130 : 170) + lines * 50 : 80;
  let map = {x: margin, y: margin, w: W - 2 * margin, h: H - margin - textBlock};

  return {
    map,
    decorate(ctx) {
      if (layers.north) drawNorthArrow(ctx, poster, map.x + 50, map.y + 80);
      let y = map.y + map.h + (compact ? 110 : 140);
      if (layers.title && text.title) drawTitle(ctx, poster, W / 2, y, W - 2 * margin, 100, 'center');
      else y -= 60;
      if (layers.subtitle && text.subtitle) {
        y += 52;
        drawText(ctx, text.subtitle.toUpperCase(), W / 2, y, {...bodyFont(style, 26, 400), spacing: 0.12, align: 'center', paint: style.muted});
      }
      let line = layers.coords && text.coords ? text.coords : (layers.tagline ? text.tagline : '');
      if (line) {
        y += 46;
        drawText(ctx, line, W / 2, y, {...bodyFont(style, 23, 500), spacing: 0.05, align: 'center', paint: style.text});
      }
      if (layers.flag && poster.flag) {
        y += 26;
        drawFlag(ctx, poster.flag, W / 2, y, 28);
      }
      drawAttribution(ctx, poster, W / 2, H - 26, 'center');
    }
  };
}

function dataLayout(poster, W, H, compact) {
  let {style, text, layers} = poster;
  let margin = 60;
  let stats = layers.stats ? (text.stats || []).filter(s => s.value) : [];
  let hasHeader = layers.title && text.title;
  let top = hasHeader ? (compact ? 175 : 240) : margin;
  let bottom = stats.length ? (compact ? 170 : 220) : 90;
  let map = {x: margin, y: top, w: W - 2 * margin, h: H - top - bottom};

  return {
    map,
    decorate(ctx) {
      let titleY = compact ? 105 : 140;
      if (hasHeader) drawTitle(ctx, poster, W / 2, titleY, W - 2 * margin, 92, 'center');
      if (hasHeader && layers.subtitle && text.subtitle) {
        drawText(ctx, text.subtitle, W / 2, titleY + 48, {...bodyFont(style, 28, 400), spacing: 0.06, align: 'center', paint: style.muted});
      }
      if (layers.flag && poster.flag) drawFlag(ctx, poster.flag, W - margin - 22, titleY - 30, 26);
      if (layers.north) drawNorthArrow(ctx, poster, map.x + 40, map.y + 70);
      if (stats.length) drawStatsRow(ctx, poster, stats, margin, map.y + map.h + (compact ? 40 : 60), W - 2 * margin);
      drawAttribution(ctx, poster, W - margin, H - 26, 'right');
    }
  };
}

/**
 * For wide formats: the map on the left, a column of text on the right.
 */
function sideLayout(poster, W, H) {
  let {style, text, layers, layout} = poster;
  let margin = Math.min(60, H * 0.08);
  let hasText = countVisible(layers, ['title', 'subtitle', 'tagline', 'stats']) > 0;
  let columnWidth = hasText ? W * 0.32 : 0;
  let map = {x: margin, y: margin, w: W - columnWidth - margin * (hasText ? 2.5 : 2), h: H - 2 * margin};
  let unit = Math.min(1, H / 700);

  return {
    map,
    decorate(ctx) {
      if (layers.north) drawNorthArrow(ctx, poster, map.x + 40 * unit + 10, map.y + 60 * unit + 10);
      if (!hasText) {
        drawAttribution(ctx, poster, W - margin, H - 16, 'right');
        return;
      }
      let cx = W - margin - columnWidth / 2;
      let stats = layers.stats && layout === 'data' ? (text.stats || []).filter(s => s.value) : [];
      let y = H / 2 - (stats.length ? 40 : 10) * unit;
      if (layers.title && text.title) drawTitle(ctx, poster, cx, y, columnWidth, 84 * unit, 'center');
      if (layers.subtitle && text.subtitle) {
        y += 44 * unit;
        drawText(ctx, text.subtitle.toUpperCase(), cx, y, {...bodyFont(style, 20 * unit, 600), spacing: 0.14, align: 'center', paint: style.text});
      }
      if (layers.tagline && text.tagline) {
        y += 34 * unit;
        drawText(ctx, text.tagline, cx, y, {...bodyFont(style, 16 * unit, 500), spacing: 0.06, align: 'center', paint: style.muted});
      }
      if (layers.coords && text.coords && layout === 'inset') {
        y += 32 * unit;
        drawText(ctx, text.coords, cx, y, {...bodyFont(style, 16 * unit, 500), align: 'center', paint: style.muted});
      }
      if (stats.length) drawStatsRow(ctx, poster, stats, cx - columnWidth / 2, y + 30 * unit, columnWidth, unit * 0.8);
      if (layers.flag && poster.flag) drawFlag(ctx, poster.flag, cx, y + (stats.length ? 150 : 26) * unit, 26 * unit);
      drawAttribution(ctx, poster, W - margin, H - 16, 'right');
    }
  };
}

/**
 * Full-bleed map for wallpapers. Text is optional and small, sized from the
 * shorter side so it reads the same on a phone and an ultrawide monitor.
 */
function fullBleedLayout(poster, W, H) {
  let {style, text, layers} = poster;
  let map = {x: 0, y: 0, w: W, h: H};
  let unit = Math.min(W, H) / 1000;
  let position = poster.labelPosition || 'corner';

  return {
    map,
    decorate(ctx) {
      if (layers.north) drawNorthArrow(ctx, poster, 60 * unit + 20, 80 * unit + 20);
      let showTitle = layers.title && text.title;
      let showTagline = layers.tagline && text.tagline;
      if (showTitle || showTagline) {
        let margin = 60 * unit;
        let titleSize = 46 * unit;
        let small = 20 * unit;
        let align = position === 'corner' ? 'right' : 'center';
        let x = position === 'corner' ? W - margin : W / 2;
        let y = position === 'top' ? margin + titleSize : H - margin - (showTagline ? small * 1.8 : 0);
        if (showTitle) drawTitle(ctx, poster, x, y, W - 2 * margin, titleSize, align);
        if (showTagline) {
          drawText(ctx, text.tagline, x, y + small * 1.8, {...bodyFont(style, small, 500), spacing: 0.08, align, paint: style.muted});
        }
      }
      if (layers.attribution) drawAttribution(ctx, poster, position === 'corner' ? 20 * unit + 8 : W - 20 * unit - 8, H - 14 * unit - 6, position === 'corner' ? 'left' : 'right', 9 * unit + 3);
    }
  };
}

function countVisible(layers, names) {
  return names.filter(n => layers[n]).length;
}

function drawStatsRow(ctx, poster, stats, x0, top, width, scale = 1) {
  let {style} = poster;
  let columnWidth = width / stats.length;
  stats.forEach((stat, i) => {
    let x = x0 + i * columnWidth;
    ctx.save();
    ctx.fillStyle = toStyle(ctx, style.accent, {x, y: top, w: 4, h: 92 * scale});
    ctx.fillRect(x, top, 4 * scale, 92 * scale);
    ctx.restore();
    let labelFont = {...bodyFont(style, 17 * scale, 500), spacing: 0.1, paint: style.muted};
    let label = (stat.label || '').toUpperCase();
    drawText(ctx, label, x + 18 * scale, top + 22 * scale, {...labelFont, size: fitSize(ctx, label, labelFont, columnWidth - 30 * scale)});
    let valueFont = {...bodyFont(style, 40 * scale, 600), paint: style.text};
    drawText(ctx, stat.value, x + 18 * scale, top + 78 * scale, {...valueFont, size: fitSize(ctx, stat.value, valueFont, columnWidth - 30 * scale)});
  });
}

// ---------------------------------------------------------------- map

function drawMap(ctx, poster, rect, box) {
  let {style, layers, subject, features, selection} = poster;
  let transform = createTransform(subject, rect, poster.view);
  let selected = selection && selection.keys && selection.keys.size ? selection.keys : null;
  let isolate = selected && selection.mode === 'isolate';
  let blur = selected && !isolate ? (selection.blur || 0) : 0;
  let trackSelected = selected && selected.has('track');
  let hero = subject.kind === 'track' && layers.track;

  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (style.mapBackground && poster.layout === 'inset') {
    ctx.fillStyle = toStyle(ctx, style.mapBackground, rect);
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }

  let fade = createFade(style.fade, subject.radius);
  let env = {transform, rect, fade, box, style, layers};
  let notSelected = chunk => !selected || !selected.has(chunk.key);

  let drawContext = c => {
    if (!features) return;
    drawAreas(c, features.parks, layers.parks, style.parks || mix(style.background, style.streets, 6), 1, env);
    drawAreas(c, features.waterAreas, layers.water, style.water || mix(style.background, style.streets, 12), 1, env);
    if (layers.water) drawChunks(c, features.water, env, style.water || style.streets, style.streetOpacity * 0.8, style.streetWidth, 'none', notSelected);
    let threeD = style.buildings3d && layers.buildings;
    if (layers.buildings && style.buildings !== 'none' && !threeD) drawBuildings(c, features.buildings, env);
    if (layers.rail) drawChunks(c, features.rail, env, style.streets, style.streetOpacity * 0.6, style.streetWidth, 'none', notSelected);
    if (layers.streets) drawChunks(c, features.roads, env, style.streets, style.streetOpacity, style.streetWidth, style.streetEffect, notSelected);
    // Raised buildings stand on top of the streets around them.
    if (threeD) drawBuildings3d(c, features.buildings, env);
  };
  let drawHero = c => {
    if (layers.pit && subject.pit.length) {
      c.save();
      c.globalAlpha = 0.6;
      strokeLines(c, subject.pit, transform, style.track, Math.max(style.trackWidth * 0.32, 1.2), box);
      c.restore();
    }
    drawTrack(c, poster, transform, box);
  };

  if (!isolate) {
    if (blur > 0) {
      drawBlurred(ctx, blur, c => {
        drawContext(c);
        if (hero && !trackSelected) drawHero(c);
      });
    } else {
      drawContext(ctx);
    }
  }

  if (selected && features) drawSelection(ctx, features, selected, env);
  if (hero && (trackSelected || (!isolate && blur <= 0) || !selected)) drawHero(ctx);

  if (hero && (!isolate || trackSelected) && !(blur > 0 && !trackSelected)) {
    if (layers.start && subject.start) drawStartLine(ctx, subject, transform, style.trackWidth, style);
    if (layers.corners && subject.corners.length) drawCornerLabels(ctx, poster, transform, rect);
  }
  if (layers.landmarks && features && features.labels.length && !isolate) drawLandmarks(ctx, poster, features.labels, transform, rect);
  ctx.restore();

  return {rect, transform};
}

/**
 * Local metres -> poster units. The subject is centred and scaled to fill the
 * map rectangle (with some air around it), then zoomed and panned by the user.
 */
function createTransform(subject, rect, view) {
  let rotation = (view.rotation || 0) * Math.PI / 180;
  let cos = Math.cos(rotation), sin = Math.sin(rotation);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let [x, y] of subject.points) {
    let rx = x * cos - y * sin, ry = x * sin + y * cos;
    if (rx < minX) minX = rx;
    if (rx > maxX) maxX = rx;
    if (ry < minY) minY = ry;
    if (ry > maxY) maxY = ry;
  }
  let padding = subject.padding;
  let fit = Math.min(rect.w * (1 - 2 * padding) / (maxX - minX || 1), rect.h * (1 - 2 * padding) / (maxY - minY || 1));
  let scale = fit * (view.zoom || 1);
  let midX = (minX + maxX) / 2, midY = (minY + maxY) / 2;
  let cx = rect.x + rect.w / 2 + (view.panX || 0) * rect.w;
  let cy = rect.y + rect.h / 2 + (view.panY || 0) * rect.h;

  return {
    scale,
    rotation,
    x(x, y) {
      return cx + (x * cos - y * sin - midX) * scale;
    },
    y(x, y) {
      return cy - (x * sin + y * cos - midY) * scale;
    },
    // Direction of an angle given in local coordinates, on the poster.
    angle(a) {
      return -(a + rotation);
    }
  };
}

function shifted(transform, dx, dy) {
  return {...transform, x: (x, y) => transform.x(x, y) + dx, y: (x, y) => transform.y(x, y) + dy};
}

/**
 * Emboss draws a light edge above-left and a shadow below-right of a shape,
 * so it looks raised; deboss swaps them, so it looks pressed in.
 */
function effectPasses(effect, depth, width) {
  if (effect !== 'emboss' && effect !== 'deboss') return [null];
  let d = (0.6 + width * 0.3) * (0.4 + depth);
  let s = effect === 'emboss' ? 1 : -1;
  return [
    {dx: -d * s, dy: -d * s, color: '#ffffff', alpha: 0.75 * depth},
    {dx: d * s, dy: d * s, color: '#000000', alpha: 0.6 * depth},
    null
  ];
}

function isVisible(chunk, transform, rect) {
  let x = transform.x(chunk.cx, chunk.cy);
  let y = transform.y(chunk.cx, chunk.cy);
  let r = chunk.r * transform.scale + 4;
  return x + r > rect.x && x - r < rect.x + rect.w && y + r > rect.y && y - r < rect.y + rect.h;
}

function createFade(amount, radius) {
  if (!amount) return () => FADE_BUCKETS - 1;
  // Strong fade keeps only what is right next to the subject.
  let reach = radius * (3.2 - 2.8 * amount);
  let floor = 0.25 * (1 - amount);
  return function bucket(distance) {
    let t = Math.max(0, 1 - distance / reach);
    let alpha = floor + (1 - floor) * Math.pow(t, 1.3);
    return Math.round(alpha * (FADE_BUCKETS - 1));
  };
}

function drawChunks(ctx, chunks, env, paint, opacity, widthScale, effect, include) {
  if (!chunks || !chunks.length) return;
  let {transform, rect, fade, box} = env;
  // One path per (stroke width, opacity) pair keeps the SVG small and the canvas fast.
  let groups = new Map();
  for (let chunk of chunks) {
    if (include && !include(chunk)) continue;
    let bucket = fade(chunk.distance);
    if (bucket <= 0 || !isVisible(chunk, transform, rect)) continue;
    let key = chunk.width + '|' + bucket;
    let group = groups.get(key);
    if (!group) groups.set(key, group = {width: chunk.width, bucket, chunks: []});
    group.chunks.push(chunk);
  }

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  let main = toStyle(ctx, paint, box);
  for (let pass of effectPasses(effect, env.style.effectDepth, widthScale)) {
    let t = pass ? shifted(transform, pass.dx, pass.dy) : transform;
    ctx.strokeStyle = pass ? pass.color : main;
    for (let group of groups.values()) {
      ctx.globalAlpha = opacity * group.bucket / (FADE_BUCKETS - 1) * (pass ? pass.alpha : 1);
      ctx.lineWidth = group.width * widthScale;
      ctx.beginPath();
      for (let chunk of group.chunks) tracePoints(ctx, chunk.pts, t, false);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawAreas(ctx, areas, visible, paint, opacity, env) {
  if (!visible || !areas || !areas.length) return;
  let {transform, rect, box} = env;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = toStyle(ctx, paint, box);
  ctx.beginPath();
  for (let area of areas) {
    if (isVisible(area, transform, rect)) tracePoints(ctx, area.pts, transform, true);
  }
  ctx.fill();
  ctx.restore();
}

function drawBuildings(ctx, buildings, env) {
  if (!buildings || !buildings.length) return;
  let {transform, rect, fade, box, style} = env;
  let groups = new Map();
  for (let b of buildings) {
    let bucket = fade(b.distance);
    if (bucket <= 0 || !isVisible(b, transform, rect)) continue;
    let group = groups.get(bucket);
    if (!group) groups.set(bucket, group = []);
    group.push(b);
  }
  let paint = style.buildingColor || style.streets;
  let fill = style.buildings === 'fill';
  ctx.save();
  ctx.lineJoin = 'round';
  let main = toStyle(ctx, paint, box);
  for (let pass of effectPasses(style.buildingEffect, style.effectDepth, 1)) {
    let t = pass ? shifted(transform, pass.dx, pass.dy) : transform;
    for (let [bucket, group] of groups) {
      let alpha = style.streetOpacity * bucket / (FADE_BUCKETS - 1) * (pass ? pass.alpha : 1);
      // Same-colour embossed buildings only work when the face is opaque.
      let faceAlpha = style.buildingEffect !== 'none' ? 1 : (fill ? 0.45 : 0.55);
      ctx.beginPath();
      for (let b of group) tracePoints(ctx, b.pts, t, true);
      if (fill) {
        ctx.globalAlpha = alpha * (pass ? 1 : faceAlpha);
        ctx.fillStyle = pass ? pass.color : main;
        ctx.fill();
      } else {
        ctx.globalAlpha = alpha * (pass ? 1 : faceAlpha);
        ctx.strokeStyle = pass ? pass.color : main;
        ctx.lineWidth = 0.5 * style.streetWidth;
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

/**
 * Buildings as a bird's-eye model: each footprint is raised by its height
 * from OpenStreetMap, as if seen from above and slightly to the south.
 * Walls are shaded by how they face the light; far buildings are drawn
 * first so near ones cover them (painter's algorithm).
 *
 * style.extrude scales heights, style.tilt is how steep the view is (0 =
 * straight down), style.lightAngle is where the light comes from (degrees,
 * 0 = from the top of the poster, clockwise).
 */
function drawBuildings3d(ctx, buildings, env) {
  if (!buildings || !buildings.length) return;
  let {transform, rect, fade, box, style} = env;
  let lift = transform.scale * style.tilt * style.extrude; // poster units per metre of height
  let base = mainColor(style.buildingColor || style.streets);
  let light = (style.lightAngle || 0) * Math.PI / 180;
  let lx = Math.sin(light), ly = -Math.cos(light);
  // Wall colours from dark (facing away from the light) to bright (facing it).
  let shades = [0, 1, 2, 3, 4, 5].map(i => mix(base, '#000000', Math.round(55 - i * 9)));
  let edge = style.buildingEdge ? toStyle(ctx, style.buildingEdge, box) : null;
  let roof = toStyle(ctx, style.buildingColor || style.streets, box);
  let defaultHeight = 9; // when OSM has no height: about three floors

  let visible = [];
  for (let b of buildings) {
    if (fade(b.distance) <= 0) continue;
    let height = b.height || defaultHeight;
    let margin = height * lift;
    let x = transform.x(b.cx, b.cy), y = transform.y(b.cx, b.cy);
    let r = b.r * transform.scale + 4;
    if (x + r < rect.x || x - r > rect.x + rect.w || y + r < rect.y || y - r - margin > rect.y + rect.h) continue;
    let n = b.pts.length / 2;
    let sx = new Float64Array(n), sy = new Float64Array(n);
    let maxY = -Infinity;
    for (let i = 0; i < n; ++i) {
      sx[i] = transform.x(b.pts[2 * i], b.pts[2 * i + 1]);
      sy[i] = transform.y(b.pts[2 * i], b.pts[2 * i + 1]);
      if (sy[i] > maxY) maxY = sy[i];
    }
    visible.push({b, sx, sy, maxY, top: height * lift, bottom: (b.minHeight || 0) * lift});
  }
  // Far (higher on the poster) first; for stacked parts of one tower, the lower part first.
  visible.sort((a, c) => (a.maxY - c.maxY) || (a.bottom - c.bottom));

  ctx.save();
  ctx.lineJoin = 'round';
  for (let v of visible) {
    let {sx, sy, top, bottom, b} = v;
    let n = sx.length;
    // Signed area tells which way the ring winds on screen, so we know which side is "outside".
    let area = 0;
    for (let i = 0, j = n - 1; i < n; j = i++) area += sx[j] * sy[i] - sx[i] * sy[j];
    let orient = area > 0 ? 1 : -1;
    let walls = [[], [], [], [], [], []];
    for (let i = 0; i < n; ++i) {
      if (b.cut && b.cut[i]) continue; // edge where a tile cut the building: not a real wall
      let j = (i + 1) % n;
      let dx = sx[j] - sx[i], dy = sy[j] - sy[i];
      let nx = dy * orient, ny = -dx * orient;
      if (ny <= 0) continue; // faces away from the viewer
      let len = Math.hypot(nx, ny) || 1;
      let brightness = 0.5 + 0.5 * ((nx * lx + ny * ly) / len);
      walls[Math.min(5, Math.max(0, Math.round(brightness * 5)))].push(i);
    }
    walls.forEach((list, shade) => {
      if (!list.length) return;
      ctx.beginPath();
      for (let i of list) {
        let j = (i + 1) % n;
        ctx.moveTo(sx[i], sy[i] - bottom);
        ctx.lineTo(sx[j], sy[j] - bottom);
        ctx.lineTo(sx[j], sy[j] - top);
        ctx.lineTo(sx[i], sy[i] - top);
        ctx.closePath();
      }
      ctx.fillStyle = shades[shade];
      ctx.fill();
      if (edge) {
        ctx.strokeStyle = edge;
        ctx.lineWidth = 0.35;
        ctx.stroke();
      }
    });
    ctx.beginPath();
    ctx.moveTo(sx[0], sy[0] - top);
    for (let i = 1; i < n; ++i) ctx.lineTo(sx[i], sy[i] - top);
    ctx.closePath();
    ctx.fillStyle = roof;
    ctx.fill();
    if (edge) {
      ctx.strokeStyle = edge;
      ctx.lineWidth = 0.45;
      ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * Names of landmarks (towers, museums, monuments) and water, with a halo in
 * the background colour so they read on top of the map.
 */
const MAX_LANDMARKS = 14;

function drawLandmarks(ctx, poster, labels, transform, rect) {
  let {style} = poster;
  let size = 13;
  let placed = [];
  let font = {...bodyFont(style, size, 600), spacing: 0.02, paint: style.text, halo: mainColor(style.background)};
  let waterFont = {...font, weight: 500, paint: style.muted};
  // A few well-spaced names read as a map; dozens read as noise.
  let gap = 14;
  for (let label of labels) {
    if (placed.length >= MAX_LANDMARKS) break;
    let x = transform.x(label.x, label.y), y = transform.y(label.x, label.y);
    let f = label.kind === 'water' ? waterFont : font;
    let width = measure(ctx, label.name, f);
    let box = {x: x - width / 2 - 4, y: y - size, w: width + 8, h: size + 6};
    if (box.x < rect.x || box.y < rect.y || box.x + box.w > rect.x + rect.w || box.y + box.h > rect.y + rect.h) continue;
    if (placed.some(b => b.x < box.x + box.w + gap && box.x < b.x + b.w + gap && b.y < box.y + box.h + gap && box.y < b.y + b.h + gap)) continue;
    placed.push(box);
    drawText(ctx, label.name, x, y, {...f, align: 'center'});
  }
}

/**
 * Selected streets: drawn above everything else in the selection colour, with
 * a thin outline in the background colour so they stand out on busy maps.
 */
function drawSelection(ctx, features, selected, env) {
  let {style} = env;
  let chunks = features.roads.concat(features.namedRoads, features.rail, features.water).filter(c => selected.has(c.key));
  if (!chunks.length) return;
  let width = style.streetWidth * style.selectionWidth;
  let noFade = {...env, fade: () => FADE_BUCKETS - 1};
  drawChunks(ctx, chunks.map(c => ({...c, width: c.width + 0.8})), noFade, mainColor(style.background), 0.9, width, 'none');
  if (style.glow && style.glowStrength > 0) {
    for (let i = 4; i >= 1; --i) drawChunks(ctx, chunks, noFade, style.glow, 0.08 + 0.05 * style.glowStrength, width * (1 + i * 0.9 * style.glowStrength), 'none');
  }
  drawChunks(ctx, chunks, noFade, style.selection, 1, width, 'none');
}

function drawTrack(ctx, poster, transform, box) {
  let {style, subject} = poster;
  let width = style.trackWidth;
  let lines = subject.lines;
  if (style.glow && style.glowStrength > 0) {
    // Soft light: wide, faint strokes stacked under the track. Works on canvas and in SVG alike.
    ctx.save();
    for (let i = 7; i >= 1; --i) {
      ctx.globalAlpha = 0.06 + 0.05 * style.glowStrength;
      strokeLines(ctx, lines, transform, style.glow, width + i * width * 0.9 * style.glowStrength, box);
    }
    ctx.restore();
  }
  if (style.trackCasing) strokeLines(ctx, lines, transform, style.trackCasing, width + Math.max(2.5, width * 0.35), box);
  for (let pass of effectPasses(style.trackEffect, style.effectDepth, width)) {
    if (!pass) {
      strokeLines(ctx, lines, transform, style.track, width, box);
      continue;
    }
    ctx.save();
    ctx.globalAlpha = pass.alpha;
    strokeLines(ctx, lines, shifted(transform, pass.dx, pass.dy), pass.color, width, box);
    ctx.restore();
  }
  if (style.glow && style.glowStrength > 0 && style.trackCore) {
    // A bright core makes the line read as a lit neon tube.
    ctx.save();
    ctx.globalAlpha = 0.85;
    strokeLines(ctx, lines, transform, style.trackCore, Math.max(width * 0.32, 1), box);
    ctx.restore();
  }
}

function tracePoints(ctx, pts, transform, close) {
  ctx.moveTo(transform.x(pts[0], pts[1]), transform.y(pts[0], pts[1]));
  for (let i = 2; i < pts.length; i += 2) {
    ctx.lineTo(transform.x(pts[i], pts[i + 1]), transform.y(pts[i], pts[i + 1]));
  }
  if (close) ctx.closePath();
}

function strokeLines(ctx, lines, transform, paint, width, box) {
  ctx.save();
  ctx.strokeStyle = toStyle(ctx, paint, box);
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let line of lines) {
    ctx.moveTo(transform.x(line[0][0], line[0][1]), transform.y(line[0][0], line[0][1]));
    for (let i = 1; i < line.length; ++i) ctx.lineTo(transform.x(line[i][0], line[i][1]), transform.y(line[i][0], line[i][1]));
  }
  ctx.stroke();
  ctx.restore();
}

function drawStartLine(ctx, subject, transform, trackWidth, style) {
  let {start} = subject;
  let x = transform.x(start.x, start.y);
  let y = transform.y(start.x, start.y);
  let along = transform.angle(start.angle);
  let ux = Math.cos(along), uy = Math.sin(along); // along the track
  let nx = -uy, ny = ux; // across the track

  let across = Math.max(trackWidth * 3.2, 16);
  let columns = 6, rows = 2;
  let cell = across / columns;
  ctx.save();
  // A thin border so the flag reads on any background.
  quad(ctx, x, y, ux, uy, nx, ny, -cell * rows / 2 - 0.8, cell * rows / 2 + 0.8, -across / 2 - 0.8, across / 2 + 0.8);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.fillStyle = '#111111';
  for (let r = 0; r < rows; ++r) {
    for (let c = 0; c < columns; ++c) {
      if ((r + c) % 2) continue;
      let a0 = -cell * rows / 2 + r * cell, b0 = -across / 2 + c * cell;
      quad(ctx, x, y, ux, uy, nx, ny, a0, a0 + cell, b0, b0 + cell);
      ctx.fill();
    }
  }

  if (subject.oneway) {
    // Little arrow showing the direction of the race, next to the flag.
    let ax = x + ux * cell * 3 + nx * (across / 2 + cell * 1.6);
    let ay = y + uy * cell * 3 + ny * (across / 2 + cell * 1.6);
    let s = cell * 1.4;
    ctx.beginPath();
    ctx.moveTo(ax + ux * s, ay + uy * s);
    ctx.lineTo(ax - ux * s * 0.6 + nx * s * 0.7, ay - uy * s * 0.6 + ny * s * 0.7);
    ctx.lineTo(ax - ux * s * 0.6 - nx * s * 0.7, ay - uy * s * 0.6 - ny * s * 0.7);
    ctx.closePath();
    ctx.fillStyle = mainColor(style.accent);
    ctx.fill();
  }
  ctx.restore();
}

function quad(ctx, x, y, ux, uy, nx, ny, a0, a1, b0, b1) {
  ctx.beginPath();
  ctx.moveTo(x + ux * a0 + nx * b0, y + uy * a0 + ny * b0);
  ctx.lineTo(x + ux * a1 + nx * b0, y + uy * a1 + ny * b0);
  ctx.lineTo(x + ux * a1 + nx * b1, y + uy * a1 + ny * b1);
  ctx.lineTo(x + ux * a0 + nx * b1, y + uy * a0 + ny * b1);
  ctx.closePath();
}

/**
 * Corner names, pushed outwards from the middle of the circuit so they sit
 * beside the track. Labels that would overlap an earlier one are skipped.
 */
function drawCornerLabels(ctx, poster, transform, rect) {
  let {style, subject} = poster;
  let cx = transform.x(0, 0), cy = transform.y(0, 0);
  let size = 12;
  let placed = [];
  let font = {...bodyFont(style, size, 500), spacing: 0.04, paint: style.muted};
  for (let corner of subject.corners) {
    let x = transform.x(corner.x, corner.y), y = transform.y(corner.x, corner.y);
    let dx = x - cx, dy = y - cy;
    let len = Math.hypot(dx, dy) || 1;
    let offset = style.trackWidth * 0.8 + 8;
    let lx = x + dx / len * offset, ly = y + dy / len * offset + size * 0.35;
    let align = Math.abs(dx / len) < 0.3 ? 'center' : dx > 0 ? 'left' : 'right';
    let width = measure(ctx, corner.name, font);
    let left = align === 'center' ? lx - width / 2 : align === 'right' ? lx - width : lx;
    let box = {x: left - 3, y: ly - size, w: width + 6, h: size + 4};
    if (box.x < rect.x || box.y < rect.y || box.x + box.w > rect.x + rect.w || box.y + box.h > rect.y + rect.h) continue;
    if (placed.some(b => b.x < box.x + box.w && box.x < b.x + b.w && b.y < box.y + box.h && box.y < b.y + b.h)) continue;
    placed.push(box);
    drawText(ctx, corner.name, lx, ly, {...font, align});
  }
}

function drawNorthArrow(ctx, poster, x, y) {
  let {style, view} = poster;
  let color = style.mapBackground && poster.layout === 'inset' ? '#ffffff' : mainColor(style.text);
  // North is "up" in local coordinates; on the poster it turns with the map.
  let rotation = (view.rotation || 0) * Math.PI / 180;
  let ux = -Math.sin(rotation), uy = -Math.cos(rotation);
  let nx = -uy, ny = ux;
  let s = 24;
  ctx.save();
  // Two halves, one filled and one outlined, like a classic map compass needle.
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.lineJoin = 'round';
  let tip = [x + ux * s, y + uy * s];
  let tail = [x - ux * s * 0.35, y - uy * s * 0.35];
  let left = [x - ux * s * 0.7 + nx * s * 0.55, y - uy * s * 0.7 + ny * s * 0.55];
  let right = [x - ux * s * 0.7 - nx * s * 0.55, y - uy * s * 0.7 - ny * s * 0.55];
  ctx.beginPath();
  ctx.moveTo(tip[0], tip[1]);
  ctx.lineTo(left[0], left[1]);
  ctx.lineTo(tail[0], tail[1]);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(tip[0], tip[1]);
  ctx.lineTo(right[0], right[1]);
  ctx.lineTo(tail[0], tail[1]);
  ctx.closePath();
  ctx.stroke();
  drawText(ctx, 'N', x + ux * (s + 16), y + uy * (s + 16) + 6, {family: style.bodyFont, weight: 600, size: 17, align: 'center', paint: color});
  ctx.restore();
}

function drawFlag(ctx, flag, cx, top, height) {
  let width = height * flag.aspect;
  ctx.save();
  if (flag.image) ctx.drawImage(flag.image, cx - width / 2, top, width, height);
  ctx.restore();
}

function drawAttribution(ctx, poster, x, y, align, size = 10) {
  if (!poster.layers.attribution) return;
  // Credit whoever served the map data, and always OpenStreetMap.
  let credit = (poster.features && poster.features.attribution) || 'Map data © OpenStreetMap contributors';
  drawText(ctx, credit, x, y, {...bodyFont(poster.style, size, 400), align, paint: poster.style.muted, alpha: 0.75});
}

// ---------------------------------------------------------------- text

function drawTitle(ctx, poster, x, y, maxWidth, maxSize, align) {
  let {style, text, uppercase} = poster;
  let title = uppercase ? (text.title || '').toUpperCase() : (text.title || '');
  let font = {family: style.titleFont, weight: style.titleWeight, size: maxSize, spacing: style.titleSpacing};
  let size = fitSize(ctx, title, font, maxWidth);
  drawText(ctx, title, x, y, {...font, size, align, paint: style.text});
}

function bodyFont(style, size, weight) {
  return {family: style.bodyFont, weight, size, spacing: 0};
}

function setFont(ctx, font) {
  ctx.font = `${font.weight || 400} ${font.size}px "${font.family}", sans-serif`;
  let spacing = (font.spacing || 0) * font.size;
  if ('letterSpacing' in ctx) ctx.letterSpacing = spacing + 'px';
  return spacing;
}

function measure(ctx, text, font) {
  let spacing = setFont(ctx, font);
  let width = ctx.measureText(text).width;
  if (!('letterSpacing' in ctx)) width += spacing * text.length;
  // Both canvas and SVG add the spacing after the last letter too; it is not part of the visible text.
  return width - spacing;
}

function fitSize(ctx, text, font, maxWidth) {
  let width = measure(ctx, text, font);
  if (width <= maxWidth) return font.size;
  return Math.floor(font.size * maxWidth / width);
}

function drawText(ctx, text, x, y, font) {
  if (!text) return;
  ctx.save();
  let width = measure(ctx, text, font);
  let spacing = setFont(ctx, font);
  let left = font.align === 'center' ? x - width / 2 : font.align === 'right' ? x - width : x;
  // Gradients span the text itself, so every word shows the full range of colours.
  ctx.fillStyle = toStyle(ctx, font.paint, {x: left, y: y - font.size, w: width, h: font.size});
  if (font.alpha !== undefined) ctx.globalAlpha = font.alpha;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  if (font.halo) {
    ctx.save();
    ctx.strokeStyle = font.halo;
    ctx.lineWidth = font.size * 0.28;
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.85;
    ctx.strokeText(text, left, y);
    ctx.restore();
  }
  if ('letterSpacing' in ctx || !spacing) {
    ctx.fillText(text, left, y);
  } else {
    // Older browsers: place letters one by one.
    for (let ch of text) {
      ctx.fillText(ch, left, y);
      left += ctx.measureText(ch).width + spacing;
    }
  }
  ctx.restore();
}
