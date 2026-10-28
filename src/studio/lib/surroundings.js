import postData from '../../lib/postData.js';
import {bboxAreaKm2} from './geo.js';

const MB = 1024 * 1024;
const cache = new Map();

const MAJOR_ROADS = 'motorway|trunk|primary|secondary|tertiary|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link';
const NEVER = 'proposed|construction|abandoned|platform|razed|bus_stop|elevator|corridor|via_ferrata';
const MINOR = 'footway|path|cycleway|steps|bridleway|service|track|pedestrian';

/**
 * Downloads everything we draw around a subject from Overpass: roads, buildings,
 * water, parks and railways in a [west, south, east, north] box.
 *
 * Resolves to {roads, rail, waterLines, waterAreas, parks, buildings, detail};
 * lines are {id, kind, name, pts}, areas are {id, pts}, points are [lon, lat].
 * `detail` says what was left out because the area is large.
 */
export function loadFeatures(key, bbox, progress) {
  if (cache.has(key)) return Promise.resolve(cache.get(key));

  let area = bboxAreaKm2(bbox);
  let [west, south, east, north] = bbox.map(x => x.toFixed(5));

  // Large areas would be hundreds of megabytes with every footpath and building,
  // and you could not see them on the poster anyway.
  let detail = area > 2500 ? 'major' : area > 150 ? 'roads' : area > 40 ? 'no-buildings' : 'full';
  let roads = detail === 'major'
    ? `way["highway"~"^(${MAJOR_ROADS})$"];`
    : `way["highway"]["highway"!~"^(${NEVER}${detail === 'roads' ? '|' + MINOR : ''})$"];`;
  let buildings = detail === 'full' ? 'way["building"];' : '';
  let small = detail === 'full' || detail === 'no-buildings';
  let timeout = area < 100 ? 60 : area < 1000 ? 120 : 180;
  let maxsize = area < 100 ? 256 * MB : area < 1000 ? 512 * MB : 1024 * MB;

  let query = `[out:json][timeout:${timeout}][maxsize:${maxsize}][bbox:${south},${west},${north},${east}];
(
  ${roads}
  ${buildings}
  way["natural"~"^(coastline|water)$"];
  way["waterway"~"^(river|canal|riverbank)$"];
  way["water"];
  way["man_made"~"^(pier|breakwater|groyne)$"];
  way["railway"="rail"]["service"!~"."];
  ${small ? 'way["leisure"~"^(park|garden|golf_course|nature_reserve)$"]; way["landuse"~"^(grass|forest|meadow|recreation_ground|village_green)$"]; way["natural"="wood"];' : ''}
);
out geom qt;`;

  return postData(query, progress, timeout).then(response => {
    if (!response || !response.elements) throw new Error('OpenStreetMap servers returned an invalid response.');
    let result = parseElements(response.elements);
    result.detail = detail;
    cache.set(key, result);
    return result;
  });
}

function parseElements(elements) {
  let roads = [], rail = [], waterLines = [], waterAreas = [], parks = [], buildings = [];
  for (let el of elements) {
    if (el.type !== 'way' || !el.geometry) continue;
    let tags = el.tags || {};
    // Overpass leaves out nodes it could not resolve as `null`; split there.
    let parts = splitGeometry(el.geometry);
    let closed = parts.length === 1 && isClosed(el.geometry);
    for (let pts of parts) {
      if (tags.building) {
        if (pts.length > 2) buildings.push({id: el.id, pts});
      } else if (tags.highway) {
        roads.push({id: el.id, kind: tags.highway, name: tags.name || tags.ref || '', pts});
      } else if (tags.railway) {
        rail.push({id: el.id, kind: 'rail', name: tags.name || '', pts});
      } else if (tags.leisure || tags.landuse || tags.natural === 'wood') {
        if (closed && pts.length > 2) parks.push({id: el.id, pts});
      } else if (closed && pts.length > 2 && (tags.natural === 'water' || tags.water || tags.waterway === 'riverbank')) {
        waterAreas.push({id: el.id, pts});
      } else {
        waterLines.push({id: el.id, kind: 'water', name: tags.name || '', pts});
      }
    }
  }
  return {roads, rail, waterLines, waterAreas, parks, buildings};
}

function isClosed(geometry) {
  let first = geometry[0], last = geometry[geometry.length - 1];
  return first && last && first.lat === last.lat && first.lon === last.lon;
}

function splitGeometry(geometry) {
  let parts = [];
  let current = [];
  for (let p of geometry) {
    if (!p) {
      if (current.length > 1) parts.push(current);
      current = [];
    } else {
      current.push([p.lon, p.lat]);
    }
  }
  if (current.length > 1) parts.push(current);
  return parts;
}
