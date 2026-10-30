const GEOMETRY_KEYS = ['roads', 'namedRoads', 'rail', 'waterLines', 'waterAreas', 'parks', 'buildings'];

/**
 * Packs every layer's geometry into one buffer, so a worker hands over a
 * handful of buffers instead of hundreds of thousands (which is very slow).
 * Returns {result, buffers}; unpack() on the other side restores the layers.
 */
export function pack(result) {
  let packed = {...result, packed: {}};
  let buffers = [];
  for (let key of GEOMETRY_KEYS) {
    let list = result[key];
    let total = 0, cuts = 0;
    for (let f of list) {
      total += f.pts.length;
      if (f.cut) cuts += f.cut.length;
    }
    let pts = new Float64Array(total);
    let cut = new Uint8Array(cuts);
    let offset = 0, cutOffset = 0;
    packed[key] = list.map(f => {
      let item = {...f, pts: null, cut: null, at: offset, length: f.pts.length};
      pts.set(f.pts, offset);
      offset += f.pts.length;
      if (f.cut) {
        cut.set(f.cut, cutOffset);
        item.cutAt = cutOffset;
        cutOffset += f.cut.length;
      }
      return item;
    });
    packed.packed[key] = {pts, cut};
    buffers.push(pts.buffer, cut.buffer);
  }
  return {result: packed, buffers};
}

export function unpack(packed) {
  if (!packed.packed) return packed;
  let result = {...packed};
  for (let key of GEOMETRY_KEYS) {
    let {pts, cut} = packed.packed[key];
    result[key] = packed[key].map(f => {
      let item = {...f, pts: pts.subarray(f.at, f.at + f.length), cut: null};
      if (f.cutAt !== undefined) item.cut = cut.subarray(f.cutAt, f.cutAt + f.length / 2);
      delete item.at;
      delete item.length;
      delete item.cutAt;
      return item;
    });
  }
  delete result.packed;
  return result;
}
