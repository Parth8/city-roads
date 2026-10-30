<template>
<div>
  <section class='card' v-if='studio.isTrack || hasSelection'>
    <div class='card-head'>
      <div>
        <div class='card-title'>Neon glow</div>
        <div class='card-text'>Light around the {{studio.isTrack ? 'track' : 'selected streets'}}.</div>
      </div>
      <toggle :model-value='Boolean(style.glow)' @update:model-value='toggleGlow' label='Neon glow'></toggle>
    </div>
    <template v-if='style.glow'>
      <scrubber v-model='style.glowStrength' label='Strength' :min='0.05' :max='1' :step='0.01' unit='percent'></scrubber>
      <paint-picker v-model='style.glow' label='Glow colour'></paint-picker>
      <paint-picker v-if='studio.isTrack' v-model='style.trackCore' label='Bright core' :allow-none='true' :allow-gradient='false'></paint-picker>
    </template>
  </section>

  <section class='card'>
    <div class='card-head'>
      <div>
        <div class='card-title'>3D buildings</div>
        <div class='card-text'>A bird's-eye view: buildings rise to their real mapped height.</div>
      </div>
      <toggle v-model='style.buildings3d' label='3D buildings'></toggle>
    </div>
    <template v-if='style.buildings3d'>
      <scrubber v-model='style.extrude' label='Height' :min='0.2' :max='4' :step='0.05' unit='×'></scrubber>
      <scrubber v-model='style.tilt' label='Tilt' :min='0' :max='1' :step='0.01' unit='percent'></scrubber>
      <div class='row-between'>
        <span>Light from</span>
        <dial v-model='style.lightAngle' label='Light direction'></dial>
      </div>
      <paint-picker v-model='style.buildingColor' label='Roofs' :allow-none='true'></paint-picker>
      <paint-picker v-model='style.buildingEdge' label='Outline' :allow-none='true' :allow-gradient='false'></paint-picker>
      <p class='hint' v-if='style.buildings === "none" || !studio.layers.buildings'>
        Buildings are hidden. <button type='button' class='link-button' @click='showBuildings'>Show them</button>
      </p>
    </template>
  </section>

  <section class='card'>
    <div class='card-title'>Emboss &amp; deboss</div>
    <div class='card-text'>A raised or pressed-in look, like letterpress. Try the same colour as the background.</div>
    <div v-for='t in reliefTargets' :key='t.key' class='relief-row'>
      <span>{{t.name}}</span>
      <chips v-model='style[t.key]' :options='reliefOptions' label='Effect'></chips>
    </div>
    <scrubber v-model='style.effectDepth' label='Depth' :min='0.1' :max='1' :step='0.01' unit='percent'></scrubber>
  </section>

  <section class='card'>
    <div class='card-title'>Fade with distance</div>
    <div class='card-text'>Streets and buildings fade out away from the {{studio.isTrack ? 'track' : 'centre'}}.</div>
    <scrubber v-model='style.fade' label='Fade' :min='0' :max='1' :step='0.01' unit='percent'></scrubber>
  </section>

  <section class='card'>
    <div class='card-title'>Focus blur</div>
    <div class='card-text'>Blur everything except what you select.</div>
    <scrubber v-model='studio.selection.blur' label='Blur' :min='0' :max='30' :step='0.5' unit='px'></scrubber>
    <button type='button' class='pill' @click='studio.togglePanel("select")'>
      {{hasSelection ? 'Change selection' : 'Select streets to keep sharp'}}
    </button>
  </section>
</div>
</template>

<script>
import tinycolor from 'tinycolor2';
import {mainColor} from '../lib/paint.js';
import Toggle from '../components/Toggle.vue';
import Scrubber from '../components/Scrubber.vue';
import Chips from '../components/Chips.vue';
import PaintPicker from '../components/PaintPicker.vue';
import Dial from '../components/Dial.vue';

export default {
  name: 'EffectsPanel',
  components: {Toggle, Scrubber, Chips, PaintPicker, Dial},
  inject: ['studio'],
  data() {
    return {
      reliefOptions: [{id: 'none', name: 'Flat'}, {id: 'emboss', name: 'Emboss'}, {id: 'deboss', name: 'Deboss'}]
    };
  },
  computed: {
    style() {
      return this.studio.style;
    },
    hasSelection() {
      return this.studio.selection.items.length > 0;
    },
    reliefTargets() {
      let t = [];
      if (this.studio.isTrack) t.push({key: 'trackEffect', name: 'Track'});
      t.push({key: 'streetEffect', name: 'Streets'}, {key: 'buildingEffect', name: 'Buildings'});
      return t;
    }
  },
  methods: {
    showBuildings() {
      this.studio.layers.buildings = true;
      if (this.style.buildings === 'none') this.style.buildings = 'fill';
    },
    toggleGlow(on) {
      let base = this.studio.isTrack ? this.style.track : this.style.selection;
      this.style.glow = on ? this.studio.copyPaint(base) : null;
      if (on && !this.style.glowStrength) this.style.glowStrength = 0.6;
      if (on && this.studio.isTrack && !this.style.trackCore) {
        this.style.trackCore = tinycolor(mainColor(base)).lighten(30).toHexString();
      }
    }
  }
}
</script>

<style lang='stylus' scoped>
.card {
  background: var(--soft);
  border-radius: 16px;
  padding: 14px;
  margin-bottom: 12px;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.card-title {
  font-weight: 600;
  font-size: 15px;
}

.card-text {
  font-size: 12.5px;
  color: var(--muted-ink);
  margin-top: 2px;
}

.relief-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 6px;
  span {
    font-size: 14px;
  }
  .chips {
    margin: 4px 0;
  }
}

.pill {
  margin-top: 4px;
}
</style>
