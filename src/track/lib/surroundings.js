import postData from '../../lib/postData.js';
import {padBBox, bboxAreaKm2} from './geo.js';

const MB = 1024 * 1024;
const cache = new Map();

/**
 * The area around a circuit we download streets for. Generous, so the map can
 * be zoomed out a bit before it runs out of streets.
 */
export function getSurroundingsBBox(track) {
  return padBBox(track.bbox, 1, 1000, 3000);
}

/**
 * Downloads streets, buildings, water and railways around a circuit from Overpass.
 * Resolves to {roads, rail, water, buildings} with [lon, lat] points.
 */
export function loadSurroundings(track, progress) {
  if (cache.has(track.id)) return Promise.resolve(cache.get(track.id));

  let bbox = getSurroundingsBBox(track);
  let area = bboxAreaKm2(bbox);
  let [west, south, east, north] = bbox.map(x => x.toFixed(5));

  // Large areas (Le Mans, the Isle of Man) would be hundreds of megabytes with every
  // footpath and building, and you could not see them on the poster anyway.
  let skipHighways = area > 150
    ? 'proposed|construction|abandoned|platform|razed|bus_stop|elevator|corridor|footway|path|cycleway|steps|bridleway|service|track|pedestrian'
    : 'proposed|construction|abandoned|platform|razed|bus_stop|elevator|corridor';
  let buildings = area < 40 ? 'way["building"];' : '';
  let timeout = area < 100 ? 60 : area < 1000 ? 120 : 180;
  let maxsize = area < 100 ? 256 * MB : area < 1000 ? 512 * MB : 1024 * MB;

  let query = `[out:json][timeout:${timeout}][maxsize:${maxsize}][bbox:${south},${west},${north},${east}];
(
  way["highway"]["highway"!~"^(${skipHighways})$"];
  ${buildings}
  way["natural"~"^(coastline|water)$"];
  way["waterway"~"^(river|canal|riverbank)$"];
  way["man_made"~"^(pier|breakwater|groyne)$"];
  way["railway"="rail"]["service"!~"."];
);
out geom qt;`;

  return postData(query, progress, timeout).then(response => {
    if (!response || !response.elements) throw new Error('OpenStreetMap servers returned an invalid response.');
    let result = parseElements(response.elements);
    cache.set(track.id, result);
    return result;
  });
}

function parseElements(elements) {
  let roads = [], rail = [], water = [], buildings = [];
  for (let el of elements) {
    if (el.type !== 'way' || !el.geometry) continue;
    let tags = el.tags || {};
    // Overpass leaves out nodes it could not resolve as `null`; split there.
    for (let pts of splitGeometry(el.geometry)) {
      if (tags.building) {
        if (pts.length > 2) buildings.push(pts);
      } else if (tags.highway) {
        roads.push({kind: tags.highway, pts});
      } else if (tags.railway) {
        rail.push({kind: 'rail', pts});
      } else {
        water.push({kind: 'water', pts});
      }
    }
  }
  return {roads, rail, water, buildings};
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
