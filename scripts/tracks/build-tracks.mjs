#!/usr/bin/env node
/**
 * Extracts circuit layouts from OpenStreetMap and writes them to src/track/data.
 *
 *   node scripts/tracks/build-tracks.mjs            # every circuit in catalog.mjs
 *   node scripts/tracks/build-tracks.mjs monaco spa # only these ids
 *   node scripts/tracks/build-tracks.mjs --missing  # only circuits that have no data yet
 *
 * Most circuits in OSM have a `type=circuit` relation: track ways with an empty
 * role, the pit lane with role `pit_lane` and a `start-finish` node. We look the
 * relation up by name (Nominatim) or by looking at what is mapped around the
 * catalog coordinates, then download it with the OSM editing API. When a
 * circuit has no relation we follow its `highway=raceway` ways instead.
 *
 * This makes a few hundred small requests in total, at most a couple per
 * second, which is within the OSM API and Nominatim usage policies for a
 * one-off build. Behind a proxy run it with NODE_USE_ENV_PROXY=1.
 */
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import catalog from './catalog.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', '..', 'src', 'track', 'data');
const tracksDir = path.join(outDir, 'tracks');
const USER_AGENT = 'city-roads track builder (https://github.com/anvaka/city-roads)';
const OSM_API = 'https://api.openstreetmap.org/api/0.6';
const NOMINATIM = 'https://nominatim.openstreetmap.org';

// Names of other layouts and facilities at the same venue, which we should not
// pick unless the catalog asks for them. Corner names like "Club" or "Stowe" must
// not match, so plain directions and sizes only count next to "circuit", "course"...
const SECONDARY_LAYOUT = /kart|drift|motocross|supermoto|skid|rally|dirt|school|handling|test track|e-?prix|formula e|\b(national|international|club|short|south|north|east|west|inner|outer|junior|indy|historic|old|stowe|infield)\s+(circuit|course|track|loop|layout)/i;
// "National Pit Straight" is part of the track.
const STRAIGHT = /straight|gerade|ligne droite|recta|rettilineo|reta\b/i;
// "Ligne droite des stands" is the main straight in French; "voie des stands" is the pit lane.
const PIT = /\b(pit|pits|pitlane|pit-lane|boxengasse|boxen|paddock)\b|(voie|sortie|entr[ée]e) des stands/i;

let lastNominatim = 0;
let lastOSM = 0;

async function main() {
  let args = process.argv.slice(2);
  let missingOnly = args.includes('--missing');
  let only = new Set(args.filter(x => !x.startsWith('--')));
  fs.mkdirSync(tracksDir, {recursive: true});
  let report = [];

  for (let entry of catalog) {
    if (only.size && !only.has(entry.id)) continue;
    if (missingOnly && fs.existsSync(trackFile(entry.id))) continue;
    try {
      let track = await buildTrack(entry);
      fs.writeFileSync(trackFile(entry.id), JSON.stringify(track));
      let lengthNote = '';
      if (entry.length) {
        let diff = (track.lengthKm - entry.length) / entry.length;
        lengthNote = ` (catalog ${entry.length} km, ${diff > 0 ? '+' : ''}${(diff * 100).toFixed(1)}%)`;
        if (Math.abs(diff) > 0.08) lengthNote += '  <-- CHECK LAYOUT';
      }
      report.push(`ok    ${entry.id}: ${track.source} "${track.osmName}" ${track.lengthKm.toFixed(3)} km${lengthNote}`);
    } catch (e) {
      report.push(`FAIL  ${entry.id}: ${e.message}`);
    }
    console.log(report[report.length - 1]);
  }

  // The index is rebuilt from the catalog and every extracted track, in catalog order.
  let index = catalog
    .filter(entry => fs.existsSync(trackFile(entry.id)))
    .map(entry => toIndexEntry(entry, JSON.parse(fs.readFileSync(trackFile(entry.id), 'utf8'))));
  let indexPath = path.join(outDir, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(index));
  copyFlags(index);
  console.log('\n' + report.join('\n'));
  console.log(`\n${index.length} tracks in ${path.relative(process.cwd(), indexPath)}`);
}

