import {loadTiles} from './loadTiles.js';

/**
 * Downloads and decodes tiles off the main thread, so the editor stays smooth
 * while a city loads. Geometry comes back as transferred Float64Arrays.
 */
let controller = null;

self.onmessage = async event => {
  let {type, request} = event.data;
  if (type === 'cancel') {
    if (controller) controller.abort();
    return;
  }
  controller = new AbortController();
  try {
    let result = await loadTiles(request, progress => self.postMessage({type: 'progress', progress}), controller.signal);
    self.postMessage({type: 'done', result}, collectBuffers(result));
  } catch (e) {
    self.postMessage({type: 'error', message: e.message, aborted: controller.signal.aborted});
  }
};

function collectBuffers(result) {
  let buffers = [];
  for (let key of ['roads', 'namedRoads', 'rail', 'waterLines', 'waterAreas', 'parks', 'buildings']) {
    for (let f of result[key]) {
      buffers.push(f.pts.buffer);
      if (f.cut) buffers.push(f.cut.buffer);
    }
  }
  return buffers;
}
