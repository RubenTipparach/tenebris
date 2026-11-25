# Tasks

## 1. The rule (water-flow)

- [x] 1.1 `src/water/Liquid.ts`: Luanti/PBD transform on hex columns, unique queue, tick, touch, flowing bytes per column, renew via `setSource`, the previous-tick record for smoothing; LGPL header + `src/water/COPYING.LESSER`. Verify: `scripts/water-flow.test.ts` 1-6.
- [x] 1.2 `src/config/WaterConfig.ts`: tick, range, renew, drop boost, caps, shape levels.
- [x] 1.3 Planet owns one Liquid: `setBlock` touches it, loaded edits touch it, reset clears it, `updateLiquid(dt)` ticks and queues the changed columns; mainPlanet ticks every planet. Delete `simulateWaterFlow`, `rebalanceWaterBasin`, `cascadeWaterInColumns`, `updateWaterFlow` and the break-block water guess. Verify: tsc.

## 2. The shape

- [x] 2.1 `src/water/LiquidMesh.ts`: corner levels, sloped tops, sides over air, columns under water, bottoms over air. Verify: test 7.
- [x] 2.2 The three column meshers call it; the three water-wall builders are deleted; flowing bytes go to the worker as triples. Verify: tsc, vite build.
- [x] 2.3 ~~S1-S4 smoothing~~ removed: water changes remesh only the chunk's water (`Planet.rebuildChunkWater`), the mesh shows the current tick. Verify: test 13 (water never changes the terrain buffers); the rebuild probe in PR #129.

## 3. Under water

- [x] 3.1 `Planet.waterSurfaceRadiusAt` and `isInWater` by the drawn (sloped) surface.
- [x] 3.2 Under water: clear to the fog colour, skip the far layer, far plane at the fog's far distance.
- [x] 3.3 Depth pre-pass draws water's far side (back-face depth twin per water material), every planet registered; per-fragment fog distances in water.frag and terrain.frag.
- [x] 3.4 Headless sweeps: the sea at +3 .. -2.5 m, and the flow volumes (above, at the surface, inside, inside a filled pit, beside a fall).

## 4. The flow texture (PBD's water look)

- [x] 4.1 `src/water/FlowTile.ts`: water.png ranked into tones (= PBD TEX_IDX). Verify: test 11.
- [x] 4.2 `LiquidMesh`: `liquidFlow` per vertex (cap flow from the corner slope, side direction, face code); plumbed through the three meshers, the worker transfer and both geometry builders. Verify: test 10.
- [x] 4.3 `water.vert` / `water.frag`: caps panned along the flow, sides standing, falls panned down with froth; fades by distance and texel size; none under water; numbers in `WaterConfig`. Verify: headless watertex-* shots (fall close up, caps from above, the sea from the shore, high up).

## 5. Verify

- [x] 5.1 All `scripts/*.test.ts`, `npx tsc --noEmit -p .`, `npx vite build`, `npx openspec validate --all --strict`.
- [ ] 5.2 Owner's in-game check: pour a bucket on a hillside, dig beside the sea, swim in a filled pit; the flow texture on tops, falls and the sea.
