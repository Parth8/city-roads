<template>
<div class='poster-editor'>
  <aside class='sidebar'>
    <div class='sidebar-header'>
      <button class='link-button' @click='$emit("back")'>← All circuits</button>
      <h2>{{meta.name}}</h2>
      <div class='source' v-if='osmUrl'>
        Layout from <a :href='osmUrl' target='_blank' rel='noopener'>OpenStreetMap</a>
        <span v-if='track'> · {{track.lengthKm.toFixed(3)}} km as mapped</span>
      </div>
    </div>

    <section>
      <h3>Style</h3>
      <div class='themes'>
        <button v-for='t in themes' :key='t.id' :class='{theme: true, active: t.id === themeId}' @click='applyTheme(t.id)' :title='t.name'>
          <span class='swatch' :style='{background: t.mapBackground || t.background, borderColor: t.background}'>
            <span class='swatch-track' :style='{background: t.track}'></span>
          </span>
          <span class='theme-name'>{{t.name}}</span>
        </button>
      </div>
      <div class='segmented'>
        <button v-for='l in layouts' :key='l.id' :class='{active: style.layout === l.id}' @click='style.layout = l.id'>{{l.name}}</button>
      </div>
    </section>

    <section>
      <h3>Text</h3>
      <label class='field'>
        <span>Title</span>
        <input type='text' v-model='text.title'>
      </label>
      <label class='field'>
        <span>Subtitle</span>
        <input type='text' v-model='text.subtitle'>
      </label>
      <label class='field' v-if='style.layout === "minimal"'>
        <span>Tagline</span>
        <input type='text' v-model='text.tagline' @input='taglineEdited = true'>
      </label>
      <label class='field' v-if='style.layout === "inset"'>
        <span>Coordinates</span>
        <input type='text' v-model='text.coords'>
      </label>
      <div class='stats'>
        <div class='stats-label'>Stats <small>(empty values are hidden)</small></div>
        <div v-for='(stat, i) in text.stats' :key='i' class='stat-row'>
          <input type='text' v-model='stat.label' placeholder='Label' aria-label='Stat label'>
          <input type='text' v-model='stat.value' placeholder='Value' aria-label='Stat value'>
          <button class='icon-button' @click='text.stats.splice(i, 1)' aria-label='Remove stat'>×</button>
        </div>
        <button class='link-button' v-if='text.stats.length < 5' @click='text.stats.push({label: "", value: ""})'>+ Add stat</button>
      </div>
      <label class='check'><input type='checkbox' v-model='options.uppercase'> Uppercase title</label>
    </section>

    <section>
      <h3>Map</h3>
      <div class='status' v-if='streetsStatus'>
        <span>{{streetsStatus}}</span>
        <button class='link-button' v-if='loadingStreets' @click='cancelStreets'>cancel</button>
        <button class='link-button' v-if='streetsError' @click='loadStreets'>retry</button>
      </div>
      <label class='slider'>
        <span>Rotation <em>{{Math.round(view.rotation)}}°</em></span>
        <input type='range' min='-180' max='180' step='1' v-model.number='view.rotation'>
      </label>
      <label class='slider'>
        <span>Zoom <em>{{view.zoom.toFixed(2)}}×</em></span>
        <input type='range' min='0.3' max='4' step='0.01' v-model.number='view.zoom'>
      </label>
      <div class='buttons'>
        <button @click='autoRotate'>Fit rotation</button>
        <button @click='resetView'>Reset view</button>
      </div>
      <p class='hint'>Drag the map to move it, scroll or pinch to zoom.</p>
      <label class='slider'>
        <span>Track width <em>{{style.trackWidth}}</em></span>
        <input type='range' min='2' max='26' step='0.5' v-model.number='style.trackWidth'>
      </label>
      <label class='check'><input type='checkbox' v-model='options.showStreets'> Streets around the track</label>
      <template v-if='options.showStreets'>
        <label class='slider'>
          <span>Street opacity <em>{{Math.round(style.streetOpacity * 100)}}%</em></span>
          <input type='range' min='0.05' max='1' step='0.01' v-model.number='style.streetOpacity'>
        </label>
        <label class='slider'>
          <span>Fade with distance <em>{{Math.round(style.fade * 100)}}%</em></span>
          <input type='range' min='0' max='1' step='0.01' v-model.number='style.fade'>
        </label>
        <label class='slider'>
          <span>Street width <em>{{style.streetWidth.toFixed(1)}}</em></span>
          <input type='range' min='0.3' max='3' step='0.1' v-model.number='style.streetWidth'>
        </label>
        <label class='check' v-if='style.buildings !== "none"'><input type='checkbox' v-model='options.showBuildings'> Buildings</label>
      </template>
      <label class='check' v-if='track && track.pit.length'><input type='checkbox' v-model='options.showPit'> Pit lane</label>
      <label class='check' v-if='track && track.start'><input type='checkbox' v-model='options.showStart'> Start / finish flag</label>
      <label class='check'><input type='checkbox' v-model='options.showNorth'> North arrow</label>
      <label class='check' v-if='flag'><input type='checkbox' v-model='options.showFlag'> Flag</label>
      <label class='check'><input type='checkbox' v-model='options.showAttribution'> OpenStreetMap credit</label>
    </section>

    <section>
      <h3>Colours</h3>
      <div class='colors'>
        <label v-for='c in colorFields' :key='c.key' class='color'>
          <input type='color' :value='style[c.key] || "#000000"' @input='style[c.key] = $event.target.value'>
          <span>{{c.name}}</span>
        </label>
      </div>
      <label class='check'><input type='checkbox' :checked='Boolean(style.trackCasing)' @change='toggleCasing($event.target.checked)'> Outline around the track</label>
      <label class='check' v-if='style.layout === "inset"'><input type='checkbox' :checked='Boolean(style.mapBackground)' @change='toggleMapBackground($event.target.checked)'> Map panel colour</label>
    </section>

    <section>
      <h3>Print</h3>
      <label class='field'>
        <span>Paper</span>
        <select v-model='print.paper'>
          <option v-for='p in paperSizes' :key='p.id' :value='p.id'>{{p.name}}</option>
        </select>
      </label>
      <div class='segmented'>
        <button :class='{active: !print.landscape}' @click='print.landscape = false'>Portrait</button>
        <button :class='{active: print.landscape}' @click='print.landscape = true'>Landscape</button>
      </div>
      <div class='segmented'>
        <button :class='{active: print.dpi === 150}' @click='print.dpi = 150'>150 dpi</button>
        <button :class='{active: print.dpi === 300}' @click='print.dpi = 300'>300 dpi</button>
      </div>
      <label class='check'><input type='checkbox' v-model='print.showFrame'> Preview in a frame</label>
      <div class='buttons export'>
        <button class='primary' @click='downloadPNG' :disabled='exporting'>Download PNG</button>
        <button @click='downloadSVG' :disabled='exporting'>Download SVG</button>
      </div>
      <p class='hint'>
        PNG: {{exportSize.width}} × {{exportSize.height}} px at {{exportSize.dpi}} dpi.
        <span v-if='exportSize.dpi < print.dpi'>Reduced so that browsers can create the image.</span>
        SVG is a vector file for any size.
      </p>
      <p class='hint' v-if='exporting'>Preparing your file…</p>
    </section>
  </aside>

  <main class='preview' ref='preview'>
    <div class='poster-holder' :class='frameClass' :style='holderStyle'>
      <canvas ref='canvas' class='poster-canvas'
        @pointerdown='onPointerDown' @pointermove='onPointerMove' @pointerup='onPointerUp' @pointercancel='onPointerUp'
        @wheel.prevent='onWheel'></canvas>
    </div>
    <div v-if='loadError' class='load-error'>{{loadError}}</div>
  </main>
