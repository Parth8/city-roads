// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import {createApp} from 'vue';
import {require as d3Require} from 'd3-require';
import {isWebGLEnabled} from 'w-gl';
import Query from './lib/Query.js';

// const wgl = require('w-gl');

window.addEventListener('error', logError);

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

function logError(e) {
  if (typeof gtag !== 'function') return;

  const exDescription = e ? `${e.message} in ${e.filename}:${e.lineno}` : 'Unknown exception';

  gtag('send', 'exception', {
    description: exDescription,
    fatal: false
  });
}