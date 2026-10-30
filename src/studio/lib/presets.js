import {gradient, gradientPalettes} from './paint.js';

/**
 * Presets set the whole look of a poster. Each one starts from BASE and
 * overrides what it needs. Paints are colours or gradients (see paint.js).
 *
 * layout: minimal | inset | data | fullbleed
 * buildings3d raises buildings by their OSM height (extrude, tilt, lightAngle).
 * effects: 'none' | 'emboss' | 'deboss'
 * null paints are derived from the others (e.g. water from background and streets).
 */
export const BASE = {
  layout: 'minimal',
  background: '#2d2d2d',
  mapBackground: null,
  track: '#ffffff',
  trackCasing: null,
  trackCore: null,
  glow: null,
  glowStrength: 0.6,
  trackWidth: 9,
  trackEffect: 'none',
  streets: '#ffffff',
  streetOpacity: 0.5,
  streetWidth: 1,
  streetEffect: 'none',
  fade: 0.35,
  buildings: 'outline',
  buildingColor: null,
  buildingEffect: 'none',
  water: null,
  parks: null,
  buildings3d: false,
  extrude: 1,
  tilt: 0.55,
  lightAngle: 315,
  buildingEdge: null,
  selection: '#ff3b30',
  selectionWidth: 2.2,
  effectDepth: 0.6,
  text: '#ffffff',
  muted: '#bdbdbd',
  accent: '#ffffff',
  titleFont: 'Montserrat',
  titleWeight: 700,
  titleSpacing: 0.12,
  bodyFont: 'Montserrat',
};

const p = id => gradientPalettes.find(x => x.id === id).stops;

