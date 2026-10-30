/**
 * Vector tile sources and the adapters that turn their layers into the
 * studio's features. Both serve OpenStreetMap data, in different schemas.
 *
 * An adapter gets (layerName, properties, geometryType) and returns what the
 * feature is for us, or null to skip it:
 *   {type: 'road', kind, name} | {type: 'namedRoad', kind, name} | {type: 'rail'}
 *   {type: 'waterLine'} | {type: 'waterArea'} | {type: 'park'}
 *   {type: 'building', height, minHeight} | {type: 'label', name, kind, rank}
 * A lower label rank is more important.
 * geometryType is 1 (point), 2 (line) or 3 (polygon), as in the MVT spec.
 */

const LINE = 2;
const POLYGON = 3;
const POINT = 1;

// Points of interest worth naming on a poster.
const LANDMARK_CLASSES = new Set(['attraction', 'monument', 'museum', 'castle', 'stadium', 'theatre', 'zoo', 'aquarium', 'art_gallery', 'tower']);

export const sources = [
  {
    id: 'openfreemap',
    name: 'OpenFreeMap',
    tileJson: 'https://tiles.openfreemap.org/planet',
    maxzoom: 14,
    attribution: '© OpenFreeMap © OpenMapTiles · Data © OpenStreetMap contributors',
    adapt: openMapTiles
  },
  {
    id: 'versatiles',
    name: 'VersaTiles',
    tiles: 'https://tiles.versatiles.org/tiles/osm/{z}/{x}/{y}',
    maxzoom: 14,
    attribution: '© VersaTiles · Data © OpenStreetMap contributors',
    adapt: shortbread
  }
];

// OpenMapTiles schema, https://openmaptiles.org/schema/
function openMapTiles(layer, p, type) {
  switch (layer) {
    case 'transportation': {
      if (type !== LINE) return null;
      let cls = p.class;
      if (cls === 'rail' || cls === 'transit') return {type: 'rail'};
      if (cls === 'ferry' || cls === 'aerialway' || cls === 'busway' || cls === 'bus_guideway') return null;
      let kind = cls === 'minor' ? 'residential' : cls === 'path' ? (p.subclass || 'path') : cls;
      if (p.ramp === 1 || p.ramp === '1') kind += '_link';
      return {type: 'road', kind};
    }
    case 'transportation_name':
      if (type !== LINE || !p.name) return null;
      return {type: 'namedRoad', kind: p.class === 'minor' ? 'residential' : p.class, name: p.name};
    case 'building':
      if (type !== POLYGON) return null;
      return {type: 'building', height: Number(p.render_height) || 0, minHeight: Number(p.render_min_height) || 0};
    case 'water':
      return type === POLYGON ? {type: 'waterArea'} : null;
    case 'waterway':
      return type === LINE ? {type: 'waterLine', name: p.name || ''} : null;
    case 'park':
      return type === POLYGON ? {type: 'park'} : null;
    case 'landcover':
      return type === POLYGON && (p.class === 'wood' || p.class === 'grass') ? {type: 'park'} : null;
    case 'poi':
      if (type !== POINT || !p.name) return null;
      if (!LANDMARK_CLASSES.has(p.class) && !LANDMARK_CLASSES.has(p.subclass)) return null;
      return {type: 'label', name: p.name, kind: p.subclass || p.class, rank: Number(p.rank) || 30};
    case 'water_name':
      return p.name && type === POINT ? {type: 'label', name: p.name, kind: 'water', rank: 20} : null;
    case 'mountain_peak':
      return p.name && type === POINT ? {type: 'label', name: p.name, kind: 'peak', rank: Number(p.rank) || 30} : null;
    default:
      return null;
  }
}

// Shortbread schema, https://shortbread-tiles.org/schema/
const SHORTBREAD_RAIL = new Set(['rail', 'light_rail', 'subway', 'tram', 'funicular', 'narrow_gauge', 'monorail']);
const SHORTBREAD_PARKS = new Set(['park', 'forest', 'grass', 'meadow', 'garden', 'golf_course', 'nature_reserve', 'village_green', 'recreation_ground', 'cemetery']);

function shortbread(layer, p, type) {
  switch (layer) {
    case 'streets':
      if (type !== LINE) return null;
      if (SHORTBREAD_RAIL.has(p.kind)) return {type: 'rail'};
      return {type: 'road', kind: p.link ? p.kind + '_link' : p.kind};
    case 'street_labels':
      return type === LINE && p.name ? {type: 'namedRoad', kind: p.kind, name: p.name} : null;
    case 'buildings':
      return type === POLYGON ? {type: 'building', height: 0, minHeight: 0} : null;
    case 'water_polygons':
    case 'ocean':
      return type === POLYGON ? {type: 'waterArea'} : null;
    case 'water_lines':
      return type === LINE ? {type: 'waterLine', name: p.name || ''} : null;
    case 'land':
      return type === POLYGON && SHORTBREAD_PARKS.has(p.kind) ? {type: 'park'} : null;
    case 'pier_lines':
      return type === LINE ? {type: 'road', kind: 'pier'} : null;
    case 'pois': {
      if (type !== POINT || !p.name) return null;
      let kind = p.tourism || p.historic || p.leisure;
      return LANDMARK_CLASSES.has(kind) ? {type: 'label', name: p.name, kind, rank: 30} : null;
    }
    default:
      return null;
  }
}
