<template>
<div class='export-bar'>
  <div class='formats' role='group' aria-label='File format'>
    <button v-for='f in formats' :key='f.id' :class='{active: editor.format === f.id}' @click='editor.format = f.id' :title='f.title'>{{f.name}}</button>
  </div>
  <button class='download' @click='editor.download()' :disabled='editor.exporting || !editor.track'>
    {{editor.exporting ? 'Preparing…' : 'Download ' + currentName}}
  </button>
  <p class='hint'>
    {{editor.output.width}} × {{editor.output.height}} px<span v-if='editor.border.style !== "none"'>, {{editor.border.style}} border included</span>.
    <span v-if='editor.format === "svg"'>Vector: scales to any size, fonts embedded.</span>
    <span v-else-if='editor.format === "jpeg"'>Smaller file, no transparency.</span>
    <span v-if='!hasAvif'>HEIF/AVIF can't be created in this browser; PNG keeps full quality.</span>
  </p>
  <p class='hint error-text' v-if='editor.exportError' role='alert'>{{editor.exportError}}</p>
</div>
</template>

<script>
import {getSupportedFormats} from '../../lib/artwork.js';

export default {
  name: 'ExportBar',
  inject: ['editor'],
  data() {
    let raster = getSupportedFormats();
    return {
      formats: raster.map(f => ({id: f.id, name: f.name, title: f.mime}))
        .concat({id: 'svg', name: 'SVG', title: 'Vector image'}),
      hasAvif: raster.some(f => f.id === 'avif')
    };
  },
  computed: {
    currentName() {
      let f = this.formats.find(x => x.id === this.editor.format);
      return f ? f.name : '';
    }
  }
}
</script>
