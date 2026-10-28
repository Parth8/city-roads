<template>
<div>
  <div class='mode-card' :class='{on: studio.selectMode}'>
    <div>
      <div class='card-title'>{{studio.selectMode ? 'Tap the poster to select' : 'Selecting is off'}}</div>
      <div class='card-text'>Tap streets{{studio.isTrack ? ' or the circuit' : ''}} to pick them; tap again to drop them.</div>
    </div>
    <toggle :model-value='studio.selectMode' @update:model-value='studio.setSelectMode' label='Select by tapping'></toggle>
  </div>

  <label class='field search'>
    <span>Find a street</span>
    <input type='search' v-model='query' list='street-names' :placeholder='studio.streetsLoaded ? "Type a street name" : "Loading streets…"'
      @change='addByName' @keydown.enter.prevent='addByName'>
    <datalist id='street-names'>
      <option v-for='name in suggestions' :key='name' :value='name'></option>
    </datalist>
  </label>
  <button v-if='studio.isTrack && !hasTrack' type='button' class='pill ghost' @click='studio.toggleSelection({key: "track", label: "Circuit"})'>
    <icon name='track' :size='16'></icon> Select the circuit
  </button>

  <div v-if='items.length' class='selected'>
    <div class='label'>Selected ({{items.length}})</div>
    <transition-group name='chip' tag='div' class='selected-chips'>
      <button v-for='item in items' :key='item.key' type='button' class='selected-chip' @click='studio.toggleSelection(item)' :title='"Remove " + item.label'>
        {{item.label}} <icon name='close' :size='14'></icon>
      </button>
    </transition-group>
    <button type='button' class='link-button' @click='studio.clearSelection()'>Clear all</button>
  </div>
  <p v-else class='hint'>Nothing selected yet.</p>

  <template v-if='items.length'>
    <div class='label'>What happens to the rest</div>
    <chips v-model='selection.mode' :options='modes' fill label='Selection mode'></chips>
    <p class='hint' v-if='selection.mode === "isolate"'>Only your selection is drawn: extract a single street or the circuit.</p>
    <scrubber v-if='selection.mode === "highlight"' v-model='selection.blur' label='Blur everything else' :min='0' :max='30' :step='0.5' unit='px'></scrubber>

    <div class='label'>Selected streets look</div>
    <paint-picker v-model='studio.style.selection' label='Colour'></paint-picker>
    <scrubber v-model='studio.style.selectionWidth' label='Width' :min='0.5' :max='8' :step='0.1'></scrubber>
  </template>
</div>
</template>

<script>
import Toggle from '../components/Toggle.vue';
import Chips from '../components/Chips.vue';
import Scrubber from '../components/Scrubber.vue';
import PaintPicker from '../components/PaintPicker.vue';
import Icon from '../components/Icon.vue';

export default {
  name: 'SelectPanel',
  components: {Toggle, Chips, Scrubber, PaintPicker, Icon},
  inject: ['studio'],
  data() {
    return {
      query: '',
      modes: [{id: 'highlight', name: 'Highlight'}, {id: 'isolate', name: 'Only selection'}]
    };
  },
  computed: {
    selection() {
      return this.studio.selection;
    },
    items() {
      return this.selection.items;
    },
    hasTrack() {
      return this.items.some(x => x.key === 'track');
    },
    suggestions() {
      let q = this.query.trim().toLowerCase();
      let names = this.studio.streetNames || [];
      if (!q) return names.slice(0, 50);
      return names.filter(n => n.toLowerCase().includes(q)).slice(0, 50);
    }
  },
  methods: {
    addByName() {
      let name = (this.studio.streetNames || []).find(n => n.toLowerCase() === this.query.trim().toLowerCase());
      if (!name) return;
      this.studio.selectStreetByName(name);
      this.query = '';
    }
  }
}
</script>

<style lang='stylus' scoped>
.mode-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-radius: 16px;
  padding: 14px;
  background: var(--soft);
  margin-bottom: 8px;
  transition: background 0.25s, color 0.25s;
  &.on {
    background: var(--ink);
    color: white;
    .card-text {
      color: rgba(255, 255, 255, 0.75);
    }
  }
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

.selected-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 6px 0;
}

.selected-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 0;
  border-radius: 999px;
  padding: 6px 10px 6px 12px;
  background: var(--brand);
  color: white;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.chip-enter-active, .chip-leave-active {
  transition: all 0.2s;
}
.chip-enter-from, .chip-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
</style>
