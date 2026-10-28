<template>
<div class='poster-editor'>
  <aside class='sidebar'>
    <div class='sidebar-header'>
      <button class='link-button' @click='$emit("back")'>← All circuits</button>
      <h2>{{meta.name}}</h2>
      <div class='source'>
        {{meta.title}}, {{meta.country}}
        <span v-if='osmUrl'> · layout from <a :href='osmUrl' target='_blank' rel='noopener'>OpenStreetMap</a></span>
      </div>
    </div>

    <div class='panels'>
      <style-panel></style-panel>
      <size-panel></size-panel>
      <text-panel></text-panel>
      <map-panel></map-panel>
      <colors-panel></colors-panel>
    </div>

    <export-bar></export-bar>
  </aside>

  <main class='preview' ref='preview'>
    <div class='preview-toolbar'>
      <span class='output-label'>{{outputLabel}}</span>
      <label class='check'><input type='checkbox' v-model='showFrame'> Frame preview</label>
    </div>
    <div class='poster-holder' :class='{framed: showFrame, screen: output.kind === "screen"}' :style='holderStyle'>
      <canvas ref='canvas' class='poster-canvas' aria-label='Poster preview. Drag to move the map, scroll to zoom.'
        @pointerdown='onPointerDown' @pointermove='onPointerMove' @pointerup='onPointerUp' @pointercancel='onPointerUp'
        @wheel='onWheel'></canvas>
    </div>
    <div v-if='loadError' class='load-error' role='alert'>{{loadError}}</div>
  </main>
</div>
</template>

<script>
import {markRaw} from 'vue';
import {getTrackMeta, loadTrack, loadFlag} from './lib/catalog.js';
import {getTheme, loadFonts} from './lib/themes.js';
import {getOutput} from './lib/outputs.js';
import {prepareTrack, prepareSurroundings, bestRotation} from './lib/geometry.js';
import {loadSurroundings} from './lib/surroundings.js';
import {formatDMS, bboxCenter} from './lib/geo.js';
import renderPoster, {POSTER_WIDTH} from './lib/renderPoster.js';
import {posterToImage, posterToSvg} from './lib/exportPoster.js';
import {getFormat, downloadBlob} from '../lib/artwork.js';
import Progress from '../lib/Progress.js';
import urlState from './lib/urlState.js';
import StylePanel from './panels/StylePanel.vue';
import SizePanel from './panels/SizePanel.vue';
import TextPanel from './panels/TextPanel.vue';
import MapPanel from './panels/MapPanel.vue';
import ColorsPanel from './panels/ColorsPanel.vue';
import ExportBar from './panels/ExportBar.vue';

// Theme fields that the editor lets people change.
const STYLE_KEYS = ['layout', 'background', 'background2', 'mapBackground', 'streets', 'streetOpacity', 'buildings',
  'buildingColor', 'track', 'trackCasing', 'trackCore', 'trackWidth', 'glow', 'glowStrength', 'text', 'muted', 'accent', 'fade'];

/**
 * The poster editor. Panels get this component through inject('editor') and
 * change its state directly; every change redraws the preview.
 */
