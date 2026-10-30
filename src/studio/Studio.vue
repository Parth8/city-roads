<template>
<div class='studio' :class='{"panel-open": panel, narrow}' @keydown='onKeyDown'>
  <nav class='rail' aria-label='Tools'>
    <button v-for='t in tools' :key='t.id' type='button' class='tool' :class='{active: panel === t.id}' @click='togglePanel(t.id)' :aria-pressed='panel === t.id'>
      <icon :name='t.icon' :size='22'></icon>
      <span>{{t.name}}</span>
    </button>
  </nav>

  <transition :name='narrow ? "sheet" : "slide"'>
    <section v-if='panel' class='panel' :aria-label='currentTool.name'>
      <div class='grabber' v-if='narrow' @click='panel = null'></div>
      <header class='panel-header'>
        <h2>{{currentTool.name}}</h2>
        <button type='button' class='icon-button' @click='panel = null' aria-label='Close panel'><icon name='close'></icon></button>
      </header>
      <div class='panel-body'>
        <transition name='fade' mode='out-in'>
          <component :is='currentTool.component' :key='panel'></component>
        </transition>
      </div>
    </section>
  </transition>

  <main class='stage' ref='stage'>
    <header class='topbar'>
      <button type='button' class='icon-button' @click='$emit("back")' aria-label='Back to all subjects'><icon name='back'></icon></button>
      <div class='subject'>
        <div class='subject-name'>{{meta.name}}</div>
        <button type='button' class='size-chip' @click='togglePanel("size")'>{{output.name}} · {{output.width}}×{{output.height}}</button>
      </div>
      <div class='topbar-actions'>
        <button type='button' class='icon-button' :disabled='!canUndo' @click='undo' aria-label='Undo' title='Undo (Ctrl+Z)'><icon name='undo'></icon></button>
        <button type='button' class='icon-button' :disabled='!canRedo' @click='redo' aria-label='Redo' title='Redo (Ctrl+Shift+Z)'><icon name='redo'></icon></button>
        <button type='button' class='download-button' @click='exportOpen = !exportOpen' :aria-expanded='exportOpen'>
          <icon name='download' :size='18'></icon><span>Download</span>
        </button>
      </div>
    </header>

    <div class='canvas-area' ref='canvasArea'>
      <div class='poster-holder' :class='{screen: output.isScreen}' :style='holderStyle'>
        <canvas ref='canvas' class='poster-canvas' :class='{selecting: selectMode}'
          aria-label='Poster preview. Drag to move the map, pinch or scroll to zoom, twist with two fingers to rotate.'
          @pointerdown='onPointerDown' @pointermove='onPointerMove' @pointerup='onPointerUp' @pointercancel='onPointerUp'
          @dblclick='onDoubleClick'></canvas>
      </div>
      <transition name='fade'>
        <div v-if='streetsStatus' class='data-status' :class='{error: streetsError}' role='status'>
          <span v-if='loadingStreets' class='spinner' aria-hidden='true'></span>
          <span>{{streetsStatus}}</span>
          <button v-if='loadingStreets' type='button' @click='cancelStreets'>Cancel</button>
          <button v-if='streetsError' type='button' class='retry' @click='loadStreets'>Retry</button>
        </div>
      </transition>
      <transition name='fade'>
        <div v-if='toast' class='toast' role='status'>{{toast}}</div>
      </transition>
    </div>

    <div class='dock' role='toolbar' aria-label='Map controls'>
      <button type='button' class='dock-button' :class='{active: selectMode}' @click='setSelectMode(!selectMode)'
        :title='selectMode ? "Selecting: tap streets on the poster" : "Select streets"' :aria-pressed='selectMode'>
        <icon :name='selectMode ? "select" : "hand"'></icon>
      </button>
      <span class='dock-divider'></span>
      <button type='button' class='dock-button' @click='zoomBy(1 / 1.25)' aria-label='Zoom out'><icon name='minus'></icon></button>
      <button type='button' class='zoom-label' @click='resetView' title='Reset view'>{{Math.round(view.zoom * 100)}}%</button>
      <button type='button' class='dock-button' @click='zoomBy(1.25)' aria-label='Zoom in'><icon name='plus'></icon></button>
      <span class='dock-divider'></span>
      <dial v-model='view.rotation' :size='40'></dial>
      <button type='button' class='dock-button' @click='autoRotate' title='Rotate to fill the frame'><icon name='fit'></icon></button>
    </div>

    <transition name='pop'>
      <export-sheet v-if='exportOpen' @close='exportOpen = false'></export-sheet>
    </transition>
  </main>
