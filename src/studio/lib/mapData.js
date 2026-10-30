import {sources} from './tiles/sources.js';
import {loadFeatures} from './surroundings.js';
import {unpack} from './tiles/pack.js';

/**
 * Gets map data for a box, as fast and as reliably as possible:
 *   1. OpenFreeMap vector tiles (CDN, in a worker)
 *   2. VersaTiles vector tiles, if OpenFreeMap fails
 *   3. Overpass, if both fail
 * mode 'raw' goes straight to Overpass, for every last footpath and tag.
 *
 * Resolves to features with flat Float64Array geometry (see loadTiles.js),
 * plus {source, attribution, detail}.
 */
const cache = new Map();

export const DATA_MODES = [
  {id: 'standard', name: 'Fast', note: 'smallest download'},
  {id: 'high', name: 'Detailed', note: 'recommended'},
  {id: 'ultra', name: 'Ultra', note: 'many tiles, big cities in full'},
  {id: 'raw', name: 'Raw OSM', note: 'every tag, slow servers'},
];

export function loadMapData({key, bbox, mode = 'high'}, progress) {
  let cacheKey = key + '|' + mode;
  if (cache.has(cacheKey)) return Promise.resolve(cache.get(cacheKey));

  let attempts = mode === 'raw' ? [] : sources.map(s => () => viaTiles(s, bbox, mode, progress));
  attempts.push(() => viaOverpass(key, bbox, progress));

  let errors = [];
  let tryNext = i => {
    if (progress.isCancelled) return Promise.reject(cancelled());
    if (i >= attempts.length) {
      let err = new Error(errors.map(e => e.message).join('; ') || 'No map data source responded.');
      err.allServersFailed = true;
      return Promise.reject(err);
    }
    return attempts[i]().catch(e => {
      if (e.cancelled || progress.isCancelled) throw cancelled();
      console.warn('Map data source failed, trying the next one', e);
      errors.push(e);
      progress.notify({loaded: -1, attempt: i + 2, of: attempts.length, switching: true});
      return tryNext(i + 1);
    });
  };

  return tryNext(0).then(result => {
    cache.set(cacheKey, result);
    return result;
  });
}

function viaTiles(source, bbox, detail, progress) {
  let request = {sourceId: source.id, bbox, detail};
  return new Promise((resolve, reject) => {
    let worker = createWorker();
    if (!worker) {
      // No module workers (older Safari): do the same work on the main thread.
      let controller = new AbortController();
      progress.onCancel(() => controller.abort());
      import('./tiles/loadTiles.js')
        .then(m => m.loadTiles(request, p => notify(p), controller.signal))
        .then(resolve, e => reject(controller.signal.aborted ? cancelled() : e));
      return;
    }
    let finish = () => worker.terminate();
    progress.onCancel(() => {
      finish();
      reject(cancelled());
    });
    worker.onmessage = event => {
      let message = event.data;
      if (message.type === 'progress') notify(message.progress);
      else if (message.type === 'done') {
        finish();
        resolve(unpack(message.result));
      } else if (message.type === 'error') {
        finish();
        reject(message.aborted ? cancelled() : new Error(`${source.name}: ${message.message}`));
      }
    };
    worker.onerror = e => {
      finish();
      reject(new Error(`${source.name}: ${e.message || 'worker failed'}`));
    };
    worker.postMessage({type: 'load', request});
  });

  function notify(p) {
    progress.notify({loaded: p.bytes, tiles: p.done, total: p.total, source: source.name});
  }
}

function createWorker() {
  try {
    return new Worker(new URL('./tiles/worker.js', import.meta.url), {type: 'module'});
  } catch {
    return null;
  }
}

function viaOverpass(key, bbox, progress) {
  return loadFeatures(key, bbox, progress).then(raw => ({
    roads: raw.roads.map(flatLine),
    namedRoads: [],
    rail: raw.rail.map(flatLine),
    waterLines: raw.waterLines.map(flatLine),
    waterAreas: raw.waterAreas.map(flatArea),
    parks: raw.parks.map(flatArea),
    buildings: raw.buildings.map(b => ({...flatArea(b), height: b.height, minHeight: b.minHeight})),
    labels: [],
    source: 'overpass',
    detail: raw.detail,
    attribution: 'Map data © OpenStreetMap contributors'
  }));
}

function flatLine(line) {
  return {kind: line.kind, name: line.name, id: line.id, pts: flatten(line.pts)};
}

function flatArea(area) {
  return {id: area.id, pts: flatten(area.pts)};
}

function flatten(points) {
  let pts = new Float64Array(points.length * 2);
  points.forEach(([lon, lat], i) => {
    pts[2 * i] = lon;
    pts[2 * i + 1] = lat;
  });
  return pts;
}

function cancelled() {
  let e = new Error('Cancelled');
  e.cancelled = true;
  return e;
}
