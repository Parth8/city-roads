import {loadTiles} from './loadTiles.js';
import {pack} from './pack.js';

/**
 * Downloads and decodes tiles off the main thread, so the editor stays smooth
 * while a city loads. Geometry comes back packed into a few transferred buffers
 * (see pack.js).
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
    let packed = pack(result);
    self.postMessage({type: 'done', result: packed.result}, packed.buffers);
  } catch (e) {
    self.postMessage({type: 'error', message: e.message, aborted: controller.signal.aborted});
  }
};
