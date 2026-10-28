<template>
<div class='export-sheet' role='dialog' aria-label='Download'>
  <header>
    <h2>Download</h2>
    <button type='button' class='icon-button' @click='$emit("close")' aria-label='Close'><icon name='close'></icon></button>
  </header>
  <chips v-model='studio.format' :options='formats' fill label='File format'></chips>
  <scrubber v-if='lossy' v-model='studio.quality' label='Quality' :min='0.5' :max='1' :step='0.01' unit='percent'></scrubber>
  <div class='row-between' v-if='studio.border.style !== "none"'>
    <span>Include the {{studio.border.style}} border</span>
    <toggle v-model='studio.includeBorder' label='Include border'></toggle>
  </div>
  <dl class='summary'>
    <dt>Size</dt>
    <dd>{{output.name}}</dd>
    <dt>Pixels</dt>
    <dd>{{output.width}} × {{output.height}}<span v-if='output.dpi'> at {{output.dpi}} dpi</span></dd>
    <dt>Format</dt>
    <dd>{{formatNote}}</dd>
  </dl>
  <button type='button' class='primary' @click='studio.download()' :disabled='studio.exporting || !studio.trackLoaded'>
    <icon name='download' :size='18'></icon>
    {{studio.exporting ? 'Preparing…' : 'Download ' + currentName}}
  </button>
  <p class='hint error-text' v-if='studio.exportError' role='alert'>{{studio.exportError}}</p>
  <p class='hint' v-if='!hasAvif'>HEIC/HEIF can't be created by browsers; AVIF isn't available in this one. PNG keeps full quality.</p>
</div>
</template>

<script>
import {getSupportedFormats} from '../../lib/artwork.js';
import Chips from '../components/Chips.vue';
import Scrubber from '../components/Scrubber.vue';
import Toggle from '../components/Toggle.vue';
import Icon from '../components/Icon.vue';

export default {
  name: 'ExportSheet',
  components: {Chips, Scrubber, Toggle, Icon},
  inject: ['studio'],
  emits: ['close'],
  data() {
    let raster = getSupportedFormats();
    return {
      formats: raster.map(f => ({id: f.id, name: f.name})).concat({id: 'svg', name: 'SVG'}),
      hasAvif: raster.some(f => f.id === 'avif')
    };
  },
  computed: {
    output() {
      return this.studio.output;
    },
    lossy() {
      return ['jpeg', 'webp', 'avif'].includes(this.studio.format);
    },
    currentName() {
      let f = this.formats.find(x => x.id === this.studio.format);
      return f ? f.name : '';
    },
    formatNote() {
      return {
        png: 'PNG: lossless, best for printing',
        jpeg: 'JPEG: small file, no transparency',
        webp: 'WebP: small file, sharp',
        avif: 'AVIF: smallest file',
        svg: 'SVG: vector, any size, fonts embedded'
      }[this.studio.format];
    }
  }
}
</script>

<style lang='stylus' scoped>
.export-sheet {
  position: absolute;
  top: 64px;
  right: 16px;
  width: 340px;
  max-width: calc(100% - 32px);
  background: white;
  border-radius: 20px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05);
  padding: 16px 18px 18px;
  z-index: 20;
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    h2 {
      margin: 0;
      font-size: 18px;
    }
  }
}

.summary {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 12px;
  font-size: 13px;
  margin: 12px 0;
  dt {
    color: var(--muted-ink);
  }
  dd {
    margin: 0;
    font-variant-numeric: tabular-nums;
  }
}

.primary {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 14px;
  background: var(--brand);
  color: white;
  font: inherit;
  font-size: 16px;
  font-weight: 600;
  padding: 13px;
  cursor: pointer;
  transition: transform 0.12s, filter 0.15s;
  &:hover {
    filter: brightness(1.08);
  }
  &:active {
    transform: scale(0.98);
  }
  &:disabled {
    opacity: 0.55;
    cursor: default;
  }
}
</style>
