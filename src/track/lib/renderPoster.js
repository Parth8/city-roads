import {drawBorder} from '../../lib/artwork.js';

/**
 * Draws a circuit poster onto a 2D canvas context (or onto SvgContext, which
 * mimics one). Everything is laid out in poster units: the poster is always
 * 1000 units wide, so styles look the same at every paper size and resolution.
 */
export const POSTER_WIDTH = 1000;

const FADE_BUCKETS = 8;

/**
 * Draws the whole poster: the optional border (plain or polaroid), and the
 * artwork inside it. Returns where the map ended up, in poster units, so the
 * editor can turn pointer movements into panning.
 */
export default function renderPoster(ctx, poster) {
  let {width, height} = poster;
  ctx.save();
  let inner = drawBorder(ctx, poster.border, width, height);
  // The artwork is always laid out 1000 units wide; scale it into the space the border leaves.
  let k = inner.w / POSTER_WIDTH;
  ctx.translate(inner.x, inner.y);
  ctx.scale(k, k);
  let mapInfo = renderArtwork(ctx, {...poster, width: POSTER_WIDTH, height: inner.h / k});
  ctx.restore();
  let r = mapInfo.rect;
  return {...mapInfo, rect: {x: inner.x + r.x * k, y: inner.y + r.y * k, w: r.w * k, h: r.h * k}};
}

function renderArtwork(ctx, poster) {
  let {width, height, theme} = poster;
  let layout = getLayout(poster);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.clip();
  if (theme.background2) {
    let gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, theme.background);
    gradient.addColorStop(1, theme.background2);
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = theme.background;
  }
  ctx.fillRect(0, 0, width, height);

  let mapInfo = drawMap(ctx, poster, layout.map);

  if (layout.decorate) layout.decorate(ctx);
  ctx.restore();
  return mapInfo;
}

// ---------------------------------------------------------------- layouts

function getLayout(poster) {
  let {width: W, height: H} = poster;
  let compact = H < W * 1.05; // square and landscape posters have less room for text
  if (poster.layout === 'inset') return insetLayout(poster, W, H, compact);
  if (poster.layout === 'data') return dataLayout(poster, W, H, compact);
  if (poster.layout === 'wallpaper') return wallpaperLayout(poster, W, H);
  return minimalLayout(poster, W, H, compact);
}

function minimalLayout(poster, W, H, compact) {
  let {theme, text, options} = poster;
  let margin = 70;
  let textBlock = (compact ? 230 : 300) + (options.showFlag && poster.flag ? 45 : 0);
  let map = {x: margin, y: margin, w: W - 2 * margin, h: H - margin - textBlock};

  return {
    map,
    decorate(ctx) {
      let y = map.y + map.h + (compact ? 105 : 140);
      let title = transformTitle(text.title, options);
      let size = fitSize(ctx, title, titleFont(theme, 96), W - 2 * margin);
      drawText(ctx, title, W / 2, y, {...titleFont(theme, size), align: 'center', color: theme.text});

      let summary = text.tagline;
      if (summary) {
        y += 46;
        drawText(ctx, summary, W / 2, y, {...bodyFont(theme, 19, 500), spacing: 0.08, align: 'center', color: theme.muted});
      }

      if (text.subtitle) {
        y += 42;
        let sub = text.subtitle.toUpperCase();
        let subFont = {...bodyFont(theme, 22, 600), spacing: 0.14};
        let subWidth = measure(ctx, sub, subFont);
        drawText(ctx, sub, W / 2, y, {...subFont, align: 'center', color: theme.text});
        let ruleY = y - 8;
        let gap = 22;
        let ruleLength = Math.min(170, (W - 2 * margin - subWidth) / 2 - gap);
        if (ruleLength > 20) {
          ctx.save();
          ctx.strokeStyle = theme.muted;
          ctx.globalAlpha = 0.7;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(W / 2 - subWidth / 2 - gap - ruleLength, ruleY);
          ctx.lineTo(W / 2 - subWidth / 2 - gap, ruleY);
          ctx.moveTo(W / 2 + subWidth / 2 + gap, ruleY);
          ctx.lineTo(W / 2 + subWidth / 2 + gap + ruleLength, ruleY);
          ctx.stroke();
          ctx.restore();
        }
      }

      if (options.showFlag && poster.flag) {
        y += 24;
        drawFlag(ctx, poster.flag, W / 2, y, 30);
      }
      drawAttribution(ctx, poster, W / 2, H - 26, 'center');
    }
  };
}

/**
 * Full-bleed map for screens. Text is optional and kept small, sized from the
 * shorter side so it reads the same on a phone and on an ultrawide monitor.
 */
