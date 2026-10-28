import index from '../data/index.json';

const trackLoaders = import.meta.glob('../data/tracks/*.json');
const flagUrls = import.meta.glob('../data/flags/*.svg');

export const tracks = index;

// Series in the order they show up in the filter.
const SERIES_ORDER = ['F1', 'MotoGP', 'WEC', 'IMSA', 'IndyCar', 'NASCAR', 'Formula E', 'Supercars', 'DTM', 'Super GT', 'WSBK', 'BTCC', 'Isle of Man TT', 'Historic F1', 'Historic'];

export const seriesList = (() => {
  let all = new Set();
  tracks.forEach(t => t.series.forEach(s => all.add(s)));
  let known = SERIES_ORDER.filter(s => all.has(s));
  let rest = Array.from(all).filter(s => !SERIES_ORDER.includes(s)).sort();
  return known.concat(rest);
})();

export function getTrackMeta(id) {
  return tracks.find(t => t.id === id);
}

export function loadTrack(id) {
  let loader = trackLoaders[`../data/tracks/${id}.json`];
  if (!loader) return Promise.reject(new Error('Unknown track ' + id));
  return loader().then(module => module.default || module);
}

/**
 * Resolves to {image, dataUrl, aspect} for a country code, or null.
 */
export function loadFlag(cc) {
  let loader = flagUrls[`../data/flags/${cc}.svg`];
  if (!loader) return Promise.resolve(null);
  return loader()
    .then(module => fetch(module.default))
    .then(response => response.text())
    .then(raw => {
      // A data URL keeps the canvas exportable (no cross-origin taint) and embeds into SVG exports.
      let dataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(raw)));
      return new Promise(resolve => {
        let image = new Image();
        image.onload = () => resolve({image, dataUrl, aspect: 4 / 3});
        image.onerror = () => resolve(null);
        image.src = dataUrl;
      });
    })
    .catch(() => null);
}
