<template>
<div class='scrubber' :class='{active: dragging, editing}' role='slider' tabindex='0'
  :aria-label='label' :aria-valuemin='min' :aria-valuemax='max' :aria-valuenow='modelValue' :aria-valuetext='display'
  @pointerdown='onDown' @pointermove='onMove' @pointerup='onUp' @pointercancel='onUp' @keydown='onKey'>
  <div class='fill' :style='{width: percent + "%"}'></div>
  <span class='scrub-label'>{{label}}</span>
  <input v-if='editing' ref='input' class='value-input' type='number' :min='min' :max='max' :step='step'
    :value='rounded' @keydown.enter.prevent='commit' @keydown.esc.prevent='editing = false' @blur='commit' @pointerdown.stop>
  <span v-else class='value'>{{display}}</span>
</div>
</template>

<script>
/**
 * A pill you drag sideways to change a number, like the controls in photo
 * editors. Dragging is relative (nothing jumps when you touch it), a tap lets
 * you type an exact value, arrow keys nudge it. Vertical swipes still scroll
 * the page on phones.
 */
export default {
  name: 'Scrubber',
  inject: {studio: {default: null}},
  props: {
    modelValue: {type: Number, required: true},
    label: {type: String, required: true},
    min: {type: Number, default: 0},
    max: {type: Number, default: 1},
    step: {type: Number, default: 0.01},
    // How to show the value: 'percent', 'degrees', or a suffix such as 'px'.
    unit: {type: String, default: ''},
    digits: {type: Number, default: null},
    // Equal drags multiply the value, for ranges like 1.5 m to 3 km.
    log: {type: Boolean, default: false}
  },
  emits: ['update:modelValue'],
  data() {
    return {dragging: false, editing: false};
  },
  computed: {
    percent() {
      return Math.max(0, Math.min(100, this.toT(this.modelValue) * 100));
    },
    rounded() {
      let digits = this.digits !== null ? this.digits : decimals(this.step);
      return Number(this.modelValue.toFixed(digits));
    },
    display() {
      if (this.unit === 'percent') return Math.round(this.modelValue * 100) + '%';
      if (this.unit === 'degrees') return Math.round(this.modelValue) + '°';
      return this.rounded + (this.unit ? ' ' + this.unit : '');
    }
  },
  methods: {
    onDown(e) {
      if (this.editing || e.button > 0) return;
      this.start = {x: e.clientX, y: e.clientY, value: this.modelValue, id: e.pointerId, moved: false, width: this.$el.clientWidth};
    },
    onMove(e) {
      let s = this.start;
      if (!s || s.id !== e.pointerId) return;
      let dx = e.clientX - s.x, dy = e.clientY - s.y;
      if (!s.moved) {
        if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
        // A mostly vertical swipe is a scroll, not an adjustment.
        if (Math.abs(dy) > Math.abs(dx)) {
          this.start = null;
          return;
        }
        s.moved = true;
        this.dragging = true;
        this.$el.setPointerCapture(e.pointerId);
        if (this.studio) this.studio.setInteracting(true);
      }
      let fine = e.shiftKey ? 0.2 : 1;
      this.set(this.fromT(this.toT(s.value) + dx / s.width * fine));
    },
    onUp(e) {
      let s = this.start;
      this.start = null;
      if (!s || s.id !== e.pointerId) return;
      if (this.dragging) {
        this.dragging = false;
        if (this.studio) this.studio.setInteracting(false);
      } else if (e.type === 'pointerup') {
        this.editing = true;
        this.$nextTick(() => this.$refs.input && this.$refs.input.select());
      }
    },
    onKey(e) {
      if (this.editing) return;
      let delta = {ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1}[e.key];
      if (delta) {
        e.preventDefault();
        if (this.log) this.set(this.modelValue * Math.pow(e.shiftKey ? 1.5 : 1.08, delta));
        else this.set(this.modelValue + delta * this.step * (e.shiftKey ? 10 : 1));
      } else if (e.key === 'Enter') {
        this.editing = true;
        this.$nextTick(() => this.$refs.input && this.$refs.input.select());
      }
    },
    commit() {
      if (!this.editing) return;
      let value = Number(this.$refs.input.value);
      if (Number.isFinite(value)) this.set(value);
      this.editing = false;
      this.$el.focus();
    },
    // Value <-> position along the pill, 0 to 1.
    toT(value) {
      if (this.log) return Math.log(Math.max(value, this.min) / this.min) / Math.log(this.max / this.min);
      return (value - this.min) / (this.max - this.min);
    },
    fromT(t) {
      if (this.log) return this.min * Math.pow(this.max / this.min, t);
      return this.min + t * (this.max - this.min);
    },
    set(value) {
      let snapped = Math.round(value / this.step) * this.step;
      let clamped = Math.max(this.min, Math.min(this.max, snapped));
      if (clamped !== this.modelValue) this.$emit('update:modelValue', Number(clamped.toFixed(6)));
    }
  }
}

function decimals(step) {
  let s = String(step);
  return s.includes('.') ? s.split('.')[1].length : 0;
}
</script>

<style lang='stylus' scoped>
.scrubber {
  position: relative;
  height: 40px;
  border-radius: 12px;
  background: var(--soft);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  margin: 8px 0;
  cursor: ew-resize;
  user-select: none;
  touch-action: pan-y;
  overflow: hidden;
  transition: box-shadow 0.2s, transform 0.15s;
  outline: none;
  &:hover, &:focus-visible {
    box-shadow: 0 0 0 1.5px var(--ink) inset;
  }
  &.active {
    transform: scale(1.015);
    box-shadow: 0 0 0 2px var(--ink) inset, 0 6px 18px rgba(0, 0, 0, 0.12);
  }
}

.fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: linear-gradient(90deg, var(--fill-from), var(--fill-to));
  border-radius: 12px 0 0 12px;
  transition: width 0.08s linear;
  pointer-events: none;
}

.scrub-label, .value {
  position: relative;
  font-size: 14px;
  pointer-events: none;
}

.scrub-label {
  color: var(--ink);
}

.value {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: var(--ink);
}

.value-input {
  position: relative;
  width: 80px;
  text-align: right;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  border: 0;
  border-radius: 6px;
  padding: 4px 6px;
  background: white;
}
</style>
