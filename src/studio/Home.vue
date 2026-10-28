<template>
<div class='home'>
  <header class='hero'>
    <div class='brand'>Map Poster Studio</div>
    <h1>Make art from any map.</h1>
    <p>Race circuits, cities, the street you grew up on. Style them, then download a print, a wallpaper or a post. Everything runs in your browser.</p>
    <div class='tabs' role='tablist'>
      <button type='button' role='tab' :aria-selected='tab === "tracks"' :class='{active: tab === "tracks"}' @click='tab = "tracks"'>
        <icon name='track' :size='18'></icon> Race tracks
      </button>
      <button type='button' role='tab' :aria-selected='tab === "places"' :class='{active: tab === "places"}' @click='tab = "places"'>
        <icon name='pin' :size='18'></icon> Any place
      </button>
    </div>
  </header>

  <section v-if='tab === "tracks"' class='content'>
    <div class='search'>
      <icon name='search' :size='18'></icon>
      <input type='search' v-model='query' placeholder='Search circuits, cities or countries' aria-label='Search circuits' ref='trackSearch'>
    </div>
    <chips v-model='series' :options='seriesOptions' label='Filter by series'></chips>
    <transition-group name='card' tag='div' class='grid'>
      <button v-for='track in filtered' :key='track.id' type='button' class='card' @click='$emit("open", {kind: "track", id: track.id})'>
        <svg viewBox='-6 -6 112 112' class='outline' aria-hidden='true'>
          <path :d='track.outline' fill='none' stroke='currentColor' stroke-width='3.2' stroke-linejoin='round' stroke-linecap='round'></path>
        </svg>
        <span class='card-text'>
          <span class='card-title'>{{track.name}}</span>
          <span class='card-subtitle'>{{track.title}}, {{track.country}}</span>
          <span class='card-meta'>{{lengthOf(track)}} · {{track.series.slice(0, 3).join(' · ')}}</span>
        </span>
      </button>
    </transition-group>
    <p v-if='!filtered.length' class='empty'>No circuits match "{{query}}".</p>
  </section>

  <section v-else class='content'>
    <form class='search' @submit.prevent='searchPlaces'>
      <icon name='search' :size='18'></icon>
      <input type='search' v-model='placeQuery' placeholder='A city, a neighbourhood, an island…' aria-label='Search a place' ref='placeSearch'>
      <button type='submit' class='search-button' :disabled='!placeQuery.trim() || searching'>{{searching ? 'Searching…' : 'Search'}}</button>
    </form>
    <div v-if='!places.length && !searching' class='ideas'>
      <span>Try</span>
      <button v-for='idea in ideas' :key='idea' type='button' class='pill ghost' @click='placeQuery = idea; searchPlaces()'>{{idea}}</button>
    </div>
    <p v-if='placeError' class='error-text' role='alert'>{{placeError}}</p>
    <transition-group name='card' tag='ul' class='places'>
      <li v-for='place in places' :key='place.key'>
        <button type='button' class='place' @click='openPlace(place)'>
          <span class='place-name'>{{place.displayName}}</span>
          <span class='place-meta'>{{place.type}} · {{place.areaLabel}}<template v-if='place.note'> · {{place.note}}</template></span>
        </button>
      </li>
    </transition-group>
  </section>

  <footer class='footer'>
    Need every single road of a huge city? Use <a href='?mode=classic'>classic City Roads</a> (WebGL, by Andrei Kashcha).
    Map data © <a href='https://www.openstreetmap.org/copyright' target='_blank' rel='noopener'>OpenStreetMap contributors</a>.
    <a :href='repoUrl' target='_blank' rel='noopener'>Source code</a>.
  </footer>
</div>
</template>

<script>
import {tracks, seriesList} from './lib/catalog.js';
import {bboxAreaKm2} from './lib/geo.js';
import findBoundaryByName from '../lib/findBoundaryByName.js';
import config from '../config.js';
import Chips from './components/Chips.vue';
import Icon from './components/Icon.vue';

export default {
  name: 'Home',
  components: {Chips, Icon},
  props: {
    initialTab: {type: String, default: 'tracks'}
  },
  emits: ['open'],
  data() {
    return {
      tab: this.initialTab,
      query: '',
      series: 'all',
      seriesOptions: [{id: 'all', name: 'All'}].concat(seriesList.map(s => ({id: s, name: s}))),
      placeQuery: '',
      places: [],
      searching: false,
      placeError: null,
      ideas: ['Manhattan', 'Paris', 'Shibuya', 'Venice', 'Amsterdam', 'San Francisco', 'Kyoto', 'Reykjavík'],
      repoUrl: config.repoUrl
    };
  },
  computed: {
    filtered() {
      let words = normalize(this.query).split(' ').filter(Boolean);
      return tracks.filter(track => {
        if (this.series !== 'all' && !track.series.includes(this.series)) return false;
        if (!words.length) return true;
        let haystack = normalize([track.name, track.title, track.country, track.nickname, track.series.join(' ')].join(' '));
        return words.every(w => haystack.includes(w));
      });
    }
  },
  methods: {
    lengthOf(track) {
      let km = track.length || track.computedLength;
      return km ? km.toFixed(2) + ' km' : '';
    },
    searchPlaces() {
      let q = this.placeQuery.trim();
      if (!q) return;
      this.searching = true;
      this.placeError = null;
      findBoundaryByName(q).then(results => {
        this.places = results.filter(r => r.bbox).map(r => {
          // Nominatim boxes are [south, west, north, east]; we use [west, south, east, north].
          let bbox = [r.bbox[1], r.bbox[0], r.bbox[3], r.bbox[2]];
          let area = bboxAreaKm2(bbox);
          return {
            key: r.osmType + r.osmId,
            name: r.name.split(',')[0],
            displayName: r.name,
            type: (r.type || 'place').replace(/_/g, ' '),
            bbox,
            areaLabel: area < 1 ? `${Math.round(area * 100)} ha` : `${Math.round(area).toLocaleString()} km²`,
            note: area > 2500 ? 'main roads only' : area > 150 ? 'no footpaths or buildings' : ''
          };
        });
        if (!this.places.length) this.placeError = `Nothing found for "${q}".`;
      }).catch(e => {
        console.error(e);
        this.placeError = 'Could not reach the OpenStreetMap search. Please try again.';
      }).finally(() => {
        this.searching = false;
      });
    },
    openPlace(place) {
      this.$emit('open', {kind: 'place', name: place.name, displayName: place.displayName, bbox: place.bbox});
    }
  }
}

