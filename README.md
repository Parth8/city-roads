# Map Poster Studio (city-roads)

Make prints, wallpapers and social posts from any map: race circuits, cities, the street you grew up on.
https://parth8.github.io/city-roads/

This is a fork of [anvaka/city-roads](https://github.com/anvaka/city-roads) by Andrei Kashcha, whose
WebGL "every road in a city" viewer still lives here as [classic mode](https://parth8.github.io/city-roads/?mode=classic).
It has no analytics, ads or shop: everything runs in your browser, and the only servers it talks to are
OpenStreetMap's, Google Fonts, and the original author's city cache.

## The studio

* **Subjects:** 96 race circuits (F1, MotoGP, WEC, IMSA, IndyCar, NASCAR, Supercars, DTM, Super GT, WSBK,
  BTCC, Isle of Man TT and historic venues), or any place you can search for.
* **23 looks** to start from, previewed live on your map, and a "Surprise me" button.
* **Layers:** circuit, pit lane, start/finish flag, corner names (from OpenStreetMap), streets, buildings,
  water, parks and woods, railways, landmark names (monuments, museums, peaks), and every piece of text.
  Switch off anything you don't want.
* **3D buildings:** a bird's-eye view where buildings rise to their real mapped height, with controls for
  height, tilt, light direction, roof colour and outlines. Search a monument ("Tokyo Tower", "Eiffel
  Tower", "Central Park") and it opens as a little 3D model with its landmarks named.
* **Colours and gradients** for every part (background, track, streets, buildings, water, parks, title…),
  with 18 gradient palettes you can apply to one part or to everything.
* **Effects:** neon glow, emboss and deboss (raised or pressed-in, like letterpress), fade with distance,
  and a focus blur that blurs everything except your selection.
* **Select:** tap streets or the circuit (or search them by name) to highlight them, blur the rest, or keep
  only the selection to extract a single street or track.
* **Any size:** print sizes from A6 to A0, B sizes, US paper and frame sizes, posters up to 70×100 cm;
  phones, tablets, laptops, 4K/5K/8K, 21:9 and 32:9 ultrawide, watches; Instagram, stories, X, LinkedIn,
  YouTube and more; or any custom size in px, mm, cm or inches. Every size works portrait or landscape.
* **Frames:** none, a border in any colour, or a polaroid frame with a handwritten caption.
* **Downloads:** PNG, JPEG, WebP, AVIF (where the browser supports it) and SVG with fonts embedded, with
  or without the border. Everything is drawn as vectors, so any size stays sharp. Browsers cannot encode
  HEIC/HEIF, so it is not offered.
* Drag to move, pinch or scroll to zoom, twist with two fingers (or Shift+scroll, or the dial) to rotate.
  Undo and redo (Ctrl/Cmd+Z), and your design is remembered in your browser.
* Works on phones (bottom tabs and sheets), tablets and desktops.

Circuit layouts are extracted from OpenStreetMap ahead of time and ship with the site, so they appear
instantly. Streets, water, buildings (with heights) and landmarks come from OpenStreetMap through:

1. [OpenFreeMap](https://openfreemap.org) vector tiles, served from a CDN and decoded in a web worker:
   usually a few seconds even for a whole city;
2. [VersaTiles](https://versatiles.org) vector tiles, if OpenFreeMap does not answer;
3. Overpass (several public servers), if neither tile service answers, or when you pick
   **Layers › Map data › Raw OSM** for every last footpath.

**Layers › Map data** trades download size for detail: Fast, Detailed (default) or Ultra. Large areas
are drawn from lower-zoom tiles, which simplify small streets and buildings. The map credit on the
poster names whichever source was used.

## Classic mode: how it is made

The data is fetched from OpenStreetMap using [overpass API](http://overpass-turbo.eu/). While that API
is free (as long as you follow ODbL licenses), it can be rate-limited and sometimes it is slow. After all
we are downloading thousands of roads within an area!

To improve the performance of download, I indexed ~3,000 cities with population larger than 100,000 people and
stored into a [very simple](https://github.com/anvaka/index-large-cities/blob/master/proto/place.proto) protobuf format. The cities are stored into a cache in this github [repository](https://github.com/anvaka/index-large-cities).

The name resolution is done by [nominatim](https://nominatim.openstreetmap.org/) - for any query that you type
into the search box it returns list of area ids. I check for the area id in my list of cached cities first,
and fallback to overpass if area is not present in cache.

## Adding a circuit

1. Add an entry to [`scripts/tracks/catalog.mjs`](scripts/tracks/catalog.mjs) with a rough coordinate,
   and the length if you know it (it is used to pick the right layout).
2. Run `npm run build:tracks -- <id>` (behind a proxy: `NODE_USE_ENV_PROXY=1 npm run build:tracks -- <id>`).
   It finds the circuit's `type=circuit` relation in OpenStreetMap, or the closed loop of `highway=raceway`
   ways closest to the expected length, and writes `src/studio/data/tracks/<id>.json` (including corner names).
3. Run `npm run tracks:sheet` and open `tracks.svg` to check that the right layout was picked.

If the layout looks wrong, the fix usually belongs in OpenStreetMap; the catalog also lets you pin a relation
(`osmRelation`), prefer a layout by name (`layout`) or leave out other layouts (`exclude`).

Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), available under the ODbL.
Posters show this credit by default; please keep it when you share or sell prints. Country flags come from
[flag-icons](https://github.com/lipis/flag-icons) (MIT).

## Scripting

Classic mode (`?mode=classic`) has scripting capabilities. You can develop programs on top
of the city-roads. A few examples are available in [city-script](https://github.com/anvaka/city-script). Scene
API is documented here: https://github.com/anvaka/city-roads/blob/main/API.md

Please share your creations and do not hesitate to reach out if you have any questions.

## Limitations

The rendering of the city is limited by the browser and video card memory capacity. I was able to render Seattle
roads without a hiccup on a very old samsung phone, though when I tried Tokyo (with 1.4m segments) the phone
was very slow.

Selecting area that has millions of roads (e.g. a Washington state) may cause the page to crash even on a
powerful device.

Luckily, most of the cities can be rendered without problems, resulting in a beautiful art.

## Credits

The original city-roads is by [Andrei Kashcha](https://github.com/anvaka); if you like it, consider
[sponsoring his work](https://github.com/sponsors/anvaka).

## Deployment

Every push to `main` builds the site and publishes it to GitHub Pages
(`.github/workflows/pages.yml`). In the repository settings, under Pages, set the source to "GitHub Actions".

## Local development

``` bash
# install dependencies
npm install

# serve with hot reload at localhost:8080
npm run dev

# build for production
npm run build

# re-extract circuit layouts from OpenStreetMap (see "Adding a circuit")
npm run build:tracks
```

## License

The source code is licensed under MIT license
