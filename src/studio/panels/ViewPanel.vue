<template>
<div>
  <div class='modes' role='radiogroup' aria-label='View'>
    <button v-for='m in modes' :key='m.id' type='button' role='radio' class='mode' :class='{active: mode === m.id}'
      :aria-checked='mode === m.id' @click='studio.setCameraMode(m.id)'>
      <svg viewBox='0 0 64 44' aria-hidden='true' v-html='m.art'></svg>
      <span class='mode-name'>{{m.name}}</span>
      <span class='mode-note'>{{m.note}}</span>
    </button>
  </div>

  <template v-if='mode === "skyline"'>
    <p class='hint'>Drag the poster sideways to walk around, up and down to rise or sink. Pinch or scroll to move closer.</p>

    <div class='label'>Stand</div>
    <chips :model-value='spot' @update:model-value='setSpot' :options='spots' fill label='Viewpoint height'></chips>

    <section class='card'>
      <div class='row-between'>
        <span>Facing <strong>{{compass}}</strong></span>
        <dial :model-value='camera.bearing || 0' @update:model-value='camera.bearing = $event' label='Facing'></dial>
      </div>
      <scrubber :model-value='studio.cameraDistance' @update:model-value='camera.distance = $event' label='Distance' :min='150' :max='2850' :step='10' unit='m' log></scrubber>
      <scrubber v-model='camera.height' label='Eye height' :min='1.5' :max='3000' :step='0.5' unit='m' log></scrubber>
      <scrubber v-model='camera.fov' label='Lens' :min='15' :max='110' :step='1' unit='degrees'></scrubber>
      <scrubber v-model='camera.horizon' label='Look down' :min='-15' :max='30' :step='0.5' unit='degrees'></scrubber>
    </section>

    <section class='card'>
      <scrubber v-model='camera.haze' label='Haze' :min='0' :max='1' :step='0.01' unit='percent'></scrubber>
      <scrubber v-model='style.extrude' label='Building height' :min='0.5' :max='3' :step='0.05' unit='×'></scrubber>
      <paint-picker v-model='camera.sky' label='Sky' :allow-none='true'></paint-picker>
      <p class='hint' v-if='!camera.sky'>No sky colour: it is blended from the background and the streets.</p>
    </section>
    <p class='hint'>Buildings use their heights from OpenStreetMap; where none is mapped they are drawn three floors tall.</p>
  </template>

  <p v-else-if='mode === "3d"' class='hint'>
    Buildings rise to their mapped height. Fine-tune height, tilt and light in Effects › 3D buildings.
  </p>
  <p v-else class='hint'>The classic top-down poster.</p>
</div>
</template>

<script>
import Chips from '../components/Chips.vue';
import Scrubber from '../components/Scrubber.vue';
import Dial from '../components/Dial.vue';
import PaintPicker from '../components/PaintPicker.vue';
import {CAMERA_SPOTS} from '../lib/scene.js';

// Little pictures of each view. Static markup, never user input.
const ART = {
  map: '<rect x="6" y="4" width="52" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="2"/>' +
    '<path d="M6 16h52M22 4v36M40 4v36M6 30h52" stroke="currentColor" stroke-width="1.2" opacity=".5"/>',
  '3d': '<path d="M10 30l22-12 22 12-22 12z" fill="none" stroke="currentColor" stroke-width="2"/>' +
    '<path d="M24 28v-10l6-3 6 3v10M30 15v8" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  skyline: '<path d="M2 32h60" stroke="currentColor" stroke-width="1.2" opacity=".5"/>' +
    '<path d="M6 32v-8h5v-5h4v13M18 32V14h6v18M27 32V4l4 6 4-6v28M38 32V18h7v14M48 32v-9h5v-4h4v13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>' +
    '<path d="M2 38l8-3h44l8 3" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".5"/>'
};

const COMPASS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];

export default {
  name: 'ViewPanel',
  components: {Chips, Scrubber, Dial, PaintPicker},
  inject: ['studio'],
  data() {
    return {
      modes: [
        {id: 'map', name: 'Map', note: 'top-down', art: ART.map},
        {id: '3d', name: '3D map', note: "bird's-eye", art: ART['3d']},
        {id: 'skyline', name: 'Skyline', note: 'from a viewpoint', art: ART.skyline}
      ],
      spots: CAMERA_SPOTS.map(s => ({id: s.id, name: s.name, title: s.height + ' m up'}))
    };
  },
  computed: {
    camera() {
      return this.studio.camera;
    },
    style() {
      return this.studio.style;
    },
    mode() {
      if (this.camera.mode === 'skyline') return 'skyline';
      return this.style.buildings3d ? '3d' : 'map';
    },
    spot() {
      let match = CAMERA_SPOTS.find(s => Math.abs(s.height - this.camera.height) < 1);
      return match ? match.id : null;
    },
    compass() {
      let b = ((this.camera.bearing || 0) % 360 + 360) % 360;
      return COMPASS[Math.round(b / 45) % 8];
    }
  },
  methods: {
    setSpot(id) {
      let spot = CAMERA_SPOTS.find(s => s.id === id);
      this.camera.height = spot.height;
      // At street level, look up at the skyline rather than down at the pavement.
      this.camera.horizon = id === 'street' ? -12 : 0;
    }
  }
}
</script>

<style lang='stylus' scoped>
.modes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 8px;
}

.mode {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: white;
  padding: 10px 6px 9px;
  font: inherit;
  color: var(--muted-ink);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, transform 0.12s, box-shadow 0.15s;
  svg {
    width: 56px;
    height: 38px;
  }
  &:hover {
    border-color: var(--ink);
  }
  &:active {
    transform: scale(0.96);
  }
  &.active {
    color: var(--ink);
    border-color: var(--ink);
    box-shadow: 0 0 0 1px var(--ink);
  }
}

.mode-name {
  font-weight: 600;
  font-size: 13.5px;
  color: var(--ink);
}

.mode-note {
  font-size: 11.5px;
}

.card {
  background: var(--soft);
  border-radius: 16px;
  padding: 10px 14px;
  margin: 10px 0;
}
</style>
