import {toStyle, mainColor, mix} from './paint.js';
import {SCENE_MARGIN} from './geometry.js';

/**
 * The skyline view: the map seen through a camera standing somewhere around
 * the subject, as if from a rooftop or a helicopter. A true perspective
 * projection: things get smaller with distance, buildings are drawn far to
 * near (painter's algorithm) and fade into haze towards the horizon.
 *
 * camera: {
 *   mode,       'map' (top-down poster) or 'skyline'
 *   bearing,    compass direction the camera looks in, degrees (0 = north); null picks one
 *   distance,   metres from the subject's centre to the camera; 0 picks one
 *   height,     eye height in metres
 *   fov,        horizontal field of view, degrees
 *   horizon,    tilts the camera down (positive) or up, degrees
 *   haze,       0 (crystal clear) to 1 (thick haze)
 *   sky         paint for the sky, or null to blend it from the colours
 * }
 *
 * Coordinates are the subject's local Web Mercator units; heights in metres
 * are scaled by subject.unitsPerMetre to match them.
 */
export const CAMERA_DEFAULTS = {mode: 'map', bearing: null, distance: 0, height: 320, fov: 60, horizon: 0, haze: 0.5, sky: null};

export const CAMERA_SPOTS = [
  {id: 'street', name: 'Street', height: 2},
  {id: 'rooftop', name: 'Rooftop', height: 180},
  {id: 'deck', name: 'Sky deck', height: 380},
  {id: 'aerial', name: 'Aerial', height: 900},
];

const DEFAULT_HEIGHT = 9; // metres, when OpenStreetMap has no height: about three floors
const SHADES = 6;
const FOG_STEPS = 16;
const MAX_LINE = 5; // poster units

export function autoDistance(subject) {
  let radius = subject.radius / (subject.unitsPerMetre || 1);
  return Math.round(Math.min(Math.max(radius * 1.3, 600), SCENE_MARGIN * 0.85) / 50) * 50;
}

/**
 * The direction of the street grid near the centre, so the camera can look
 * straight down the avenues (Manhattan's grid runs 29° east of north).
 */
export function gridBearing(features, subject) {
  let bins = new Float64Array(36);
  let reach = subject.radius * 1.5;
  for (let chunk of features.roads) {
    if (Math.hypot(chunk.cx, chunk.cy) > reach) continue;
    let pts = chunk.pts;
    for (let i = 2; i < pts.length; i += 2) {
      let dx = pts[i] - pts[i - 2], dy = pts[i + 1] - pts[i - 1];
      let angle = Math.atan2(dx, dy) * 180 / Math.PI; // from north, clockwise
      let bin = Math.floor((((angle % 90) + 90) % 90) / 2.5);
      bins[bin] += Math.hypot(dx, dy);
    }
  }
  let best = 0;
  for (let i = 1; i < bins.length; ++i) if (bins[i] > bins[best]) best = i;
  if (!bins[best]) return 0;
  // Of the grid's two directions, look along the one closer to north.
  let angle = best * 2.5 + 1.25;
  return angle > 45 ? angle - 90 : angle;
}