</div>
</template>

<script>
import {markRaw} from 'vue';
import {getTrackMeta, loadTrack, loadFlag} from './lib/catalog.js';
import {presets, presetStyle, getPreset} from './lib/presets.js';
import {loadFonts} from './lib/fonts.js';
import {getOutput, defaultOutput, getCategory} from './lib/outputs.js';
import {prepareTrack, preparePlace, prepareFeatures, featuresBBox, bestRotation} from './lib/geometry.js';
import {loadMapData} from './lib/mapData.js';
import {bboxAreaKm2} from './lib/geo.js';
import {formatDMS, bboxCenter} from './lib/geo.js';
import {gradientPalettes, clonePaint} from './lib/paint.js';
import renderPoster, {POSTER_WIDTH} from './lib/render.js';
import {posterToImage, posterToSvg} from './lib/exportPoster.js';
import hitTest from './lib/hitTest.js';
import createHistory from './lib/history.js';
import {getFormat, downloadBlob} from '../lib/artwork.js';
import Progress from '../lib/Progress.js';
import urlState from './lib/urlState.js';
import Icon from './components/Icon.vue';
import Dial from './components/Dial.vue';
import LooksPanel from './panels/LooksPanel.vue';
import SizePanel from './panels/SizePanel.vue';
import LayersPanel from './panels/LayersPanel.vue';
import ColoursPanel from './panels/ColoursPanel.vue';
import EffectsPanel from './panels/EffectsPanel.vue';
import TextPanel from './panels/TextPanel.vue';
import SelectPanel from './panels/SelectPanel.vue';
import ExportSheet from './panels/ExportSheet.vue';

export const DEFAULT_LAYERS = {
  track: true, pit: false, start: true, corners: false,
  streets: true, buildings: true, water: true, parks: false, rail: true,
  title: true, subtitle: true, tagline: true, stats: true, coords: true,
  flag: false, north: false, attribution: true, landmarks: false
};
// Layers a preset may switch on or off; the rest are left as the user set them.
const PRESET_LAYERS = ['north', 'flag', 'corners', 'parks'];
const STORAGE_PREFIX = 'studio:v1:';

const TOOLS = [
  {id: 'looks', name: 'Looks', icon: 'looks', component: LooksPanel},
  {id: 'size', name: 'Size', icon: 'size', component: SizePanel},
  {id: 'layers', name: 'Layers', icon: 'layers', component: LayersPanel},
  {id: 'colours', name: 'Colours', icon: 'colours', component: ColoursPanel},
  {id: 'effects', name: 'Effects', icon: 'effects', component: EffectsPanel},
  {id: 'text', name: 'Text', icon: 'text', component: TextPanel},
  {id: 'select', name: 'Select', icon: 'select', component: SelectPanel},
];

/**
 * The poster studio. Panels get this component through inject('studio') and
 * change its state directly; every change redraws the preview, and settles
 * into one undo step.
 */