function trackFile(id) {
  return path.join(tracksDir, id + '.json');
}

/**
 * Copies the country flags used by the catalog from the flag-icons package
 * (MIT), so the app only ships the flags it needs.
 */
function copyFlags(index) {
  let flagsDir = path.join(outDir, 'flags');
  fs.mkdirSync(flagsDir, {recursive: true});
  let source = path.join(here, '..', '..', 'node_modules', 'flag-icons', 'flags', '4x3');
  for (let cc of new Set(index.map(x => x.cc))) {
    let file = path.join(source, cc + '.svg');
    if (fs.existsSync(file)) fs.copyFileSync(file, path.join(flagsDir, cc + '.svg'));
    else console.log('No flag for ' + cc);
  }
}

async function buildTrack(entry) {
  let fromRelation = null;
  if (!entry.racewaysOnly) {
    let relation;
    if (entry.osmRelation) {
      relation = {id: entry.osmRelation};
    } else {
      relation = pickRelation(entry, await findCircuitRelations(entry));
    }
    if (relation) {
      let full = await osm(`/relation/${relation.id}/full.json`);
      fromRelation = await trackFromRelation(entry, relation.id, full.elements).catch(e => {
        console.log(`      ${entry.id}: relation ${relation.id} not usable: ${e.message}`);
        return null;
      });
    }
  }
  if (fromRelation && looksRight(fromRelation, entry)) return fromRelation;

  // No relation, or one that is incomplete or describes a different layout:
  // find the loop among the raceways mapped around the circuit.
  let fromRaceways = await trackFromRaceways(entry).catch(e => {
    console.log(`      ${entry.id}: raceways not usable: ${e.message}`);
    return null;
  });
  if (fromRelation && fromRaceways) {
    if (!entry.length) return fromRelation.closed || !fromRaceways.closed ? fromRelation : fromRaceways;
    return lengthError(fromRelation, entry) <= lengthError(fromRaceways, entry) ? fromRelation : fromRaceways;
  }
  let result = fromRelation || fromRaceways;
  if (!result) throw new Error('no circuit relation or raceway loop found near ' + entry.lat + ',' + entry.lon);
  return result;
}

function looksRight(track, entry) {
  if (!track.closed) return false;
  return !entry.length || lengthError(track, entry) < 0.04;
}

function lengthError(track, entry) {
  return Math.abs(track.lengthKm - entry.length) / entry.length;
}

// ---------------------------------------------------------------- discovery

async function findCircuitRelations(entry) {
  let found = new Map();
  let names = [entry.name, entry.query].filter(Boolean);
  for (let name of names) {
    let results = await nominatim(name);
    for (let r of results) {
      if (distanceKm(entry, {lat: +r.lat, lon: +r.lon}) > 30) continue;
      if (r.osm_type === 'relation') {
        let rel = await osm(`/relation/${r.osm_id}.json`).catch(() => null);
        addCircuits(found, rel && rel.elements);
      } else if (r.osm_type === 'way' && r.class === 'highway' && r.type === 'raceway') {
        let rels = await osm(`/way/${r.osm_id}/relations.json`);
        addCircuits(found, rels.elements);
      }
    }
  }
  // Venues with several layouts often share ways, so also look at what is mapped
  // around the catalog point.
  for (let delta of [0.004, 0.012]) {
    let map = await osmMap(entry, delta);
    if (!map) continue;
    addCircuits(found, map.elements);
    if (found.size) break;
  }
  return Array.from(found.values());
}

function addCircuits(found, elements) {
  if (!elements) return;
  for (let el of elements) {
    if (el.type === 'relation' && isCircuitRelation(el.tags)) found.set(el.id, el);
  }
}

function isCircuitRelation(tags) {
  if (!tags) return false;
  if (tags.type === 'circuit') return true;
  // A few circuits (e.g. the Nordschleife) are mapped as route relations instead.
  return tags.type === 'route' && (tags.route === 'raceway' || tags.highway === 'raceway' || tags.sport === 'motor');
}

