<template>
<div class='studio-app'>
  <home v-if='!subject' :initial-tab='tab' @open='open'></home>
  <studio v-else :subject-ref='subject' :key='subjectKey' @back='close'></studio>
</div>
</template>

<script>
import Home from './Home.vue';
import Studio from './Studio.vue';
import {getTrackMeta} from './lib/catalog.js';
import {loadFonts} from './lib/fonts.js';
import urlState from './lib/urlState.js';

/**
 * Picks what to show from the address: ?track=monaco, ?place=Paris&bbox=w,s,e,n,
 * or the home page. Back and forward move between them.
 */
export default {
  name: 'StudioApp',
  components: {Home, Studio},
  data() {
    return {subject: subjectFromUrl(), tab: 'tracks'};
  },
  computed: {
    subjectKey() {
      let s = this.subject;
      return s ? (s.kind === 'track' ? s.id : s.bbox.join(',')) : '';
    }
  },
  created() {
    loadFonts();
    window.addEventListener('popstate', this.onPopState);
  },
  beforeUnmount() {
    window.removeEventListener('popstate', this.onPopState);
  },
  methods: {
    open(subject) {
      this.subject = subject;
      this.tab = subject.kind === 'track' ? 'tracks' : 'places';
      if (subject.kind === 'track') urlState.navigate({track: subject.id});
      else urlState.navigate({place: subject.displayName, bbox: subject.bbox.map(x => x.toFixed(5)).join(',')});
      window.scrollTo(0, 0);
    },
    close() {
      this.subject = null;
      urlState.navigate({});
    },
    onPopState() {
      this.subject = subjectFromUrl();
    }
  }
}

function subjectFromUrl() {
  let track = urlState.get('track');
  if (track && getTrackMeta(track)) return {kind: 'track', id: track};
  let place = urlState.get('place');
  let bbox = (urlState.get('bbox') || '').split(',').map(Number);
  if (place && bbox.length === 4 && bbox.every(Number.isFinite)) {
    return {kind: 'place', name: place.split(',')[0], displayName: place, bbox};
  }
  return null;
}
</script>

<style lang='stylus'>
.studio-app {
  --ink: #17171a;
  --muted-ink: #6b6b72;
  --line: #e4e0d9;
  --soft: #f3f1ed;
  --paper: #f7f5f1;
  --brand: #e10600;
  --fill-from: #d9d4cc;
  --fill-to: #c4beb4;

  position: fixed;
  inset: 0;
  overflow: auto;
  background: var(--paper);
  color: var(--ink);
  font-family: 'Barlow', system-ui, -apple-system, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  -webkit-overflow-scrolling: touch;

  button, input, select {
    font-family: inherit;
  }

  .label {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted-ink);
    margin: 18px 0 6px;
    small {
      text-transform: none;
      letter-spacing: 0;
      font-weight: 400;
    }
  }

  .hint {
    font-size: 12.5px;
    color: var(--muted-ink);
    line-height: 1.45;
    margin: 8px 0;
  }

  .error-text {
    color: #b00020;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin: 10px 0;
    font-size: 13px;
    color: var(--muted-ink);
    flex: 1;
    min-width: 0;
    small {
      color: var(--muted-ink);
    }
    input, select {
      font-size: 15px;
      padding: 10px 12px;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: white;
      color: var(--ink);
      width: 100%;
      transition: border-color 0.15s, box-shadow 0.15s;
      &:focus {
        outline: none;
        border-color: var(--ink);
        box-shadow: 0 0 0 3px rgba(23, 23, 26, 0.08);
      }
    }
  }

  .row-between {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 10px 0;
    font-size: 14.5px;
  }

  .icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border: 0;
    border-radius: 12px;
    background: transparent;
    color: var(--ink);
    cursor: pointer;
    transition: background 0.15s;
    &:hover:not(:disabled) {
      background: var(--soft);
    }
    &:disabled {
      opacity: 0.3;
      cursor: default;
    }
  }

  .pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 0;
    border-radius: 999px;
    background: var(--ink);
    color: white;
    padding: 9px 14px;
    font-size: 14px;
    cursor: pointer;
    transition: transform 0.12s, background 0.15s;
    &:active {
      transform: scale(0.96);
    }
    &.ghost {
      background: white;
      color: var(--ink);
      box-shadow: 0 0 0 1px var(--line) inset;
      &:hover {
        box-shadow: 0 0 0 1px var(--ink) inset;
      }
    }
  }

  .link-button {
    border: 0;
    background: transparent;
    padding: 4px 0;
    color: var(--brand);
    cursor: pointer;
    font-size: 14px;
  }

  .fade-enter-active, .fade-leave-active {
    transition: opacity 0.18s;
  }
  .fade-enter-from, .fade-leave-to {
    opacity: 0;
  }
}
</style>