export default {
  name: 'Studio',
  components: {Icon, Dial, ExportSheet},
  provide() {
    return {studio: this};
  },
  props: {
    // {kind: 'track', id} or {kind: 'place', name, displayName, bbox}
    subjectRef: {type: Object, required: true}
  },
  emits: ['back'],
  data() {
    let ref = this.subjectRef;
    let meta = ref.kind === 'track' ? trackMeta(ref.id) : placeMeta(ref);
    let presetId = getPreset(urlState.get('look')).id;
    let style = presetStyle(presetId);
    let layers = {...DEFAULT_LAYERS};
    applyPresetLayers(layers, presetId);
    let narrow = window.innerWidth < 900;
    // A landmark or a neighbourhood looks best as a little 3D model with names on it.
    if (ref.kind === 'place' && bboxAreaKm2(ref.bbox) < 12) {
      style.buildings3d = true;
      layers.landmarks = true;
    }

    return {
      meta,
      tools: TOOLS,
      presetId,
      style,
      layers,
      text: {
        title: meta.title,
        subtitle: meta.subtitle,
        tagline: '',
        coords: '',
        stats: meta.stats
      },
      taglineEdited: false,
      uppercase: true,
      labelPosition: 'corner',
      view: {rotation: 0, zoom: 1, panX: 0, panY: 0},
      outputSettings: JSON.parse(JSON.stringify(defaultOutput)),
      border: {style: 'none', color: '#ffffff', size: 0.045, caption: '', captionColor: '#2b2b2b'},
      selection: {items: [], mode: 'highlight', blur: 0},
      format: 'png',
      quality: 0.92,
      includeBorder: true,
      panel: narrow ? null : 'looks',
      narrow,
      exportOpen: false,
      selectMode: false,
      trackLoaded: false,
      flag: null,
      streetsLoaded: false,
      loadingStreets: false,
      streetsStatusText: '',
      streetsError: null,
      streetsCancelled: false,
      streetNames: [],
      detail: 'full',
      dataMode: 'high',
      dataSource: '',
      loadError: null,
      exporting: false,
      exportError: null,
      previewSize: {width: 300, height: 400},
      canUndo: false,
      canRedo: false,
      toast: '',
      renderVersion: 0
    };
  },
  computed: {
    currentTool() {
      return TOOLS.find(t => t.id === this.panel) || TOOLS[0];
    },
    output() {
      return getOutput(this.outputSettings);
    },
    isTrack() {
      return this.subjectRef.kind === 'track';
    },
    streetsStatus() {
      if (this.loadingStreets) return this.streetsStatusText;
      if (this.streetsError) {
        let e = this.streetsError;
        let code = e.statusError ? ` (${e.statusError})` : '';
        if (e.queryTooLarge) return 'This area is too large for OpenStreetMap to send in one go. Try a smaller place.';
        return `Couldn't load the streets: OpenStreetMap servers are busy${code}.`;
      }
      if (this.streetsCancelled) return 'Streets not loaded.';
      return '';
    },
    holderStyle() {
      return {width: this.previewSize.width + 'px', height: this.previewSize.height + 'px'};
    },
    effectiveLayers() {
      let layers = {...this.layers};
      if (!this.isTrack) {
        layers.track = layers.pit = layers.start = layers.corners = false;
        layers.stats = false;
      }
      if (!this.flag) layers.flag = false;
      return layers;
    },
    snapshot() {
      // Everything a user can change, as one string: what undo, redo and autosave work with.
      return JSON.stringify({
        presetId: this.presetId, style: this.style, layers: this.layers, text: this.text, uppercase: this.uppercase,
        labelPosition: this.labelPosition, view: this.view, outputSettings: this.outputSettings, border: this.border,
        selection: this.selection, taglineEdited: this.taglineEdited, dataMode: this.dataMode
      });
    }
  },
  watch: {
    snapshot() {
      this.scheduleRender();
      if (this.restoring) return;
      clearTimeout(this.recordTimer);
      this.recordTimer = setTimeout(this.recordHistory, 350);
    },
    previewSize() {
      this.scheduleRender();
    },
    output(next, prev) {
      if (prev && next.aspect !== prev.aspect) this.$nextTick(this.updatePreviewSize);
    },
    'outputSettings.category'(category, previous) {
      // Screens get the full-bleed layout; going back to paper restores the look's own layout.
      let screen = getCategory(category).screen;
      if (screen && !getCategory(previous).screen) this.style.layout = 'fullbleed';
      if (!screen && getCategory(previous).screen) this.style.layout = presetStyle(this.presetId).layout;
    },
    'text.stats': {
      deep: true,
      handler() {
        if (!this.taglineEdited && this.isTrack) this.text.tagline = taglineFrom(this.text.stats);
      }
    },
    panel(panel) {
      if (panel === 'select') this.setSelectMode(true);
      this.$nextTick(this.updatePreviewSize);
    }
  },
  created() {
    // Large, non-reactive data. Vue does not need to watch every coordinate.
    this.prepared = null;
    this.features = null;
    this.lastMap = null;
    this.pointers = new Map();
    this.history = createHistory();
    if (this.isTrack && !this.taglineEdited) this.text.tagline = taglineFrom(this.text.stats);
  },
  mounted() {
    this.restoreSaved();
    this.history.reset(this.snapshot);
    this.resizeObserver = new ResizeObserver(() => this.updatePreviewSize());
    this.resizeObserver.observe(this.$refs.canvasArea);
    this.onResize = () => {
      this.narrow = window.innerWidth < 900;
    };
    window.addEventListener('resize', this.onResize);
    // Wheel listeners must be non-passive to stop the page from scrolling while zooming.
    this.$refs.canvas.addEventListener('wheel', this.onWheel, {passive: false});
    this.updatePreviewSize();
    loadFonts().then(() => this.scheduleRender());
    this.loadSubject();
  },
  beforeUnmount() {
    this.resizeObserver.disconnect();
    window.removeEventListener('resize', this.onResize);
    this.cancelStreets();
    cancelAnimationFrame(this.frame);
    clearTimeout(this.recordTimer);
  },
  methods: {
    // ---------------------------------------------------------------- subject
    loadSubject() {
      let ref = this.subjectRef;
      if (ref.kind === 'track') {
        loadFlag(this.meta.cc).then(flag => {
          this.flag = flag && markRaw(flag);
        });
        loadTrack(ref.id).then(track => {
          this.prepared = prepareTrack(track);
          this.subjectBBox = track.bbox;
          if (!this.text.coords) this.text.coords = formatDMS(...bboxCenter(track.bbox));
          this.trackLoaded = true;
          this.scheduleRender();
          this.loadStreets();
        }).catch(e => {
          console.error(e);
          this.loadError = 'Could not load this circuit: ' + e.message;
        });
      } else {
        this.prepared = preparePlace(ref);
        this.subjectBBox = ref.bbox;
        if (!this.text.coords) this.text.coords = formatDMS(...bboxCenter(ref.bbox));
        if (!this.text.tagline) this.text.tagline = this.text.coords;
        this.trackLoaded = true;
        this.scheduleRender();
        this.loadStreets();
      }
    },

    subjectKey() {
      let ref = this.subjectRef;
      return ref.kind === 'track' ? 'track:' + ref.id : 'place:' + ref.bbox.map(x => x.toFixed(4)).join(',');
    },

    loadStreets() {
      if (!this.prepared) return;
      this.cancelStreets();
      this.loadingStreets = true;
      this.streetsError = null;
      this.streetsCancelled = false;
      let progress = new Progress(status => {
        if (status.switching) this.streetsStatusText = 'That map source is not answering, trying another…';
        else if (status.loaded < 0) this.streetsStatusText = `OpenStreetMap is busy, trying again (${status.attempt} of ${status.of})…`;
        else if (status.total) this.streetsStatusText = `Loading map tiles ${status.tiles}/${status.total} · ${formatBytes(status.loaded)}`;
        else this.streetsStatusText = `Downloading map data… ${formatBytes(status.loaded)}`;
      });
      this.progress = progress;
      this.streetsStatusText = 'Loading streets, water and buildings…';
      let bbox = featuresBBox({kind: this.subjectRef.kind, bbox: this.subjectBBox});
      let started = performance.now();
      loadMapData({key: this.subjectKey(), bbox, mode: this.dataMode}, progress).then(raw => {
        if (progress.isCancelled) return;
        this.features = markRaw(prepareFeatures(raw, this.prepared));
        this.streetNames = markRaw(this.features.streetNames);
        this.detail = detailOf(raw);
        this.dataSource = `${sourceName(raw.source)} · ${((performance.now() - started) / 1000).toFixed(1)} s` + (raw.zoom ? ` · zoom ${raw.zoom}, ${raw.tiles} tiles` : '');
        this.streetsLoaded = true;
        this.loadingStreets = false;
        this.scheduleRender();
      }).catch(e => {
        if (e && e.cancelled) return;
        console.error(e);
        this.loadingStreets = false;
        this.streetsError = e;
      });
    },

    setDataMode(mode) {
      if (mode === this.dataMode) return;
      this.dataMode = mode;
      this.loadStreets();
    },

    cancelStreets() {
      if (this.progress) {
        this.progress.cancel();
        this.progress = null;
        if (this.loadingStreets && !this.streetsLoaded) this.streetsCancelled = true;
      }
      this.loadingStreets = false;
    },

    // ---------------------------------------------------------------- looks
    applyPreset(id) {
      let layout = this.style.layout;
      let keep = {streetWidth: this.style.streetWidth};
      this.presetId = id;
      this.style = {...presetStyle(id), ...keep};
      if (this.output.isScreen) this.style.layout = layout;
      applyPresetLayers(this.layers, id);
      urlState.replace({look: id});
    },

    surprise() {
      let preset = presets[Math.floor(Math.random() * presets.length)];
      this.applyPreset(preset.id);
      // Half the time, also paint the track (or the streets of a place) with a random gradient.
      if (Math.random() < 0.5) {
        let palette = gradientPalettes[Math.floor(Math.random() * gradientPalettes.length)];
        let target = this.isTrack ? 'track' : 'streets';
        this.style[target] = {stops: palette.stops.slice(), angle: Math.round(Math.random() * 180)};
      }
    },

    applyGradientTo(targets, palette) {
      targets.forEach(target => {
        this.style[target] = {stops: palette.stops.slice(), angle: 45};
      });
    },

    copyPaint(paint) {
      return clonePaint(paint);
    },

    // ---------------------------------------------------------------- history and saving
    recordHistory() {
      if (this.history.record(this.snapshot)) this.save();
      this.canUndo = this.history.canUndo;
      this.canRedo = this.history.canRedo;
    },

    undo() {
      let snapshot = this.history.undo();
      if (snapshot) this.applySnapshot(snapshot);
    },

    redo() {
      let snapshot = this.history.redo();
      if (snapshot) this.applySnapshot(snapshot);
    },

    applySnapshot(snapshot) {
      this.restoring = true;
      Object.assign(this, JSON.parse(snapshot));
      this.canUndo = this.history.canUndo;
      this.canRedo = this.history.canRedo;
      this.$nextTick(() => {
        this.restoring = false;
        this.save();
      });
    },

    save() {
      try {
        localStorage.setItem(STORAGE_PREFIX + this.subjectKey(), this.snapshot);
      } catch {
        // Private mode or storage full: the poster still works, it just is not remembered.
      }
    },

    restoreSaved() {
      if (urlState.get('look')) return; // a shared link wins over what this browser remembers
      let saved;
      try {
        saved = localStorage.getItem(STORAGE_PREFIX + this.subjectKey());
      } catch {
        return;
      }
      if (!saved) return;
      try {
        let state = JSON.parse(saved);
        this.restoring = true;
        this.presetId = getPreset(state.presetId).id;
        this.style = {...presetStyle(this.presetId), ...state.style};
        this.layers = {...DEFAULT_LAYERS, ...state.layers};
        this.text = {...this.text, ...state.text};
        ['uppercase', 'labelPosition', 'taglineEdited', 'dataMode'].forEach(k => {
          if (k in state) this[k] = state[k];
        });
        Object.assign(this.view, state.view);
        this.outputSettings = {...this.outputSettings, ...state.outputSettings, custom: {...this.outputSettings.custom, ...(state.outputSettings || {}).custom}};
        Object.assign(this.border, state.border);
        Object.assign(this.selection, state.selection);
        this.$nextTick(() => {
          this.restoring = false;
        });
        this.showToast('Restored your last design · Looks › Start over to reset');
      } catch {
        this.restoring = false;
      }
    },

    startOver() {
      try {
        localStorage.removeItem(STORAGE_PREFIX + this.subjectKey());
      } catch { // nothing saved
      }
      this.applyPreset(this.presetId);
      this.layers = {...DEFAULT_LAYERS};
      applyPresetLayers(this.layers, this.presetId);
      this.text = {title: this.meta.title, subtitle: this.meta.subtitle, tagline: '', coords: this.text.coords, stats: this.meta.stats};
      this.taglineEdited = false;
      if (this.isTrack) this.text.tagline = taglineFrom(this.text.stats);
      else this.text.tagline = this.text.coords;
      this.border.style = 'none';
      this.selection = {items: [], mode: 'highlight', blur: 0};
      this.resetView();
    },

    // ---------------------------------------------------------------- panels and modes
    togglePanel(id) {
      this.panel = this.panel === id ? null : id;
      this.exportOpen = false;
    },

    setSelectMode(on) {
      this.selectMode = on;
      if (on) this.showToast('Tap streets or the track to select them');
    },

    showToast(message) {
      this.toast = message;
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => {
        this.toast = '';
      }, 2600);
    },

    setInteracting(on) {
      this.interacting = on;
      if (!on) this.scheduleRender();
    },

    // ---------------------------------------------------------------- selection
    toggleSelection(item) {
      let i = this.selection.items.findIndex(x => x.key === item.key);
      if (i >= 0) this.selection.items.splice(i, 1);
      else this.selection.items.push({key: item.key, label: item.label});
    },

    selectStreetByName(name) {
      if (!name) return;
      let key = 'road:' + name;
      if (!this.selection.items.some(x => x.key === key)) this.selection.items.push({key, label: name});
    },

    clearSelection() {
      this.selection.items = [];
    },

    // ---------------------------------------------------------------- view
    autoRotate() {
      if (!this.prepared || !this.lastMap) return;
      let rect = this.lastMap.rect;
      this.view.rotation = bestRotation(this.prepared.points, rect.w / rect.h);
      Object.assign(this.view, {zoom: 1, panX: 0, panY: 0});
    },

    resetView() {
      Object.assign(this.view, {rotation: 0, zoom: 1, panX: 0, panY: 0});
    },

    zoomBy(factor) {
      if (!this.lastMap) return;
      let r = this.lastMap.rect;
      this.zoomAround({x: r.x + r.w / 2, y: r.y + r.h / 2}, factor);
    },

    zoomAround(p, factor) {
      let rect = this.lastMap.rect;
      let zoom = Math.max(0.2, Math.min(12, this.view.zoom * factor));
      factor = zoom / this.view.zoom;
      // Keep the point under the cursor in place.
      let cx = rect.x + rect.w / 2 + this.view.panX * rect.w;
      let cy = rect.y + rect.h / 2 + this.view.panY * rect.h;
      let nx = p.x - (p.x - cx) * factor;
      let ny = p.y - (p.y - cy) * factor;
      this.view.zoom = zoom;
      this.view.panX = (nx - rect.x - rect.w / 2) / rect.w;
      this.view.panY = (ny - rect.y - rect.h / 2) / rect.h;
    },

    // ---------------------------------------------------------------- drawing
    updatePreviewSize() {
      let area = this.$refs.canvasArea;
      if (!area) return;
      let margin = this.narrow ? 24 : 64;
      // Leave room for the floating dock under the poster (hidden behind the sheet on phones).
      let dock = this.narrow && this.panel ? 0 : 70;
      let availableWidth = Math.max(120, area.clientWidth - margin);
      let availableHeight = Math.max(120, area.clientHeight - margin / 2 - dock);
      let aspect = this.output.aspect;
      let width = Math.floor(Math.min(availableWidth, availableHeight / aspect));
      let height = Math.round(width * aspect);
      if (width !== this.previewSize.width || height !== this.previewSize.height) this.previewSize = {width, height};
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
      // While dragging, draw at lower resolution to keep up with the finger.
      let dpr = this.interacting ? 1 : Math.min(window.devicePixelRatio || 1, 2.5);
      let {width, height} = this.previewSize;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      let ctx = canvas.getContext('2d');
      let scale = canvas.width / POSTER_WIDTH;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      this.lastMap = renderPoster(ctx, this.getPoster({height: canvas.height / scale}));
    },

    getPoster(overrides = {}) {
      return {
        width: POSTER_WIDTH,
        height: POSTER_WIDTH * this.output.aspect,
        layout: this.style.layout,
        style: this.style,
        layers: this.effectiveLayers,
        text: this.text,
        uppercase: this.uppercase,
        labelPosition: this.labelPosition,
        view: this.view,
        subject: this.prepared,
        features: this.features,
        selection: {keys: new Set(this.selection.items.map(x => x.key)), mode: this.selection.mode, blur: this.selection.blur},
        flag: this.flag,
        border: {...this.border, caption: this.border.caption || this.text.title},
        ...overrides
      };
    },

    /**
     * Draws a small preview of a look, used by the Looks panel.
     */
    renderThumbnail(canvas, presetId) {
      if (!this.prepared) return false;
      let ctx = canvas.getContext('2d');
      let scale = canvas.width / POSTER_WIDTH;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      let style = {...presetStyle(presetId), layout: this.style.layout === 'fullbleed' ? 'fullbleed' : getPreset(presetId).style.layout || 'minimal'};
      let layers = {...this.effectiveLayers};
      applyPresetLayers(layers, presetId);
      if (!this.flag) layers.flag = false;
      if (!this.isTrack) layers.track = layers.start = layers.corners = layers.pit = false;
      renderPoster(ctx, this.getPoster({style, layers, layout: style.layout, height: canvas.height / scale, border: {style: 'none'}, selection: {keys: new Set()}}));
      return true;
    },

    // ---------------------------------------------------------------- export
    download() {
      if (!this.prepared || this.exporting) return;
      this.exporting = true;
      this.exportError = null;
      let poster = this.getPoster(this.includeBorder ? {} : {border: {style: 'none'}});
      let output = this.output;
      let isSvg = this.format === 'svg';
      let format = {...getFormat(this.format), quality: this.quality};
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
      let base = this.isTrack ? this.subjectRef.id : this.meta.title;
      let border = this.includeBorder && this.border.style !== 'none' ? '-' + this.border.style : '';
      return `${base}-${this.presetId}-${this.output.width}x${this.output.height}${border}.${extension}`;
    },

    // ---------------------------------------------------------------- pointer gestures
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
      if (this.pointers.size === 1) this.tap = {x: e.clientX, y: e.clientY, time: Date.now(), point: p};
      else this.tap = null;
      this.setInteracting(true);
    },

    onPointerMove(e) {
      if (!this.pointers.has(e.pointerId)) return;
      let p = this.toPoster(e);
      let rect = this.lastMap.rect;
      if (this.tap && Math.hypot(e.clientX - this.tap.x, e.clientY - this.tap.y) > 6) this.tap = null;
      if (this.pointers.size === 1) {
        let last = this.pointers.get(e.pointerId);
        this.view.panX += (p.x - last.x) / rect.w;
        this.view.panY += (p.y - last.y) / rect.h;
      } else if (this.pointers.size === 2) {
        // Pinch to zoom, twist to rotate.
        let [a, b] = Array.from(this.pointers.entries());
        let other = a[0] === e.pointerId ? b[1] : a[1];
        let last = this.pointers.get(e.pointerId);
        let before = Math.hypot(last.x - other.x, last.y - other.y);
        let after = Math.hypot(p.x - other.x, p.y - other.y);
        if (before > 0) this.zoomAround({x: (p.x + other.x) / 2, y: (p.y + other.y) / 2}, after / before);
        let turn = Math.atan2(p.y - other.y, p.x - other.x) - Math.atan2(last.y - other.y, last.x - other.x);
        if (turn > Math.PI) turn -= 2 * Math.PI;
        if (turn < -Math.PI) turn += 2 * Math.PI;
        this.view.rotation = normalizeAngle(this.view.rotation - turn * 180 / Math.PI);
      }
      this.pointers.set(e.pointerId, p);
    },

    onPointerUp(e) {
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.delete(e.pointerId);
      if (!this.pointers.size) this.setInteracting(false);
      let tap = this.tap;
      this.tap = null;
      if (e.type !== 'pointerup' || !tap || Date.now() - tap.time > 500) return;
      if (this.selectMode) this.selectAt(tap.point);
    },

    selectAt(point) {
      if (!this.lastMap) return;
      // About 14 screen pixels, in poster units.
      let tolerance = 14 * POSTER_WIDTH / this.$refs.canvas.getBoundingClientRect().width;
      let hit = hitTest(this.prepared, this.features, this.lastMap, point, tolerance);
      if (hit) this.toggleSelection(hit);
      else this.showToast('Nothing to select there. Tap closer to a street.');
    },

    onDoubleClick(e) {
      let p = this.toPoster(e);
      if (this.isOnMap(p) && !this.selectMode) this.zoomAround(p, 1.6);
    },

    onWheel(e) {
      let p = this.toPoster(e);
      if (!this.isOnMap(p)) return;
      e.preventDefault();
      if (e.shiftKey || e.altKey) {
        // Shift/Alt + scroll rotates.
        this.view.rotation = normalizeAngle(this.view.rotation + (e.deltaY || e.deltaX) * 0.15);
      } else {
        this.zoomAround(p, Math.exp(-e.deltaY * 0.0015));
      }
      this.setInteracting(true);
      clearTimeout(this.wheelTimer);
      this.wheelTimer = setTimeout(() => this.setInteracting(false), 180);
    },

    onKeyDown(e) {
      let target = e.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) return;
      let mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) this.redo();
        else this.undo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        this.redo();
      } else if (e.key === 'Escape') {
        if (this.exportOpen) this.exportOpen = false;
        else if (this.selectMode) this.selectMode = false;
        else this.panel = null;
      }
    }
  }
}

