/**
 * Finds the street (or the track) nearest to a point on the poster.
 *
 * `map` is what renderPoster() returned for the frame on screen, `point` is in
 * poster units and `tolerance` is how far away (in poster units) still counts.
 * Resolves to {key, label} or null.
 */
export default function hitTest(subject, features, map, point, tolerance) {
  let best = null;
  let bestDistance = tolerance;

  let consider = (pts, key, label, stride) => {
    let prev = map.point(pts[0], pts[1]);
    for (let i = stride; i < pts.length; i += stride) {
      let next = map.point(pts[i], pts[i + 1]);
      let d = segmentDistance(point, prev, next);
      if (d < bestDistance) {
        bestDistance = d;
        best = {key, label};
      }
      prev = next;
    }
  };

  if (subject.kind === 'track') {
    for (let line of subject.lines) consider(line.flat(), 'track', 'Circuit', 2);
    // The track is the obvious target; prefer it when it is about as close as a street.
    if (best) bestDistance *= 0.6;
  }
  if (features) {
    // Named streets first: tapping a street should select it by name, not one unnamed piece.
    for (let list of [features.namedRoads, features.roads, features.rail, features.water]) {
      for (let chunk of list) {
        let [cx, cy] = map.point(chunk.cx, chunk.cy);
        let r = chunk.r * map.scale + bestDistance;
        if (Math.abs(cx - point.x) > r || Math.abs(cy - point.y) > r) continue;
        consider(chunk.pts, chunk.key, chunk.label, 2);
      }
    }
  }
  return best;
}

function segmentDistance(p, a, b) {
  let dx = b[0] - a[0], dy = b[1] - a[1];
  let len = dx * dx + dy * dy;
  let t = len ? Math.max(0, Math.min(1, ((p.x - a[0]) * dx + (p.y - a[1]) * dy) / len)) : 0;
  return Math.hypot(a[0] + t * dx - p.x, a[1] + t * dy - p.y);
}
