import {VectorTile} from '@mapbox/vector-tile';
import {PbfReader} from 'pbf';
import {sources} from './sources.js';

/**
 * Downloads the vector tiles that cover a box and turns them into features:
 *   {roads, namedRoads, rail, waterLines, waterAreas, parks, buildings, labels,
 *    zoom, tiles, source, attribution}
 * Every geometry is a Float64Array of [lon, lat, lon, lat, ...].
 *
 * Runs in a worker (see worker.js) or, where module workers are missing, on
 * the main thread. `onProgress({done, total, bytes})` reports downloads;
 * `signal` (an AbortSignal) cancels them.
 */
export const DETAIL_BUDGET = {standard: 48, high: 160, ultra: 480};

const CONCURRENCY = 12;
const tileJsonCache = new Map();

export async function loadTiles({sourceId, bbox, detail = 'high'}, onProgress, signal) {
  let source = sources.find(s => s.id === sourceId);
  if (!source) throw new Error('Unknown tile source ' + sourceId);
  let template = await tileTemplate(source, signal);
  let budget = DETAIL_BUDGET[detail] || DETAIL_BUDGET.high;
  let {zoom, tiles} = pickTiles(bbox, source.maxzoom, budget);

  let out = {
    roads: [], namedRoads: [], rail: [], waterLines: [], waterAreas: [], parks: [], buildings: [], labels: [],
    zoom, tiles: tiles.length, source: source.id, attribution: source.attribution
  };
  let done = 0, bytes = 0;
  let queue = tiles.slice();
  // Fetch near the middle first, so the part people look at fills in first.
  let [cx, cy] = [(tiles[0].x + tiles[tiles.length - 1].x) / 2, (tiles[0].y + tiles[tiles.length - 1].y) / 2];
  queue.sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));

  let worker = async () => {
    while (queue.length) {
      let tile = queue.shift();
      let buffer = await fetchTile(template, tile, signal);
      bytes += buffer ? buffer.byteLength : 0;
      if (buffer) decodeTile(buffer, tile, source.adapt, out);
      done += 1;
      if (onProgress) onProgress({done, total: tiles.length, bytes});
    }
  };
  await Promise.all(Array.from({length: Math.min(CONCURRENCY, tiles.length)}, worker));
  return out;
}

async function tileTemplate(source, signal) {
  if (source.tiles) return source.tiles;
  if (tileJsonCache.has(source.id)) return tileJsonCache.get(source.id);
  let response = await fetch(source.tileJson, {signal});
  if (!response.ok) throw new Error(`${source.name} is unavailable (${response.status})`);
  let json = await response.json();
  let template = json.tiles && json.tiles[0];
  if (!template) throw new Error(`${source.name} sent no tile address`);
  tileJsonCache.set(source.id, template);
  return template;
}

/**
 * The most detailed zoom whose tiles over the box fit the budget.
 */
export function pickTiles(bbox, maxzoom, budget) {
  let [west, south, east, north] = bbox;
  for (let z = maxzoom; z >= 6; --z) {
    let x0 = lonToTile(west, z), x1 = lonToTile(east, z);
    let y0 = latToTile(north, z), y1 = latToTile(south, z);
    let count = (x1 - x0 + 1) * (y1 - y0 + 1);
    if (count <= budget || z === 6) {
      let tiles = [];
      for (let x = x0; x <= x1; ++x) for (let y = y0; y <= y1; ++y) tiles.push({x, y, z});
      return {zoom: z, tiles};
    }
  }
}

async function fetchTile(template, {x, y, z}, signal) {
  let url = template.replace('{z}', z).replace('{x}', x).replace('{y}', y);
  for (let attempt = 0; attempt < 3; ++attempt) {
    try {
      let response = await fetch(url, {signal});
      // No tile means nothing mapped there (open sea, for example).
      if (response.status === 204 || response.status === 404) return null;
      if (response.ok) return await response.arrayBuffer();
      if (response.status < 500 && response.status !== 429) throw new Error(`Tile ${z}/${x}/${y}: ${response.status}`);
    } catch (e) {
      if (signal && signal.aborted) throw e;
      if (attempt === 2) throw e;
    }
    await new Promise(resolve => setTimeout(resolve, 400 * (attempt + 1)));
  }
  throw new Error(`Tile ${z}/${x}/${y} failed`);
}

function decodeTile(buffer, tile, adapt, out) {
  let vt = new VectorTile(new PbfReader(new Uint8Array(buffer)));
  for (let layerName of Object.keys(vt.layers)) {
    let layer = vt.layers[layerName];
    let extent = layer.extent;
    let toLonLat = lonLatConverter(tile, extent);
    for (let i = 0; i < layer.length; ++i) {
      let feature = layer.feature(i);
      let what = adapt(layerName, feature.properties, feature.type);
      if (!what) continue;
      let geometry = feature.loadGeometry();
      switch (what.type) {
        case 'label': {
          let p = geometry[0] && geometry[0][0];
          // Points in the buffer around a tile belong to the neighbour; skip them to avoid doubles.
          if (!p || p.x < 0 || p.y < 0 || p.x >= extent || p.y >= extent) break;
          out.labels.push({name: what.name, kind: what.kind, rank: what.rank, lon: toLonLat.lon(p.x), lat: toLonLat.lat(p.y)});
          break;
        }
        case 'road':
        case 'namedRoad':
        case 'rail':
        case 'waterLine': {
          let list = what.type === 'road' ? out.roads : what.type === 'namedRoad' ? out.namedRoads : what.type === 'rail' ? out.rail : out.waterLines;
          for (let line of geometry) {
            for (let part of clipLine(line, extent)) {
              list.push({kind: what.kind || what.type, name: what.name || '', pts: toFlat(part, toLonLat)});
            }
          }
          break;
        }
        case 'building': {
          // Clip to the exact tile so pieces of a building split across tiles meet without
          // overlapping; mark the cut edges so the 3D view does not draw walls along them.
          for (let ring of exteriorRings(geometry)) {
            let clipped = clipPolygon(ring, extent);
            if (clipped.length < 3) continue;
            out.buildings.push({
              height: what.height, minHeight: what.minHeight,
              pts: toFlat(clipped, toLonLat), cut: cutEdges(clipped, extent)
            });
          }
          break;
        }
        default: {
          // Water and parks are drawn opaque, so the small overlap of tile buffers never shows.
          let list = what.type === 'park' ? out.parks : out.waterAreas;
          for (let ring of exteriorRings(geometry)) {
            if (ring.length > 2) list.push({pts: toFlat(ring, toLonLat)});
          }
        }
      }
    }
  }
}

