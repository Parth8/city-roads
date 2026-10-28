<template>
<div class='dial' role='slider' tabindex='0' :aria-label='label' aria-valuemin='-180' aria-valuemax='180' :aria-valuenow='Math.round(modelValue)'
  :title='label + ": " + Math.round(modelValue) + "° (double-click to reset)"' :style='{width: size + "px", height: size + "px"}'
  @pointerdown='onDown' @pointermove='onMove' @pointerup='onUp' @pointercancel='onUp' @dblclick='$emit("update:modelValue", 0)' @keydown='onKey'>
  <svg :viewBox='`0 0 ${size} ${size}`' :width='size' :height='size' aria-hidden='true'>
    <circle :cx='size / 2' :cy='size / 2' :r='size / 2 - 2' class='ring'></circle>
    <g :transform='`rotate(${modelValue} ${size / 2} ${size / 2})`'>
      <line :x1='size / 2' :y1='5' :x2='size / 2' :y2='size * 0.32' class='needle'></line>
    </g>
  </svg>
  <span class='degrees'>{{Math.round(modelValue)}}°</span>
</div>
</template>

<script>
/**
 * Turn it like a knob to rotate. Snaps to 0/±90/180 when close; double-click
 * resets; arrow keys nudge by 1° (10° with shift).
 */
export default {
  name: 'Dial',
  inject: {studio: {default: null}},
  props: {
    modelValue: {type: Number, required: true},
    label: {type: String, default: 'Rotation'},
    size: {type: Number, default: 46}
  },
  emits: ['update:modelValue'],
  methods: {
    angleOf(e) {
      let rect = this.$el.getBoundingClientRect();
      return Math.atan2(e.clientX - (rect.left + rect.width / 2), -(e.clientY - (rect.top + rect.height / 2))) * 180 / Math.PI;
    },
    onDown(e) {
      this.$el.setPointerCapture(e.pointerId);
      this.drag = {id: e.pointerId, last: this.angleOf(e), value: this.modelValue};
      if (this.studio) this.studio.setInteracting(true);
    },
    onMove(e) {
      if (!this.drag || this.drag.id !== e.pointerId) return;
      let angle = this.angleOf(e);
      let delta = angle - this.drag.last;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      this.drag.last = angle;
      this.drag.value += delta;
      this.emitValue(this.drag.value, true);
    },
    onUp(e) {
      if (!this.drag || this.drag.id !== e.pointerId) return;
      this.drag = null;
      if (this.studio) this.studio.setInteracting(false);
    },
    onKey(e) {
      let delta = {ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1}[e.key];
      if (!delta) return;
      e.preventDefault();
      this.emitValue(this.modelValue + delta * (e.shiftKey ? 10 : 1), false);
    },
    emitValue(value, snap) {
      let v = ((value + 180) % 360 + 360) % 360 - 180;
      if (snap) {
        for (let target of [-180, -90, 0, 90, 180]) {
          if (Math.abs(v - target) < 3) v = target;
        }
      }
      this.$emit('update:modelValue', Math.round(v * 10) / 10);
    }
  }
}
</script>

<style lang='stylus' scoped>
.dial {
  position: relative;
  border-radius: 50%;
  cursor: grab;
  touch-action: none;
  outline: none;
  flex-shrink: 0;
  &:active {
    cursor: grabbing;
  }
  &:focus-visible .ring {
    stroke: var(--ink);
  }
}

.ring {
  fill: var(--soft);
  stroke: var(--line);
  stroke-width: 1.5;
}

.needle {
  stroke: var(--brand);
  stroke-width: 3;
  stroke-linecap: round;
}

.degrees {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
  padding-top: 8px;
}
</style>
