# Design: navigation-and-orbits

## Context

See `proposal.md` for why. The pieces this builds on:

- **The E panel** is `CraftingSystem` (`src/player/CraftingSystem.ts`): the
  hotbar, bag and crafting grid in one DOM window, opened and closed with E.
- **Bodies are static.** `SolarSystemConfig.ts` gives each a fixed
  `position` and an `orbit` stub with `orbitalPeriod: 0`. The Sun is at
  `SUN_POSITION` (moved among the planets in PR #102). Every body is a
  `Planet` whose terrain meshes are built in planet-local space under groups
  placed at `planet.center`. About 160 other places read `planet.center`
  directly: trees, fauna, ground clutter, machines and torches placed at
  world positions, physics, rockets, multiplayer poses.
- **Planet data.** A planet with detailed terrain has columns
  (`getBlock(tile, depth)`). Since PR #102 a planet left far behind releases
  its columns and keeps an `editLog` of every edit. A planet never visited
  has no columns at all, only its distant LOD from `shared/terrainShape.ts`.
- **Clock.** `NetSync.worldTimeMs()` gives the multiplayer server's world
  time. Single player has no game clock yet.
- **Pale Blue Dot** has built the same features. Its `compass-bar`,
  `world-map` and `starter-missions` (G3, waypoints) changes are the
  reference for behaviour. Tenebris differs in that it is a whole solar
  system, so maps and waypoints span bodies.

## Goals / Non-Goals

**Goals:**
- One orbit model as the single source of every body's position in time,
  and of the Sun's direction.
- A map that never disagrees with the world: its colours come from the
  blocks themselves, and its tiles from the same terrain data and edits.
- Land the work in stages that each leave the game playable.

**Non-Goals:**
- Elliptical or inclined orbits, n-body gravity, and planetary spin. Orbits
  are circles in the plane each body sits in round its parent. A day on a
  world is its orbit: the Sun's direction turns as it goes round.
- Rocket navigation aids beyond the maps: no transfer planner, no manoeuvre
  nodes.
- A minimap on the HUD. The compass bar is the only new HUD element.

## Decisions

### 1. The orbit model is a pure function of game time

`src/world/Orbits.ts` (new) turns config into orbits once at load. For each
body with a parent (the Sun for planets, gas giants and asteroids; a planet
for a moon) it keeps:
- the orbit radius `a` and starting angle `θ0`, from the configured position
  relative to the parent;
- the plane: the circle through that position about the parent, in the
  parent's XZ plane (the configured y offset is kept as a fixed height, so
  today's slightly tilted layout stays);
- the period `T`.

`positionAt(body, t)` composes parent positions, so a moon rides its planet.
The Sun is the root and never moves.

**Periods (the owner's anchors and Kepler):**
- `T_planet = 180 min x (a / a_Earth)^1.5`
- `T_moon = 60 min x (a / a_Moon)^1.5 x sqrt(M_Earth / M_parent)`
- Mass comes from each body's configured surface gravity and radius,
  `M ∝ g R²`, the same quantities the flight model already uses.

**Alternatives:**
- A period per body typed into config: two copies of one fact, the
  distances and the periods, that must agree. Rejected.
- Real n-body motion: unstable with these distances and out of scope.

### 2. One clock: game time

- **Single player:** a `gameTimeS` saved in the world's player save,
  advanced only while the world is played (Pale Blue Dot's world-time rule).
- **Multiplayer:** the server's world clock (`NetSync.worldTimeMs`), which
  already runs from the world's creation.

Every consumer reads `Orbits.now()`. Nothing caches a body's position
across frames.

### 3. The fixed frame is the body you are on

Moving the planet under the player would move the player's world-space
physics, every placed object and every chunk mesh, about 160 places. The
station rule in CLAUDE.md names the right model: inside a body's sphere of
influence, that body is the fixed frame and the rest of the universe moves
round it.

- **The reference body** is the body whose sphere of influence the player
  (or their rocket) is in: the nearest body whose gravity well holds them,
  else none.
- **Render positions** are `pos(body, t) - pos(ref, t) + pos(ref, 0)`. The
  reference body sits exactly at its configured position, where all its
  world-space objects and meshes were placed, and never moves. The Sun and
  every other body move round it. Its sky turns, and that gives the
  day/night cycle.
- **Changing reference body** happens when the player leaves one sphere of
  influence and enters another, in flight or by teleport. The old body
  becomes a moving one.

**Staging, so each step ships playable:**
- **Stage A:** the reference body is always the body the player is on, or
  else the last one they left. Every other body moves.
  - A body that is not the reference is drawn only as its distant LOD, its
    atmosphere and its clouds. Since PR #102 its detailed terrain is
    released anyway, so moving those few groups is all it takes.
  - The Sun's direction for lighting comes from the live relative position.
  - Rockets in flight are a free body in the reference frame, so flight
    physics is unchanged.
- **Stage B:** objects become planet-relative. Things placed on a body
  (machines, torches, launch pads, landed rockets, trees, fauna) are
  parented to a per-planet root group in planet-local coordinates, so a
  body that has become a moving one carries them along. Saves keep world
  coordinates at the body's configured position, which is still its
  reference-frame position, so the save format does not change.
- **Stage C:** a rocket's sphere-of-influence handoff while flying, which
  rebases the rocket pose and velocity into the new frame at a tick
  boundary (CLAUDE.md, quaternion and frame rules).

### 4. Map colours come from the block textures

A block's map colour is the mean colour of its top face texture, computed
once from the textures `HexBlock` already loads. That makes it one source:
a new biome block gets its colour from its own art, with no table to keep
in step (CLAUDE.md, one code path).

### 5. Map tiles come from the terrain data, or the terrain generator

- **A planet with columns:** the map reads each tile's top block from them,
  and redraws a tile when `Planet.setBlock` changes its top.
- **A planet without columns** (never visited, or released): the map asks
  the terrain generation worker for top blocks only, for that planet's seed
  and config. That is the same generator, so it is the same answer. It
  applies the planet's `editLog` on top and caches the result per planet
  until the next edit.

**Projection:** equirectangular, one polygon per tile from its corner
vertices' latitude and longitude, drawn to a 2D canvas, north up. Tiles
that cross the antimeridian are drawn twice, once each side. The map pans
and zooms. 2D canvas holds about 160k polygons on the largest planets; the
map draws once and then redraws only the tiles that change.

### 6. North and the compass

North is the pole the planet's Sun-relative motion turns about such that the
Sun rises on the right, Pale Blue Dot's rule (`compass-bar` decision 1),
worked out once per body from the orbit direction. `compassHeading(planet,
position, forward)` is the one function every compass, map arrow and
waypoint bearing uses. The compass bar is a DOM HUD element. It follows the
existing HUD pattern, as the hotbar does.

### 7. Waypoints are records

`{ id, body, tile or lat/lon, setAt }`:
- at most four, oldest dropped (Pale Blue Dot G3);
- stored in `GameStorage` and saved on change;
- in multiplayer, published as a per-player NetSync record
  (`waypoint:<playerName>`), so they follow the player between devices and
  never mix with other players'.

A waypoint is stored by tile index on its body. It moves with its body
because the body's frame moves, so there is no world position to update.

### 8. Missions are a tree that unlocks the tech (Pale Blue Dot's model)

The owner, 2026-11-21: "See how mission tree is set up on pale blue dot".
Pale Blue Dot's `starter-missions` ("Missions are a tree that unlocks the
tech", and "One parent per mission") is the model:
- a trunk opens branches that can be played in any order;
- each mission unlocks recipes;
- exactly one parent per mission, and an extra need is a hidden `after`
  gate with no line drawn;
- cards laid out left to right with branch plaques;
- a side panel for the selected card;
- zoom in designed whole-pixel steps, so card frames never tear.

The first version of this change, a straight line of 14 missions, is
replaced. Its ids are kept where the step still exists, because saves name
them.

**Data:** `src/config/Missions.ts`, one entry per mission:
`{ id, branch, icon, title, help, parent, after?, objectives, unlocks }`.
`unlocks` lists recipe output item types.

**The tree,** with real recipe and item names:

| branch | missions (parent -> child) | unlocks |
| --- | --- | --- |
| 0. Trunk | Chop a tree (logs 4) -> Make planks (planks, sticks) -> Dig stone (stone 8) -> Build a furnace (place Furnace) | planks: Furnace, Torch, Storage Chest |
| 1. Mining and smelting | Find ore (iron 3, coal 2) -> Smelt iron (iron ingot 3) -> Smelt copper (copper ingot 2) -> Make glass | Smelt iron: Bucket. Smelt copper: Cable, Copper Pipe |
| 2. Light and storage | Light the night (place 4 torches) -> Store things (place a Storage Chest) | |
| 3. Power | Steam power (place a Steam Engine) -> Wire it up (place 4 Cables) -> Electric furnace (place one); and Water power (place a Hydro Generator) | Steam Engine: Hydro Generator, Electric Furnace |
| 4. Electronics | Electronics workbench (place one) -> Chips (CPU Chip, RAM Module) -> Computer (craft and place) -> 3D printer (craft and place) | workbench: CPU, RAM, Motherboard, Power Supply. Chips: Computer, Print Nozzle, 3D Printer |
| 5. Rocketry (after the 3D printer) | Pad blocks (print 7) -> Lay the pad -> Launch tower (3 segments) -> Rocket parts (engine, tank, command module) -> Assemble -> Launch -> Land on the Moon | Pad blocks: Launch Pad Block, Launch Pad Segment. Tower: Rocket Engine, Medium Fuel Tank, Command Module. Launch: Cargo Bay |
| 6. The Moon and beyond (after landing on the Moon) | Moon metal (titanium ore 3) -> Titanium (smelt 3) -> Vacuum engine (print it and a Large Fuel Tank) -> Ice fuel (make rocket fuel from ice) -> Another world (land on Sequoia) -> Explorer (land on 3 more worlds) | Moon metal: Vacuum Engine, Large Fuel Tank. Ice fuel: the ice and snow fuel recipes |
| 7. Getting about (after the trunk) | Read the map (reach a waypoint set 200 m away) -> Go fishing (Fishing Rod, catch 3 fish) | Read the map: Fishing Rod |

**Unlocking:**
- **One function** answers whether a recipe is open:
  `MissionTracker.recipeOpen(output)`. The crafting grid, the electronics
  workbench and the 3D printer all ask it.
- **Locked recipes** show dimmed with the mission's title, and the craft
  button refuses.
- **Old worlds:** the skip rule from the first version is kept. On first
  open, a world counts as done every mission it already satisfies. Any
  recipe whose output the world has crafted, carries or has placed is also
  open (Pale Blue Dot T.3).

**Panel:** DOM cards in a pannable stage, laid out from the tree.
- **Layout:** the column is the depth from the trunk and the row is the
  branch; side chains hang below their branch.
- **Lines:** SVG elbows from parent to child.
- **States:** Done, Now, Open and Locked, with a legend.
- **Branch plaques:** one per branch row.
- **Zoom:** five designed levels, from overview to full card. Each level
  sets the card size and the type size in whole pixels, never a CSS scale.
  Fit chooses the largest level that shows the whole tree.
- **Side panel:** the clicked card's objectives with progress bars, its
  help, what it unlocks, what it needs, and what it opens next.

**Events** are as in the first version (`src/engine/GameEvents.ts`). Two
are added: `smelted` and `reached` (a waypoint, from the waypoint list).

## Risks / Trade-offs

- **Trip costs change with the orbits.** Earth to Sequoia may be close one
  hour and far the next. → The rocket tech report learns to report a
  range: the best and worst over a synodic period. The system map shows
  where things are, which is how a player picks a window. Teleport is
  unaffected.
- **A world saved mid-orbit.** → Positions are a pure function of the saved
  game time, so a reload is exact.
- **Stage A shows other bodies' surfaces only as LOD.** A rocket arriving
  at a moving planet would land on a moving target. → Landing makes it the
  reference body (Stage A's rule) before detail loads. Detail only loads
  within the distant-LOD range, inside the sphere of influence.
- **Map of a large planet (Vesper, 160k tiles).** → Drawn once into an
  offscreen canvas, panned and zoomed as an image; top-block generation
  runs in the worker.
- **The north rule on a planet barely moving round its parent.** → Every
  body orbits something, so the rule always has a direction.

## Migration Plan

- Saves without `gameTimeS` start at 0, which is today's layout.
- Waypoints and missions are new save fields; older saves have none and
  start empty.
- Stage A lands first, and the game stays playable at every stage.
- Rollback is reverting the change: no save format is removed.

## Open Questions

- **Missions on an existing world:** start at mission 1, or skip missions
  the inventory already satisfies? Proposed: skip them, so a veteran starts
  where they are. The specs hold either way.