function pickRelation(entry, candidates) {
  if (!candidates.length) return;
  let layout = entry.layout ? new RegExp(entry.layout, 'i') : null;
  let wanted = normalize(entry.name);
  let scored = candidates.map(rel => {
    let name = (rel.tags && (rel.tags['name:en'] || rel.tags.name)) || '';
    let allNames = Object.keys(rel.tags || {}).filter(k => k === 'name' || k.startsWith('name:')).map(k => rel.tags[k]);
    let score = 0;
    if (layout && allNames.some(n => layout.test(n))) score += 100;
    let n = normalize(name);
    if (n === wanted) score += 60;
    else if (n.includes(wanted) || wanted.includes(n)) score += 30;
    let secondary = allNames.some(x => SECONDARY_LAYOUT.test(x)) && !(layout && allNames.some(x => layout.test(x)));
    if (secondary && !SECONDARY_LAYOUT.test(entry.name)) score -= 60;
    let tagLength = parseLength(rel.tags && rel.tags.length);
    if (entry.length && tagLength) score += 30 * Math.max(0, 1 - Math.abs(tagLength - entry.length) / entry.length * 4);
    if (rel.tags && rel.tags.sport === 'motor') score += 5;
    return {rel, score, name};
  });
  scored.sort((a, b) => b.score - a.score);
  if (scored.length > 1) {
    console.log(`      ${entry.id}: ` + scored.map(x => `${x.rel.id} "${x.name}" ${x.score.toFixed(0)}`).join(' | '));
  }
  return scored[0].rel;
}

// ---------------------------------------------------------------- geometry

async function trackFromRelation(entry, relationId, elements) {
  let relation = elements.find(e => e.type === 'relation' && e.id === relationId);
  if (!relation) throw new Error('relation ' + relationId + ' is missing in the response');
  let nodes = new Map();
  let ways = new Map();
  collect(elements, nodes, ways);

  // Some circuits are split into sub relations (sectors, stages). Pull their ways in too.
  let members = [];
  for (let m of relation.members) {
    if (m.type === 'relation' && m.ref !== relationId) {
      let sub = await osm(`/relation/${m.ref}/full.json`).catch(() => null);
      if (!sub) continue;
      collect(sub.elements, nodes, ways);
      let subRel = sub.elements.find(e => e.type === 'relation' && e.id === m.ref);
      if (subRel) members.push(...subRel.members.filter(x => x.type !== 'relation').map(x => ({...x, role: x.role || m.role})));
    } else {
      members.push(m);
    }
  }

  let trackWays = [];
  let pitWays = [];
  let start = null;
  let seen = new Set();
  for (let m of members) {
    // Ordered route relations sometimes list the same way more than once.
    if (seen.has(m.type + m.ref)) continue;
    seen.add(m.type + m.ref);
    let role = (m.role || '').toLowerCase();
    if (m.type === 'node') {
      if (/start|finish/.test(role) && nodes.has(m.ref)) start = nodes.get(m.ref);
      continue;
    }
    if (m.type !== 'way' || !ways.has(m.ref)) continue;
    let way = ways.get(m.ref);
    if (isExcluded(way.tags, entry)) continue;
    if (/pit/.test(role) || isPit(way.tags)) pitWays.push(way);
    else if (!role || /track|circuit|main|forward|backward|route/.test(role)) trackWays.push(way);
  }
  if (!trackWays.length) throw new Error('relation ' + relationId + ' has no track ways');
  if (!start) start = findStartNode(trackWays, nodes);

  let oneway = trackWays.every(isOneway);
  let trackLines = mergeWays(trackWays, oneway);
  let candidate = makeTrack({
    entry,
    source: 'relation ' + relationId,
    osmName: relation.tags.name,
    osm: {type: 'relation', id: relationId},
    trackLines, pitLines: mergeWays(pitWays, false), nodes, start, oneway
  });
  if (looksRight(candidate, entry)) return candidate;

  // Relations sometimes hold several layouts, or stray pieces. Keep the best loop.
  let loop = bestLoop(trackWays, nodes, entry.length);
  if (!loop) return candidate;
  let fromLoop = makeTrack({...candidate.args, source: 'relation ' + relationId + ' (loop)', trackLines: [loop.nodes], oneway: loop.oneway});
  if (entry.length) return lengthError(fromLoop, entry) < lengthError(candidate, entry) ? fromLoop : candidate;
  // Without a known length, only trust a loop that keeps most of the relation.
  return !candidate.closed && fromLoop.lengthKm > candidate.lengthKm * 0.8 ? fromLoop : candidate;
}