export function createCamera(subject, rect, settings) {
  let k = subject.unitsPerMetre || 1;
  let bearing = (settings.bearing || 0) * Math.PI / 180;
  let distance = (settings.distance || autoDistance(subject)) * k;
  let height = Math.max(settings.height, 0.5) * k;
  let dirX = Math.sin(bearing), dirY = Math.cos(bearing);
  let ex = -dirX * distance, ey = -dirY * distance, ez = height;
  // Aim at the subject's centre on the ground, then tilt as asked.
  let pitch = Math.atan2(height, distance) + (settings.horizon || 0) * Math.PI / 180;
  let cp = Math.cos(pitch), sp = Math.sin(pitch);
  // Camera axes: right, up and forward.
  let rx = dirY, ry = -dirX;
  let ux = dirX * sp, uy = dirY * sp, uz = cp;
  let fx = dirX * cp, fy = dirY * cp, fz = -sp;
  let focal = rect.w / 2 / Math.tan(Math.max(10, Math.min(settings.fov || 60, 120)) * Math.PI / 360);
  let cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
  return {
    k, ex, ey, ez, focal, pitch, rect,
    near: 1.5 * k,
    horizonY: cy - Math.tan(pitch) * focal,
    tanX: rect.w / 2 / focal,
    tanY: rect.h / 2 / focal,
    // World -> camera space: [right, up, depth].
    toCamera(x, y, z) {
      let dx = x - ex, dy = y - ey, dz = z - ez;
      return [dx * rx + dy * ry, dx * ux + dy * uy + dz * uz, dx * fx + dy * fy + dz * fz];
    },
    sx: c => cx + c[0] / c[2] * focal,
    sy: c => cy - c[1] / c[2] * focal,
    // Distance along the ground for a point on screen below the horizon, or Infinity above it.
    groundDistance(screenY) {
      let below = pitch - Math.atan((screenY - cy) / -focal);
      return below > 0 ? ez / Math.tan(below) : Infinity;
    },
    // A transform-like object for labels; NaN for points behind the camera.
    pointAt(z) {
      let camera = this;
      return {
        scale: 1,
        x: (x, y) => {
          let c = camera.toCamera(x, y, z);
          return c[2] > camera.near ? camera.sx(c) : NaN;
        },
        y: (x, y) => {
          let c = camera.toCamera(x, y, z);
          return c[2] > camera.near ? camera.sy(c) : NaN;
        }
      };
    }
  };
}

/**
 * Draws the scene into `rect`. Returns the camera.
 * options.minSize: features smaller than this on the poster are skipped
 * (bigger while dragging and for thumbnails, to stay fast); options.fast
 * also leaves out building outlines.
 */
export function drawScene(ctx, poster, rect, box, options = {}) {
  let {style, layers, subject, features} = poster;
  let settings = {...CAMERA_DEFAULTS, ...poster.camera};
  let cam = createCamera(subject, rect, settings);
  let minSize = options.minSize || 0.2;
  let haze = Math.max(0, Math.min(settings.haze, 1));
  // Thick enough that the far edge of the downloaded area melts into the haze.
  let edge = Math.hypot(cam.ex, cam.ey) + subject.radius + SCENE_MARGIN * cam.k;
  let visibility = edge / (0.8 + 3 * haze);
  let fogAt = d => 1 - Math.exp(-d / visibility);
  let fogColor = settings.sky ? skyBottom(settings.sky) : mix(style.background, style.streets, 22);
  let hy = Math.max(rect.y, Math.min(cam.horizonY, rect.y + rect.h));

  // Sky, then the ground.
  if (hy > rect.y) {
    let skyBox = {x: rect.x, y: rect.y, w: rect.w, h: hy - rect.y};
    if (settings.sky) {
      ctx.fillStyle = toStyle(ctx, settings.sky, skyBox);
    } else {
      let gradient = ctx.createLinearGradient(0, rect.y, 0, hy);
      gradient.addColorStop(0, mainColor(style.background));
      gradient.addColorStop(1, fogColor);
      ctx.fillStyle = gradient;
    }
    ctx.fillRect(rect.x, rect.y, rect.w, hy - rect.y + 0.5);
  }
  ctx.fillStyle = toStyle(ctx, style.background, box);
  ctx.fillRect(rect.x, hy, rect.w, rect.y + rect.h - hy);

  if (features) {
    if (layers.parks) fillGround(ctx, features.parks, cam, style.parks || mix(style.background, style.streets, 6), minSize);
    if (layers.water) fillGround(ctx, features.waterAreas, cam, style.water || mix(style.background, style.streets, 12), minSize);
    // Opaque, pre-mixed colours: see-through strokes would blotch where pieces overlap.
    let ground = mainColor(style.background);
    let ink = (paint, opacity) => mix(ground, paint, Math.round(Math.min(1, opacity) * 100));
    if (layers.water) strokeGround(ctx, features.water, cam, ink(style.water || style.streets, style.streetOpacity * 0.8), 4 * style.streetWidth, minSize);
    if (layers.rail) strokeGround(ctx, features.rail, cam, ink(style.streets, style.streetOpacity * 0.6), 2.5 * style.streetWidth, minSize);
    if (layers.streets) strokeGround(ctx, features.roads, cam, ink(style.streets, style.streetOpacity), 4 * style.streetWidth, minSize);
  }
  if (subject.kind === 'track' && layers.track) drawGroundTrack(ctx, subject, cam, style, box);
  drawGroundHaze(ctx, cam, rect, hy, fogColor, fogAt);
  // Like the 3D map, the skyline always shows buildings unless the layer is off.
  if (features && layers.buildings) {
    drawSceneBuildings(ctx, features.buildings, cam, style, fogColor, fogAt, minSize, options.fast);
  }
  return cam;
}

