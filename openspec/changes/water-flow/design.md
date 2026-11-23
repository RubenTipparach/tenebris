# Design: water-flow

## Context

Reference: Pale Blue Dot's three water mockups (`water-flow/liquid.js`, the
Pour tab of `waterfall/waterfall.js`), themselves ports of Luanti's
`ServerMap::transformLiquidsLocal`, `get_max_liquid_level` and
`drawLiquidNode`. Tenebris water before this change: a binary
`HexBlockType.WATER` block per hex column cell (`column.blocks[depth]`,
depth + 1 = up), drawn as a flat top plus walls over air by three copies of
the column mesher.

## Decisions

### 1. The rule: Luanti on hex, as PBD ported it

`src/water/Liquid.ts` is a line-for-line port of `liquid.js`: kinds AIR /
SOLID / FLOW (level 0..7, falling bit) / SOURCE; eight neighbours in Luanti's
order (up, the sides in `tile.neighbors` order - five at a pentagon - down);
renew threshold `WaterConfig.RENEW_SOURCES` = 3 on hex; `DROP_BOOST` 4;
range 8; a unique work queue; one tick processes the queue as it stood, at
most once, capped by `MAX_CELLS_PER_TICK`; an edit touches the cell and its
eight neighbours. A cell in a column that is not loaded is a neutral.

Licence: Luanti is LGPL-2.1-or-later. The file keeps PBD's attribution
header and the licence text sits beside it as `src/water/COPYING.LESSER`.

### 2. Storage

- A **source** is a `WATER` block, as before. The ocean, a placed bucket and
  every old save's water are sources, so saves load unchanged.
- A **flowing** cell is `AIR` in `column.blocks` plus a byte in the liquid's
  per-column `Uint8Array` (`0x80 | falling << 3 | level`). Everything that
  reads blocks (collision, placement, lighting, fauna, the map) sees air, so
  nothing outside water needs to know about levels.
- A **renewed** source (three source neighbours) is written into
  `column.blocks` as `WATER` but not into the edit log: like flowing water it
  is derived, and the saved edit that caused it re-creates it on load.

### 3. Persistence and multiplayer

Edits persist and sync exactly as today: `Planet.setBlock` +
`gameStorage.saveTileChange` the same frame, NetSync for MP. `setBlock`
touches the liquid, so a placed/scooped source or a dug/placed block starts
the flow. When terrain loads, the saved edits applied to a column are
touched, so flowing water re-derives by ticking. The break-block path no
longer guesses water in (it wrote and saved WATER blocks - a second flow
rule); it saves AIR and the rule fills the cell.

The rule is deterministic: the same edits in the same order give the same
water on every client (`scripts/water-flow.test.ts` case 5). Clients tick on
their own clocks; flowing water is not on the wire.

### 4. The ocean

All sea cells are sources and nothing queues them unless an edit lands next
to them, so the sea costs nothing per tick. A cell dug beside the sea has
three or more source neighbours and renews into sea, which is what the old
basin rebalance tried to do.

### 5. Tick rate

`WaterConfig.TICK_SECONDS` = 0.35 (PBD's mockups ran 1 s; that reads as
sand). At most `MAX_TICKS_PER_FRAME` ticks catch up after a stall.

### 6. Shape

`src/water/LiquidMesh.ts` meshes every water cell of a column for all three
column meshers (one water mesher; the three water-wall copies are deleted):

- corner level = 1 if any of the three cells round the corner is a source or
  has water on it; `CORNER_DRY_LEVEL` if two or more are air; else the mean
  of the flowing levels ((level + 0.5) / 8); `CORNER_ENCLOSED_LEVEL` if none.
- level L maps to radius floor + L x (top - WATER_SURFACE_OFFSET - floor):
  level 1 is exactly today's sheet, so sources and the sea are unchanged.
- top: a fan from the centre at the mean level; flat tops keep the radial
  normal, sloped ones take the facet normal (flat shading);
- sides only where the neighbour is AIR (not flowing, not solid), from the
  floor to the corner levels; with water on the cell, no top and full-height
  sides, so a fall reads as one column; a bottom only over air.

### 7. Smoothing (S1-S4)

The liquid records, for each cell a tick changed, what it was before. The
main-thread chunk rebuild near the player meshes both states; every water
vertex carries `liquidPrev` (vec4): the previous position and
mode + 4 x tick stamp. `water.vert` mixes previous to current on
`liquidT` (the fraction of the tick played): mode 1 smoothstep (levels
ease), 2 linear (a new cell sweeps in from a thin sheet on its source side,
or a fall grows down from the water above), 3 linear then hidden (a dried
cell shrinks toward where it drained). A vertex built for an older tick is
drawn at rest, so a chunk not rebuilt this tick never replays. The worker
paths draw water at rest. Only the vertex position changes; the fragment
shader and every colour stay as they are.

### 8. Under water

`Planet.waterSurfaceRadiusAt(tile, depth, point)` is the one answer: the
sheet (top - WATER_SURFACE_OFFSET) for a source, the cell's top with water
on it, and for a flowing cell the sloped top under the point. `isInWater`
(fog and swimming) is "below that surface", so a camera 5 cm above the drawn
sea is above water, and a level-3 sheet only counts below its surface.

While the camera is under water the frame is cleared to the fog colour, the
far layer is skipped, and the camera's far plane comes in to the fog's far
distance for that frame. Everything past it would be fully fogged anyway;
pulling the far plane in drops what has no underwater fog of its own (the
distant LOD, the sea walls, the atmosphere and clouds, other planets), so the
view fades into the fog colour instead of a black clear (`scene.background`
is never drawn with `autoClear` off) or an unfogged navy LOD sea.
The fog and clear colour are the colour that puts UNDERWATER_FOG_COLOR's
linear value on screen, which is what the terrain and water shaders write
(they do no output encoding), so terrain at the fog's far edge meets the
background with no seam.

Depth through water (the owner: "check that the 'volume' of water has proper
fog/depth applied"). The water shader tints by the distance light travels
through water, read from the engine's depth pre-pass. Two faults made that
wrong, both fixed without touching the look:

- the pre-pass hid the water, so the tint measured the distance to whatever
  lay behind it: a flowing sheet on a hillside, or a cell seen side-on, went
  opaque against the sky. Now each water material has a back-face, depth-only
  twin (same vertex shader and uniforms) drawn in the pre-pass, so the depth
  is the nearer of the terrain and the water's own far side: the water's
  thickness along the view ray. Every planet's water joins the pre-pass (only
  Earth's did).
- distances were per-vertex (`vDepth`), interpolated across faces several
  metres wide: 0.3 m above the sea the surface read as metres away and the
  sea went opaque navy. The water and terrain fog now take the distance per
  fragment.

Under water the surface fades to the same fog colour as the terrain shader,
the scene fog and the cleared background (it was darkened by the day/night
factor, so the view ended in two colours).

## Risks

- Renewal can flood a cave system that touches the sea once an edit opens
  it; bounded per tick by `MAX_CELLS_PER_TICK`.
- Clients that load at different times see the same steady state, but a
  flow in progress may be a tick or two apart between clients.
- Flowing water reaching a column whose neighbour is not loaded stops at the
  edge until the neighbour is edited (neutrals, as in PBD).
