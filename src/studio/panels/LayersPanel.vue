<template>
<div>
  <p class='hint'>Switch anything off that you don't want on the poster. Tap a row for its settings.</p>
  <section v-for='group in groups' :key='group.name' class='group'>
    <div class='label'>{{group.name}}</div>
    <div v-for='row in group.rows' :key='row.id' class='layer' :class='{open: expanded === row.id, off: !layers[row.id]}'>
      <div class='layer-row'>
        <toggle v-model='layers[row.id]' :label='row.name'></toggle>
        <button type='button' class='layer-name' @click='expand(row)' :disabled='!row.settings'>
          <span>{{row.name}}</span>
          <small v-if='row.note'>{{row.note}}</small>
          <icon v-if='row.settings' name='chevron' :size='16' class='chevron'></icon>
        </button>
      </div>
      <transition name='expand'>
        <div v-if='expanded === row.id && row.settings' class='layer-settings'>
          <template v-if='row.id === "track"'>
            <scrubber v-model='style.trackWidth' label='Width' :min='1' :max='30' :step='0.5'></scrubber>
          </template>
          <template v-if='row.id === "streets"'>
            <scrubber v-model='style.streetOpacity' label='Opacity' :min='0.05' :max='1' :step='0.01' unit='percent'></scrubber>
            <scrubber v-model='style.streetWidth' label='Line width' :min='0.2' :max='4' :step='0.1'></scrubber>
            <scrubber v-model='style.fade' label='Fade with distance' :min='0' :max='1' :step='0.01' unit='percent'></scrubber>
          </template>
          <template v-if='row.id === "buildings"'>
            <chips v-model='style.buildings' :options='buildingModes' fill label='Buildings'></chips>
          </template>
        </div>
      </transition>
    </div>
  </section>
  <p class='hint' v-if='studio.detail !== "full" && studio.streetsLoaded'>
    This is a large area, so {{detailNote}} were left out to keep it fast.
  </p>
</div>
</template>

<script>
import Toggle from '../components/Toggle.vue';
import Scrubber from '../components/Scrubber.vue';
import Chips from '../components/Chips.vue';
import Icon from '../components/Icon.vue';

export default {
  name: 'LayersPanel',
  components: {Toggle, Scrubber, Chips, Icon},
  inject: ['studio'],
  data() {
    return {
      expanded: null,
      buildingModes: [{id: 'outline', name: 'Outline'}, {id: 'fill', name: 'Filled'}, {id: 'none', name: 'Hidden'}]
    };
  },
  computed: {
    layers() {
      return this.studio.layers;
    },
    style() {
      return this.studio.style;
    },
    groups() {
      let s = this.studio;
      let subject = s.prepared;
      let map = [];
      if (s.isTrack) {
        map.push({id: 'track', name: 'Circuit', settings: true});
        if (subject && subject.pit.length) map.push({id: 'pit', name: 'Pit lane'});
        if (subject && subject.start) map.push({id: 'start', name: 'Start / finish flag'});
        if (subject && subject.corners.length) map.push({id: 'corners', name: 'Corner names', note: subject.corners.length + ' from OpenStreetMap'});
      }
      map.push(
        {id: 'streets', name: 'Streets', settings: true},
        {id: 'buildings', name: 'Buildings', settings: true},
        {id: 'water', name: 'Water'},
        {id: 'parks', name: 'Parks & woods'},
        {id: 'rail', name: 'Railways'}
      );
      let labels = [
        {id: 'title', name: 'Title'},
        {id: 'subtitle', name: 'Subtitle'},
        {id: 'tagline', name: 'Tagline'}
      ];
      if (s.isTrack) labels.push({id: 'stats', name: 'Stats', note: 'Stats layout'});
      labels.push({id: 'coords', name: 'Coordinates', note: 'Framed layout'});
      if (s.flag) labels.push({id: 'flag', name: 'Country flag'});
      labels.push({id: 'north', name: 'North arrow'}, {id: 'attribution', name: 'Map credit', note: 'please keep for shared prints'});
      return [{name: 'Map', rows: map}, {name: 'Labels', rows: labels}];
    },
    detailNote() {
      let d = this.studio.detail;
      if (d === 'major') return 'small streets, buildings and parks';
      if (d === 'roads') return 'footpaths, service roads, buildings and parks';
      return 'buildings';
    }
  },
  methods: {
    expand(row) {
      if (!row.settings) return;
      this.expanded = this.expanded === row.id ? null : row.id;
    }
  }
}
</script>

<style lang='stylus' scoped>
.group {
  margin-bottom: 8px;
}

.layer {
  border-radius: 12px;
  transition: background 0.2s;
  &.open {
    background: var(--soft);
  }
  &.off .layer-name span {
    color: var(--muted-ink);
  }
}

.layer-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 8px;
}

.layer-name {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 0;
  background: transparent;
  font: inherit;
  font-size: 14.5px;
  color: var(--ink);
  text-align: left;
  padding: 6px 0;
  cursor: pointer;
  min-width: 0;
  &:disabled {
    cursor: default;
  }
  small {
    color: var(--muted-ink);
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .chevron {
    margin-left: auto;
    transition: transform 0.2s;
    color: var(--muted-ink);
    .open & {
      transform: rotate(90deg);
    }
  }
}

.layer-settings {
  padding: 0 10px 8px;
}

.expand-enter-active, .expand-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.expand-enter-from, .expand-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
