# city-roads

Render every single road in any city at once, or make a poster or wallpaper of a race circuit:
https://parth8.github.io/city-roads/

This is a fork of [anvaka/city-roads](https://github.com/anvaka/city-roads) by Andrei Kashcha. It adds race
track posters and wallpapers, borders and polaroid frames, PNG/JPEG/WebP/SVG downloads, and fixes for
downloads that used to time out. It has no analytics, ads or shop: everything runs in your browser and
the only servers it talks to are OpenStreetMap's (plus Google Fonts and the original author's city cache).

![demo](https://i.imgur.com/6bFhX3e.png)

## How it is made?

The data is fetched from OpenStreetMap using [overpass API](http://overpass-turbo.eu/). While that API
is free (as long as you follow ODbL licenses), it can be rate-limited and sometimes it is slow. After all
we are downloading thousands of roads within an area!

To improve the performance of download, I indexed ~3,000 cities with population larger than 100,000 people and
stored into a [very simple](https://github.com/anvaka/index-large-cities/blob/master/proto/place.proto) protobuf format. The cities are stored into a cache in this github [repository](https://github.com/anvaka/index-large-cities).

The name resolution is done by [nominatim](https://nominatim.openstreetmap.org/) - for any query that you type
into the search box it returns list of area ids. I check for the area id in my list of cached cities first,
and fallback to overpass if area is not present in cache.

## Race track posters

Open the site with `?mode=tracks` (or follow the "race track posters" link on the start page) to make a
print-ready poster of a race circuit: the track drawn bold, with the streets around it faded into the
background.

* 96 circuits from F1, MotoGP, WEC, IMSA, IndyCar, NASCAR, Supercars, DTM, Super GT, WSBK, BTCC and the Isle of Man TT,
  plus historic venues. Filter by series or search by name, city or country.
* Eight styles (Carbon, Rosso, Paddock, Midnight, Heritage, Paper, Blueprint, Gulf) and three layouts
  (minimal, framed map, stats bar). Every colour, width, text and stat can be edited.
* Drag to move the map, scroll or pinch to zoom, rotate it, show or hide streets, buildings, the pit lane,
  the start/finish flag, a north arrow and the country flag.
* Print sizes from A4 to 24×36 in at 150 or 300 dpi, or wallpaper sizes for phones, tablets, 16:9, 16:10,
  21:9 ultrawide and 32:9 super-ultrawide screens (or any custom pixel size).
* Optional white (or any colour) border, or a polaroid frame with a thicker bottom and a handwritten caption.
* Neon styles (Neon, Synthwave, Acid, Ice) with a glow around the track, and gradient backgrounds.
* Download as PNG, JPEG, WebP, AVIF (where the browser supports it) or SVG with the fonts embedded.
  Browsers cannot encode HEIC/HEIF, so it is not offered.

Circuit layouts are extracted from OpenStreetMap ahead of time and ship with the site, so a poster
appears instantly. Only the surrounding streets are downloaded from Overpass when you open a circuit;
if that fails, the poster still works without them.

### Adding a circuit

1. Add an entry to [`scripts/tracks/catalog.mjs`](scripts/tracks/catalog.mjs) with a rough coordinate,
   and the length if you know it (it is used to pick the right layout).
2. Run `npm run build:tracks -- <id>` (behind a proxy: `NODE_USE_ENV_PROXY=1 npm run build:tracks -- <id>`).
   It finds the circuit's `type=circuit` relation in OpenStreetMap, or the closed loop of `highway=raceway`
   ways closest to the expected length, and writes `src/track/data/tracks/<id>.json`.
3. Run `npm run tracks:sheet` and open `tracks.svg` to check that the right layout was picked.

If the layout looks wrong, the fix usually belongs in OpenStreetMap; the catalog also lets you pin a relation
(`osmRelation`), prefer a layout by name (`layout`) or leave out other layouts (`exclude`).

Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), available under the ODbL.
Posters show this credit by default; please keep it when you share or sell prints. Country flags come from
[flag-icons](https://github.com/lipis/flag-icons) (MIT).

## Scripting

Behind simple UI software engineers would also find scripting capabilities. You can develop programs on top
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

# build for production with minification (writes stats.html with a bundle report)
npm run build

# re-extract circuit layouts from OpenStreetMap (see "Adding a circuit")
npm run build:tracks
```

## License

The source code is licensed under MIT license