function wallpaperLayout(poster, W, H) {
  let {theme, text, options} = poster;
  let map = {x: 0, y: 0, w: W, h: H};
  let unit = Math.min(W, H) / 1000;
  let label = options.wallpaperLabel || 'none';

  return {
    map,
    decorate(ctx) {
      if (label === 'none') return;
      let title = transformTitle(text.title, options);
      let margin = 60 * unit;
      let titleSize = 46 * unit;
      let subtitleSize = 20 * unit;
      let align = label === 'corner' ? 'right' : 'center';
      let x = label === 'corner' ? W - margin : W / 2;
      let y = H - margin - (text.tagline ? subtitleSize * 1.8 : 0);
      let size = fitSize(ctx, title, titleFont(theme, titleSize), W - 2 * margin);
      drawText(ctx, title, x, y, {...titleFont(theme, size), align, color: theme.text});
      if (text.tagline) {
        drawText(ctx, text.tagline, x, y + subtitleSize * 1.8, {...bodyFont(theme, subtitleSize, 500), spacing: 0.08, align, color: theme.muted});
      }
    }
  };
}

function insetLayout(poster, W, H, compact) {
  let {theme, text, options} = poster;
  let margin = 80;
  let textBlock = compact ? 250 : 330;
  let map = {x: margin, y: margin, w: W - 2 * margin, h: H - margin - textBlock};

  return {
    map,
    decorate(ctx) {
      if (options.showNorth) drawNorthArrow(ctx, poster, map.x + 50, map.y + 80);

      let y = map.y + map.h + (compact ? 110 : 140);
      let title = transformTitle(text.title, options);
      let size = fitSize(ctx, title, titleFont(theme, 100), W - 2 * margin);
      drawText(ctx, title, W / 2, y, {...titleFont(theme, size), align: 'center', color: theme.text});

      if (text.subtitle) {
        y += 52;
        drawText(ctx, text.subtitle.toUpperCase(), W / 2, y, {...bodyFont(theme, 26, 400), spacing: 0.12, align: 'center', color: theme.muted});
      }
      let line = text.coords || text.tagline;
      if (line) {
        y += 46;
        drawText(ctx, line, W / 2, y, {...bodyFont(theme, 23, 500), spacing: 0.05, align: 'center', color: theme.text});
      }
      if (options.showFlag && poster.flag) {
        y += 26;
        drawFlag(ctx, poster.flag, W / 2, y, 28);
      }
      drawAttribution(ctx, poster, W / 2, H - 26, 'center');
    }
  };
}

function dataLayout(poster, W, H, compact) {
  let {theme, text, options} = poster;
  let margin = 60;
  let stats = (text.stats || []).filter(s => s.value);
  let top = compact ? 175 : 240;
  let bottom = stats.length ? (compact ? 170 : 220) : 90;
  let map = {x: margin, y: top, w: W - 2 * margin, h: H - top - bottom};

  return {
    map,
    decorate(ctx) {
      let title = transformTitle(text.title, options);
      let size = fitSize(ctx, title, titleFont(theme, 92), W - 2 * margin);
      let titleY = compact ? 105 : 140;
      drawText(ctx, title, W / 2, titleY, {...titleFont(theme, size), align: 'center', color: theme.text});
      if (text.subtitle) {
        drawText(ctx, text.subtitle, W / 2, titleY + 48, {...bodyFont(theme, 28, 400), spacing: 0.06, align: 'center', color: theme.muted});
      }
      if (options.showFlag && poster.flag) {
        drawFlag(ctx, poster.flag, W - margin - 22, titleY - 30, 26);
      }
      if (options.showNorth) drawNorthArrow(ctx, poster, map.x + 40, map.y + 70);

      if (stats.length) {
        let barTop = map.y + map.h + (compact ? 40 : 60);
        let columnWidth = (W - 2 * margin) / stats.length;
        stats.forEach((stat, i) => {
          let x = margin + i * columnWidth;
          ctx.save();
          ctx.fillStyle = theme.accent;
          ctx.fillRect(x, barTop, 4, 92);
          ctx.restore();
          let labelFont = {...bodyFont(theme, 17, 500), spacing: 0.1, color: theme.muted};
          let label = (stat.label || '').toUpperCase();
          drawText(ctx, label, x + 18, barTop + 22, {...labelFont, size: fitSize(ctx, label, labelFont, columnWidth - 30)});
          let valueFont = {...bodyFont(theme, 40, 600), color: theme.text};
          drawText(ctx, stat.value, x + 18, barTop + 78, {...valueFont, size: fitSize(ctx, stat.value, valueFont, columnWidth - 30)});
        });
      }
      drawAttribution(ctx, poster, W - margin, H - 26, 'right');
    }
  };
}

