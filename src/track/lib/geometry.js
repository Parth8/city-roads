import {bboxCenter, createProjection, createPointIndex, densify} from './geo.js';

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
 * the renderer needs (extent, start line direction, distance index).
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

  let index = createPointIndex(lines.flatMap(line => densify(line, 15)), 100);

  return {
    origin,
    project,
    lines,
    pit,
    points,
    radius: radius || 1,
    start,
    oneway: track.oneway,
    index
  };
}

/**
 * Turns streets downloaded from OSM into short chunks with a precomputed
 * distance to the circuit, so the renderer can fade them out with distance
 * without touching every point on every frame.
 */
export function prepareSurroundings(surroundings, preparedTrack) {
  let {project, index, radius} = preparedTrack;
  let maxDistance = radius * 6;
  let chunkLength = Math.max(radius / 30, 40);

  return {
    roads: toChunks(surroundings.roads),
    rail: toChunks(surroundings.rail),
    water: toChunks(surroundings.water),
    buildings: surroundings.buildings.map(polygon => {
      let pts = new Float64Array(polygon.length * 2);
      let cx = 0, cy = 0;
      polygon.forEach(([lon, lat], i) => {
        let [x, y] = project(lon, lat);
        pts[2 * i] = x;
        pts[2 * i + 1] = y;
        cx += x;
        cy += y;
      });
      cx /= polygon.length;
      cy /= polygon.length;
      let r = 0;
      for (let i = 0; i < pts.length; i += 2) r = Math.max(r, Math.hypot(pts[i] - cx, pts[i + 1] - cy));
      return {pts, cx, cy, r, distance: index.distance(cx, cy, maxDistance)};
    })
  };

  function toChunks(lines) {
    let chunks = [];
    for (let line of lines) {
      let width = ROAD_WIDTH[line.kind] || 1;
      let projected = line.pts.map(([lon, lat]) => project(lon, lat));
      let current = [projected[0]];
      let length = 0;
      for (let i = 1; i < projected.length; ++i) {
        let p = projected[i];
        let prev = projected[i - 1];
        length += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
        current.push(p);
        if (length > chunkLength && i < projected.length - 1) {
          chunks.push(makeChunk(current, width));
          current = [p];
          length = 0;
        }
      }
      if (current.length > 1) chunks.push(makeChunk(current, width));
    }
    return chunks;
  }

  function makeChunk(points, width) {
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
      pts,
      width,
      cx,
      cy,
      r: Math.hypot(maxX - cx, maxY - cy),
      distance: index.distance(cx, cy, maxDistance)
    };
  }
}

/**
 * The rotation (in degrees) at which the circuit fills a box with the given
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
