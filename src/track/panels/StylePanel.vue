<template>
<details class='panel' open>
  <summary>Style</summary>
  <div class='themes'>
    <button v-for='t in themes' :key='t.id' :class='{theme: true, active: t.id === editor.themeId}' @click='editor.applyTheme(t.id)' :aria-pressed='t.id === editor.themeId'>
      <span class='swatch' :style='swatchStyle(t)'>
        <span class='swatch-track' :style='trackStyle(t)'></span>
      </span>
      <span class='theme-name'>{{t.name}}</span>
    </button>
  </div>
  <div class='label'>Layout</div>
  <div class='segmented'>
    <button v-for='l in layouts' :key='l.id' :class='{active: editor.style.layout === l.id}' @click='editor.style.layout = l.id'>{{l.name}}</button>
  </div>
</details>
</template>

<script>
import {themes, layouts} from '../lib/themes.js';

export default {
  name: 'StylePanel',
  inject: ['editor'],
  data() {
    return {themes, layouts};
  },
  methods: {
    swatchStyle(t) {
      let background = t.background2 ? `linear-gradient(${t.background}, ${t.background2})` : (t.mapBackground || t.background);
      return {background, borderColor: t.background};
    },
    trackStyle(t) {
      return {
        background: t.track,
        boxShadow: t.glow ? `0 0 10px 2px ${t.glow}` : 'none'
      };
    }
  }
}
</script>