/**
 * Downloads everything mapped around the circuit and picks the loop of
 * `highway=raceway` ways whose length is closest to the catalog length (or
 * the longest loop when we do not know the length).
 */
async function trackFromRaceways(entry) {
  let radiusKm = entry.length ? Math.max(0.7, entry.length / 3.5) : 1.5;
  for (let attempt = 0; attempt < 2; ++attempt) {
    let windowKm = radiusKm * (attempt + 1);
    let map = await osmMap(entry, windowKm / 111.32);
    if (!map) continue;
    let nodes = new Map();
    let ways = new Map();
    collect(map.elements, nodes, ways);
    let raceways = Array.from(ways.values()).filter(w => w.tags && w.tags.highway === 'raceway');
    let pitWays = raceways.filter(w => isPit(w.tags));
    let trackWays = raceways.filter(w => !isPit(w.tags) && !isSecondary(w.tags, entry) && !isExcluded(w.tags, entry));
    let loop = bestLoop(trackWays, nodes, entry.length);
    if (!loop) continue;

    let onLoop = new Set(loop.nodes);
    let pits = pitWays.filter(w => w.nodes.some(id => onLoop.has(id)));
    let start = findStartNode([{nodes: loop.nodes}], nodes);
    let names = new Map();
    for (let w of trackWays) {
      if (!w.nodes.some(id => onLoop.has(id)) || !w.tags.name) continue;
      names.set(w.tags.name, (names.get(w.tags.name) || 0) + 1);
    }
    let osmName = Array.from(names.keys()).sort((a, b) => names.get(b) - names.get(a))[0] || '(unnamed raceway)';
    return makeTrack({
      entry,
      source: 'raceway loop',
      osmName,
      osm: {type: 'way', id: loop.firstWay},
      trackLines: [loop.nodes],
      pitLines: mergeWays(pits, false),
      nodes,
      start,
      oneway: loop.oneway
    });
  }
  throw new Error('no closed loop of raceways around the circuit');
}

function makeTrack(args) {
  let {entry, source, osmName, osm, trackLines, pitLines, nodes, start, oneway} = args;
  let lines = closeGaps(trackLines.map(ids => toCoordinates(ids, nodes)).filter(x => x.length > 1));
  let pit = pitLines.map(ids => toCoordinates(ids, nodes)).filter(x => x.length > 1);
  let lengthKm = lines.reduce((total, line) => total + polylineLength(line), 0);
  let bbox = boundsOf(lines.flat());
  let closed = lines.length === 1 && samePoint(lines[0][0], lines[0][lines[0].length - 1]);

  let track = {
    id: entry.id,
    source,
    osmName,
    osm,
    oneway,
    lengthKm: round(lengthKm, 3),
    bbox: bbox.map(x => round(x, 6)),
    start: start ? [round(start.lon, 6), round(start.lat, 6)] : null,
    lines: lines.map(roundLine),
    pit: pit.map(roundLine)
  };
  // Not written to disk, used while choosing between candidates.
  Object.defineProperty(track, 'closed', {value: closed, enumerable: false});
  Object.defineProperty(track, 'args', {value: args, enumerable: false});
  return track;
}

/**
 * Mappers do not always connect the pieces of a circuit. Join line ends that
 * are a few metres apart, so the track is drawn as one closed stroke.
 */
