import {createApp} from 'vue';
import {require as d3Require} from 'd3-require';
import {isWebGLEnabled} from 'w-gl';
import Query from './lib/Query.js';

// expose the console API of classic City Roads
window.requireModule = d3Require;
window.Query = Query;

let params = new URLSearchParams(window.location.search);
// Links made by classic City Roads carry these; keep them working.
let classic = params.get('mode') === 'classic' || ['q', 'areaId', 'osm_id'].some(key => params.has(key)) ||
  (params.has('bbox') && !params.has('place'));

if (!classic) {
  // The poster studio draws with a 2D canvas and lives in its own chunk.
  document.querySelector('#canvas').style.display = 'none';
  import('./studio/StudioApp.vue').then(module => createApp(module.default).mount('#host'));
} else if (isWebGLEnabled(document.querySelector('#canvas'))) {
  // Loaded on demand so the classic styles do not leak into the studio.
  import('./App.vue').then(module => createApp(module.default).mount('#host'));
} else {
  import('./NoWebGL.vue').then(module => createApp(module.default).mount('#host'));
}