// ---------------------------------------------------------------- map

function drawMap(ctx, poster, rect) {
  let {theme, track, surroundings, view, options} = poster;
  let transform = createTransform(track, rect, view);

  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (theme.mapBackground) {
    ctx.fillStyle = theme.mapBackground;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }

  if (surroundings && options.showStreets) {
    let fade = createFade(options.fade, track.radius);
    if (options.showBuildings && theme.buildings !== 'none') {
      drawBuildings(ctx, surroundings.buildings, transform, rect, fade, theme, options);
    }
    drawChunks(ctx, surroundings.water, transform, rect, fade, theme.streets, options.streetOpacity * 0.8, options.streetWidth);
    drawChunks(ctx, surroundings.rail, transform, rect, fade, theme.streets, options.streetOpacity * 0.6, options.streetWidth);
    drawChunks(ctx, surroundings.roads, transform, rect, fade, theme.streets, options.streetOpacity, options.streetWidth);
  }

  let trackWidth = options.trackWidth;
  if (options.showPit && track.pit.length) {
    ctx.save();
    ctx.globalAlpha = 0.6;
    strokeLines(ctx, track.pit, transform, theme.track, Math.max(trackWidth * 0.32, 1.2));
    ctx.restore();
  }
  if (theme.glow && theme.glowStrength > 0) drawGlow(ctx, track.lines, transform, theme.glow, trackWidth, theme.glowStrength);
  if (theme.trackCasing) {
    strokeLines(ctx, track.lines, transform, theme.trackCasing, trackWidth + Math.max(2.5, trackWidth * 0.35));
  }
  strokeLines(ctx, track.lines, transform, theme.track, trackWidth);
  if (theme.glow && theme.glowStrength > 0 && theme.trackCore) {
    // A bright core makes the line read as a lit neon tube.
    ctx.save();
    ctx.globalAlpha = 0.85;
    strokeLines(ctx, track.lines, transform, theme.trackCore, Math.max(trackWidth * 0.32, 1));
    ctx.restore();
  }

  if (options.showStart && track.start) drawStartLine(ctx, track, transform, trackWidth, theme);
  ctx.restore();

  return {rect, scale: transform.scale, rotation: transform.rotation};
}

/**
 * Local metres -> poster units. The circuit is centred and scaled to fill the
 * map rectangle (with some air around it), then zoomed and panned by the user.
 */
function createTransform(track, rect, view) {
  let rotation = (view.rotation || 0) * Math.PI / 180;
  let cos = Math.cos(rotation), sin = Math.sin(rotation);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let [x, y] of track.points) {
    let rx = x * cos - y * sin, ry = x * sin + y * cos;
    if (rx < minX) minX = rx;
    if (rx > maxX) maxX = rx;
    if (ry < minY) minY = ry;
    if (ry > maxY) maxY = ry;
  }
  let padding = 0.12;
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

function isVisible(chunk, transform, rect) {
  let x = transform.x(chunk.cx, chunk.cy);
  let y = transform.y(chunk.cx, chunk.cy);
  let r = chunk.r * transform.scale + 4;
  return x + r > rect.x && x - r < rect.x + rect.w && y + r > rect.y && y - r < rect.y + rect.h;
}

function createFade(amount, radius) {
  if (!amount) return () => FADE_BUCKETS - 1;
  // Strong fade keeps only the streets right next to the track.
  let reach = radius * (3.2 - 2.8 * amount);
  let floor = 0.25 * (1 - amount);
  return function bucket(distance) {
    let t = Math.max(0, 1 - distance / reach);
    let alpha = floor + (1 - floor) * Math.pow(t, 1.3);
    return Math.round(alpha * (FADE_BUCKETS - 1));
  };
}