function skyBottom(paint) {
  if (typeof paint === 'string') return paint;
  return paint.stops[paint.stops.length - 1];
}

function rgba(color, alpha) {
  let hex = mainColor(color).replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  let n = parseInt(hex.slice(0, 6), 16);
  return `rgba(${n >> 16 & 255}, ${n >> 8 & 255}, ${n & 255}, ${alpha.toFixed(3)})`;
}

// The ground fades into haze with distance: a gradient from the horizon down.
function drawGroundHaze(ctx, cam, rect, hy, fogColor, fogAt) {
  let bottom = rect.y + rect.h;
  if (hy >= bottom) return;
  // Start a pixel above the horizon so no seam shows between sky and ground.
  let start = hy - 1;
  let gradient = ctx.createLinearGradient(0, start, 0, bottom);
  let steps = 14;
  gradient.addColorStop(0, rgba(fogColor, 1));
  for (let i = 1; i <= steps; ++i) {
    // Denser stops near the horizon, where distance changes fastest.
    let t = Math.pow(i / steps, 2);
    let y = start + t * (bottom - start);
    gradient.addColorStop(t, rgba(fogColor, Math.min(1, fogAt(cam.groundDistance(Math.max(y, hy + 0.01))))));
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(rect.x, start, rect.w, bottom - start);
}

// Is a feature (centre cx, cy, radius r, top z) in front of the camera and big enough to see?
function inView(cam, cx, cy, r, z, minSize) {
  let c = cam.toCamera(cx, cy, z / 2);
  let depth = c[2];
  if (depth + r < cam.near) return null;
  let d = Math.max(depth, cam.near);
  if (Math.abs(c[0]) - r > d * cam.tanX * 1.05) return null;
  if (Math.abs(c[1]) - r - z > d * cam.tanY * 1.05) return null;
  let size = Math.max(2 * r, z) * cam.focal / d;
  if (size < minSize) return null;
  return {depth: d, size};
}

/**
 * Traces a polygon given in camera space, clipped to the near plane.
 */
function traceCameraPolygon(ctx, cpts, cam) {
  let near = cam.near;
  let out = [];
  for (let i = 0; i < cpts.length; ++i) {
    let a = cpts[i], b = cpts[(i + 1) % cpts.length];
    let ain = a[2] >= near, bin = b[2] >= near;
    if (ain) out.push(a);
    if (ain !== bin) {
      let t = (near - a[2]) / (b[2] - a[2]);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, near]);
    }
  }
  if (out.length < 3) return false;
  ctx.moveTo(cam.sx(out[0]), cam.sy(out[0]));
  for (let i = 1; i < out.length; ++i) ctx.lineTo(cam.sx(out[i]), cam.sy(out[i]));
  ctx.closePath();
  return true;
}

function fillGround(ctx, areas, cam, paint, minSize) {
  if (!areas || !areas.length) return;
  ctx.beginPath();
  for (let area of areas) {
    if (!inView(cam, area.cx, area.cy, area.r, 0, minSize)) continue;
    let cpts = [];
    for (let i = 0; i < area.pts.length; i += 2) cpts.push(cam.toCamera(area.pts[i], area.pts[i + 1], 0));
    traceCameraPolygon(ctx, cpts, cam);
  }
  ctx.fillStyle = mainColor(paint);
  ctx.fill();
}

/**
 * Lines on the ground (streets, rail, rivers), as wide as they would be:
 * thick up close, hairlines far away. Grouped by on-screen width.
 */
