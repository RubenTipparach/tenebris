---
name: block-textures
description: Make a new terrain block for the Tenebris JS client - a biome's own ground (a forest floor, savanna grass, moss, needle duff, a new planet's soil), or any block that needs its own look - as pixel art drawn in code from one palette, wired through the block table, and checked on the block audit sheet. Use whenever a biome needs a different look ("more textures for different biomes", "new ground for the desert", "this biome looks like that one"), a new block or block texture is asked for, or someone suggests tinting/recolouring terrain per biome (don't: draw a new block).
---

# Block textures, the Pale Blue Dot way

The owner, 2026-11-20: "Never tint a biome. Always draw up new blocks. See
Pale Blue Dot's skills on effective block generation." The method below is
Pale Blue Dot's `balatro-pixel-art` skill and its `tools/block_audit.py`,
ported to this repo's stdlib-only generators.

## The rule

- **A biome's look is its own block.** Never colour-shift, tint or
  palette-swap an existing block per biome, in a shader or anywhere else.
  A new biome surface = a new `HexBlockType` with its own texture.
- **Use a texture the game already ships as it is.** A side that shows
  soil reuses the planet's own soil PNG under the new block's lip; it is
  not redrawn.

## Drawing the texture (`scripts/gen-biome-textures.py` is the model)

1. **One palette: Sweaft-64.** Every pixel you draw is a palette colour;
   `check()` refuses to write a texture with one off it.
2. **Short ramps.** Each material is 3-5 tones of one hue, dark to light,
   with a visible step between tones. No gradients, no anti-aliasing,
   alpha 0 or 255.
3. **Light from the top left.** Each clump (leaf, tuft, needle, cushion)
   is its body tone, one up on its top-left edge, one down on its
   bottom-right edge (`Tile.clump`).
4. **Readable at 1x.** Nothing that must read is 1 px thin: leaves 2x3,
   tufts 2 wide, needles stroked 2 wide. A few single bright pixels at most.
5. **Native size, tiling.** Draw at the size the game samples (16x16 for
   these blocks), wrapping at the edges so the tile repeats seamlessly.
   Never draw big and shrink.
6. **Top and side.** The side is the planet's soil with a wavy 2-4 px lip
   of the top hanging over it.

## Wiring a block (one row each)

- `src/shared/blockTypes.ts`: the enum value; `BASE_TERRAIN_TYPE` (which
  base block it behaves like for LOD colour / footsteps); `BLOCK_FACES`
  (top / side / bottom material keys).
- `src/planet/HexBlock.ts`: its material keys in `BIOME_TEXTURES`.
- `src/player/PlanetBlockInteraction.ts`: what mining it drops (a surface
  block drops its soil, as grass does - no new item; a block that is its
  own item needs an icon in the same change).
- Where it grows: the terrain worker's biome table
  (`src/workers/terrainGenerationWorker.ts`) and, for a planet with its own
  blocks, that planet's `blockRemap` in `src/planet/Planet.ts`.
- Its biome's flora: one tree species per biome (CLAUDE.md), in the
  planet's scatter callback in `src/mainPlanet.ts`; ground clutter in
  `src/mockups/GroundClutter.ts`.

## Check it

- `python3 scripts/block-audit.py out.html` draws every block's top / side
  / bottom from the real tables (read from the source, never retyped). A
  red "?" is a face with no texture; a biome block that looks like another
  block is the bug the sheet is for. Screenshot it and look.
- Then look in the game (or headless with the biome screenshot scripts) at
  1x: the new ground beside its neighbours, by day and by night.
