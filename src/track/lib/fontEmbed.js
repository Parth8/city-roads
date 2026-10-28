/**
 * SVG files opened outside the browser (or used as an <img>) cannot load web
 * fonts, so we inline the ones the poster uses, as base64 @font-face rules.
 * Only the latin subsets are embedded to keep the file small.
 *
 * Resolves to a CSS string, or '' when the fonts cannot be downloaded.
 */
export default function getEmbeddedFontCss(fonts) {
  let unique = new Map();
  fonts.forEach(f => unique.set(f.family + f.weight, f));
  let families = Array.from(unique.values())
    .map(f => 'family=' + f.family.replace(/ /g, '+') + ':wght@' + f.weight)
    .join('&');

  return fetch('https://fonts.googleapis.com/css2?' + families)
    .then(response => response.text())
    .then(css => {
      let rules = css.split(/(?=\/\* [\w-]+ \*\/\s*@font-face)/)
        .filter(rule => /^\/\* (latin|latin-ext) \*\//.test(rule.trim()));
      return Promise.all(rules.map(inlineFontFile));
    })
    .then(rules => rules.join('\n'))
    .catch(e => {
      console.error('Could not embed fonts', e);
      return '';
    });
}

function inlineFontFile(rule) {
  let match = rule.match(/url\((https:[^)]+)\)/);
  if (!match) return Promise.resolve(rule);
  return fetch(match[1])
    .then(response => response.arrayBuffer())
    .then(buffer => rule.replace(match[1], 'data:font/woff2;base64,' + toBase64(buffer)));
}

function toBase64(buffer) {
  let bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}
