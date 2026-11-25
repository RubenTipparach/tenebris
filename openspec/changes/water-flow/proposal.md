# Proposal: water-flow - Pale Blue Dot's water rule and shape

## Why

The owner, 2026-11-23: "can you update our water code to use a similar shape
system + flow system as pdb?", then "keep our look the way we have it, I like
the flat shaded water that we have already", and "get some screenshots and
check that the 'volume' of water has proper fog/depth applied".

Water in the JS client is a binary block moved by ad-hoc code: a flood-fill
basin rebalance capped at 500 cells (`Planet.simulateWaterFlow` /
`rebalanceWaterBasin`), a column cascade at generation, a 5-second
`updateWaterFlow` sweep that also deletes "trapped" water, and a second copy
of "does water flow in?" in `PlanetBlockInteraction.breakBlock` that wrote
and saved WATER blocks. Water never runs downhill, never thins out, and every
water cell is a full block with a flat top.

Pale Blue Dot settled this with Luanti's liquid transform on the hex grid
(levels 0..7, a falling bit, sources, renewal) and Luanti's liquid mesh
(sloped tops from corner levels, sides only over air, falls as columns),
remeshing only the water of a chunk when it changes.

## What Changes

- **One liquid rule**, `src/water/Liquid.ts`: the Luanti/PBD transform on
  Tenebris's hex columns, deterministic, ticking only cells near edits.
  It replaces the basin rebalance, the generation cascade, the periodic
  sweep and the break-block water guess, which are deleted.
- **Storage**: sources stay `HexBlockType.WATER` blocks (the ocean, buckets,
  every old save). Flowing water is derived: AIR in the column plus a level
  byte held by the liquid. It is never saved or synced; edits are, through
  the existing same-frame paths, and every client re-derives the same flow.
- **One water mesher**, `src/water/LiquidMesh.ts`, used by all three column
  meshers (main-thread chunk builder, geometry worker, Planet's fallback):
  sloped tops from corner levels, sides only over air, falling cells as
  columns, sources flat at the sheet as before. The old water-wall builders
  (three copies) are deleted.
- **Water-only remesh**: a water change rebuilds only that chunk's water
  mesh (the between-tick smoothing was dropped for it). The flat-shaded
  look (colours, shading) is unchanged; the fragment shader only measures
  fog distance correctly (below).
- **Under water is decided by the drawn surface**: `Planet.isInWater` (fog,
  swimming) uses the sheet height of a source and the sloped height of a
  flowing cell, not the whole block.
- **Under water the view ends in the fog colour**: the frame is cleared to
  the fog colour, the far layer is skipped and the far plane comes in to
  the fog's far distance, instead of a black clear and an unfogged LOD sea
  showing through.
- **Depth through water is the water's thickness along the view ray**: the
  depth pre-pass draws each water mesh's far side (a depth-only twin of its
  material) instead of hiding it, every planet's water takes part, and the
  water and terrain fog use per-fragment distances.
- Tunables in `src/config/WaterConfig.ts`.

Out of scope (owner): flow-scrolled normals or froth, fall froth, mist /
splash / bubbles. Per-planet fish rosters are untouched.

## Capabilities

### New Capabilities

- `water-flow`: how water moves through the hex columns, how it is drawn,
  and when the camera counts as under it.

## Impact

- New: `src/water/Liquid.ts` (LGPL-2.1-or-later port, licence text in
  `src/water/COPYING.LESSER`), `src/water/LiquidMesh.ts`,
  `src/config/WaterConfig.ts`, `scripts/water-flow.test.ts`.
- Changed: `src/planet/Planet.ts`, `src/planet/ChunkGeometryBuilder.ts`,
  `src/workers/geometryWorker.ts`, `src/workers/packedTiles.ts`,
  `src/shared/geometry.ts`, `src/shaders/water/water.vert`,
  `src/planet/HexBlock.ts`, `src/player/PlanetBlockInteraction.ts`,
  `src/engine/GameEngine.ts`, `src/mainPlanet.ts`,
  `src/shaders/water/water.frag`, `src/shaders/terrain/terrain.frag`.
- Saves and MP: no format change. Old saves load unchanged (their WATER
  blocks are sources).
