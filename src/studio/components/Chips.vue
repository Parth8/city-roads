<template>
<div class='chips' :class='{wrap, fill}' role='radiogroup' :aria-label='label'>
  <button v-for='o in options' :key='o.id' type='button' role='radio' :aria-checked='o.id === modelValue'
    :class='{chip: true, active: o.id === modelValue}' :title='o.title || o.name' @click='$emit("update:modelValue", o.id)'>
    <slot name='option' :option='o'>{{o.name}}</slot>
  </button>
</div>
</template>

<script>
/**
 * A row of choices; one is active. Scrolls sideways when it does not fit,
 * unless `wrap` is set.
 */
export default {
  name: 'Chips',
  props: {
    modelValue: {type: [String, Number, Boolean], default: null},
    options: {type: Array, required: true},
    label: {type: String, default: ''},
    wrap: {type: Boolean, default: false},
    fill: {type: Boolean, default: false}
  },
  emits: ['update:modelValue']
}
</script>

<style lang='stylus' scoped>
.chips {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  margin: 8px -2px;
  padding: 2px;
  &::-webkit-scrollbar {
    display: none;
  }
  &.wrap {
    flex-wrap: wrap;
    overflow: visible;
  }
  &.fill .chip {
    flex: 1;
  }
}

.chip {
  border: 1px solid var(--line);
  background: white;
  color: var(--ink);
  border-radius: 999px;
  padding: 7px 13px;
  font: inherit;
  font-size: 13.5px;
  white-space: nowrap;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: background 0.18s, color 0.18s, border-color 0.18s, transform 0.12s;
  &:hover {
    border-color: var(--ink);
  }
  &:active {
    transform: scale(0.96);
  }
  &.active {
    background: var(--ink);
    border-color: var(--ink);
    color: white;
  }
  &:focus-visible {
    outline: 2px solid var(--brand);
    outline-offset: 1px;
  }
}
</style>
