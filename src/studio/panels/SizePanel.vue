<template>
<div>
  <chips v-model='settings.category' :options='categoryOptions' label='Kind of output'></chips>

  <div v-if='category.id !== "custom"' class='sizes'>
    <button v-for='s in category.sizes' :key='s.id' type='button' class='size' :class='{active: s.id === settings.size}' @click='pickSize(s.id)'>
      <span class='shape'><span :style='shapeStyle(s)'></span></span>
      <span class='size-text'>
        <span class='size-name'>{{s.name}}</span>
        <span class='size-dims'>{{dims(s)}}</span>
      </span>
    </button>
  </div>

  <div v-else class='custom'>
    <label class='field'>
      <span>Width</span>
      <input type='number' min='1' step='any' v-model.number='settings.custom.width'>
    </label>
    <button type='button' class='icon-button swap' @click='swap' aria-label='Swap width and height'><icon name='swap'></icon></button>
    <label class='field'>
      <span>Height</span>
      <input type='number' min='1' step='any' v-model.number='settings.custom.height'>
    </label>
    <label class='field unit'>
      <span>Unit</span>
      <select v-model='settings.custom.unit'>
        <option v-for='u in units' :key='u' :value='u'>{{u}}</option>
      </select>
    </label>
  </div>

  <div class='row-between'>
    <div class='orientation' role='radiogroup' aria-label='Orientation'>
      <button type='button' :class='{active: !output.landscape}' @click='setOrientation(false)' role='radio' :aria-checked='!output.landscape'>
        <icon name='portrait'></icon> Portrait
      </button>
      <button type='button' :class='{active: output.landscape}' @click='setOrientation(true)' role='radio' :aria-checked='output.landscape'>
        <icon name='landscape'></icon> Landscape
      </button>
    </div>
  </div>

  <template v-if='output.physicalSize'>
    <div class='label'>Resolution</div>
    <chips v-model='settings.dpi' :options='dpiOptions' fill label='Resolution'></chips>
  </template>
  <p class='hint'>
    {{output.width}} × {{output.height}} px<span v-if='output.dpi'> at {{output.dpi}} dpi</span>.
    <span v-if='output.reduced'>Lowered so that browsers can create the image; the SVG download keeps full detail.</span>
    Everything is drawn as vectors, so any size stays sharp.
  </p>

  <div class='label'>Layout</div>
  <chips v-model='studio.style.layout' :options='layouts' fill label='Layout'></chips>
  <template v-if='studio.style.layout === "fullbleed"'>
    <div class='label'>Title position</div>
    <chips v-model='studio.labelPosition' :options='labelPositions' fill label='Title position'></chips>
  </template>

  <div class='label'>Border</div>
  <chips v-model='border.style' :options='borderStyles' fill label='Border'></chips>
  <template v-if='border.style !== "none"'>
    <scrubber v-model='border.size' label='Thickness' :min='0.01' :max='0.15' :step='0.005' unit='percent'></scrubber>
    <paint-picker v-model='border.color' label='Border colour' :allow-gradient='false'></paint-picker>
    <template v-if='border.style === "polaroid"'>
      <label class='field'>
        <span>Caption, handwritten on the bottom</span>
        <input type='text' v-model='border.caption' :placeholder='studio.text.title'>
      </label>
      <paint-picker v-model='border.captionColor' label='Caption colour' :allow-gradient='false'></paint-picker>
    </template>
  </template>
</div>
</template>

<script>
import {categories, customUnits, getCategory} from '../lib/outputs.js';
import {layouts} from '../lib/presets.js';
import {borderStyles} from '../../lib/artwork.js';
import Chips from '../components/Chips.vue';
import Scrubber from '../components/Scrubber.vue';
import PaintPicker from '../components/PaintPicker.vue';
import Icon from '../components/Icon.vue';

export default {
  name: 'SizePanel',
  components: {Chips, Scrubber, PaintPicker, Icon},
  inject: ['studio'],
  data() {
    return {
      categoryOptions: categories.map(c => ({id: c.id, name: c.name})),
      units: customUnits,
      layouts,
      borderStyles,
      dpiOptions: [{id: 150, name: '150 dpi'}, {id: 300, name: '300 dpi'}, {id: 600, name: '600 dpi'}],
      labelPositions: [{id: 'corner', name: 'Corner'}, {id: 'bottom', name: 'Bottom'}, {id: 'top', name: 'Top'}]
    };
  },
  computed: {
    settings() {
      return this.studio.outputSettings;
    },
    output() {
      return this.studio.output;
    },
    category() {
      return getCategory(this.settings.category);
    },
    border() {
      return this.studio.border;
    }
  },
  watch: {
    'settings.category'() {
      let category = this.category;
      if (category.sizes.length && !category.sizes.some(s => s.id === this.settings.size)) {
        // Phones look best upright, monitors sideways; start each category the natural way round.
        this.settings.size = category.sizes[0].id;
        this.settings.flip = false;
      }
    }
  },
  methods: {
    pickSize(id) {
      this.settings.size = id;
    },
    dims(s) {
      if (this.category.unit === 'mm') return `${Math.round(s.width)} × ${Math.round(s.height)} mm`;
      return `${s.width} × ${s.height} px`;
    },
    shapeStyle(s) {
      let w = this.settings.flip ? s.height : s.width;
      let h = this.settings.flip ? s.width : s.height;
      let k = 26 / Math.max(w, h);
      return {width: w * k + 'px', height: h * k + 'px'};
    },
    setOrientation(landscape) {
      if (this.output.landscape === landscape) return;
      if (this.category.id === 'custom') this.swap();
      else this.settings.flip = !this.settings.flip;
    },
    swap() {
      let c = this.settings.custom;
      [c.width, c.height] = [c.height, c.width];
    }
  }
}
</script>

<style lang='stylus' scoped>
.sizes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 6px;
  max-height: 260px;
  overflow-y: auto;
  margin: 6px 0 10px;
  padding: 2px;
}

.size {
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: white;
  padding: 8px 10px;
  font: inherit;
  color: var(--ink);
  cursor: pointer;
  transition: border-color 0.15s, transform 0.12s;
  &:hover {
    border-color: var(--ink);
  }
  &:active {
    transform: scale(0.97);
  }
  &.active {
    border-color: var(--ink);
    box-shadow: 0 0 0 1px var(--ink);
  }
}

.shape {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  span {
    border: 1.5px solid currentColor;
    border-radius: 3px;
    transition: width 0.25s, height 0.25s;
  }
}

.size-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.size-name {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.size-dims {
  font-size: 11.5px;
  color: var(--muted-ink);
  font-variant-numeric: tabular-nums;
}

.custom {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  .unit {
    flex: 0 0 76px;
  }
  .swap {
    margin-bottom: 6px;
  }
}

.orientation {
  display: flex;
  gap: 6px;
  width: 100%;
  margin: 6px 0;
  button {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: white;
    padding: 9px;
    font: inherit;
    font-size: 14px;
    cursor: pointer;
    color: var(--ink);
    transition: background 0.15s, color 0.15s;
    &.active {
      background: var(--ink);
      border-color: var(--ink);
      color: white;
    }
  }
}
</style>
