const EARTH_RADIUS = 6378137;

/**
 * Projects lon/lat into Web Mercator metres, relative to `origin` so that the
 * numbers stay small (canvas uses floats, and posters zoom in a lot).
 */
export function createProjection(origin) {
  let [ox, oy] = mercator(origin[0], origin[1]);
  return function project(lon, lat) {
    let [x, y] = mercator(lon, lat);
    return [x - ox, y - oy];
  };
}

export function mercator(lon, lat) {
  let x = lon * Math.PI / 180 * EARTH_RADIUS;
  let y = Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) * EARTH_RADIUS;
  return [x, y];
}

export function bboxCenter(bbox) {
  let [west, south, east, north] = bbox;
  return [(west + east) / 2, (south + north) / 2];
}

/**
 * Grows a [west, south, east, north] box by `ratio` of its largest side,
 * but at least by `minMetres` and at most by `maxMetres`.
 */
export function padBBox(bbox, ratio, minMetres, maxMetres = Infinity) {
  let [west, south, east, north] = bbox;
  let midLat = (south + north) / 2 * Math.PI / 180;
  let heightM = (north - south) * 111320;
  let widthM = (east - west) * 111320 * Math.cos(midLat);
  let pad = Math.min(Math.max(Math.max(widthM, heightM) * ratio, minMetres), maxMetres);
  let dLat = pad / 111320;
  let dLon = pad / (111320 * Math.cos(midLat));
  return [west - dLon, south - dLat, east + dLon, north + dLat];
}

export function bboxAreaKm2(bbox) {
  let [west, south, east, north] = bbox;
  let midLat = (south + north) / 2 * Math.PI / 180;
  return (north - south) * 111.32 * (east - west) * 111.32 * Math.cos(midLat);
}

export function formatDMS(lon, lat) {
  return toDMS(lat, 'N', 'S') + ' ' + toDMS(lon, 'E', 'W');
}

function toDMS(value, positive, negative) {
  let abs = Math.abs(value);
  let degrees = Math.floor(abs);
  let minutesFloat = (abs - degrees) * 60;
  let minutes = Math.floor(minutesFloat);
  let seconds = Math.round((minutesFloat - minutes) * 60);
  if (seconds === 60) {
    seconds = 0;
    minutes += 1;
  }
  if (minutes === 60) {
    minutes = 0;
    degrees += 1;
  }
  return `${degrees}° ${minutes}' ${seconds}"${value >= 0 ? positive : negative}`;
}

/**
 * A uniform grid over points, to answer "how far is the nearest point" quickly.
 */
export function createPointIndex(points, cellSize) {
  let cells = new Map();
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let [x, y] of points) {
    let key = cellKey(Math.floor(x / cellSize), Math.floor(y / cellSize));
    let bucket = cells.get(key);
    if (!bucket) cells.set(key, bucket = []);
    bucket.push(x, y);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  return {
    /**
     * Distance to the nearest indexed point, or `maxDistance` if nothing is closer.
     */
    distance(x, y, maxDistance) {
      // Nothing can be closer than the box around all points.
      let dx = Math.max(minX - x, 0, x - maxX);
      let dy = Math.max(minY - y, 0, y - maxY);
      let boxDistance = Math.hypot(dx, dy);
      if (boxDistance >= maxDistance) return maxDistance;

      let cx = Math.floor(x / cellSize);
      let cy = Math.floor(y / cellSize);
      let best = maxDistance * maxDistance;
      // A cell r rings away can be as close as r cells diagonally.
      let firstRing = Math.max(0, Math.floor(boxDistance / (cellSize * Math.SQRT2)) - 1);
      let lastRing = Math.ceil(maxDistance / cellSize) + 1;
      for (let ring = firstRing; ring <= lastRing; ++ring) {
        // Points in this ring are at least (ring - 1) cells away.
        let ringMin = (ring - 1) * cellSize;
        if (ring > 1 && ringMin * ringMin > best) break;
        forEachCellInRing(cx, cy, ring, key => {
          let bucket = cells.get(key);
          if (!bucket) return;
          for (let k = 0; k < bucket.length; k += 2) {
            let ddx = bucket[k] - x, ddy = bucket[k + 1] - y;
            let d = ddx * ddx + ddy * ddy;
            if (d < best) best = d;
          }
        });
      }
      return Math.sqrt(best);
    }
  };
}

// Visits only the cells on the border of the square ring, not the whole square.
function forEachCellInRing(cx, cy, ring, visit) {
  if (ring === 0) {
    visit(cellKey(cx, cy));
    return;
  }
  for (let i = -ring; i <= ring; ++i) {
    visit(cellKey(cx + i, cy - ring));
    visit(cellKey(cx + i, cy + ring));
  }
  for (let j = -ring + 1; j <= ring - 1; ++j) {
    visit(cellKey(cx - ring, cy + j));
    visit(cellKey(cx + ring, cy + j));
  }
}

function cellKey(x, y) {
  return x + ':' + y;
}

/**
 * Adds points along a polyline so that no two neighbours are more than `step` apart.
 */
export function densify(points, step) {
  let result = [];
  for (let i = 0; i < points.length; ++i) {
    let p = points[i];
    if (i > 0) {
      let prev = points[i - 1];
      let dx = p[0] - prev[0], dy = p[1] - prev[1];
      let len = Math.sqrt(dx * dx + dy * dy);
      let count = Math.floor(len / step);
      for (let k = 1; k <= count; ++k) {
        let t = k / (count + 1);
        result.push([prev[0] + dx * t, prev[1] + dy * t]);
      }
    }
    result.push(p);
  }
  return result;
}