function closeGaps(lines, maxGapKm = 0.05) {
  lines = lines.map(line => line.slice());
  let joined = true;
  while (joined && lines.length > 1) {
    joined = false;
    let best = null;
    for (let i = 0; i < lines.length; ++i) {
      for (let j = 0; j < lines.length; ++j) {
        if (i === j) continue;
        let a = lines[i], b = lines[j];
        // Prefer joining tail to head, which keeps the driving direction.
        let options = [
          {d: gap(a[a.length - 1], b[0]), join: () => a.concat(b)},
          {d: gap(a[a.length - 1], b[b.length - 1]) + 1e-6, join: () => a.concat(b.slice().reverse())},
        ];
        for (let option of options) {
          if (option.d < maxGapKm && (!best || option.d < best.d)) best = {...option, i, j};
        }
      }
    }
    if (best) {
      let merged = best.join();
      lines = lines.filter((_, k) => k !== best.i && k !== best.j);
      lines.push(merged);
      joined = true;
    }
  }
  return lines.map(line => {
    let first = line[0], last = line[line.length - 1];
    if (!samePoint(first, last) && gap(first, last) < maxGapKm) return line.concat([first]);
    return line;
  });
}

function gap(a, b) {
  return distanceKm({lon: a[0], lat: a[1]}, {lon: b[0], lat: b[1]});
}

function samePoint(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}

/**
 * Finds the simple cycle in a small graph of ways that is closest in length to
 * `targetKm`, or the longest one when there is no target.
 */
function bestLoop(ways, nodes, targetKm) {
  ways = snapDanglingEnds(ways, nodes);
  // Split ways into edges at junctions.
  let useCount = new Map();
  for (let w of ways) {
    w.nodes.forEach((id, i) => {
      let isEnd = i === 0 || i === w.nodes.length - 1;
      useCount.set(id, (useCount.get(id) || 0) + (isEnd ? 2 : 1));
    });
  }
  let edges = [];
  for (let w of ways) {
    let current = [w.nodes[0]];
    for (let i = 1; i < w.nodes.length; ++i) {
      let id = w.nodes[i];
      current.push(id);
      if (useCount.get(id) > 1 || i === w.nodes.length - 1) {
        let coords = toCoordinates(current, nodes);
        if (coords.length === current.length && current.length > 1) {
          edges.push({a: current[0], b: id, nodes: current, len: polylineLength(coords), way: w.id, oneway: isOneway(w)});
        }
        current = [id];
      }
    }
  }

  // Drop dead ends: they can never be part of a loop.
  let alive = edges.map(() => true);
  let changed = true;
  while (changed) {
    changed = false;
    let degree = new Map();
    edges.forEach((e, i) => {
      if (!alive[i] || e.a === e.b) return;
      degree.set(e.a, (degree.get(e.a) || 0) + 1);
      degree.set(e.b, (degree.get(e.b) || 0) + 1);
    });
    edges.forEach((e, i) => {
      if (!alive[i] || e.a === e.b) return;
      if (degree.get(e.a) < 2 || degree.get(e.b) < 2) {
        alive[i] = false;
        changed = true;
      }
    });
  }
  let live = edges.filter((e, i) => alive[i]);
  if (!live.length) return null;

  let adjacency = new Map();
  live.forEach((e, i) => {
    if (!adjacency.has(e.a)) adjacency.set(e.a, []);
    if (!adjacency.has(e.b)) adjacency.set(e.b, []);
    adjacency.get(e.a).push(i);
    if (e.a !== e.b) adjacency.get(e.b).push(i);
  });

  let order = new Map(Array.from(adjacency.keys()).map((id, i) => [id, i]));
  let limit = targetKm ? targetKm * 1.25 : Infinity;
  let best = null;
  let bestScore = Infinity;
  let budget = 300000;

  let consider = (path, len) => {
    let score = targetKm ? Math.abs(len - targetKm) : -len;
    if (score < bestScore) {
      bestScore = score;
      best = path.slice();
    }
  };

  live.forEach((e, i) => {
    if (e.a === e.b) consider([{edge: i, forward: true}], e.len);
  });

  for (let startId of adjacency.keys()) {
    let startOrder = order.get(startId);
    let visited = new Set([startId]);
    let usedEdges = new Set();
    let path = [];
    let dfs = (vertex, len) => {
      if (--budget < 0) return;
      for (let i of adjacency.get(vertex)) {
        let e = live[i];
        if (e.a === e.b || usedEdges.has(i)) continue;
        let forward = e.a === vertex;
        let next = forward ? e.b : e.a;
        let total = len + e.len;
        if (total > limit) continue;
        if (next === startId) {
          if (path.length >= 1) {
            path.push({edge: i, forward});
            consider(path, total);
            path.pop();
          }
          continue;
        }
        if (visited.has(next) || order.get(next) < startOrder) continue;
        visited.add(next);
        usedEdges.add(i);
        path.push({edge: i, forward});
        dfs(next, total);
        path.pop();
        usedEdges.delete(i);
        visited.delete(next);
      }
    };
    dfs(startId, 0);
  }
  if (!best) return null;

  // Walk the loop; flip it if most oneway pieces go the other way.
  let withFlow = 0, againstFlow = 0, onewayLength = 0, total = 0;
  for (let {edge, forward} of best) {
    let e = live[edge];
    total += e.len;
    if (!e.oneway) continue;
    onewayLength += e.len;
    if (forward) withFlow += e.len;
    else againstFlow += e.len;
  }
  let sequence = [];
  for (let {edge, forward} of best) {
    let ids = forward ? live[edge].nodes : live[edge].nodes.slice().reverse();
    sequence.push(...(sequence.length ? ids.slice(1) : ids));
  }
  if (againstFlow > withFlow) sequence.reverse();
  return {nodes: sequence, oneway: onewayLength > total * 0.6, firstWay: live[best[0].edge].way};
}

