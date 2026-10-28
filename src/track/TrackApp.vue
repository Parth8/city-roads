<template>
<div class='track-app'>
  <track-picker v-if='!trackId' @select='selectTrack'></track-picker>
  <poster-editor v-else :track-id='trackId' :key='trackId' @back='selectTrack(null)'></poster-editor>
</div>
</template>

<script>
import TrackPicker from './TrackPicker.vue';
import PosterEditor from './PosterEditor.vue';
import {getTrackMeta} from './lib/catalog.js';
import {loadFonts} from './lib/themes.js';
import urlState from './lib/urlState.js';

export default {
  name: 'TrackApp',
  components: {TrackPicker, PosterEditor},
  data() {
    let trackId = urlState.get('track');
    return {
      trackId: getTrackMeta(trackId) ? trackId : null
    };
  },
  created() {
    loadFonts();
    window.addEventListener('popstate', this.onPopState);
  },
  beforeUnmount() {
    window.removeEventListener('popstate', this.onPopState);
  },
  methods: {
    selectTrack(id) {
      this.trackId = id;
      urlState.navigate(id ? {mode: 'tracks', track: id} : {mode: 'tracks'});
      window.scrollTo(0, 0);
    },
    onPopState() {
      let id = urlState.get('track');
      this.trackId = getTrackMeta(id) ? id : null;
    }
  }
}
</script>

<style lang='stylus'>
.track-app {
  position: fixed;
  inset: 0;
  overflow: auto;
  background: #f4f1ec;
  color: #1d1d1f;
  font-family: 'Barlow', 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-overflow-scrolling: touch;

  a {
    color: inherit;
  }

  button {
    font-family: inherit;
  }
}
</style>
