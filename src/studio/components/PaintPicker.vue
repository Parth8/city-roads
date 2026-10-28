<template>
<div class='paint-picker' :class='{open}'>
  <button type='button' class='row' @click='open = !open' :aria-expanded='open'>
    <span class='name'>{{label}}</span>
    <span class='swatch' :style='{background: css}' :class='{none: modelValue === null}'></span>
  </button>
  <transition name='expand'>
    <div v-if='open' class='editor'>
      <div class='modes'>
        <button v-if='allowNone' type='button' :class='{active: mode === "none"}' @click='setNone'>None</button>
        <button type='button' :class='{active: mode === "solid"}' @click='setSolid'>Solid</button>
        <button v-if='allowGradient' type='button' :class='{active: mode === "gradient"}' @click='setGradient'>Gradient</button>
      </div>

      <template v-if='mode === "solid"'>
        <div class='swatches'>
          <button v-for='c in suggestions' :key='c' type='button' class='dot' :style='{background: c}' :title='c'
            :class='{active: c === modelValue}' @click='emit(c)'></button>
          <label class='dot custom' title='Any colour'>
            <input type='color' :value='hex' @input='emit($event.target.value)'>
          </label>
        </div>
      </template>

      <template v-if='mode === "gradient"'>
        <div class='palettes'>
          <button v-for='p in palettes' :key='p.id' type='button' class='palette' :title='p.name'
            :style='{background: paletteCss(p)}' @click='applyPalette(p)'></button>
        </div>
        <div class='gradient-edit'>
          <div class='stops'>
            <label v-for='(stop, i) in modelValue.stops' :key='i' class='dot custom stop' :style='{background: stop}'>
              <input type='color' :value='stop' @input='setStop(i, $event.target.value)' :aria-label='"Colour " + (i + 1)'>
            </label>
            <button v-if='modelValue.stops.length < 6' type='button' class='dot add' @click='addStop' aria-label='Add colour'>+</button>
            <button v-if='modelValue.stops.length > 2' type='button' class='dot add' @click='removeStop' aria-label='Remove last colour'>−</button>
          </div>
          <dial :model-value='modelValue.angle || 0' @update:model-value='setAngle' label='Gradient angle' :size='40'></dial>
        </div>
      </template>
    </div>
  </transition>
</div>
</template>

<script>
import tinycolor from 'tinycolor2';
import {gradientPalettes, isGradient, toCss, mainColor} from '../lib/paint.js';
import Dial from './Dial.vue';

const SUGGESTIONS = ['#ffffff', '#f4efe6', '#c9c9c9', '#6b6b6b', '#2d2d2d', '#0a0a0a', '#e10600', '#ff2a6d', '#f37021',
  '#ffd319', '#ccff00', '#00d26a', '#2de2e6', '#0a84ff', '#1c2a5c', '#9b7fd1'];

/**
 * Colour or gradient for one part of the poster. Collapsed it is a labelled
 * swatch; tapping it opens quick colours, any colour, and gradients.
 */
export default {
  name: 'PaintPicker',
  components: {Dial},
  props: {
    modelValue: {type: [String, Object], default: null},
    label: {type: String, required: true},
    allowGradient: {type: Boolean, default: true},
    allowNone: {type: Boolean, default: false}
  },
  emits: ['update:modelValue'],
  data() {
    return {open: false, palettes: gradientPalettes, suggestions: SUGGESTIONS};
  },
  computed: {
    mode() {
      if (this.modelValue === null) return 'none';
      return isGradient(this.modelValue) ? 'gradient' : 'solid';
    },
    css() {
      return this.modelValue === null ? 'transparent' : toCss(this.modelValue);
    },
    hex() {
      return tinycolor(mainColor(this.modelValue || '#000000')).toHexString();
    }
  },
  methods: {
    emit(value) {
      this.$emit('update:modelValue', value);
    },
    setNone() {
      this.emit(null);
    },
    setSolid() {
      if (this.mode !== 'solid') this.emit(this.hex);
    },
    setGradient() {
      if (this.mode === 'gradient') return;
      let base = tinycolor(this.hex);
      this.emit({stops: [base.toHexString(), base.clone().spin(60).saturate(20).toHexString()], angle: 45});
    },
    paletteCss(p) {
      return toCss({stops: p.stops, angle: 0});
    },
    applyPalette(p) {
      this.emit({stops: p.stops.slice(), angle: isGradient(this.modelValue) ? this.modelValue.angle : 45});
    },
    setStop(i, color) {
      let stops = this.modelValue.stops.slice();
      stops[i] = color;
      this.emit({...this.modelValue, stops});
    },
    addStop() {
      let stops = this.modelValue.stops.slice();
      stops.push(tinycolor(stops[stops.length - 1]).spin(40).toHexString());
      this.emit({...this.modelValue, stops});
    },
    removeStop() {
      this.emit({...this.modelValue, stops: this.modelValue.stops.slice(0, -1)});
    },
    setAngle(angle) {
      this.emit({...this.modelValue, angle});
    }
  }
}
</script>

<style lang='stylus' scoped>
.paint-picker {
  border-radius: 12px;
  transition: background 0.2s;
  &.open {
    background: var(--soft);
  }
}

.row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 0;
  background: transparent;
  font: inherit;
  font-size: 14px;
  color: var(--ink);
  padding: 8px 10px;
  cursor: pointer;
  border-radius: 12px;
  &:hover {
    background: var(--soft);
  }
}

.swatch {
  width: 64px;
  height: 26px;
  border-radius: 8px;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.12) inset;
  &.none {
    background: repeating-linear-gradient(45deg, #fff 0 5px, #e8e4dd 5px 10px) !important;
  }
}

.editor {
  padding: 2px 10px 12px;
}

.modes {
  display: flex;
  gap: 4px;
  margin-bottom: 10px;
  button {
    flex: 1;
    border: 0;
    border-radius: 8px;
    padding: 6px;
    font: inherit;
    font-size: 13px;
    background: white;
    cursor: pointer;
    color: var(--ink);
    &.active {
      background: var(--ink);
      color: white;
    }
  }
}

.swatches, .stops {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dot {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 0;
  padding: 0;
  cursor: pointer;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.15) inset;
  position: relative;
  overflow: hidden;
  transition: transform 0.15s;
  &:hover {
    transform: scale(1.1);
  }
  &.active {
    box-shadow: 0 0 0 2px white, 0 0 0 4px var(--ink);
  }
  &.custom {
    background: conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);
    input {
      position: absolute;
      inset: 0;
      opacity: 0;
      width: 100%;
      height: 100%;
      cursor: pointer;
    }
  }
  &.add {
    background: white;
    font-size: 18px;
    line-height: 30px;
    color: var(--ink);
  }
}

.palettes {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
  margin-bottom: 10px;
}

.palette {
  height: 26px;
  border-radius: 8px;
  border: 0;
  cursor: pointer;
  transition: transform 0.15s;
  &:hover {
    transform: scale(1.08);
  }
}

.gradient-edit {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.expand-enter-active, .expand-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.expand-enter-from, .expand-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
