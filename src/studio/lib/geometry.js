import {bboxCenter, createProjection, createPointIndex, densify, padBBox} from './geo.js';

// Relative stroke width of each kind of road. Anything not listed is drawn at 1.
const ROAD_WIDTH = {
  motorway: 2, trunk: 1.9, primary: 1.6, secondary: 1.4, tertiary: 1.2,
  motorway_link: 1.2, trunk_link: 1.2, primary_link: 1.1, secondary_link: 1.1, tertiary_link: 1,
  residential: 1, unclassified: 1, living_street: 0.9, road: 0.9, raceway: 1,
  service: 0.7, pedestrian: 0.8, track: 0.6,
  footway: 0.45, path: 0.45, cycleway: 0.45, steps: 0.45, bridleway: 0.45, corridor: 0.45,
  rail: 0.6, water: 0.8
};

/**
 * Projects a circuit into local metres around its centre and precomputes what
 * the renderer needs: extent, start line direction, corner labels and an index
 * to measure how far things are from the track.
 */
export function prepareTrack(track) {
  let origin = bboxCenter(track.bbox);
  let project = createProjection(origin);
  let lines = track.lines.map(line => line.map(([lon, lat]) => project(lon, lat)));
  let pit = (track.pit || []).map(line => line.map(([lon, lat]) => project(lon, lat)));
  let points = lines.flat();

  let radius = 0;
  for (let [x, y] of points) radius = Math.max(radius, Math.hypot(x, y));

  let start = null;
  if (track.start) {
    let [x, y] = project(track.start[0], track.start[1]);
    start = {x, y, angle: directionAt(lines, x, y)};
  }

  let corners = (track.corners || []).map(c => {
    let [x, y] = project(c.lon, c.lat);
    return {name: c.name, x, y};
  });

  return {
    kind: 'track',
    origin,
    project,
    lines,
    pit,
    points,
    padding: 0.12,
    radius: radius || 1,
    start,
    corners,
    oneway: track.oneway,
    index: createPointIndex(lines.flatMap(line => densify(line, 15)), 100)
  };
}

/**
 * A place has no track: the poster frames its bounding box and fades (if asked
 * to) from its centre.
 */
export function preparePlace(place) {
  let origin = bboxCenter(place.bbox);
  let project = createProjection(origin);
  let [west, south, east, north] = place.bbox;
  let points = [project(west, south), project(east, north), project(west, north), project(east, south)];
  let radius = Math.max(...points.map(([x, y]) => Math.hypot(x, y))) || 1;
  return {
    kind: 'place',
    origin,
    project,
    lines: [],
    pit: [],
    points,
    padding: 0.02,
    radius,
    start: null,
    corners: [],
    oneway: false,
    index: createPointIndex([[0, 0]], radius / 4)
  };
}

/**
 * The area we download streets for. Generous around tracks, so the map can be
 * zoomed out or shown on an ultrawide screen before it runs out of streets.
 */
export function featuresBBox(subject) {
  if (subject.kind === 'place') return padBBox(subject.bbox, 0.05, 100);
  return padBBox(subject.bbox, 1.5, 1200, 4000);
}

/**
 * Turns features downloaded from OSM into short chunks with a precomputed
 * distance to the subject, so the renderer can fade them with distance and
 * find what was tapped without touching every point on every frame.
 */
export function prepareFeatures(features, prepared) {
  let {project, index, radius} = prepared;
  let maxDistance = radius * 6;
  let chunkLength = Math.max(radius / 30, 40);

  let roads = toChunks(features.roads, 'road');
  return {
    detail: features.detail,
    roads,
    rail: toChunks(features.rail, 'rail'),
    water: toChunks(features.waterLines, 'water'),
    waterAreas: features.waterAreas.map(toArea),
    parks: features.parks.map(toArea),
    buildings: features.buildings.map(toArea),
    streetNames: Array.from(new Set(features.roads.map(r => r.name).filter(Boolean))).sort((a, b) => a.localeCompare(b))
  };

  function toArea(area) {
    let pts = new Float64Array(area.pts.length * 2);
    let cx = 0, cy = 0;
    area.pts.forEach(([lon, lat], i) => {
      let [x, y] = project(lon, lat);
      pts[2 * i] = x;
      pts[2 * i + 1] = y;
      cx += x;
      cy += y;
    });
    cx /= area.pts.length;
    cy /= area.pts.length;
    let r = 0;
    for (let i = 0; i < pts.length; i += 2) r = Math.max(r, Math.hypot(pts[i] - cx, pts[i + 1] - cy));
    return {pts, cx, cy, r, key: 'area:' + area.id, distance: index.distance(cx, cy, maxDistance)};
  }

  function toChunks(lines, type) {
    let chunks = [];
    for (let line of lines) {
      let width = ROAD_WIDTH[line.kind] || 1;
      // Streets are selected by name, so every piece of "Avenue d'Ostende" goes together.
      let key = line.name ? type + ':' + line.name : type + ':way' + line.id;
      let label = line.name || prettyKind(line.kind);
      let projected = line.pts.map(([lon, lat]) => project(lon, lat));
      let current = [projected[0]];
      let length = 0;
      for (let i = 1; i < projected.length; ++i) {
        let p = projected[i];
        let prev = projected[i - 1];
        length += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
        current.push(p);
        if (length > chunkLength && i < projected.length - 1) {
          chunks.push(makeChunk(current, width, key, label));
          current = [p];
          length = 0;
        }
      }
      if (current.length > 1) chunks.push(makeChunk(current, width, key, label));
    }
    return chunks;
  }

  function makeChunk(points, width, key, label) {
    let pts = new Float64Array(points.length * 2);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    points.forEach(([x, y], i) => {
      pts[2 * i] = x;
      pts[2 * i + 1] = y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });
    let cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    return {
      pts, width, key, label, cx, cy,
      r: Math.hypot(maxX - cx, maxY - cy),
      distance: index.distance(cx, cy, maxDistance)
    };
  }
}

/**
 * The rotation (in degrees) at which the subject fills a box with the given
 * aspect ratio best.
 */
export function bestRotation(points, aspect) {
  let best = 0, bestScale = 0;
  for (let deg = 0; deg < 180; deg += 1) {
    let a = deg * Math.PI / 180;
    let cos = Math.cos(a), sin = Math.sin(a);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < points.length; i += 3) {
      let [x, y] = points[i];
      let rx = x * cos - y * sin, ry = x * sin + y * cos;
      if (rx < minX) minX = rx;
      if (rx > maxX) maxX = rx;
      if (ry < minY) minY = ry;
      if (ry > maxY) maxY = ry;
    }
    let scale = Math.min(aspect / (maxX - minX), 1 / (maxY - minY));
    if (scale > bestScale * 1.0001) {
      bestScale = scale;
      best = deg;
    }
  }
  return best > 90 ? best - 180 : best;
}

function prettyKind(kind) {
  if (!kind) return 'Road';
  return (kind.charAt(0).toUpperCase() + kind.slice(1)).replace(/_/g, ' ');
}

function directionAt(lines, x, y) {
  let best = Infinity, angle = 0;
  for (let line of lines) {
    for (let i = 1; i < line.length; ++i) {
      let [x0, y0] = line[i - 1], [x1, y1] = line[i];
      let dx = x1 - x0, dy = y1 - y0;
      let len = dx * dx + dy * dy;
      let t = len ? Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / len)) : 0;
      let d = Math.hypot(x0 + t * dx - x, y0 + t * dy - y);
      if (d < best) {
        best = d;
        angle = Math.atan2(dy, dx);
      }
    }
  }
  return angle;
}
