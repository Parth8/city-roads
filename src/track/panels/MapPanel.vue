<template>
<details class='panel'>
  <summary>Map</summary>
  <div class='status' v-if='editor.streetsStatus' role='status'>
    <span>{{editor.streetsStatus}}</span>
    <button class='link-button' v-if='editor.loadingStreets' @click='editor.cancelStreets()'>cancel</button>
    <button class='link-button' v-if='editor.streetsError' @click='editor.loadStreets()'>retry</button>
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
    <button @click='editor.autoRotate()'>Fit rotation</button>
    <button @click='editor.resetView()'>Reset view</button>
  </div>
  <p class='hint'>Drag the map to move (crop) it, scroll or pinch to zoom.</p>
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
    <div class='label'>Buildings</div>
    <div class='segmented'>
      <button v-for='b in buildingModes' :key='b.id' :class='{active: style.buildings === b.id}' @click='style.buildings = b.id'>{{b.name}}</button>
    </div>
  </template>
  <label class='check' v-if='track && track.pit.length'><input type='checkbox' v-model='options.showPit'> Pit lane</label>
  <label class='check' v-if='track && track.start'><input type='checkbox' v-model='options.showStart'> Start / finish flag</label>
  <label class='check'><input type='checkbox' v-model='options.showNorth'> North arrow</label>
  <label class='check' v-if='editor.flag'><input type='checkbox' v-model='options.showFlag'> Country flag</label>
  <label class='check'><input type='checkbox' v-model='options.showAttribution'> OpenStreetMap credit</label>
</details>
</template>

<script>
export default {
  name: 'MapPanel',
  inject: ['editor'],
  data() {
    return {
      buildingModes: [{id: 'none', name: 'Hidden'}, {id: 'outline', name: 'Outline'}, {id: 'fill', name: 'Filled'}]
    };
  },
  computed: {
    view() {
      return this.editor.view;
    },
    style() {
      return this.editor.style;
    },
    options() {
      return this.editor.options;
    },
    track() {
      return this.editor.track;
    }
  }
}
</script>
