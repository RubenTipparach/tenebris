# Tasks

## 1. Data

- [x] 1.1 `scripts/gen-admin-data.ts` -> `server-js/game-data.json` (items, missions, bodies).
- [x] 1.2 Drift test in `scripts/admin-monitor.test.ts`; CI runs it.

## 2. Client

- [x] 2.1 `src/config/AdminReportConfig.ts`: check interval, map size / quality, refresh age and edits.
- [x] 2.2 `src/net/AdminReport.ts`: status frame (inventory, suit, ride, missions) through `netSync.live`.
- [x] 2.3 `MapPanel.mapImage` from the Map tab's raster; `netSync.uploadMap` through the transport.
- [x] 2.4 Wire it in `mainPlanet.ts`.

## 3. Server

- [x] 3.1 `status` channel kept per player, not relayed; last-seen.
- [x] 3.2 Upload key in the welcome; `POST /maps/<world>/<planet>`; maps on the data volume; dropped on reset / delete.
- [x] 3.3 `server-js/geo.js`: lat / lon / alt / map u v from a pose; test against compass.ts.
- [x] 3.4 Admin API: players with place, items, missions; game data; map images.

## 4. Portal

- [x] 4.1 Tabs: Players, Solar system, Planet map, Worlds.
- [x] 4.2 Item icon grid, mission bars, look colours.
- [x] 4.3 SVG system diagram with player badges; click opens the map.
- [x] 4.4 Planet map with markers; placeholder when none.

## 5. Checks

- [x] 5.1 `server-js/test/admin-monitor.test.mjs`: a fake client sends pose + status + map, the admin API returns them.
- [x] 5.2 Headless screenshots of each tab.