/**
 * A way that ends a few metres short of another one was meant to connect to it.
 * Reconnect such ends to the nearest node of another way.
 */
function snapDanglingEnds(ways, nodes, maxKm = 0.015) {
  let owners = new Map();
  for (let w of ways) {
    for (let id of w.nodes) {
      if (!owners.has(id)) owners.set(id, new Set());
      owners.get(id).add(w.id);
    }
  }
  let candidates = Array.from(owners.keys()).filter(id => nodes.has(id));
  return ways.map(w => {
    let ids = w.nodes.slice();
    [0, ids.length - 1].forEach(index => {
      let id = ids[index];
      if (owners.get(id).size > 1 || !nodes.has(id)) return; // already connected
      let here = nodes.get(id);
      let best = null, bestDistance = maxKm;
      for (let other of candidates) {
        if (owners.get(other).has(w.id)) continue;
        let node = nodes.get(other);
        if (Math.abs(node.lat - here.lat) > 0.0003 || Math.abs(node.lon - here.lon) > 0.0005) continue;
        let d = distanceKm(here, node);
        if (d < bestDistance) {
          bestDistance = d;
          best = other;
        }
      }
      if (best !== null) {
        if (index === 0) ids.unshift(best);
        else ids.push(best);
      }
    });
    return {...w, nodes: ids};
  });
}

function isOneway(way) {
  return Boolean(way.tags && (way.tags.oneway === 'yes' || way.tags.oneway === '1'));
}

function isExcluded(tags, entry) {
  return Boolean(entry.exclude && new RegExp(entry.exclude, 'i').test((tags && tags.name) || ''));
}

function isSecondary(tags, entry) {
  let name = tags.name || '';
  if (!name || !SECONDARY_LAYOUT.test(name)) return false;
  if (entry.layout && new RegExp(entry.layout, 'i').test(name)) return false;
  return !SECONDARY_LAYOUT.test(entry.name);
}

function collect(elements, nodes, ways) {
  for (let el of elements) {
    if (el.type === 'node') nodes.set(el.id, el);
    else if (el.type === 'way') ways.set(el.id, el);
  }
}

