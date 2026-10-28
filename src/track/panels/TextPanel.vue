<template>
<details class='panel'>
  <summary>Text</summary>
  <label class='field'>
    <span>Title</span>
    <input type='text' v-model='text.title'>
  </label>
  <label class='check'><input type='checkbox' v-model='editor.options.uppercase'> Uppercase title</label>
  <label class='field' v-if='layout !== "wallpaper"'>
    <span>Subtitle</span>
    <input type='text' v-model='text.subtitle'>
  </label>
  <label class='field' v-if='layout === "minimal" || layout === "wallpaper"'>
    <span>Tagline</span>
    <input type='text' v-model='text.tagline' @input='editor.taglineEdited = true'>
  </label>
  <label class='field' v-if='layout === "inset"'>
    <span>Coordinates</span>
    <input type='text' v-model='text.coords'>
  </label>
  <template v-if='layout === "wallpaper"'>
    <div class='label'>Label</div>
    <div class='segmented'>
      <button v-for='p in labelPositions' :key='p.id' :class='{active: editor.options.wallpaperLabel === p.id}' @click='editor.options.wallpaperLabel = p.id'>{{p.name}}</button>
    </div>
  </template>
  <div class='stats' v-else>
    <div class='label'>Stats <small>(empty values are hidden)</small></div>
    <div v-for='(stat, i) in text.stats' :key='i' class='stat-row'>
      <input type='text' v-model='stat.label' placeholder='Label' aria-label='Stat label'>
      <input type='text' v-model='stat.value' placeholder='Value' aria-label='Stat value'>
      <button class='icon-button' @click='text.stats.splice(i, 1)' aria-label='Remove stat'>×</button>
    </div>
    <button class='link-button' v-if='text.stats.length < 5' @click='text.stats.push({label: "", value: ""})'>+ Add stat</button>
  </div>
</details>
</template>

<script>
export default {
  name: 'TextPanel',
  inject: ['editor'],
  data() {
    return {
      labelPositions: [{id: 'none', name: 'None'}, {id: 'bottom', name: 'Bottom'}, {id: 'corner', name: 'Corner'}]
    };
  },
  computed: {
    text() {
      return this.editor.text;
    },
    layout() {
      return this.editor.style.layout;
    }
  }
}
</script>
