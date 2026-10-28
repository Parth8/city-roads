<template>
<label class='color-picker' :title='title'>
  <input type='color' :value='hex' @input='onColor($event.target.value)' :aria-label='title'>
  <input type='range' min='0' max='1' step='0.01' :value='alpha' @input='onAlpha($event.target.value)' aria-label='Opacity' class='alpha'>
</label>
</template>

<script>
import tinycolor from 'tinycolor2';

/**
 * Colour with opacity, built on the browser's own colour input.
 * v-model is an {r, g, b, a} object; `change` fires with the same object.
 */
export default {
  name: 'ColorPicker',
  props: {
    modelValue: {type: Object},
    title: {type: String, default: 'Colour'}
  },
  emits: ['update:modelValue', 'change'],
  computed: {
    color() {
      return tinycolor(this.modelValue || '#ffffff');
    },
    hex() {
      return this.color.toHexString();
    },
    alpha() {
      return this.color.getAlpha();
    }
  },
  methods: {
    onColor(hex) {
      let rgba = tinycolor(hex).setAlpha(this.alpha).toRgb();
      this.emit(rgba);
    },
    onAlpha(alpha) {
      this.emit(this.color.clone().setAlpha(Number(alpha)).toRgb());
    },
    emit(rgba) {
      this.$emit('update:modelValue', rgba);
      this.$emit('change', rgba);
    }
  }
}
</script>

<style lang="stylus" scoped>
.color-picker {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  cursor: pointer;
  input[type=color] {
    width: 34px;
    height: 26px;
    padding: 0;
    border: 1px solid #ccc;
    border-radius: 6px;
    background: none;
    cursor: pointer;
  }
  .alpha {
    width: 48px;
    height: 12px;
  }
}
</style>
