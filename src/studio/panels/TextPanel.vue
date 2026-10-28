<template>
<div>
  <label class='field'>
    <span>Title</span>
    <input type='text' v-model='text.title'>
  </label>
  <label class='field'>
    <span>Subtitle</span>
    <input type='text' v-model='text.subtitle'>
  </label>
  <label class='field'>
    <span>Tagline</span>
    <input type='text' v-model='text.tagline' @input='studio.taglineEdited = true'>
  </label>
  <label class='field'>
    <span>Coordinates <small>(framed layout)</small></span>
    <input type='text' v-model='text.coords'>
  </label>

  <div class='label'>Title font</div>
  <div class='fonts'>
    <button v-for='f in titleFonts' :key='f.family' type='button' class='font' :class='{active: style.titleFont === f.family}'
      :style='{fontFamily: `"${f.family}", sans-serif`, fontWeight: f.weight}' @click='setFont(f)'>
      {{sample}}
    </button>
  </div>
  <div class='row-between'>
    <span>Uppercase title</span>
    <toggle v-model='studio.uppercase' label='Uppercase title'></toggle>
  </div>
  <scrubber v-model='style.titleSpacing' label='Letter spacing' :min='-0.05' :max='0.5' :step='0.01'></scrubber>

  <template v-if='studio.isTrack'>
    <div class='label'>Stats <small>(shown in the Stats layout; empty values are hidden)</small></div>
    <div v-for='(stat, i) in text.stats' :key='i' class='stat-row'>
      <input type='text' v-model='stat.label' placeholder='Label' aria-label='Stat label'>
      <input type='text' v-model='stat.value' placeholder='Value' aria-label='Stat value'>
      <button type='button' class='icon-button' @click='text.stats.splice(i, 1)' aria-label='Remove stat'><icon name='close' :size='16'></icon></button>
    </div>
    <button type='button' class='pill ghost' v-if='text.stats.length < 5' @click='text.stats.push({label: "", value: ""})'>
      <icon name='plus' :size='16'></icon> Add stat
    </button>
  </template>
  <p class='hint'>Hide any text in Layers.</p>
</div>
</template>

<script>
import {titleFonts} from '../lib/fonts.js';
import Toggle from '../components/Toggle.vue';
import Scrubber from '../components/Scrubber.vue';
import Icon from '../components/Icon.vue';

export default {
  name: 'TextPanel',
  components: {Toggle, Scrubber, Icon},
  inject: ['studio'],
  data() {
    return {titleFonts};
  },
  computed: {
    text() {
      return this.studio.text;
    },
    style() {
      return this.studio.style;
    },
    sample() {
      let title = (this.text.title || 'Monaco').slice(0, 12);
      return this.studio.uppercase ? title.toUpperCase() : title;
    }
  },
  methods: {
    setFont(f) {
      this.style.titleFont = f.family;
      this.style.titleWeight = f.weight;
    }
  }
}
</script>

<style lang='stylus' scoped>
.fonts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin: 6px 0 10px;
}

.font {
  border: 1px solid var(--line);
  border-radius: 10px;
  background: white;
  padding: 10px 8px;
  font-size: 16px;
  color: var(--ink);
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: border-color 0.15s, transform 0.12s;
  &:hover {
    border-color: var(--ink);
  }
  &.active {
    background: var(--ink);
    color: white;
    border-color: var(--ink);
  }
}

.stat-row {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
  input {
    min-width: 0;
    flex: 1;
    font: inherit;
    font-size: 14px;
    padding: 8px 10px;
    border: 1px solid var(--line);
    border-radius: 10px;
  }
}
</style>