function lonLatConverter({x, y, z}, extent) {
  let n = Math.pow(2, z);
  return {
    lon: px => (x + px / extent) / n * 360 - 180,
    lat: py => {
      let t = Math.PI * (1 - 2 * (y + py / extent) / n);
      return Math.atan(Math.sinh(t)) * 180 / Math.PI;
    }
  };
}

function toFlat(points, convert) {
  let pts = new Float64Array(points.length * 2);
  points.forEach((p, i) => {
    pts[2 * i] = convert.lon(p.x);
    pts[2 * i + 1] = convert.lat(p.y);
  });
  return pts;
}

// In vector tiles exterior rings have positive area (clockwise with y down), holes negative.
function exteriorRings(rings) {
  return rings.filter(ring => signedArea(ring) > 0);
}

function signedArea(ring) {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) sum += (ring[j].x - ring[i].x) * (ring[i].y + ring[j].y);
  return sum;
}

/**
 * Splits a polyline where it leaves the tile square (Liang-Barsky per segment).
 */
function clipLine(line, extent) {
  let parts = [];
  let current = [];
  for (let i = 1; i < line.length; ++i) {
    let segment = clipSegment(line[i - 1], line[i], extent);
    if (!segment) {
      if (current.length > 1) parts.push(current);
      current = [];
      continue;
    }
    let [a, b] = segment;
    let last = current[current.length - 1];
    if (!last || last.x !== a.x || last.y !== a.y) {
      if (current.length > 1) parts.push(current);
      current = [a];
    }
    current.push(b);
    // The segment was cut short: the line leaves the tile here.
    if (b.x !== line[i].x || b.y !== line[i].y) {
      parts.push(current);
      current = [];
    }
  }
  if (current.length > 1) parts.push(current);
  return parts;
}

function clipSegment(a, b, extent) {
  let t0 = 0, t1 = 1;
  let dx = b.x - a.x, dy = b.y - a.y;
  let checks = [[-dx, a.x], [dx, extent - a.x], [-dy, a.y], [dy, extent - a.y]];
  for (let [p, q] of checks) {
    if (p === 0) {
      if (q < 0) return null;
    } else {
      let t = q / p;
      if (p < 0) {
        if (t > t1) return null;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return null;
        if (t < t1) t1 = t;
      }
    }
  }
  return [{x: a.x + t0 * dx, y: a.y + t0 * dy}, {x: a.x + t1 * dx, y: a.y + t1 * dy}];
}

/**
 * Sutherland-Hodgman against the tile square.
 */
function clipPolygon(ring, extent) {
  let points = ring;
  let edges = [
    p => p.x >= 0, p => p.x <= extent, p => p.y >= 0, p => p.y <= extent
  ];
  let intersect = [
    (a, b) => ({x: 0, y: a.y + (b.y - a.y) * (0 - a.x) / (b.x - a.x)}),
    (a, b) => ({x: extent, y: a.y + (b.y - a.y) * (extent - a.x) / (b.x - a.x)}),
    (a, b) => ({x: a.x + (b.x - a.x) * (0 - a.y) / (b.y - a.y), y: 0}),
    (a, b) => ({x: a.x + (b.x - a.x) * (extent - a.y) / (b.y - a.y), y: extent}),
  ];
  for (let e = 0; e < 4 && points.length; ++e) {
    let inside = edges[e];
    let result = [];
    for (let i = 0; i < points.length; ++i) {
      let current = points[i];
      let previous = points[(i + points.length - 1) % points.length];
      if (inside(current)) {
        if (!inside(previous)) result.push(intersect[e](previous, current));
        result.push(current);
      } else if (inside(previous)) {
        result.push(intersect[e](previous, current));
      }
    }
    points = result;
  }
  // Drop the closing duplicate that MVT rings carry.
  let first = points[0], last = points[points.length - 1];
  if (points.length > 1 && first.x === last.x && first.y === last.y) points.pop();
  return points;
}

// 1 for every edge (point i to i + 1) that lies on the tile border.
function cutEdges(points, extent) {
  let cut = new Uint8Array(points.length);
  let onBorder = (a, b) => (a.x === 0 && b.x === 0) || (a.x === extent && b.x === extent) ||
    (a.y === 0 && b.y === 0) || (a.y === extent && b.y === extent);
  for (let i = 0; i < points.length; ++i) {
    if (onBorder(points[i], points[(i + 1) % points.length])) cut[i] = 1;
  }
  return cut;
}

function lonToTile(lon, z) {
  return Math.floor((lon + 180) / 360 * Math.pow(2, z));
}

function latToTile(lat, z) {
  let r = lat * Math.PI / 180;
  return Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * Math.pow(2, z));
}
