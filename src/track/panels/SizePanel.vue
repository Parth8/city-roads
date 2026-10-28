<template>
<details class='panel' open>
  <summary>Size &amp; border</summary>
  <div class='segmented'>
    <button :class='{active: settings.kind === "print"}' @click='settings.kind = "print"'>Print</button>
    <button :class='{active: settings.kind === "screen"}' @click='settings.kind = "screen"'>Wallpaper</button>
  </div>

  <template v-if='settings.kind === "print"'>
    <label class='field'>
      <span>Paper</span>
      <select v-model='settings.paper'>
        <option v-for='p in paperSizes' :key='p.id' :value='p.id'>{{p.name}}</option>
      </select>
    </label>
    <div class='segmented'>
      <button :class='{active: !settings.landscape}' @click='settings.landscape = false'>Portrait</button>
      <button :class='{active: settings.landscape}' @click='settings.landscape = true'>Landscape</button>
    </div>
    <div class='segmented'>
      <button v-for='dpi in [150, 300]' :key='dpi' :class='{active: settings.dpi === dpi}' @click='settings.dpi = dpi'>{{dpi}} dpi</button>
    </div>
  </template>

  <template v-else>
    <label class='field'>
      <span>Screen</span>
      <select v-model='settings.screen'>
        <optgroup v-for='group in screenGroups' :key='group.name' :label='group.name'>
          <option v-for='s in group.sizes' :key='s.id' :value='s.id'>{{s.name}}<template v-if='s.width'> ({{s.width}} × {{s.height}})</template></option>
        </optgroup>
      </select>
    </label>
    <div class='row-fields' v-if='settings.screen === "custom"'>
      <label class='field'>
        <span>Width (px)</span>
        <input type='number' min='200' max='16000' v-model.number='settings.customWidth'>
      </label>
      <label class='field'>
        <span>Height (px)</span>
        <input type='number' min='200' max='16000' v-model.number='settings.customHeight'>
      </label>
    </div>
  </template>
  <p class='hint' v-if='editor.output.reduced'>Lowered to {{editor.output.width}} × {{editor.output.height}} px so that browsers can create the image.</p>

  <div class='label'>Border</div>
  <div class='segmented'>
    <button v-for='b in borderStyles' :key='b.id' :class='{active: border.style === b.id}' @click='border.style = b.id'>{{b.name}}</button>
  </div>
  <template v-if='border.style !== "none"'>
    <label class='slider'>
      <span>Thickness <em>{{Math.round(border.size * 1000) / 10}}%</em></span>
      <input type='range' min='0.01' max='0.12' step='0.005' v-model.number='border.size'>
    </label>
    <div class='colors'>
      <label class='color'>
        <input type='color' v-model='border.color'>
        <span>Border</span>
      </label>
      <label class='color' v-if='border.style === "polaroid"'>
        <input type='color' v-model='border.captionColor'>
        <span>Caption</span>
      </label>
    </div>
    <label class='field' v-if='border.style === "polaroid"'>
      <span>Caption <small>(handwritten on the bottom)</small></span>
      <input type='text' v-model='border.caption' :placeholder='editor.text.title'>
    </label>
  </template>
</details>
</template>

<script>
import {paperSizes, screenSizes} from '../lib/outputs.js';
import {borderStyles} from '../../lib/artwork.js';

export default {
  name: 'SizePanel',
  inject: ['editor'],
  data() {
    let groups = [];
    screenSizes.forEach(size => {
      let group = groups.find(g => g.name === size.group);
      if (!group) groups.push(group = {name: size.group, sizes: []});
      group.sizes.push(size);
    });
    return {paperSizes, screenGroups: groups, borderStyles};
  },
  computed: {
    settings() {
      return this.editor.outputSettings;
    },
    border() {
      return this.editor.border;
    }
  }
}
</script>