export default {
  name: 'PosterEditor',
  components: {StylePanel, SizePanel, TextPanel, MapPanel, ColorsPanel, ExportBar},
  provide() {
    return {editor: this};
  },
  props: {
    trackId: {type: String, required: true}
  },
  emits: ['back'],
  data() {
    let meta = getTrackMeta(this.trackId);
    let theme = getTheme(urlState.get('style'));
    let kind = urlState.get('screen') ? 'screen' : 'print';
    let style = pickStyle(theme);
    if (kind === 'screen') style.layout = 'wallpaper';
    let layoutFromUrl = urlState.get('layout');
    if (['minimal', 'inset', 'data', 'wallpaper'].includes(layoutFromUrl)) style.layout = layoutFromUrl;

    return {
      meta,
      track: null,
      flag: null,
      themeId: theme.id,
      style,
      view: {rotation: Number.parseFloat(urlState.get('rotate')) || 0, zoom: 1, panX: 0, panY: 0},
      options: {
        showStreets: true,
        showBuildings: true,
        showPit: false,
        showStart: true,
        showNorth: style.layout === 'inset',
        showFlag: Boolean(theme.flag),
        showAttribution: true,
        uppercase: true,
        wallpaperLabel: 'corner'
      },
      text: {
        title: meta.title,
        subtitle: meta.nickname || (meta.country !== meta.title ? meta.country : meta.name),
        coords: '',
        tagline: '',
        stats: defaultStats(meta)
      },
      taglineEdited: false,
      outputSettings: {
        kind,
        paper: urlState.get('paper') || 'a3',
        landscape: urlState.get('landscape') === '1',
        dpi: 300,
        screen: urlState.get('screen') || 'iphone',
        customWidth: 2560,
        customHeight: 1080
      },
      border: {style: 'none', color: '#ffffff', size: 0.045, caption: '', captionColor: '#2b2b2b'},
      format: 'png',
      showFrame: true,
      loadingStreets: false,
      streetsStatusText: '',
      streetsError: null,
      streetsLoaded: false,
      loadError: null,
      exporting: false,
      exportError: null,
      previewSize: {width: 300, height: 400}
    };
  },
  computed: {
    output() {
      return getOutput(this.outputSettings);
    },
    posterHeight() {
      return POSTER_WIDTH * this.output.aspect;
    },
    outputLabel() {
      let o = this.output;
      let size = `${o.width} × ${o.height} px`;
      return o.kind === 'print' ? `${o.name} · ${size} at ${o.dpi} dpi` : `${o.name} · ${size}`;
    },
    holderStyle() {
      return {width: this.previewSize.width + 'px', height: this.previewSize.height + 'px'};
    },
    osmUrl() {
      let osm = this.meta.osm;
      return osm ? `https://www.openstreetmap.org/${osm.type}/${osm.id}` : null;
    },
    streetsStatus() {
      if (this.loadingStreets) return this.streetsStatusText;
      if (this.streetsError) return 'Could not download the streets: OpenStreetMap servers are busy or unreachable.';
      return '';
    },
    renderState() {
      // Everything that should trigger a redraw.
      return [this.style, this.view, this.options, this.text, this.border, this.output, this.previewSize, this.track, this.flag, this.streetsLoaded];
    }
  },
  watch: {
    renderState: {
      deep: true,
      handler() {
        this.scheduleRender();
      }
    },
    output() {
      this.updateUrl();
      this.$nextTick(this.updatePreviewSize);
    },
    'outputSettings.kind'(kind) {
      // Screens get the full-bleed layout, prints go back to the style's own layout.
      this.style.layout = kind === 'screen' ? 'wallpaper' : getTheme(this.themeId).layout;
    },
    'style.layout'(layout) {
      this.updateUrl();
      if (layout === 'inset') this.options.showNorth = true;
    },
    'view.rotation'() {
      this.updateUrl();
    },
    showFrame() {
      this.$nextTick(this.updatePreviewSize);
    },
    'text.stats': {
      deep: true,
      immediate: true,
      handler(stats) {
        if (!this.taglineEdited) this.text.tagline = taglineFrom(stats);
      }
    }
  },
  created() {
    // Large, non-reactive data. Vue does not need to watch every coordinate.
    this.prepared = null;
    this.preparedSurroundings = null;
    this.lastMap = null;
    this.pointers = new Map();
  },
  mounted() {
    window.addEventListener('resize', this.updatePreviewSize);
    // Wheel listeners must be non-passive to stop the page from scrolling while zooming.
    this.$refs.canvas.addEventListener('wheel', this.preventWheelScroll, {passive: false});
    this.updatePreviewSize();
    loadFonts().then(() => this.scheduleRender());
    loadFlag(this.meta.cc).then(flag => {
      this.flag = flag && markRaw(flag);
    });
    loadTrack(this.trackId).then(track => {
      this.prepared = prepareTrack(track);
      this.track = markRaw(track);
      this.text.coords = formatDMS(...bboxCenter(track.bbox));
      this.loadStreets();
    }).catch(e => {
      console.error(e);
      this.loadError = 'Could not load this circuit: ' + e.message;
    });
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.updatePreviewSize);
    this.cancelStreets();
    cancelAnimationFrame(this.frame);
  },
  methods: {
    applyTheme(id) {
      let theme = getTheme(id);
      this.themeId = theme.id;
      let layout = this.style.layout;
      Object.assign(this.style, pickStyle(theme));
      if (this.outputSettings.kind === 'screen') this.style.layout = layout;
      this.options.showFlag = Boolean(theme.flag) && Boolean(this.flag);
      this.options.showNorth = this.style.layout === 'inset';
      this.updateUrl();
    },

    loadStreets() {
      if (!this.track) return;
      this.cancelStreets();
      this.loadingStreets = true;
      this.streetsError = null;
      let progress = new Progress(status => {
        if (status.loaded < 0) this.streetsStatusText = 'OpenStreetMap is busy, trying another server…';
        else this.streetsStatusText = `Downloading streets… ${formatBytes(status.loaded)}`;
      });
      this.progress = progress;
      this.streetsStatusText = 'Downloading streets around the circuit…';
      let track = this.track;
      loadSurroundings(track, progress).then(raw => {
        if (track !== this.track || progress.isCancelled) return;
        this.preparedSurroundings = prepareSurroundings(raw, this.prepared);
        this.streetsLoaded = true;
        this.loadingStreets = false;
      }).catch(e => {
        if (e && e.cancelled) return;
        console.error(e);
        this.loadingStreets = false;
        this.streetsError = e;
      });
    },

    cancelStreets() {
      if (this.progress) {
        this.progress.cancel();
        this.progress = null;
      }
      this.loadingStreets = false;
    },

    autoRotate() {
      if (!this.prepared || !this.lastMap) return;
      let rect = this.lastMap.rect;
      this.view.rotation = bestRotation(this.prepared.points, rect.w / rect.h);
      this.view.panX = 0;
      this.view.panY = 0;
      this.view.zoom = 1;
    },

    resetView() {
      Object.assign(this.view, {rotation: 0, zoom: 1, panX: 0, panY: 0});
    },

    updateUrl() {
      let o = this.outputSettings;
      let screen = o.kind === 'screen';
      urlState.replace({
        style: this.themeId,
        layout: this.style.layout !== (screen ? 'wallpaper' : getTheme(this.themeId).layout) ? this.style.layout : null,
        paper: !screen && o.paper !== 'a3' ? o.paper : null,
        landscape: !screen && o.landscape ? '1' : null,
        screen: screen ? o.screen : null,
        rotate: Math.round(this.view.rotation) || null
      });
    },

    // ---------------------------------------------------------------- drawing
    updatePreviewSize() {
      let preview = this.$refs.preview;
      if (!preview) return;
      let isNarrow = window.innerWidth < 760;
      let frame = this.showFrame ? 28 : 0;
      let availableWidth = preview.clientWidth - (isNarrow ? 32 : 96) - frame;
      let availableHeight = isNarrow ? window.innerHeight * 0.8 : preview.clientHeight - 140 - frame;
      let aspect = this.output.aspect;
      let width = Math.min(availableWidth, availableHeight / aspect);
      width = Math.max(160, Math.floor(width));
      this.previewSize = {width, height: Math.round(width * aspect)};
    },

    scheduleRender() {
      if (this.frame) return;
      this.frame = requestAnimationFrame(() => {
        this.frame = 0;
        this.render();
      });
    },

    render() {
      let canvas = this.$refs.canvas;
      if (!canvas || !this.prepared) return;
      let dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      let {width, height} = this.previewSize;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      let ctx = canvas.getContext('2d');
      let scale = canvas.width / POSTER_WIDTH;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      this.lastMap = renderPoster(ctx, {...this.getPoster(), height: canvas.height / scale});
    },

    getPoster() {
      let theme = {...getTheme(this.themeId), ...this.style};
      return {
        width: POSTER_WIDTH,
        height: this.posterHeight,
        theme,
        layout: this.style.layout,
        track: this.prepared,
        surroundings: this.preparedSurroundings,
        view: this.view,
        options: {
          ...this.options,
          trackWidth: this.style.trackWidth,
          streetOpacity: this.style.streetOpacity,
          streetWidth: this.style.streetWidth,
          fade: this.style.fade
        },
        text: this.text,
        flag: this.flag,
        border: {...this.border, caption: this.border.caption || this.text.title}
      };
    },

    // ---------------------------------------------------------------- export
    download() {
      if (!this.prepared || this.exporting) return;
      this.exporting = true;
      this.exportError = null;
      let poster = this.getPoster();
      let output = this.output;
      let isSvg = this.format === 'svg';
      let format = getFormat(this.format);
      // Let the "preparing" state paint before the main thread is busy drawing.
      setTimeout(() => {
        let work = isSvg ? posterToSvg(poster, output) : posterToImage(poster, output, format);
        work.then(blob => downloadBlob(blob, this.fileName(isSvg ? 'svg' : format.extension)))
          .catch(e => {
            console.error(e);
            this.exportError = e.message;
          })
          .finally(() => {
            this.exporting = false;
          });
      }, 30);
    },

    fileName(extension) {
      let o = this.output;
      let border = this.border.style !== 'none' ? '-' + this.border.style : '';
      return `${this.meta.id}-${this.themeId}-${o.id}${border}.${extension}`;
    },

    // ---------------------------------------------------------------- interaction
    toPoster(e) {
      let rect = this.$refs.canvas.getBoundingClientRect();
      let k = POSTER_WIDTH / rect.width;
      return {x: (e.clientX - rect.left) * k, y: (e.clientY - rect.top) * k};
    },

    isOnMap(p) {
      let r = this.lastMap && this.lastMap.rect;
      return r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
    },

    onPointerDown(e) {
      let p = this.toPoster(e);
      if (!this.isOnMap(p) && !this.pointers.size) return;
      this.$refs.canvas.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, p);
    },

    onPointerMove(e) {
      if (!this.pointers.has(e.pointerId)) return;
      let p = this.toPoster(e);
      let rect = this.lastMap.rect;
      if (this.pointers.size === 1) {
        let last = this.pointers.get(e.pointerId);
        this.view.panX += (p.x - last.x) / rect.w;
        this.view.panY += (p.y - last.y) / rect.h;
      } else if (this.pointers.size === 2) {
        let [a, b] = Array.from(this.pointers.entries());
        let other = a[0] === e.pointerId ? b[1] : a[1];
        let last = this.pointers.get(e.pointerId);
        let before = Math.hypot(last.x - other.x, last.y - other.y);
        let after = Math.hypot(p.x - other.x, p.y - other.y);
        if (before > 0) this.zoomAround({x: (p.x + other.x) / 2, y: (p.y + other.y) / 2}, after / before);
      }
      this.pointers.set(e.pointerId, p);
    },

    onPointerUp(e) {
      this.pointers.delete(e.pointerId);
    },

    preventWheelScroll(e) {
      if (this.isOnMap(this.toPoster(e))) e.preventDefault();
    },

    onWheel(e) {
      let p = this.toPoster(e);
      if (!this.isOnMap(p)) return;
      this.zoomAround(p, Math.exp(-e.deltaY * 0.0015));
    },

    zoomAround(p, factor) {
      let rect = this.lastMap.rect;
      let zoom = Math.max(0.3, Math.min(8, this.view.zoom * factor));
      factor = zoom / this.view.zoom;
      // Keep the point under the cursor in place.
      let cx = rect.x + rect.w / 2 + this.view.panX * rect.w;
      let cy = rect.y + rect.h / 2 + this.view.panY * rect.h;
      let nx = p.x - (p.x - cx) * factor;
      let ny = p.y - (p.y - cy) * factor;
      this.view.zoom = zoom;
      this.view.panX = (nx - rect.x - rect.w / 2) / rect.w;
      this.view.panY = (ny - rect.y - rect.h / 2) / rect.h;
    }
  }
}

function pickStyle(theme) {
  let style = {};
  STYLE_KEYS.forEach(key => { style[key] = theme[key]; });
  style.streetWidth = 1;
  return style;
}

function defaultStats(meta) {
  let length = meta.length || meta.computedLength;
  return [
    {label: 'Length', value: length ? length.toFixed(3) + ' km' : ''},
    {label: 'Turns', value: meta.turns ? String(meta.turns) : ''},
    {label: 'Opened', value: meta.opened ? String(meta.opened) : ''},
    {label: 'Lap record', value: ''}
  ];
}

/**
 * "3.337 km  |  19 turns  |  since 1929" from the stats rows.
 */
function taglineFrom(stats) {
  return stats.filter(s => s.value).map(s => {
    let label = (s.label || '').trim().toLowerCase();
    if (label === 'turns' || label === 'corners') return `${s.value} ${label}`;
    if (label === 'opened' || label === 'built' || label === 'first race') return `since ${s.value}`;
    return s.value;
  }).join('  |  ');
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}
</script>

<style lang='stylus'>
@import('./editor.styl');
</style>
