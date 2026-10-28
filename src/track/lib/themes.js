/**
 * Poster styles. Each one is a starting point: every colour, width and the
 * layout can be changed in the editor afterwards.
 *
 * layout:
 *   minimal - map on top, title and a one-line summary underneath
 *   inset   - map in a box on a mat, title, country and coordinates underneath
 *   data    - title on top, map in the middle, a row of stats at the bottom
 */
export const themes = [
  {
    id: 'carbon',
    name: 'Carbon',
    layout: 'minimal',
    background: '#2d2d2d',
    mapBackground: null,
    streets: '#ffffff',
    streetOpacity: 0.5,
    buildings: 'outline',
    track: '#ffffff',
    trackCasing: null,
    trackWidth: 9,
    pit: null,
    text: '#ffffff',
    muted: '#bdbdbd',
    accent: '#ffffff',
    fade: 0.35,
    titleFont: 'Montserrat',
    titleWeight: 700,
    titleSpacing: 0.12,
    bodyFont: 'Montserrat',
  },
  {
    id: 'rosso',
    name: 'Rosso',
    layout: 'data',
    background: '#141414',
    mapBackground: null,
    streets: '#a3a3a3',
    streetOpacity: 0.55,
    buildings: 'outline',
    track: '#e10600',
    trackCasing: '#ffd5d2',
    trackWidth: 11,
    pit: null,
    text: '#ffffff',
    muted: '#a0a0a0',
    accent: '#e10600',
    fade: 0.3,
    titleFont: 'Barlow Condensed',
    titleWeight: 500,
    titleSpacing: 0.04,
    bodyFont: 'Barlow Condensed',
  },
  {
    id: 'paddock',
    name: 'Paddock',
    layout: 'inset',
    background: '#f6eee3',
    mapBackground: '#565656',
    streets: '#9a9a9a',
    streetOpacity: 0.8,
    buildings: 'fill',
    track: '#ffffff',
    trackCasing: null,
    trackWidth: 9,
    pit: null,
    text: '#111111',
    muted: '#555555',
    accent: '#c8102e',
    fade: 0,
    titleFont: 'Barlow',
    titleWeight: 600,
    titleSpacing: 0.16,
    bodyFont: 'Barlow',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    layout: 'minimal',
    background: '#050505',
    mapBackground: null,
    streets: '#d6d6d6',
    streetOpacity: 0.7,
    buildings: 'none',
    track: '#f2f2f2',
    trackCasing: null,
    trackWidth: 7,
    pit: null,
    text: '#e6e6e6',
    muted: '#b0b0b0',
    accent: '#ffffff',
    fade: 0.75,
    titleFont: 'Barlow Condensed',
    titleWeight: 400,
    titleSpacing: 0.18,
    bodyFont: 'Barlow Condensed',
    flag: true,
  },
  {
    id: 'heritage',
    name: 'Heritage',
    layout: 'data',
    background: '#e9dab9',
    mapBackground: null,
    streets: '#6d5f45',
    streetOpacity: 0.35,
    buildings: 'fill',
    track: '#141414',
    trackCasing: '#8f8a80',
    trackWidth: 11,
    pit: null,
    text: '#1a1712',
    muted: '#4a4337',
    accent: '#141414',
    fade: 0.5,
    titleFont: 'Playfair Display',
    titleWeight: 700,
    titleSpacing: 0.02,
    bodyFont: 'Playfair Display',
  },
  {
    id: 'paper',
    name: 'Paper',
    layout: 'minimal',
    background: '#f7f2e8',
    mapBackground: null,
    streets: '#1a1a1a',
    streetOpacity: 0.3,
    buildings: 'none',
    track: '#c8102e',
    trackCasing: null,
    trackWidth: 8,
    pit: null,
    text: '#1a1a1a',
    muted: '#5c5c5c',
    accent: '#c8102e',
    fade: 0.4,
    titleFont: 'Montserrat',
    titleWeight: 700,
    titleSpacing: 0.12,
    bodyFont: 'Montserrat',
  },
  {
    id: 'blueprint',
    name: 'Blueprint',
    layout: 'inset',
    background: '#0f2e52',
    mapBackground: '#14395f',
    streets: '#86a9d1',
    streetOpacity: 0.55,
    buildings: 'outline',
    track: '#ffd23f',
    trackCasing: null,
    trackWidth: 8,
    pit: null,
    text: '#eaf2ff',
    muted: '#9db7d6',
    accent: '#ffd23f',
    fade: 0.2,
    titleFont: 'Barlow Condensed',
    titleWeight: 600,
    titleSpacing: 0.14,
    bodyFont: 'Barlow Condensed',
  },
  {
    id: 'gulf',
    name: 'Gulf',
    layout: 'minimal',
    background: '#a7d4ec',
    mapBackground: null,
    streets: '#ffffff',
    streetOpacity: 0.75,
    buildings: 'none',
    track: '#f37021',
    trackCasing: '#14365c',
    trackWidth: 10,
    pit: null,
    text: '#14365c',
    muted: '#285281',
    accent: '#f37021',
    fade: 0.35,
    titleFont: 'Montserrat',
    titleWeight: 700,
    titleSpacing: 0.1,
    bodyFont: 'Montserrat',
  },
];

export const layouts = [
  {id: 'minimal', name: 'Minimal'},
  {id: 'inset', name: 'Framed map'},
  {id: 'data', name: 'Stats'},
];

export const fonts = [
  {family: 'Montserrat', weights: [400, 500, 700]},
  {family: 'Barlow Condensed', weights: [400, 500, 600]},
  {family: 'Barlow', weights: [400, 500, 600]},
  {family: 'Playfair Display', weights: [400, 700]},
];

export function getTheme(id) {
  return themes.find(x => x.id === id) || themes[0];
}

let fontsReady = null;

/**
 * Adds the Google Fonts stylesheet and resolves once the poster fonts can be
 * used on a canvas (canvas text silently falls back to a default font otherwise).
 */
export function loadFonts() {
  if (fontsReady) return fontsReady;
  let families = fonts.map(f => 'family=' + f.family.replace(/ /g, '+') + ':wght@' + f.weights.join(';')).join('&');
  let stylesheetLoaded = new Promise(resolve => {
    let link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?' + families + '&display=swap';
    link.onload = resolve;
    link.onerror = resolve;
    document.head.appendChild(link);
  });
  let loaded = stylesheetLoaded.then(() => {
    if (!document.fonts || !document.fonts.load) return;
    let loads = [];
    fonts.forEach(f => f.weights.forEach(w => loads.push(document.fonts.load(`${w} 32px "${f.family}"`))));
    return Promise.all(loads);
  }).catch(() => {});
  // Never block the poster on fonts that do not come.
  let timeout = new Promise(resolve => setTimeout(resolve, 5000));
  fontsReady = Promise.race([loaded, timeout]);
  return fontsReady;
}
