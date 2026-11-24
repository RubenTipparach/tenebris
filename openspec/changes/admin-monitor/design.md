# Design: admin-monitor

## 1. One path for the new client -> server data

Everything the client tells the server goes through `src/net/NetSync.ts`.
The player summary is a live frame (`netSync.live('status', summary)`) - the
existing relay-only message - and the server intercepts the `status` channel:
it keeps the latest per player and does not relay it (nobody else needs it).
`src/net/AdminReport.ts` builds the summary from the game's own objects
(`Inventory.exportForSave()`, `AirSystem.getState()`, `MissionTracker`), and
sends it on join (a new `netSync.myId()`) and whenever its JSON changes,
checked every `SUMMARY_CHECK_S`.

The frame is compact (`encodeStatus` / `decodeStatus` in AdminReport.ts):

```
{ v: 1, inv: [[slot, item, count, uses?], ...],   // non-empty slots only
  suit: { worn, tankS }, ride: 'walk' | 'rocket',
  m: { done: [id...], now: id | null, prog: [n...] } }
```

## 2. Map images

The map is the Map tab's raster (`PlanetRaster` in `MapPanel.ts`): the same
block colours, relief and hillshade, the same equirectangular projection
(longitude -pi..pi left to right, north up). `MapPanel.mapImage(id, w, h)`
reuses the panel's cached raster (building it if needed) and scales it to
`MAP_UPLOAD_WIDTH x MAP_UPLOAD_WIDTH / 2`. It is encoded as WebP and handed to
`netSync.uploadMap(planet, blob)`, which the Multiplayer transport POSTs to
`/maps/<world>/<planet>?player=<id>&key=<uploadKey>`. The key is a random
per-connection token in the welcome; the server only accepts an upload from
a connected player of that world, of a bounded size and image type, and at
most once per `MAP_MIN_UPLOAD_GAP_MS` per player.

When to upload: the welcome lists the world's maps and when each was made;
the client uploads a planet's map when it stands on that planet and the
server has none, or one older than `MAP_REFRESH_MIN`, or after
`MAP_REFRESH_EDITS` block edits on that planet since its last upload.

## 3. One table of game data

The portal needs item names / icons, mission titles / objectives and the
body layout. The one source is the game's config, read at build time by
`scripts/gen-admin-data.ts` into `server-js/game-data.json` (the server has
no TypeScript build). `scripts/admin-monitor.test.ts` regenerates it in
memory and fails if the shipped file differs; `static.yml` runs it, so it
cannot drift. Item icons are the item textures served by the deployed game
(`ICON_BASE` in `admin.js`); a missing icon falls back to the item name.

## 4. Where a player is

A pose is in the sender's frame, where their planet sits at its configured
position and turns with them, so `p - configured position` is the
planet-local direction - the same vector the Map tab projects.
`server-js/geo.js` turns it into latitude / longitude (compass.ts `latLon`),
altitude over the body radius, and the map's `u, v` (0..1) - the raster's
`project`. The portal only multiplies `u, v` by the image size. The test
compares geo.js with compass.ts over many directions.

Place: `rocket` when the summary says so, `space` when the altitude is more
than `SPACE_ALT_RADII` body radii, else `surface`.

## 5. The solar system diagram

Static: the Sun in the middle, each planet / gas giant on its own ring at its
configured start angle (ring radius by orbit rank, so the inner worlds don't
crowd), moons on small rings round their parent. Dot size and colour from the
body's radius and colour. A badge over a body counts its players (names on
hover); a click opens its map. All drawn in SVG from game-data.json.