function findStartNode(ways, nodes) {
  for (let way of ways) {
    for (let id of way.nodes) {
      let node = nodes.get(id);
      let tag = node && node.tags && (node.tags.raceway || node.tags.sport_track || node.tags.line);
      if (tag && /start|finish/.test(tag)) return node;
    }
  }
  return null;
}

/**
 * Joins ways that share endpoints into longer polylines, so that thick
 * strokes do not show seams. Oneway ways are only joined head to tail, which
 * keeps the driving direction.
 */
function mergeWays(ways, keepDirection) {
  let pieces = ways.map(w => w.nodes.slice());
  let used = new Array(pieces.length).fill(false);
  let result = [];
  for (let i = 0; i < pieces.length; ++i) {
    if (used[i]) continue;
    used[i] = true;
    let line = pieces[i];
    let extended = true;
    while (extended) {
      extended = false;
      for (let j = 0; j < pieces.length; ++j) {
        if (used[j]) continue;
        let p = pieces[j];
        let head = line[0];
        let tail = line[line.length - 1];
        if (head === tail) break; // closed loop
        if (p[0] === tail) line = line.concat(p.slice(1));
        else if (p[p.length - 1] === head) line = p.concat(line.slice(1));
        else if (!keepDirection && p[p.length - 1] === tail) line = line.concat(p.slice(0, -1).reverse());
        else if (!keepDirection && p[0] === head) line = p.slice(1).reverse().concat(line);
        else continue;
        used[j] = true;
        extended = true;
      }
    }
    result.push(line);
  }
  return result;
}

function toCoordinates(ids, nodes) {
  return ids.map(id => nodes.get(id)).filter(Boolean).map(n => [n.lon, n.lat]);
}

function toIndexEntry(entry, track) {
  let rest = {...entry};
  delete rest.lat;
  delete rest.lon;
  delete rest.query;
  delete rest.layout;
  delete rest.osmRelation;
  return {
    ...rest,
    computedLength: track.lengthKm,
    bbox: track.bbox,
    osm: track.osm,
    outline: outlinePath(track.lines)
  };
}

/**
 * A small SVG path (in a 100x100 box) for the track picker thumbnails.
 */
function outlinePath(lines) {
  let projected = lines.map(line => line.map(([lon, lat]) => mercator(lon, lat)));
  let all = projected.flat();
  let minX = Math.min(...all.map(p => p[0])), maxX = Math.max(...all.map(p => p[0]));
  let minY = Math.min(...all.map(p => p[1])), maxY = Math.max(...all.map(p => p[1]));
  let size = Math.max(maxX - minX, maxY - minY) || 1;
  let dx = (size - (maxX - minX)) / 2, dy = (size - (maxY - minY)) / 2;
  let tolerance = size * 0.004;
  return projected.map(line => {
    let simple = simplify(line, tolerance);
    return simple.map((p, i) => {
      let x = ((p[0] - minX + dx) / size * 100).toFixed(1);
      let y = ((maxY - p[1] + dy) / size * 100).toFixed(1);
      return (i ? 'L' : 'M') + x + ' ' + y;
    }).join('');
  }).join('');
}