function strokeGround(ctx, chunks, cam, color, metres, minSize) {
  if (!chunks || !chunks.length) return;
  let groups = new Map();
  let k = cam.k;
  for (let chunk of chunks) {
    let seen = inView(cam, chunk.cx, chunk.cy, chunk.r, 0, minSize);
    if (!seen) continue;
    // A stroke widens in every direction, so very near streets are capped rather than true to size.
    let width = Math.min(metres * k * (chunk.width || 1) * cam.focal / seen.depth, MAX_LINE);
    let bucket = Math.round(Math.log(Math.max(width, 0.08)) / Math.log(1.3));
    let group = groups.get(bucket);
    if (!group) groups.set(bucket, group = []);
    group.push(chunk);
  }
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let [bucket, group] of groups) {
    let width = Math.pow(1.3, bucket);
    // Hairlines stay faint rather than vanishing.
    ctx.globalAlpha = Math.min(1, width / 0.25 + 0.3);
    ctx.lineWidth = Math.max(width, 0.12);
    ctx.beginPath();
    for (let chunk of group) traceGroundLine(ctx, chunk.pts, cam);
    ctx.stroke();
  }
  ctx.restore();
}

function traceGroundLine(ctx, pts, cam) {
  let near = cam.near;
  let prev = cam.toCamera(pts[0], pts[1], 0);
  let drawing = false;
  if (prev[2] >= near) {
    ctx.moveTo(cam.sx(prev), cam.sy(prev));
    drawing = true;
  }
  for (let i = 2; i < pts.length; i += 2) {
    let c = cam.toCamera(pts[i], pts[i + 1], 0);
    let pin = prev[2] >= near, cin = c[2] >= near;
    if (pin !== cin) {
      let t = (near - prev[2]) / (c[2] - prev[2]);
      let m = [prev[0] + (c[0] - prev[0]) * t, prev[1] + (c[1] - prev[1]) * t, near];
      if (pin) ctx.lineTo(cam.sx(m), cam.sy(m));
      else ctx.moveTo(cam.sx(m), cam.sy(m));
    }
    if (cin) ctx.lineTo(cam.sx(c), cam.sy(c));
    drawing = cin;
    prev = c;
  }
  return drawing;
}

