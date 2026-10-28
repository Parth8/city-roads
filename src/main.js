import {createApp} from 'vue';
import {require as d3Require} from 'd3-require';
import {isWebGLEnabled} from 'w-gl';
import Query from './lib/Query.js';

// expose the console API
window.requireModule = d3Require;
window.Query = Query;

let params = new URLSearchParams(window.location.search);
if (params.get('mode') === 'tracks' || params.has('track')) {
  // Race track posters are drawn with a 2D canvas and live in their own chunk.
  document.querySelector('#canvas').style.display = 'none';
  import('./track/TrackApp.vue').then(module => createApp(module.default).mount('#host'));
} else if (isWebGLEnabled(document.querySelector('#canvas'))) {
  // Loaded on demand so the city styles do not leak into the poster editor.
  import('./App.vue').then(module => createApp(module.default).mount('#host'));
} else {
  import('./NoWebGL.vue').then(module => createApp(module.default).mount('#host'));
}