function drawChunks(ctx, chunks, transform, rect, fade, color, opacity, widthScale) {
  if (!chunks || !chunks.length) return;
  // One path per (stroke width, opacity) pair keeps the SVG small and the canvas fast.
  let groups = new Map();
  for (let chunk of chunks) {
    let bucket = fade(chunk.distance);
    if (bucket <= 0 || !isVisible(chunk, transform, rect)) continue;
    let key = chunk.width + '|' + bucket;
    let group = groups.get(key);
    if (!group) groups.set(key, group = {width: chunk.width, bucket, chunks: []});
    group.chunks.push(chunk);
  }

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let group of groups.values()) {
    ctx.globalAlpha = opacity * group.bucket / (FADE_BUCKETS - 1);
    ctx.lineWidth = group.width * widthScale;
    ctx.beginPath();
    for (let chunk of group.chunks) tracePoints(ctx, chunk.pts, transform, false);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBuildings(ctx, buildings, transform, rect, fade, theme, options) {
  if (!buildings || !buildings.length) return;
  let groups = new Map();
  for (let b of buildings) {
    let bucket = fade(b.distance);
    if (bucket <= 0 || !isVisible(b, transform, rect)) continue;
    let group = groups.get(bucket);
    if (!group) groups.set(bucket, group = []);
    group.push(b);
  }
  ctx.save();
  ctx.lineJoin = 'round';
  for (let [bucket, group] of groups) {
    let alpha = options.streetOpacity * bucket / (FADE_BUCKETS - 1);
    ctx.beginPath();
    for (let b of group) tracePoints(ctx, b.pts, transform, true);
    if (theme.buildings === 'fill') {
      ctx.globalAlpha = alpha * 0.45;
      ctx.fillStyle = theme.buildingColor || theme.streets;
      ctx.fill();
    } else {
      ctx.globalAlpha = alpha * 0.55;
      ctx.strokeStyle = theme.buildingColor || theme.streets;
      ctx.lineWidth = 0.5 * options.streetWidth;
      ctx.stroke();
    }
  }
  ctx.restore();
}

function tracePoints(ctx, pts, transform, close) {
  ctx.moveTo(transform.x(pts[0], pts[1]), transform.y(pts[0], pts[1]));
  for (let i = 2; i < pts.length; i += 2) {
    ctx.lineTo(transform.x(pts[i], pts[i + 1]), transform.y(pts[i], pts[i + 1]));
  }
  if (close) ctx.closePath();
}

function strokeLines(ctx, lines, transform, color, width) {
  ctx.save();
  ctx.strokeStyle = color;
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

/**
 * Soft light around the track: wide, faint strokes stacked under it. Works the
 * same on canvas and in SVG, unlike blur filters.
 */
function drawGlow(ctx, lines, transform, color, trackWidth, strength) {
  let layers = 7;
  ctx.save();
  for (let i = layers; i >= 1; --i) {
    ctx.globalAlpha = 0.06 + 0.05 * strength;
    strokeLines(ctx, lines, transform, color, trackWidth + i * trackWidth * 0.9 * strength);
  }
  ctx.restore();
}

function drawStartLine(ctx, track, transform, trackWidth, theme) {
  let {start} = track;
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

  if (track.oneway) {
    // Little arrow showing the direction of the race, next to the flag.
    let ax = x + ux * cell * 3 + nx * (across / 2 + cell * 1.6);
    let ay = y + uy * cell * 3 + ny * (across / 2 + cell * 1.6);
    let s = cell * 1.4;
    ctx.beginPath();
    ctx.moveTo(ax + ux * s, ay + uy * s);
    ctx.lineTo(ax - ux * s * 0.6 + nx * s * 0.7, ay - uy * s * 0.6 + ny * s * 0.7);
    ctx.lineTo(ax - ux * s * 0.6 - nx * s * 0.7, ay - uy * s * 0.6 - ny * s * 0.7);
    ctx.closePath();
    ctx.fillStyle = theme.accent;
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

function drawNorthArrow(ctx, poster, x, y) {
  let {theme, view} = poster;
  let color = theme.mapBackground ? '#ffffff' : theme.text;
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
  let labelX = x + ux * (s + 16), labelY = y + uy * (s + 16) + 6;
  drawText(ctx, 'N', labelX, labelY, {family: theme.bodyFont, weight: 600, size: 17, align: 'center', color});
  ctx.restore();
}

function drawFlag(ctx, flag, cx, top, height) {
  let width = height * flag.aspect;
  ctx.save();
  if (flag.image) ctx.drawImage(flag.image, cx - width / 2, top, width, height);
  ctx.restore();
}

function drawAttribution(ctx, poster, x, y, align) {
  if (!poster.options.showAttribution) return;
  drawText(ctx, 'Map data © OpenStreetMap contributors', x, y, {...bodyFont(poster.theme, 10, 400), align, color: poster.theme.muted, alpha: 0.75});
}

// ---------------------------------------------------------------- text

function titleFont(theme, size) {
  return {family: theme.titleFont, weight: theme.titleWeight, size, spacing: theme.titleSpacing};
}

function bodyFont(theme, size, weight) {
  return {family: theme.bodyFont, weight, size, spacing: 0};
}

function transformTitle(title, options) {
  title = title || '';
  return options.uppercase ? title.toUpperCase() : title;
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
  ctx.fillStyle = font.color;
  if (font.alpha !== undefined) ctx.globalAlpha = font.alpha;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  let left = font.align === 'center' ? x - width / 2 : font.align === 'right' ? x - width : x;
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
