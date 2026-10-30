<template>
<svg class='icon' :width='size' :height='size' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8'
  stroke-linecap='round' stroke-linejoin='round' aria-hidden='true' v-html='path'></svg>
</template>

<script>
// Simple line icons (24x24). Paths are static strings defined here, never user input.
const ICONS = {
  looks: '<path d="M12 3l1.8 4.6L18 9.4l-4.2 1.8L12 16l-1.8-4.8L6 9.4l4.2-1.8z"/><path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9z"/><path d="M5 15l.6 1.4L7 17l-1.4.6L5 19l-.6-1.4L3 17l1.4-.6z"/>',
  view: '<path d="M3 20l5-9 4 5 3-4 6 8z"/><path d="M8 11V5M8 5h4l-1 2h-3"/>',
  size: '<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/><path d="M3 17.5l9 5 9-5" opacity=".5"/>',
  colours: '<circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="9" r="1.4" fill="currentColor"/><circle cx="13" cy="7.5" r="1.4" fill="currentColor"/><circle cx="16.5" cy="11" r="1.4" fill="currentColor"/><path d="M12 21c-1.5 0-2-1.2-1.5-2.3.6-1.2-.3-2.7-1.8-2.7H7"/>',
  effects: '<path d="M4 20L15 9"/><path d="M15 9l2-2 2 2-2 2z"/><path d="M8 3v3M6.5 4.5h3M19 14v3M17.5 15.5h3M13 2.5v2M12 3.5h2"/>',
  text: '<path d="M5 6V4h14v2"/><path d="M12 4v16"/><path d="M9 20h6"/>',
  select: '<path d="M5 3l14 7-6 2-2 6z"/><path d="M13 12l5 5"/>',
  hand: '<path d="M8 11V5.5a1.5 1.5 0 0 1 3 0V10"/><path d="M11 10V4.5a1.5 1.5 0 0 1 3 0V10"/><path d="M14 10V6.5a1.5 1.5 0 0 1 3 0V13"/><path d="M8 11V9.5a1.5 1.5 0 0 0-3 0V14a7 7 0 0 0 7 7h1a6 6 0 0 0 4-1.6"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
  download: '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  shuffle: '<path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/>',
  portrait: '<rect x="7" y="3" width="10" height="18" rx="2"/>',
  landscape: '<rect x="3" y="7" width="18" height="10" rx="2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  swap: '<path d="M7 4L3 8l4 4"/><path d="M3 8h14"/><path d="M17 20l4-4-4-4"/><path d="M21 16H7"/>',
  reset: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  track: '<path d="M4 15c0-4 3-9 8-9 3 0 5 2 5 4s-2 3-4 3-3 2-1 4 6 1 7-2"/>',
  pin: '<path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
};

export default {
  name: 'Icon',
  props: {
    name: {type: String, required: true},
    size: {type: [Number, String], default: 20}
  },
  computed: {
    path() {
      return ICONS[this.name] || '';
    }
  }
}
</script>

<style scoped>
.icon {
  flex-shrink: 0;
  display: block;
}
</style>
