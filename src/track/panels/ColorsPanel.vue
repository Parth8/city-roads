<template>
<details class='panel'>
  <summary>Colours</summary>
  <div class='colors'>
    <label v-for='c in fields' :key='c.key' class='color'>
      <input type='color' :value='style[c.key] || "#000000"' @input='style[c.key] = $event.target.value'>
      <span>{{c.name}}</span>
    </label>
  </div>
  <label class='check'><input type='checkbox' :checked='Boolean(style.background2)' @change='toggle("background2", $event.target.checked, darker(style.background))'> Gradient background</label>
  <label class='check'><input type='checkbox' :checked='Boolean(style.trackCasing)' @change='toggle("trackCasing", $event.target.checked, style.background)'> Outline around the track</label>
  <label class='check'><input type='checkbox' :checked='Boolean(style.glow)' @change='toggleGlow($event.target.checked)'> Neon glow</label>
  <label class='slider' v-if='style.glow'>
    <span>Glow strength <em>{{Math.round(style.glowStrength * 100)}}%</em></span>
    <input type='range' min='0.1' max='1' step='0.05' v-model.number='style.glowStrength'>
  </label>
  <label class='check' v-if='style.layout === "inset"'><input type='checkbox' :checked='Boolean(style.mapBackground)' @change='toggle("mapBackground", $event.target.checked, "#555555")'> Map panel colour</label>
  <label class='check' v-if='style.buildings !== "none"'><input type='checkbox' :checked='Boolean(style.buildingColor)' @change='toggle("buildingColor", $event.target.checked, style.streets)'> Separate building colour</label>
</details>
</template>

<script>
import tinycolor from 'tinycolor2';
import {getTheme} from '../lib/themes.js';

export default {
  name: 'ColorsPanel',
  inject: ['editor'],
  computed: {
    style() {
      return this.editor.style;
    },
    fields() {
      let s = this.style;
      let fields = [
        {key: 'track', name: 'Track'},
        {key: 'streets', name: 'Streets'},
        {key: 'background', name: s.background2 ? 'Background top' : 'Background'},
      ];
      if (s.background2) fields.push({key: 'background2', name: 'Background bottom'});
      if (s.trackCasing) fields.push({key: 'trackCasing', name: 'Track outline'});
      if (s.glow) fields.push({key: 'glow', name: 'Glow'});
      if (s.trackCore) fields.push({key: 'trackCore', name: 'Track core'});
      if (s.buildingColor) fields.push({key: 'buildingColor', name: 'Buildings'});
      if (s.mapBackground) fields.push({key: 'mapBackground', name: 'Map panel'});
      fields.push({key: 'text', name: 'Title'}, {key: 'muted', name: 'Small text'}, {key: 'accent', name: 'Accent'});
      return fields;
    }
  },
  methods: {
    toggle(key, on, fallback) {
      let theme = getTheme(this.editor.themeId);
      this.style[key] = on ? (theme[key] || toHex(fallback)) : null;
    },
    toggleGlow(on) {
      let theme = getTheme(this.editor.themeId);
      this.style.glow = on ? (theme.glow || this.style.track) : null;
      if (on && !this.style.glowStrength) this.style.glowStrength = 0.6;
      this.style.trackCore = on ? (theme.trackCore || toHex(tinycolor(this.style.track).lighten(30))) : null;
    },
    darker(color) {
      return tinycolor(color).darken(12);
    }
  }
}

function toHex(color) {
  return tinycolor(color).toHexString();
}
</script>
