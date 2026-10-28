#!/usr/bin/env node
/**
 * Writes an SVG with every extracted track (black), pit lane (red) and start
 * line (blue dot), to eyeball that the right layouts were picked:
 *
 *   node scripts/tracks/contact-sheet.mjs > tracks.svg
 */
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(here, '..', '..', 'src', 'track', 'data');
const index = JSON.parse(fs.readFileSync(path.join(dataDir, 'index.json'), 'utf8'));
const only = new Set(process.argv.slice(2));
const cell = Number(process.env.CELL) || 220, cols = Number(process.env.COLS) || 6;
const items = index.filter(x => !only.size || only.has(x.id));
let out = [];
items.forEach((entry, i) => {
  let track = JSON.parse(fs.readFileSync(path.join(dataDir, 'tracks', entry.id + '.json'), 'utf8'));
  let pts = track.lines.flat().concat(track.pit.flat()).map(project);
  let minX = Math.min(...pts.map(p => p[0])), maxX = Math.max(...pts.map(p => p[0]));
  let minY = Math.min(...pts.map(p => p[1])), maxY = Math.max(...pts.map(p => p[1]));
  let size = Math.max(maxX - minX, maxY - minY) || 1;
  let ox = (i % cols) * cell, oy = Math.floor(i / cols) * cell;
  let toXY = p => {
    let [x, y] = project(p);
    return [ox + 10 + (x - minX) / size * (cell - 20), oy + 30 + (maxY - y) / size * (cell - 40)];
  };
  let d = lines => lines.map(l => l.map((p, j) => (j ? 'L' : 'M') + toXY(p).map(v => v.toFixed(1)).join(' ')).join('')).join('');
  out.push(`<text x="${ox + 6}" y="${oy + 14}" font-size="11" font-family="sans-serif">${entry.id} ${track.lengthKm}km${entry.length ? ' / ' + entry.length : ''}</text>`);
  out.push(`<path d="${d(track.pit)}" stroke="#e33" stroke-width="1.5" fill="none"/>`);
  out.push(`<path d="${d(track.lines)}" stroke="#111" stroke-width="2.5" fill="none" stroke-linejoin="round"/>`);
  if (track.start) {
    let [x, y] = toXY(track.start);
    out.push(`<circle cx="${x}" cy="${y}" r="4" fill="#27f"/>`);
  }
});
let rows = Math.ceil(items.length / cols);
console.log(`<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cell}" height="${rows * cell}" style="background:#fff"><rect width="100%" height="100%" fill="#fff"/>${out.join('')}</svg>`);

function project([lon, lat]) {
  return [lon * Math.PI / 180, Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360))];
}