export const presets = [
  {id: 'carbon', name: 'Carbon', style: {}},
  {
    id: 'rosso', name: 'Rosso',
    style: {layout: 'data', background: '#141414', streets: '#a3a3a3', streetOpacity: 0.55, track: '#e10600', trackCasing: '#ffd5d2',
      trackWidth: 11, selection: '#ffd5d2', text: '#ffffff', muted: '#a0a0a0', accent: '#e10600', fade: 0.3,
      titleFont: 'Barlow Condensed', titleWeight: 500, titleSpacing: 0.04, bodyFont: 'Barlow Condensed'}
  },
  {
    id: 'paddock', name: 'Paddock', layers: {north: true},
    style: {layout: 'inset', background: '#f6eee3', mapBackground: '#565656', streets: '#9a9a9a', streetOpacity: 0.8, buildings: 'fill',
      track: '#ffffff', fade: 0, text: '#111111', muted: '#555555', accent: '#c8102e', selection: '#c8102e',
      titleFont: 'Barlow', titleWeight: 600, titleSpacing: 0.16, bodyFont: 'Barlow'}
  },
  {
    id: 'midnight', name: 'Midnight', layers: {flag: true},
    style: {background: '#050505', streets: '#d6d6d6', streetOpacity: 0.7, buildings: 'none', track: '#f2f2f2', trackWidth: 7,
      text: '#e6e6e6', muted: '#b0b0b0', fade: 0.75, titleFont: 'Barlow Condensed', titleWeight: 400, titleSpacing: 0.18, bodyFont: 'Barlow Condensed'}
  },
  {
    id: 'heritage', name: 'Heritage', layers: {corners: true},
    style: {layout: 'data', background: '#e9dab9', streets: '#6d5f45', streetOpacity: 0.35, buildings: 'fill', track: '#141414', trackCasing: '#8f8a80',
      trackWidth: 11, text: '#1a1712', muted: '#4a4337', accent: '#141414', selection: '#8b1e1e', fade: 0.5,
      titleFont: 'Playfair Display', titleWeight: 700, titleSpacing: 0.02, bodyFont: 'Playfair Display'}
  },
  {
    id: 'paper', name: 'Paper',
    style: {background: '#f7f2e8', streets: '#1a1a1a', streetOpacity: 0.3, buildings: 'none', track: '#c8102e', trackWidth: 8,
      text: '#1a1a1a', muted: '#5c5c5c', accent: '#c8102e', selection: '#1d4ed8', fade: 0.4}
  },
  {
    id: 'blueprint', name: 'Blueprint', layers: {north: true},
    style: {layout: 'inset', background: '#0f2e52', mapBackground: '#14395f', streets: '#86a9d1', streetOpacity: 0.55, track: '#ffd23f', trackWidth: 8,
      text: '#eaf2ff', muted: '#9db7d6', accent: '#ffd23f', selection: '#ffd23f', fade: 0.2,
      titleFont: 'Barlow Condensed', titleWeight: 600, titleSpacing: 0.14, bodyFont: 'Barlow Condensed'}
  },
  {
    id: 'gulf', name: 'Gulf',
    style: {background: '#a7d4ec', streets: '#ffffff', streetOpacity: 0.75, buildings: 'none', track: '#f37021', trackCasing: '#14365c', trackWidth: 10,
      text: '#14365c', muted: '#285281', accent: '#f37021', selection: '#f37021'}
  },
  {
    id: 'neon', name: 'Neon',
    style: {background: gradient(['#07040f', '#1a0a2e'], 90), streets: '#2de2e6', streetOpacity: 0.3, buildings: 'none',
      track: '#ff2a6d', trackCore: '#ffd6e3', glow: '#ff2a6d', glowStrength: 0.8, trackWidth: 8, selection: '#2de2e6',
      text: '#fdf6ff', muted: '#9d9dc4', accent: '#2de2e6', fade: 0.45, titleSpacing: 0.16}
  },
  {
    id: 'synthwave', name: 'Synthwave',
    style: {background: gradient(['#1b0b38', '#47125c'], 90), streets: '#f222ff', streetOpacity: 0.3, buildings: 'none',
      track: '#ffd319', trackCore: '#fff6c2', glow: '#ff901f', glowStrength: 0.7, trackWidth: 8, selection: '#ffd319',
      text: gradient(['#ffd319', '#ff901f', '#f222ff'], 90), muted: '#f9a8ff', accent: '#f222ff', fade: 0.4,
      titleFont: 'Orbitron', titleWeight: 700, titleSpacing: 0.12, bodyFont: 'Barlow Condensed'}
  },
  {
    id: 'acid', name: 'Acid',
    style: {background: '#050505', streets: '#00ff9f', streetOpacity: 0.22, buildings: 'none', track: '#ccff00', trackCore: '#f4ffc2',
      glow: '#a8ff00', glowStrength: 0.65, trackWidth: 7, selection: '#00ff9f', text: '#ccff00', muted: '#7ddfae', accent: '#00ff9f', fade: 0.5,
      titleFont: 'Barlow Condensed', titleWeight: 500, titleSpacing: 0.2, bodyFont: 'Barlow Condensed'}
  },
  {
    id: 'ice', name: 'Ice',
    style: {background: gradient(['#020c1b', '#0a2540'], 90), streets: '#64ffda', streetOpacity: 0.25, track: '#7df9ff', trackCore: '#e9feff',
      glow: '#00b4ff', glowStrength: 0.7, trackWidth: 7, selection: '#64ffda', text: '#e6f1ff', muted: '#8ab4d8', accent: '#64ffda', fade: 0.4,
      titleWeight: 500, titleSpacing: 0.18}
  },
  {
    id: 'letterpress', name: 'Letterpress', layers: {corners: true},
    style: {background: '#efe9df', streets: '#efe9df', streetOpacity: 1, streetWidth: 1.4, streetEffect: 'emboss', buildings: 'fill',
      buildingColor: '#efe9df', buildingEffect: 'emboss', track: '#efe9df', trackWidth: 12, trackEffect: 'emboss', effectDepth: 0.8,
      selection: '#b0413e', text: '#6f665a', muted: '#8c8273', accent: '#b0413e', fade: 0.25,
      titleFont: 'Playfair Display', titleWeight: 700, titleSpacing: 0.08, bodyFont: 'Playfair Display'}
  },
  {
    id: 'slate', name: 'Slate',
    style: {background: '#3a3f44', streets: '#3a3f44', streetOpacity: 1, streetWidth: 1.4, streetEffect: 'deboss', buildings: 'fill',
      buildingColor: '#3a3f44', buildingEffect: 'deboss', track: '#ff6b35', trackWidth: 10, trackEffect: 'deboss', effectDepth: 0.7,
      selection: '#ffd166', text: '#e8e6e3', muted: '#a7adb3', accent: '#ff6b35', fade: 0.2,
      titleFont: 'Space Grotesk', titleWeight: 600, titleSpacing: 0.1, bodyFont: 'Space Grotesk'}
  },
  {
    id: 'sunset-strip', name: 'Sunset Strip',
    style: {background: gradient(['#ff7e5f', '#c0397a', '#3b1f6b'], 90), streets: '#ffffff', streetOpacity: 0.35, buildings: 'none',
      track: '#ffffff', glow: '#ffd1a1', glowStrength: 0.5, trackWidth: 8, selection: '#ffe66d', text: '#ffffff', muted: '#ffe0d6', accent: '#ffe66d', fade: 0.3,
      titleFont: 'Bebas Neue', titleWeight: 400, titleSpacing: 0.1, bodyFont: 'Montserrat'}
  },
  {
    id: 'aurora', name: 'Aurora',
    style: {background: '#05060f', streets: gradient(p('aurora'), 30), streetOpacity: 0.6, buildings: 'none', track: '#ffffff', trackWidth: 6,
      glow: '#7b2ff7', glowStrength: 0.45, selection: '#00f5a0', text: gradient(p('aurora'), 0), muted: '#a8b3d6', accent: '#00f5a0', fade: 0.3,
      titleSpacing: 0.2, titleWeight: 500}
  },
  {
    id: 'rainbow-road', name: 'Rainbow Road',
    style: {background: '#0b0b16', streets: '#3b3b6d', streetOpacity: 0.4, buildings: 'none', track: gradient(p('rainbow'), 0), trackWidth: 10,
      glow: gradient(p('rainbow'), 0), glowStrength: 0.55, selection: '#ffffff', text: gradient(p('rainbow'), 0), muted: '#b7b7e0', accent: '#ffe600', fade: 0.4,
      titleFont: 'Orbitron', titleWeight: 700, titleSpacing: 0.1, bodyFont: 'Montserrat'}
  },
  {
    id: 'chrome', name: 'Chrome',
    style: {background: gradient(['#1a1a1a', '#050505'], 90), streets: '#8a8a8a', streetOpacity: 0.35, buildings: 'outline', track: gradient(p('chrome'), 35),
      trackWidth: 12, trackEffect: 'emboss', effectDepth: 0.7, selection: gradient(p('gold'), 35), text: gradient(p('chrome'), 90), muted: '#9a9a9a', accent: '#d7dadc',
      fade: 0.45, titleFont: 'Space Grotesk', titleWeight: 600, titleSpacing: 0.2, bodyFont: 'Space Grotesk'}
  },
  {
    id: 'martini', name: 'Martini',
    style: {layout: 'data', background: '#ffffff', streets: '#1c2a5c', streetOpacity: 0.22, buildings: 'none', track: gradient(p('martini'), 90), trackWidth: 11,
      selection: '#e4002b', text: '#1c2a5c', muted: '#5a6a96', accent: '#e4002b', fade: 0.35,
      titleFont: 'Barlow Condensed', titleWeight: 600, titleSpacing: 0.06, bodyFont: 'Barlow Condensed'}
  },
  {
    id: 'pastel', name: 'Pastel', layers: {parks: true},
    style: {background: '#fdeef4', streets: '#7cc6b6', streetOpacity: 0.55, buildings: 'none', track: '#9b7fd1', trackCasing: '#ffffff', trackWidth: 10,
      water: '#cfe6ff', parks: '#d9f2e4', selection: '#f28fad', text: '#6d5a8a', muted: '#9a8ab3', accent: '#f28fad', fade: 0.2,
      titleFont: 'Space Grotesk', titleWeight: 600, titleSpacing: 0.12, bodyFont: 'Space Grotesk'}
  },
  {
    id: 'skyline', name: 'Skyline', layers: {landmarks: true},
    style: {background: gradient(['#0b1020', '#1d2748'], 90), streets: '#7083a8', streetOpacity: 0.45, buildings: 'fill', buildingColor: '#eef2fb',
      buildings3d: true, tilt: 0.6, lightAngle: 300, track: '#ff3b6b', trackWidth: 8, glow: '#ff3b6b', glowStrength: 0.4, selection: '#ffcc4d',
      text: '#ffffff', muted: '#a9b8d8', accent: '#ff3b6b', fade: 0.1, titleFont: 'Space Grotesk', titleWeight: 600, titleSpacing: 0.18, bodyFont: 'Space Grotesk'}
  },
  {
    id: 'clay', name: 'Clay model', layers: {parks: true},
    style: {background: '#f1ede6', streets: '#d6cfc2', streetOpacity: 1, streetWidth: 1.6, buildings: 'fill', buildingColor: '#fdfbf7', buildings3d: true,
      tilt: 0.5, lightAngle: 320, water: '#c9d6dc', parks: '#e2e7d6', track: '#e4572e', trackWidth: 9, selection: '#e4572e',
      text: '#3b3631', muted: '#8a8177', accent: '#e4572e', fade: 0, titleFont: 'Playfair Display', titleWeight: 700, titleSpacing: 0.06, bodyFont: 'Barlow'}
  },
  {
    id: 'neon-city', name: 'Neon City',
    style: {background: '#05010d', streets: '#ff2bd6', streetOpacity: 0.35, buildings: 'fill', buildingColor: '#1a1036', buildingEdge: '#00e5ff',
      buildings3d: true, tilt: 0.65, lightAngle: 45, track: '#00e5ff', trackCore: '#e6fdff', glow: '#00e5ff', glowStrength: 0.7, trackWidth: 7,
      selection: '#00e5ff', text: gradient(['#00e5ff', '#ff2bd6'], 0), muted: '#a58ad6', accent: '#ff2bd6', fade: 0.15,
      titleFont: 'Orbitron', titleWeight: 700, titleSpacing: 0.14, bodyFont: 'Space Grotesk'}
  },
];

export const layouts = [
  {id: 'minimal', name: 'Minimal'},
  {id: 'inset', name: 'Framed'},
  {id: 'data', name: 'Stats'},
  {id: 'fullbleed', name: 'Full bleed'},
];

export function getPreset(id) {
  return presets.find(x => x.id === id) || presets[0];
}

/**
 * The complete style of a preset (BASE plus its overrides), as a fresh copy.
 */
export function presetStyle(id) {
  return JSON.parse(JSON.stringify({...BASE, ...getPreset(id).style}));
}
