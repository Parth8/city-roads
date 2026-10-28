<template>
<div>
  <div class='label'>Quick gradient</div>
  <div class='targets'>
    <chips v-model='target' :options='targets' label='Apply the gradient to'></chips>
  </div>
  <div class='palettes'>
    <button v-for='p in palettes' :key='p.id' type='button' class='palette' :title='p.name' :style='{background: css(p)}'
      @click='apply(p)'><span>{{p.name}}</span></button>
  </div>

  <div class='label'>Colours</div>
  <div class='slots'>
    <paint-picker v-for='slot in slots' :key='slot.key' v-model='style[slot.key]' :label='slot.name' :allow-none='slot.optional'></paint-picker>
  </div>
  <p class='hint'>Tap a colour to pick a solid colour or a gradient. Water, parks and buildings follow the street colour until you set them.</p>
</div>
</template>

<script>
import {gradientPalettes, toCss} from '../lib/paint.js';
import PaintPicker from '../components/PaintPicker.vue';
import Chips from '../components/Chips.vue';

export default {
  name: 'ColoursPanel',
  components: {PaintPicker, Chips},
  inject: ['studio'],
  data() {
    return {palettes: gradientPalettes, target: this.studio.isTrack ? 'track' : 'streets'};
  },
  computed: {
    style() {
      return this.studio.style;
    },
    targets() {
      let t = [];
      if (this.studio.isTrack) t.push({id: 'track', name: 'Track'});
      t.push({id: 'streets', name: 'Streets'}, {id: 'map', name: 'Track + streets'}, {id: 'text', name: 'Title'},
        {id: 'background', name: 'Background'}, {id: 'selection', name: 'Selection'}, {id: 'everything', name: 'Everything'});
      if (!this.studio.isTrack) t = t.filter(x => x.id !== 'map');
      return t;
    },
    slots() {
      let s = this.studio;
      let slots = [{key: 'background', name: 'Background'}];
      if (s.isTrack) {
        slots.push({key: 'track', name: 'Track'}, {key: 'trackCasing', name: 'Track outline', optional: true});
      }
      slots.push(
        {key: 'streets', name: 'Streets'},
        {key: 'buildingColor', name: 'Buildings', optional: true},
        {key: 'water', name: 'Water', optional: true},
        {key: 'parks', name: 'Parks & woods', optional: true},
        {key: 'selection', name: 'Selected streets'},
        {key: 'text', name: 'Title'},
        {key: 'muted', name: 'Small text'},
        {key: 'accent', name: 'Accent'}
      );
      if (this.style.layout === 'inset') slots.push({key: 'mapBackground', name: 'Map panel', optional: true});
      return slots;
    }
  },
  methods: {
    css(p) {
      return toCss({stops: p.stops, angle: 0});
    },
    apply(palette) {
      let map = {
        map: ['track', 'streets'],
        everything: ['track', 'streets', 'text', 'selection'],
      };
      let keys = map[this.target] || [this.target];
      if (!this.studio.isTrack) keys = keys.filter(k => k !== 'track');
      this.studio.applyGradientTo(keys, palette);
    }
  }
}
</script>

<style lang='stylus' scoped>
.palettes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 6px 0 16px;
}

.palette {
  height: 44px;
  border-radius: 12px;
  border: 0;
  cursor: pointer;
  display: flex;
  align-items: flex-end;
  padding: 6px 8px;
  transition: transform 0.15s cubic-bezier(0.3, 1.4, 0.6, 1), box-shadow 0.15s;
  span {
    font-size: 11px;
    font-weight: 600;
    color: white;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  }
  &:hover {
    transform: translateY(-2px) scale(1.03);
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.18);
  }
  &:active {
    transform: scale(0.96);
  }
}

.slots {
  margin: 0 -10px;
}
</style>