function trackMeta(id) {
  let meta = getTrackMeta(id);
  let length = meta.length || meta.computedLength;
  return {
    ...meta,
    subtitle: meta.nickname || (meta.country !== meta.title ? meta.country : meta.name),
    stats: [
      {label: 'Length', value: length ? length.toFixed(3) + ' km' : ''},
      {label: 'Turns', value: meta.turns ? String(meta.turns) : ''},
      {label: 'Opened', value: meta.opened ? String(meta.opened) : ''},
      {label: 'Lap record', value: ''}
    ]
  };
}

function placeMeta(ref) {
  let parts = (ref.displayName || ref.name).split(',').map(s => s.trim()).filter(Boolean);
  return {
    name: parts[0],
    title: parts[0],
    subtitle: parts.length > 1 ? parts[parts.length - 1] : '',
    country: parts[parts.length - 1],
    stats: []
  };
}

function applyPresetLayers(layers, presetId) {
  let preset = getPreset(presetId);
  PRESET_LAYERS.forEach(key => {
    layers[key] = preset.layers && key in preset.layers ? preset.layers[key] : DEFAULT_LAYERS[key];
  });
}

function sourceName(id) {
  return {openfreemap: 'OpenFreeMap tiles', versatiles: 'VersaTiles', overpass: 'Overpass (raw OSM)'}[id] || id;
}

// What was left out to keep a large area fast.
function detailOf(raw) {
  if (raw.source === 'overpass') return raw.detail;
  if (raw.zoom >= 13) return 'full';
  return raw.zoom >= 11 ? 'roads' : 'major';
}

function normalizeAngle(a) {
  return Math.round((((a + 180) % 360 + 360) % 360 - 180) * 10) / 10;
}

/**
 * "3.337 km  |  19 turns  |  since 1929" from the stats rows.
 */
export function taglineFrom(stats) {
  return (stats || []).filter(s => s.value).map(s => {
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
@import('./studio.styl');
</style>