// The circuit painted on the ground, wide enough to read from far away.
function drawGroundTrack(ctx, subject, cam, style, box) {
  let metres = style.trackWidth * 1.3 * cam.k;
  ctx.save();
  ctx.strokeStyle = toStyle(ctx, style.track, box);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let line of subject.lines) {
    for (let i = 1; i < line.length; ++i) {
      let a = cam.toCamera(line[i - 1][0], line[i - 1][1], 0);
      let b = cam.toCamera(line[i][0], line[i][1], 0);
      if (a[2] < cam.near && b[2] < cam.near) continue;
      if (a[2] < cam.near || b[2] < cam.near) {
        let t = (cam.near - a[2]) / (b[2] - a[2]);
        let m = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, cam.near];
        if (a[2] < cam.near) a = m;
        else b = m;
      }
      ctx.lineWidth = Math.min(Math.max(0.4, metres * cam.focal / ((a[2] + b[2]) / 2)), MAX_LINE * 2);
      ctx.beginPath();
      ctx.moveTo(cam.sx(a), cam.sy(a));
      ctx.lineTo(cam.sx(b), cam.sy(b));
      ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * Buildings as boxes at their mapped heights, far ones first. Walls facing
 * away are skipped, the rest are shaded by how they face the light, and
 * everything takes on the haze colour with distance.
 */
function drawSceneBuildings(ctx, buildings, cam, style, fogColor, fogAt, minSize, fast) {
  if (!buildings || !buildings.length) return;
  let k = cam.k * (style.extrude || 1);
  let base = mainColor(style.buildingColor || style.streets);
  let light = (style.lightAngle || 0) * Math.PI / 180;
  let lx = Math.sin(light), ly = Math.cos(light);
  let shades = [];
  for (let i = 0; i < SHADES; ++i) shades.push(mix(base, '#000000', Math.round(62 - i * 12)));
  shades.push(base); // roofs
  // A fine outline keeps neighbouring buildings apart; buildingEdge makes it bold.
  let edge = style.buildingEdge ? mainColor(style.buildingEdge) : mix(base, '#000000', 70);
  let edgeWidth = style.buildingEdge ? 0.35 : 0.18;
  // Colours by shade and haze, worked out once.
  let colours = new Map();
  let colourOf = (shade, fog) => {
    let key = shade * 100 + fog;
    let c = colours.get(key);
    if (!c) colours.set(key, c = fog ? mix(shades[shade], fogColor, Math.round(fog / FOG_STEPS * 100)) : shades[shade]);
    return c;
  };

  let edges = [];
  let edgeOf = fog => edges[fog] || (edges[fog] = mix(edge, fogColor, Math.round(fog / FOG_STEPS * 100)));

  let clearance = cam.ez < 40 * cam.k ? 60 * cam.k : 0;
  let visible = [];
  for (let b of buildings) {
    let top = (b.height || DEFAULT_HEIGHT) * k;
    let seen = inView(cam, b.cx, b.cy, b.r, top, minSize);
    if (!seen) continue;
    // While dragging, low buildings far away (slivers on screen) can wait.
    if (fast && top * cam.focal / seen.depth < 6) continue;
    let distance = Math.hypot(b.cx - cam.ex, b.cy - cam.ey);
    // Stand somewhere open: near the ground, buildings right next to the eye would fill the view.
    if (distance - b.r < clearance || (distance < b.r && contains(b.pts, cam.ex, cam.ey))) continue;
    let fog = Math.round(fogAt(distance) * FOG_STEPS);
    if (fog >= FOG_STEPS) continue;
    visible.push({b, distance, top, bottom: (b.minHeight || 0) * k, fog});
  }
  hideOccluded(visible, cam);
  // Far first; stacked parts of one tower bottom up.
  visible = visible.filter(v => !v.hidden);
  visible.sort((a, c) => (c.distance - a.distance) || (a.bottom - c.bottom));

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineWidth = edgeWidth;
  let walls = [];
  for (let v of visible) {
    let {b, top, fog} = v;
    let pts = b.pts, n = pts.length / 2;
    let area = 0;
    for (let i = 0, j = n - 1; i < n; j = i++) area += pts[2 * j] * pts[2 * i + 1] - pts[2 * i] * pts[2 * j + 1];
    let orient = area > 0 ? 1 : -1;
    let {low, high} = v;
    walls.length = 0;
    for (let i = 0; i < n; ++i) {
      if (b.cut && b.cut[i]) continue; // a tile edge, not a real wall
      let j = (i + 1) % n;
      let ax = pts[2 * i], ay = pts[2 * i + 1], bx = pts[2 * j], by = pts[2 * j + 1];
      let nx = (by - ay) * orient, ny = -(bx - ax) * orient;
      let mx = (ax + bx) / 2 - cam.ex, my = (ay + by) / 2 - cam.ey;
      if (nx * mx + ny * my >= 0) continue; // faces away from the camera
      let len = Math.hypot(nx, ny) || 1;
      let brightness = 0.5 + 0.5 * (nx * lx + ny * ly) / len;
      walls.push({i, j, shade: Math.min(SHADES - 1, Math.max(0, Math.round(brightness * (SHADES - 1)))), d: mx * mx + my * my});
    }
    // One path per shade (filling is the slow part), the shade with the farthest wall first.
    walls.sort((a, c) => c.d - a.d);
    let order = [];
    for (let w of walls) if (!order.includes(w.shade)) order.push(w.shade);
    for (let shade of order) {
      ctx.beginPath();
      let any = false;
      for (let w of walls) {
        if (w.shade === shade && traceCameraPolygon(ctx, [low[w.i], low[w.j], high[w.j], high[w.i]], cam)) any = true;
      }
      if (!any) continue;
      ctx.fillStyle = colourOf(shade, fog);
      ctx.fill();
      if (!fast) {
        ctx.strokeStyle = edgeOf(fog);
        ctx.stroke();
      }
    }
    if (cam.ez > top) {
      ctx.beginPath();
      if (traceCameraPolygon(ctx, high, cam)) {
        ctx.fillStyle = colourOf(SHADES, fog);
        ctx.fill();
        if (!fast) {
          ctx.strokeStyle = edgeOf(fog);
          ctx.stroke();
        }
      }
    }
  }
  ctx.restore();
}

function contains(pts, x, y) {
  let inside = false;
  for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
    let xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const COLUMNS = 240;

/**
 * Marks buildings hidden behind nearer ones, so they are never drawn: in a
 * city most of them are. Works near to far with a coarse record, per screen
 * column, of the band already covered. A building only counts as cover in
 * the band it surely fills (between its lowest roof point and its highest
 * base point, away from its sides), so nothing visible is ever dropped,
 * give or take odd shapes.
 */
function hideOccluded(visible, cam) {
  let {rect, near} = cam;
  let width = rect.w / COLUMNS;
  let coverTop = new Float64Array(COLUMNS).fill(Infinity);
  let coverBottom = new Float64Array(COLUMNS).fill(-Infinity);
  visible.sort((a, c) => a.distance - c.distance);
  for (let v of visible) {
    let {b, top, bottom} = v;
    let pts = b.pts, n = pts.length / 2;
    let low = new Array(n), high = new Array(n);
    let behind = false;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    let roofLow = -Infinity, baseHigh = Infinity;
    let topX0 = Infinity, topX1 = -Infinity, baseX0 = Infinity, baseX1 = -Infinity;
    for (let i = 0; i < n; ++i) {
      let l = low[i] = cam.toCamera(pts[2 * i], pts[2 * i + 1], bottom);
      let h = high[i] = cam.toCamera(pts[2 * i], pts[2 * i + 1], top);
      if (l[2] < near || h[2] < near) {
        behind = true;
        continue;
      }
      let lx = cam.sx(l), ly = cam.sy(l), hx = cam.sx(h), hy = cam.sy(h);
      x0 = Math.min(x0, lx, hx);
      x1 = Math.max(x1, lx, hx);
      y0 = Math.min(y0, hy);
      y1 = Math.max(y1, ly);
      if (hy > roofLow) roofLow = hy;
      if (ly < baseHigh) baseHigh = ly;
      topX0 = Math.min(topX0, hx);
      topX1 = Math.max(topX1, hx);
      baseX0 = Math.min(baseX0, lx);
      baseX1 = Math.max(baseX1, lx);
    }
    v.low = low;
    v.high = high;
    // Partly behind the camera: always drawn, never used as cover.
    if (behind) continue;
    if (x1 < rect.x || x0 > rect.x + rect.w || y1 < rect.y || y0 > rect.y + rect.h) {
      v.hidden = true;
      continue;
    }
    let c0 = Math.max(0, Math.floor((x0 - rect.x) / width));
    let c1 = Math.min(COLUMNS - 1, Math.floor((x1 - rect.x) / width));
    let hidden = true;
    for (let c = c0; c <= c1 && hidden; ++c) {
      if (!(coverTop[c] <= y0 && coverBottom[c] >= y1)) hidden = false;
    }
    if (hidden) {
      v.hidden = true;
      continue;
    }
    // Add the band this building surely covers.
    if (roofLow >= baseHigh) continue;
    let sx0 = Math.max(topX0, baseX0), sx1 = Math.min(topX1, baseX1);
    let inset = (sx1 - sx0) * 0.15;
    let s0 = Math.max(0, Math.ceil((sx0 + inset - rect.x) / width));
    let s1 = Math.min(COLUMNS - 1, Math.floor((sx1 - inset - rect.x) / width) - 1);
    for (let c = s0; c <= s1; ++c) {
      let t = coverTop[c], u = coverBottom[c];
      if (t === Infinity) {
        coverTop[c] = roofLow;
        coverBottom[c] = baseHigh;
      } else if (roofLow <= u && baseHigh >= t) {
        coverTop[c] = Math.min(t, roofLow);
        coverBottom[c] = Math.max(u, baseHigh);
      } else if (baseHigh - roofLow > u - t) {
        coverTop[c] = roofLow;
        coverBottom[c] = baseHigh;
      }
    }
  }
}
