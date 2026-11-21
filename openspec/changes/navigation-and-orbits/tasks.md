# Tasks

## 1. E panel buttons and the panel shell

- [ ] 1.1 Add Map and Missions buttons to the inventory panel (E), each opening its own panel in the same window. Verify: headless, pressing E and clicking each opens it; E or Esc closes.

## 2. Orbit model and clock (orbital-motion, stage A)

- [ ] 2.1 `src/world/Orbits.ts`: orbits from config (radius, start angle, parent, period from the two anchors + Kepler with M ∝ gR²), `positionAt(body, t)`. Verify: unit test that t=0 gives the configured layout, the Moon's period is 60 min, Earth's 180 min, a planet at 2x Earth's distance ~509 min.
- [ ] 2.2 Game clock: `gameTimeS` in the single-player save (advances only while played), `NetSync.worldTimeMs` online; `Orbits.now()` reads it. Verify: reload restores positions exactly (test); two headless MP clients agree on the Moon's angle.
- [ ] 2.3 Reference body = the one the player is on or last left; every other body's distant LOD, atmosphere and clouds drawn at `pos(b,t) - pos(ref,t) + pos(ref,0)` each frame; Sun direction from the live relative position for every planet's lighting. Verify: headless, 15 min fast-forwarded on Earth moves the Moon a quarter orbit and the Sun a twelfth; the player stands still.
- [ ] 2.4 Rocket tech report covers trip cost over a synodic period (best / worst). Verify: report prints the ranges.

## 3. World map (world-map)

- [ ] 3.1 Block map colours from each block's top texture mean (one source). Verify: test that every block type in the table has a colour.
- [ ] 3.2 Top-block source: columns when loaded; else a top-blocks-only request to the terrain worker with the planet's editLog applied, cached per planet. Verify: headless, the map of a never-visited planet matches its terrain after visiting.
- [ ] 3.3 Equirectangular hex/pentagon drawing to an offscreen canvas, north up, antimeridian handled, pan + zoom; redraw a tile on edit (Planet emits top-block changes). Verify: screenshot of Earth's map; dig a tile to stone and see it change.
- [ ] 3.4 Players (self with heading, others by name) and waypoints on the map; a body picker. Verify: two headless MP clients, each sees the other's marker.

## 4. System map (system-map)

- [ ] 4.1 Top-down canvas of every body at its live position with orbit paths, names, pan + zoom, players; click a body to open its planet map. Verify: screenshot; the Moon moves between two shots minutes apart (fast clock).

## 5. Compass (compass)

- [ ] 5.1 North per body from its orbit direction (Sun rises on the right facing north); `compassHeading` as the one heading function. Verify: test of the rule at several places; headless facing north at sunrise the Sun is to the right.
- [ ] 5.2 Compass bar HUD (N/E/S/W, intercardinals, 15 deg ticks, 180 deg span), fades in space. Verify: screenshot at four headings.

## 6. Waypoints (waypoints)

- [ ] 6.1 Right-click on a planet map adds a waypoint (max 4, fifth drops the oldest), click without drag removes; saved on change; per-player NetSync record online. Verify: test of the cap and removal; reload keeps them; MP players don't see each other's.
- [ ] 6.2 Waypoints on the compass bar (bearing, distance nearest the centre) and on the system map. Verify: screenshot walking toward one.

## 7. Missions (missions)

- [ ] 7.1 Mission data (`src/config/Missions.ts`) and an event bus fed from Inventory, crafting, block interaction, launch pad and flight. Verify: tests of counting and of only counting after a mission opens.
- [ ] 7.2 Missions panel (current first, objectives with counts, done ticked) and a toast on completion; progress saved. Verify: headless chop a tree, see "Logs 4 / 4" and the toast; reload keeps progress.

## 8. Stage B and C (orbital-motion, later)

- [ ] 8.1 Planet-bound objects parented to a per-planet root in planet-local space (saves unchanged). Verify: a torch on the Moon stays on it as the Moon moves while the player is on Earth.
- [ ] 8.2 Sphere-of-influence handoff in flight: rebase rocket pose + velocity at a tick boundary. Verify: fly Earth to Moon with the reference body switching mid-flight, no jump.