</div>
</template>

<script>
import {markRaw} from 'vue';
import {getTrackMeta, loadTrack, loadFlag} from './lib/catalog.js';
import {themes, layouts, getTheme, loadFonts} from './lib/themes.js';
import {paperSizes, getPaper, getExportSize} from './lib/paper.js';
import {prepareTrack, prepareSurroundings, bestRotation} from './lib/geometry.js';
import {loadSurroundings} from './lib/surroundings.js';
import {formatDMS, bboxCenter} from './lib/geo.js';
import renderPoster, {POSTER_WIDTH} from './lib/renderPoster.js';
import SvgContext from './lib/svgContext.js';
import getEmbeddedFontCss from './lib/fontEmbed.js';
import Progress from '../lib/Progress.js';
import urlState from './lib/urlState.js';

const STYLE_KEYS = ['layout', 'background', 'mapBackground', 'streets', 'streetOpacity', 'buildings', 'track', 'trackCasing', 'trackWidth', 'text', 'muted', 'accent', 'fade'];

export default {
  name: 'PosterEditor',
  props: {
    trackId: {type: String, required: true}
  },
  emits: ['back'],
  data() {
    let meta = getTrackMeta(this.trackId);
    let themeId = getTheme(urlState.get('style')).id;
    let theme = getTheme(themeId);
    let style = pickStyle(theme);
    let layoutFromUrl = urlState.get('layout');
    if (layouts.some(l => l.id === layoutFromUrl)) style.layout = layoutFromUrl;

    return {
      meta,
      track: null,
      flag: null,
      themes,
      layouts,
      paperSizes,
      themeId,
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
        uppercase: true
      },
      text: {
        title: meta.title,
        subtitle: meta.nickname || (meta.country !== meta.title ? meta.country : meta.name),
        coords: '',
        tagline: '',
        stats: defaultStats(meta)
      },
      taglineEdited: false,
      print: {
        paper: urlState.get('paper') || 'a3',
        landscape: urlState.get('landscape') === '1',
        dpi: 300,
        showFrame: true
      },
      loadingStreets: false,
      streetsStatusText: '',
      streetsError: null,
      streetsLoaded: false,
      loadError: null,
      exporting: false,
      previewSize: {width: 300, height: 400}
    };
  },
  computed: {
    paper() {
      return getPaper(this.print.paper, this.print.landscape);
    },
    posterHeight() {
      return POSTER_WIDTH * this.paper.height / this.paper.width;
    },
    exportSize() {
      return getExportSize(this.paper, this.print.dpi);
    },
    holderStyle() {
      return {width: this.previewSize.width + 'px', height: this.previewSize.height + 'px'};
    },
    frameClass() {
      return this.print.showFrame ? 'framed' : '';
    },
    osmUrl() {
      let osm = this.meta.osm;
      return osm ? `https://www.openstreetmap.org/${osm.type}/${osm.id}` : null;
    },
    colorFields() {
      let fields = [
        {key: 'background', name: 'Background'},
        {key: 'track', name: 'Track'},
        {key: 'streets', name: 'Streets'},
        {key: 'text', name: 'Title'},
        {key: 'muted', name: 'Small text'},
        {key: 'accent', name: 'Accent'},
      ];
      if (this.style.trackCasing) fields.splice(2, 0, {key: 'trackCasing', name: 'Track outline'});
      if (this.style.mapBackground) fields.splice(1, 0, {key: 'mapBackground', name: 'Map panel'});
      return fields;
    },
    streetsStatus() {
      if (this.loadingStreets) return this.streetsStatusText;
      if (this.streetsError) return 'Could not download the streets: OpenStreetMap servers are busy or unreachable.';
      return '';
    },
    renderState() {
      // Everything that should trigger a redraw.
      return [this.style, this.view, this.options, this.text, this.paper, this.print.showFrame, this.previewSize, this.track, this.flag, this.streetsLoaded];
    }
  },
  watch: {
    renderState: {
      deep: true,
      handler() {
        this.scheduleRender();
      }
    },
    'print.paper'() { this.updateUrl(); this.updatePreviewSize(); },
    'print.landscape'() { this.updateUrl(); this.updatePreviewSize(); },
    'style.layout'(layout) {
      this.updateUrl();
      if (layout === 'inset') this.options.showNorth = true;
    },
    'view.rotation'() { this.updateUrl(); },
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
    this.updatePreviewSize();
    loadFonts().then(() => this.scheduleRender());
    loadFlag(this.meta.cc).then(flag => { this.flag = flag && markRaw(flag); });
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
      this.themeId = id;
      Object.assign(this.style, pickStyle(theme));
      this.options.showFlag = Boolean(theme.flag) && Boolean(this.flag);
      this.options.showNorth = theme.layout === 'inset';
      this.updateUrl();
    },

    toggleCasing(on) {
      this.style.trackCasing = on ? (getTheme(this.themeId).trackCasing || this.style.background) : null;
    },

    toggleMapBackground(on) {
      this.style.mapBackground = on ? (getTheme(this.themeId).mapBackground || '#555555') : null;
    },

    loadStreets() {
      if (!this.track) return;
      this.cancelStreets();
      this.loadingStreets = true;
      this.streetsError = null;
      this.progress = new Progress(status => {
        if (status.loaded < 0) this.streetsStatusText = 'OpenStreetMap is busy, trying another server…';
        else this.streetsStatusText = `Downloading streets… ${formatBytes(status.loaded)}`;
      });
      this.streetsStatusText = 'Downloading streets around the circuit…';
      let track = this.track;
      loadSurroundings(track, this.progress).then(raw => {
        if (track !== this.track) return;
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
      if (!this.prepared) return;
      let rect = this.lastMap ? this.lastMap.rect : {w: POSTER_WIDTH, h: this.posterHeight * 0.7};
      this.view.rotation = bestRotation(this.prepared.points, rect.w / rect.h);
      this.view.panX = 0;
      this.view.panY = 0;
      this.view.zoom = 1;
    },

    resetView() {
      this.view.rotation = 0;
      this.view.zoom = 1;
      this.view.panX = 0;
      this.view.panY = 0;
    },

    updateUrl() {
      urlState.replace({
        style: this.themeId,
        layout: this.style.layout !== getTheme(this.themeId).layout ? this.style.layout : null,
        paper: this.print.paper !== 'a3' ? this.print.paper : null,
        landscape: this.print.landscape ? '1' : null,
        rotate: Math.round(this.view.rotation) || null
      });
    },

    // ---------------------------------------------------------------- drawing
    updatePreviewSize() {
      let preview = this.$refs.preview;
      if (!preview) return;
      let isNarrow = window.innerWidth < 760;
      let availableWidth = preview.clientWidth - (isNarrow ? 32 : 96);
      let availableHeight = isNarrow ? Infinity : preview.clientHeight - 96;
      let aspect = this.paper.height / this.paper.width;
      let width = Math.min(availableWidth, availableHeight / aspect);
      width = Math.max(200, Math.floor(width));
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
      this.lastMap = renderPoster(ctx, this.getPoster());
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
        flag: this.flag
      };
    },

    // ---------------------------------------------------------------- export
    downloadPNG() {
      if (!this.prepared) return;
      this.exporting = true;
      // Let the "preparing" message paint before we block the main thread.
      setTimeout(() => {
        let {width, height} = this.exportSize;
        let canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        let ctx = canvas.getContext('2d');
        let scale = width / POSTER_WIDTH;
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        renderPoster(ctx, {...this.getPoster(), height: height / scale});
        canvas.toBlob(blob => {
          this.exporting = false;
          if (!blob) {
            alert('Your browser could not create an image this large. Try 150 dpi or a smaller paper size.');
            return;
          }
          download(blob, this.fileName('png'));
        }, 'image/png');
      }, 30);
    },

    downloadSVG() {
      if (!this.prepared) return;
      this.exporting = true;
      let poster = this.getPoster();
      let {theme} = poster;
      let fonts = [400, 500, 600].map(weight => ({family: theme.bodyFont, weight}))
        .concat({family: theme.titleFont, weight: theme.titleWeight});
      getEmbeddedFontCss(fonts).then(css => {
        let svg = new SvgContext(POSTER_WIDTH, poster.height, document.createElement('canvas').getContext('2d'));
        svg.physicalSize = {width: this.paper.width + 'mm', height: this.paper.height + 'mm'};
        if (css) svg.styles = `<style>${css}</style>`;
        renderPoster(svg, poster);
        download(new Blob([svg.toString()], {type: 'image/svg+xml'}), this.fileName('svg'));
      }).finally(() => {
        this.exporting = false;
      });
    },

    fileName(extension) {
      return `${this.meta.id}-${this.themeId}-${this.paper.id}.${extension}`;
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

function download(blob, fileName) {
  let url = URL.createObjectURL(blob);
  let a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Safari needs the URL a little longer than the click.
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
</script>

<style lang='stylus' scoped>
.poster-editor {
  display: flex;
  min-height: 100%;
}

.sidebar {
  width: 340px;
  flex-shrink: 0;
  background: white;
  border-right: 1px solid #e3ded6;
  padding: 16px 18px 40px;
  height: 100vh;
  overflow-y: auto;
  position: sticky;
  top: 0;
}

.sidebar-header h2 {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 28px;
  font-weight: 600;
  line-height: 1.1;
  margin: 10px 0 4px;
}

.source {
  font-size: 13px;
  color: #6b6b6b;
}

section {
  border-top: 1px solid #eee9e1;
  margin-top: 16px;
  padding-top: 12px;
}

h3 {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #7a7a7a;
  margin: 0 0 10px;
}

.themes {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 10px;
}

.theme {
  border: 1px solid #e3ded6;
  border-radius: 8px;
  background: white;
  padding: 6px 4px 4px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  &.active {
    border-color: #1d1d1f;
    box-shadow: 0 0 0 1px #1d1d1f;
  }
}

.swatch {
  width: 44px;
  height: 52px;
  border-radius: 3px;
  border: 4px solid;
  display: flex;
  align-items: center;
  justify-content: center;
}

.swatch-track {
  width: 22px;
  height: 22px;
  border-radius: 50% 40% 55% 35%;
  -webkit-mask: radial-gradient(circle, transparent 6px, black 7px);
  mask: radial-gradient(circle, transparent 6px, black 7px);
}

.theme-name {
  font-size: 12px;
  color: #333;
}

.segmented {
  display: flex;
  border: 1px solid #d6d1c8;
  border-radius: 8px;
  overflow: hidden;
  margin: 8px 0;
  button {
    flex: 1;
    border: 0;
    background: white;
    padding: 7px 4px;
    font-size: 14px;
    cursor: pointer;
    color: #333;
    & + button {
      border-left: 1px solid #d6d1c8;
    }
    &.active {
      background: #1d1d1f;
      color: white;
    }
  }
}

.field {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-bottom: 8px;
  font-size: 13px;
  color: #555;
  input, select {
    font-size: 15px;
    font-family: inherit;
    padding: 7px 8px;
    border: 1px solid #d6d1c8;
    border-radius: 6px;
    background: white;
  }
}

.stats-label {
  font-size: 13px;
  color: #555;
  margin-bottom: 4px;
  small {
    color: #8a8a8a;
  }
}

.stat-row {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
  input {
    min-width: 0;
    flex: 1;
    font-size: 14px;
    font-family: inherit;
    padding: 6px 7px;
    border: 1px solid #d6d1c8;
    border-radius: 6px;
  }
}

.icon-button {
  border: 0;
  background: transparent;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  color: #888;
  padding: 0 4px;
}

.link-button {
  border: 0;
  background: transparent;
  padding: 0;
  color: #c8102e;
  cursor: pointer;
  font-size: 14px;
}

.check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  margin: 8px 0;
  cursor: pointer;
}

.slider {
  display: flex;
  flex-direction: column;
  font-size: 13px;
  color: #555;
  margin: 6px 0 8px;
  em {
    font-style: normal;
    color: #1d1d1f;
    float: right;
  }
  input {
    width: 100%;
    accent-color: #1d1d1f;
  }
}

.buttons {
  display: flex;
  gap: 8px;
  margin: 8px 0;
  button {
    flex: 1;
    border: 1px solid #d6d1c8;
    border-radius: 6px;
    background: white;
    padding: 8px;
    font-size: 14px;
    cursor: pointer;
    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
  }
  .primary {
    background: #c8102e;
    border-color: #c8102e;
    color: white;
    font-weight: 600;
  }
}

.hint {
  font-size: 12px;
  color: #7a7a7a;
  line-height: 1.4;
  margin: 6px 0;
}

.status {
  font-size: 13px;
  background: #f6f2ea;
  border-radius: 6px;
  padding: 8px 10px;
  margin-bottom: 8px;
  display: flex;
  gap: 8px;
  justify-content: space-between;
}

.colors {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 10px;
}

.color {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  cursor: pointer;
  input {
    width: 30px;
    height: 26px;
    padding: 0;
    border: 1px solid #d6d1c8;
    border-radius: 4px;
    background: none;
    cursor: pointer;
  }
}

.preview {
  flex: 1;
  min-width: 0;
  height: 100vh;
  position: sticky;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e9e5de;
}

.poster-holder {
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  &.framed {
    box-sizing: content-box;
    border: 14px solid #161616;
    box-shadow: 0 1px 0 #444 inset, 0 18px 40px rgba(0, 0, 0, 0.35);
  }
}

.poster-canvas {
  display: block;
  touch-action: none;
  cursor: grab;
  &:active {
    cursor: grabbing;
  }
}

.load-error {
  position: absolute;
  bottom: 24px;
  background: #fff3f3;
  color: #a10e25;
  padding: 10px 14px;
  border-radius: 6px;
}

@media (max-width: 760px) {
  .poster-editor {
    flex-direction: column-reverse;
  }
  .sidebar {
    width: 100%;
    height: auto;
    position: static;
    border-right: 0;
    border-top: 1px solid #e3ded6;
  }
  .preview {
    height: auto;
    position: static;
    padding: 20px 16px;
  }
  .poster-holder.framed {
    border-width: 8px;
  }
}
</style>
