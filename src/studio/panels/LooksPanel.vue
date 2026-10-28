<template>
<div class='looks'>
  <div class='looks-actions'>
    <button type='button' class='pill' @click='studio.surprise()'><icon name='shuffle' :size='16'></icon> Surprise me</button>
    <button type='button' class='pill ghost' @click='studio.startOver()'><icon name='reset' :size='16'></icon> Start over</button>
  </div>
  <div class='grid'>
    <button v-for='p in presets' :key='p.id' type='button' class='look' :class='{active: p.id === studio.presetId}'
      @click='studio.applyPreset(p.id)' :aria-pressed='p.id === studio.presetId'>
      <span class='thumb' :style='{aspectRatio: aspect}'>
        <canvas :ref='el => setCanvas(p.id, el)' aria-hidden='true'></canvas>
      </span>
      <span class='look-name'>{{p.name}}</span>
    </button>
  </div>
  <p class='hint'>Every look is a starting point: change any colour, effect or layer afterwards.</p>
</div>
</template>

<script>
import {presets} from '../lib/presets.js';
import Icon from '../components/Icon.vue';

const THUMB_WIDTH = 150;

/**
 * Looks, previewed on the poster being edited. Thumbnails are drawn one at a
 * time between frames, so opening the panel never freezes the page.
 */
export default {
  name: 'LooksPanel',
  components: {Icon},
  inject: ['studio'],
  data() {
    return {presets};
  },
  computed: {
    aspect() {
      let o = this.studio.output;
      return `${o.width} / ${o.height}`;
    },
    // Thumbnails depend on the subject, the map data and the poster shape.
    thumbKey() {
      let s = this.studio;
      return [s.trackLoaded, s.streetsLoaded, s.output.aspect.toFixed(3), s.style.layout === 'fullbleed', s.layers.streets].join('|');
    }
  },
  watch: {
    thumbKey() {
      this.queueAll();
    }
  },
  created() {
    this.canvases = new Map();
  },
  mounted() {
    this.queueAll();
  },
  beforeUnmount() {
    clearTimeout(this.timer);
  },
  methods: {
    setCanvas(id, el) {
      if (el) this.canvases.set(id, el);
    },
    queueAll() {
      clearTimeout(this.timer);
      this.queue = presets.map(p => p.id);
      this.next();
    },
    next() {
      let id = this.queue.shift();
      if (!id) return;
      let canvas = this.canvases.get(id);
      if (canvas) {
        let dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(THUMB_WIDTH * dpr);
        canvas.height = Math.round(THUMB_WIDTH * dpr * this.studio.output.aspect);
        if (!this.studio.renderThumbnail(canvas, id)) return;
      }
      this.timer = setTimeout(this.next, 16);
    }
  }
}
</script>

<style lang='stylus' scoped>
.looks-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
  gap: 12px 10px;
}

.look {
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: stretch;
  font: inherit;
  color: var(--ink);
  &:hover .thumb {
    transform: translateY(-3px);
    box-shadow: 0 10px 22px rgba(0, 0, 0, 0.18);
  }
  &.active .thumb {
    box-shadow: 0 0 0 2px white, 0 0 0 4.5px var(--ink);
  }
}

.thumb {
  display: block;
  border-radius: 8px;
  overflow: hidden;
  background: var(--soft);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  transition: transform 0.2s cubic-bezier(0.3, 1.3, 0.6, 1), box-shadow 0.2s;
  max-height: 190px;
  canvas {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.look-name {
  font-size: 12.5px;
  text-align: center;
}
</style>