function normalize(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
</script>

<style lang='stylus' scoped>
.home {
  min-height: 100%;
  background: radial-gradient(1200px 600px at 10% -10%, #ffe2d6 0%, transparent 60%), radial-gradient(900px 500px at 100% 0%, #dbe7ff 0%, transparent 55%), var(--paper);
}

.hero {
  max-width: 1180px;
  margin: 0 auto;
  padding: 40px 20px 8px;
  h1 {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 600;
    font-size: clamp(40px, 7vw, 72px);
    line-height: 0.95;
    letter-spacing: -0.01em;
    margin: 10px 0 12px;
  }
  p {
    max-width: 620px;
    font-size: 17px;
    line-height: 1.5;
    color: #4a4a52;
    margin: 0 0 24px;
  }
}

.brand {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--brand);
}

.tabs {
  display: inline-flex;
  background: white;
  border-radius: 999px;
  padding: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  button {
    display: flex;
    align-items: center;
    gap: 8px;
    border: 0;
    background: transparent;
    border-radius: 999px;
    padding: 10px 18px;
    font: inherit;
    font-size: 15px;
    cursor: pointer;
    color: var(--ink);
    transition: background 0.2s, color 0.2s;
    &.active {
      background: var(--ink);
      color: white;
    }
  }
}

.content {
  max-width: 1180px;
  margin: 0 auto;
  padding: 20px 20px 40px;
}

.search {
  display: flex;
  align-items: center;
  gap: 10px;
  background: white;
  border-radius: 16px;
  padding: 4px 6px 4px 16px;
  max-width: 620px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.07);
  input {
    flex: 1;
    min-width: 0;
    border: 0;
    font: inherit;
    font-size: 17px;
    padding: 12px 0;
    background: transparent;
    outline: none;
  }
}

.search-button {
  border: 0;
  border-radius: 12px;
  background: var(--ink);
  color: white;
  font: inherit;
  padding: 10px 16px;
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
  }
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
  margin-top: 12px;
}

.card {
  display: flex;
  flex-direction: column;
  text-align: left;
  border: 0;
  border-radius: 18px;
  background: white;
  padding: 0;
  cursor: pointer;
  overflow: hidden;
  font: inherit;
  color: var(--ink);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  transition: transform 0.22s cubic-bezier(0.3, 1.3, 0.6, 1), box-shadow 0.22s;
  &:hover, &:focus-visible {
    transform: translateY(-4px);
    box-shadow: 0 14px 30px rgba(0, 0, 0, 0.14);
    outline: none;
  }
}

.outline {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  padding: 18px 28px;
  background: linear-gradient(160deg, #1c1c22, #2c2c36);
  color: #f2f2f2;
  transition: color 0.25s;
  .card:hover & {
    color: #ff4b3a;
  }
}

.card-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 14px 14px;
}

.card-title {
  font-weight: 600;
  font-size: 15.5px;
}

.card-subtitle {
  font-size: 13.5px;
  color: #5c5c64;
}

.card-meta {
  font-size: 12px;
  color: #85858d;
  margin-top: 4px;
}

.ideas {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  color: #6b6b72;
  font-size: 14px;
}

.places {
  list-style: none;
  padding: 0;
  margin: 16px 0 0;
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.place {
  width: 100%;
  text-align: left;
  border: 0;
  border-radius: 14px;
  background: white;
  padding: 14px 16px;
  font: inherit;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 3px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  transition: transform 0.18s, box-shadow 0.18s;
  &:hover {
    transform: translateX(4px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  }
}

.place-name {
  font-weight: 600;
  color: var(--ink);
}

.place-meta {
  font-size: 13px;
  color: #6b6b72;
  text-transform: capitalize;
}

.empty {
  color: #5c5c64;
}

.footer {
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 20px 40px;
  font-size: 13px;
  color: #6b6b72;
  line-height: 1.6;
}

.card-enter-active, .card-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.card-enter-from, .card-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
.card-leave-active {
  position: absolute;
  visibility: hidden;
}

@media (max-width: 520px) {
  .grid {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .hero {
    padding-top: 28px;
  }
}
</style>
