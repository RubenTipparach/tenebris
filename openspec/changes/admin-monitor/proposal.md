# Proposal: admin-monitor - watch players, items, missions and maps from the admin portal

## Why

The owner, 2026-11-23: "add to admin to monitor players logged in, items the
player may have, a world map to see where everyone is, a map of every planet,
a map of the solar system (top down/static diagram) to click to planets and
see where everyone is at, player markers would be over the planet they are at
too". Later the same day: "and track missions progress on admin as well".

The operator portal (`server-js/admin.html` + `admin.js`) lists worlds and
who is in them (name, planet id, online-for) and nothing else. The server
already holds each player's last pose (planet id, world position, rotation),
name and avatar look, but not their inventory, missions or anything to draw
a map with: it has no terrain.

## What Changes

- **A player status frame**: the client sends a small summary of itself -
  hotbar, bag and toolbox (item id, count, wear), the suit and its tank air,
  whether it is riding a rocket, and its mission progress (done ids, the
  current mission and its objective counts) - as a NetSync live frame on the
  `status` channel. It goes on join and whenever it changes (checked every
  few seconds; numbers in `src/config/AdminReportConfig.ts`). The server
  keeps the latest per connected player in memory and does not relay it.
- **Planet maps**: a client on a planet renders that planet's map with the
  game's own map renderer (the Map tab's `PlanetRaster`: block colours, height
  tint, hillshade), scales it to a small equirectangular WebP and uploads it
  through NetSync's transport (an HTTP POST signed with a per-connection key
  the welcome hands out). It uploads when the server has none or an old one,
  and again after enough edits. The server keeps one per world + planet under
  `DATA_DIR/maps/`, so they survive restarts; a world reset or delete drops
  them.
- **One build-time table of game data** for the portal,
  `server-js/game-data.json`, written by `scripts/gen-admin-data.ts` from the
  game's own config: every item (name, icon path, atlas crop), every mission
  (title, objective labels and counts) and every body (name, kind, parent,
  orbit radius / start angle, radius, colour, configured position). A test
  regenerates it and fails when the shipped file differs, and CI runs it.
- **Where each player is**: the server works out latitude, longitude and
  altitude from the pose (`server-js/geo.js`, the same formulas as
  `src/nav/compass.ts latLon` and the map projection - a test holds them
  equal), and whether they are on the ground, in a rocket or in space.
- **The portal** gets four tabs: Players (every world: name and look colours,
  planet, place, online-for, last-seen, an icon grid of their items, missions
  done / total and the current mission's objective bars), Solar system (a
  static top-down schematic: orbits as rings, moons round their parents,
  player count badges over bodies, names on hover, a click opens the body's
  map), Planet map (the uploaded map with player markers, or "no map yet -
  nobody has been there"), and Worlds (the existing controls, unchanged,
  destructive buttons still need a second click).

## Out of scope

- Persisting inventories or missions on the server (the summary is a live
  view, kept while the player is connected).
- Live orbital positions in the diagram (it is a static schematic).
- Editing a player's items or missions from the portal.

## Impact

- `src/net/NetSync.ts` (map upload through the transport),
  `src/net/Multiplayer.ts` (upload key, transport), new
  `src/net/AdminReport.ts`, `src/config/AdminReportConfig.ts`,
  `src/nav/MapPanel.ts` / `Navigation.ts` (render a map image from the same
  raster), `src/mainPlanet.ts` (wire it).
- `server-js/server.js`, `admin.js`, `admin.html`, new `geo.js`,
  `game-data.json`.
- `scripts/gen-admin-data.ts`, `scripts/admin-monitor.test.ts`,
  `server-js/test/admin-monitor.test.mjs`, `.github/workflows/static.yml`.
