<template>
<div class='track-picker'>
  <header class='picker-header'>
    <a class='back-link' href='./'>← city roads</a>
    <h1>Race track posters</h1>
    <p class='lead'>
      Pick a circuit, style it, and download a print-ready poster: the track in bold, the streets around it
      faded into the background. Track layouts and streets come from OpenStreetMap.
    </p>
    <div class='search-row'>
      <input class='search' type='search' v-model='query' placeholder='Search circuits, cities or countries' ref='search' aria-label='Search circuits'>
    </div>
    <div class='chips' role='group' aria-label='Filter by series'>
      <button :class='{chip: true, active: !series}' @click='series = null'>All</button>
      <button v-for='s in seriesList' :key='s' :class='{chip: true, active: series === s}' @click='series = series === s ? null : s'>{{s}}</button>
    </div>
  </header>

  <div class='grid'>
    <button v-for='track in filtered' :key='track.id' class='card' @click='$emit("select", track.id)'>
      <svg viewBox='-6 -6 112 112' class='outline' aria-hidden='true'>
        <path :d='track.outline' fill='none' stroke='currentColor' stroke-width='3.2' stroke-linejoin='round' stroke-linecap='round'></path>
      </svg>
      <div class='card-text'>
        <div class='card-title'>{{track.name}}</div>
        <div class='card-subtitle'>{{track.title}}, {{track.country}}</div>
        <div class='card-meta'>
          <span>{{lengthOf(track)}}</span>
          <span class='series'>{{track.series.join(' · ')}}</span>
        </div>
      </div>
    </button>
  </div>
  <p v-if='!filtered.length' class='empty'>
    No circuits match "{{query}}".
  </p>
  <footer class='picker-footer'>
    Missing a circuit? Add it to <code>scripts/tracks/catalog.mjs</code> and run <code>npm run build:tracks</code>.
    Map data © <a href='https://www.openstreetmap.org/copyright' target='_blank' rel='noopener'>OpenStreetMap contributors</a>.
  </footer>
</div>
</template>

<script>
import {tracks, seriesList} from './lib/catalog.js';

export default {
  name: 'TrackPicker',
  emits: ['select'],
  data() {
    return {
      query: '',
      series: null,
      seriesList
    };
  },
  computed: {
    filtered() {
      let words = normalize(this.query).split(' ').filter(Boolean);
      return tracks.filter(track => {
        if (this.series && !track.series.includes(this.series)) return false;
        if (!words.length) return true;
        let haystack = normalize([track.name, track.title, track.country, track.nickname, track.series.join(' ')].join(' '));
        return words.every(w => haystack.includes(w));
      });
    }
  },
  mounted() {
    if (window.innerWidth > 600) this.$refs.search.focus();
  },
  methods: {
    lengthOf(track) {
      let km = track.length || track.computedLength;
      return km ? km.toFixed(3) + ' km' : '';
    }
  }
}

function normalize(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
</script>

<style lang='stylus' scoped>
.track-picker {
  max-width: 1180px;
  margin: 0 auto;
  padding: 24px 16px 48px;
}

.back-link {
  text-decoration: none;
  font-size: 14px;
  color: #6b6b6b;
  &:hover {
    color: #1d1d1f;
  }
}

h1 {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 600;
  font-size: 44px;
  letter-spacing: 0.02em;
  margin: 12px 0 4px;
  text-transform: uppercase;
}

.lead {
  max-width: 640px;
  margin: 0 0 20px;
  font-size: 17px;
  line-height: 1.45;
  color: #4a4a4a;
}

.search {
  width: 100%;
  max-width: 520px;
  font-size: 17px;
  font-family: inherit;
  padding: 12px 14px;
  border: 1px solid #cfcac2;
  border-radius: 8px;
  background: white;
  outline: none;
  &:focus {
    border-color: #1d1d1f;
  }
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 14px 0 24px;
}

.chip {
  border: 1px solid #cfcac2;
  background: white;
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 14px;
  cursor: pointer;
  color: #1d1d1f;
  &.active {
    background: #1d1d1f;
    border-color: #1d1d1f;
    color: white;
  }
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}

.card {
  display: flex;
  flex-direction: column;
  text-align: left;
  border: 1px solid #e3ded6;
  border-radius: 10px;
  background: white;
  padding: 0;
  cursor: pointer;
  overflow: hidden;
  color: #1d1d1f;
  transition: transform 0.12s ease-out, box-shadow 0.12s ease-out;
  &:hover, &:focus-visible {
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
    outline: none;
  }
}

.outline {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  padding: 18px 28px;
  background: #222;
  color: #f2f2f2;
  .card:hover & {
    color: #ff4b3a;
  }
}

.card-text {
  padding: 12px 14px 14px;
}

.card-title {
  font-weight: 600;
  font-size: 16px;
  line-height: 1.25;
}

.card-subtitle {
  font-size: 14px;
  color: #5c5c5c;
  margin-top: 2px;
}

.card-meta {
  display: flex;
  gap: 10px;
  justify-content: space-between;
  font-size: 12px;
  color: #7a7a7a;
  margin-top: 8px;
  .series {
    text-align: right;
  }
}

.empty {
  color: #5c5c5c;
}

.picker-footer {
  margin-top: 36px;
  font-size: 13px;
  color: #6b6b6b;
  line-height: 1.5;
  code {
    background: #e8e3da;
    padding: 1px 4px;
    border-radius: 3px;
  }
}

@media (max-width: 450px) {
  h1 {
    font-size: 34px;
  }
  .grid {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .card-meta .series {
    display: none;
  }
}
</style>
