<template>
<button type='button' class='toggle' role='switch' :aria-checked='modelValue' :aria-label='label' :disabled='disabled'
  @click='$emit("update:modelValue", !modelValue)'>
  <span class='knob'></span>
</button>
</template>

<script>
export default {
  name: 'Toggle',
  props: {
    modelValue: {type: Boolean, default: false},
    label: {type: String, default: ''},
    disabled: {type: Boolean, default: false}
  },
  emits: ['update:modelValue']
}
</script>

<style lang='stylus' scoped>
.toggle {
  width: 42px;
  height: 26px;
  border-radius: 13px;
  border: 0;
  padding: 0;
  background: var(--line);
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.2s;
  &[aria-checked=true] {
    background: var(--ink);
  }
  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
  &:focus-visible {
    outline: 2px solid var(--brand);
    outline-offset: 2px;
  }
}

.knob {
  position: absolute;
  left: 3px;
  top: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: transform 0.22s cubic-bezier(0.3, 1.4, 0.6, 1);
}

.toggle[aria-checked=true] .knob {
  transform: translateX(16px);
}
</style>
