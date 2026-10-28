/**
 * Poster fonts, loaded from Google Fonts on demand.
 */
export const fonts = [
  {family: 'Montserrat', weights: [400, 500, 700]},
  {family: 'Barlow Condensed', weights: [400, 500, 600]},
  {family: 'Barlow', weights: [400, 500, 600]},
  {family: 'Bebas Neue', weights: [400]},
  {family: 'Playfair Display', weights: [400, 700]},
  {family: 'Space Grotesk', weights: [400, 600]},
  {family: 'Orbitron', weights: [500, 700]},
  {family: 'Caveat', weights: [500]}, // polaroid captions
];

// Fonts offered for titles, with the weight that suits each.
export const titleFonts = [
  {family: 'Montserrat', weight: 700},
  {family: 'Barlow Condensed', weight: 500},
  {family: 'Bebas Neue', weight: 400},
  {family: 'Playfair Display', weight: 700},
  {family: 'Space Grotesk', weight: 600},
  {family: 'Orbitron', weight: 700},
  {family: 'Barlow', weight: 600},
];

let fontsReady = null;

/**
 * Adds the Google Fonts stylesheet and resolves once the fonts can be used on
 * a canvas (canvas text silently falls back to a default font otherwise).
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