function simplify(points, tolerance) {
  if (points.length < 3) return points;
  let keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  let stack = [[0, points.length - 1]];
  while (stack.length) {
    let [a, b] = stack.pop();
    let maxD = 0, index = -1;
    for (let i = a + 1; i < b; ++i) {
      let d = segmentDistance(points[i], points[a], points[b]);
      if (d > maxD) { maxD = d; index = i; }
    }
    if (maxD > tolerance) {
      keep[index] = 1;
      stack.push([a, index], [index, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function segmentDistance(p, a, b) {
  let dx = b[0] - a[0], dy = b[1] - a[1];
  let len = dx * dx + dy * dy;
  let t = len ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len)) : 0;
  let x = a[0] + t * dx - p[0], y = a[1] + t * dy - p[1];
  return Math.sqrt(x * x + y * y);
}

function mercator(lon, lat) {
  return [lon * Math.PI / 180, Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360))];
}

function polylineLength(line) {
  let total = 0;
  for (let i = 1; i < line.length; ++i) {
    total += distanceKm({lon: line[i - 1][0], lat: line[i - 1][1]}, {lon: line[i][0], lat: line[i][1]});
  }
  return total;
}

function distanceKm(a, b) {
  let R = 6371.0088;
  let dLat = (b.lat - a.lat) * Math.PI / 180;
  let dLon = (b.lon - a.lon) * Math.PI / 180;
  let h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function boundsOf(points) {
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
  for (let [lon, lat] of points) {
    if (lon < west) west = lon;
    if (lon > east) east = lon;
    if (lat < south) south = lat;
    if (lat > north) north = lat;
  }
  return [west, south, east, north];
}

function isPit(tags) {
  if (!tags) return false;
  if (tags.raceway === 'pit_lane' || tags.service === 'pit_lane' || tags.pit_lane === 'yes') return true;
  let names = [tags.name || '', tags['name:en'] || ''];
  return names.some(name => PIT.test(name) && !STRAIGHT.test(name));
}

function parseLength(value) {
  if (!value) return;
  let num = Number.parseFloat(value.replace(',', '.'));
  if (!Number.isFinite(num)) return;
  if (/km/.test(value)) return num;
  if (/mi/.test(value)) return num * 1.609344;
  return num > 100 ? num / 1000 : num; // plain numbers are metres in OSM
}

function normalize(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function round(x, digits) {
  let m = 10 ** digits;
  return Math.round(x * m) / m;
}

function roundLine(line) {
  return line.map(([lon, lat]) => [round(lon, 6), round(lat, 6)]);
}

// ---------------------------------------------------------------- network

async function nominatim(q) {
  let wait = lastNominatim + 1100 - Date.now();
  if (wait > 0) await sleep(wait);
  lastNominatim = Date.now();
  return getJSON(`${NOMINATIM}/search?format=json&limit=50&q=${encodeURIComponent(q)}`);
}

async function osm(urlPath) {
  let wait = lastOSM + 300 - Date.now();
  if (wait > 0) await sleep(wait);
  lastOSM = Date.now();
  return getJSON(OSM_API + urlPath);
}

async function osmMap(center, delta) {
  let lonDelta = delta / Math.cos(center.lat * Math.PI / 180);
  let box = [center.lon - lonDelta, center.lat - delta, center.lon + lonDelta, center.lat + delta];
  let elements = await osmMapBox(box, 0);
  return elements ? {elements} : null;
}

/**
 * The OSM API refuses boxes with more than 50,000 nodes; split those in four.
 */
async function osmMapBox(box, depth) {
  let bbox = box.map(x => x.toFixed(5)).join(',');
  try {
    let response = await osm(`/map.json?bbox=${bbox}`);
    return response.elements;
  } catch (e) {
    if (depth >= 3 || !/400/.test(e.message)) {
      console.log(`      map ${bbox} failed: ${e.message}`);
      return null;
    }
  }
  let [west, south, east, north] = box;
  let midLon = (west + east) / 2, midLat = (south + north) / 2;
  let quarters = [[west, south, midLon, midLat], [midLon, south, east, midLat], [west, midLat, midLon, north], [midLon, midLat, east, north]];
  let merged = new Map();
  for (let quarter of quarters) {
    let elements = await osmMapBox(quarter, depth + 1);
    if (!elements) return null;
    for (let el of elements) merged.set(el.type + el.id, el);
  }
  return Array.from(merged.values());
}

async function getJSON(url, attempt = 0) {
  let res;
  try {
    res = await fetch(url, {headers: {'User-Agent': USER_AGENT, 'Accept': 'application/json'}});
  } catch (e) {
    if (attempt < 3) {
      await sleep(2000 * (attempt + 1));
      return getJSON(url, attempt + 1);
    }
    throw e;
  }
  if (res.status === 429 || res.status >= 500) {
    if (attempt < 3) {
      await sleep(5000 * (attempt + 1));
      return getJSON(url, attempt + 1);
    }
  }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
