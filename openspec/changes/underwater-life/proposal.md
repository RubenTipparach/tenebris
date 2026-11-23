# Proposal: underwater life - wavy plants, anemones, schools of fish

## Why

The owner, 2026-11-23: "underwater: need wavy plants, anemones, and schools
of fish".

The merged `ocean-life` change put sea flora and swimming fish in the four
sea worlds, but under the water it still reads as static:
- **Plants:** the plants lean as one rigid piece. Only Earth has kelp and
  seagrass. Sequoia, Verdance and Mirewood have no tall plant in deep water
  and no short swaying one in the shallows.
- **Anemones:** only Sequoia has them (glow anemones). They don't cluster,
  and the tentacles don't move apart from the column.
- **Fish:** a "school" is a leader and followers parked at fixed stations,
  so it moves like a rigid formation. Every fish is its own fauna record in
  the multiplayer frame.

## What Changes

- **Wavy plants** (extends `SeaFlora`, `SeaFloraConfig`): a travelling wave
  in the sway shader, so fronds bend in an S that runs up the plant. The
  sway stays strongest at the tip, and each plant has its own phase.
  - Tall wavy plants in deep water (kelp's `reach`) and short ones in the
    shallows, on every sea world, each world's own species:
  - **Earth:** kelp and seagrass (now waving).
  - **Sequoia:** ribbon weed and lumen grass, which glows at the tips.
  - **Verdance:** streamer weed, and its reed beds wave.
  - **Mirewood:** bog tresses, and its swamp weed waves.
- **Anemones** (same sway mechanism, plus a per-tentacle flutter):
  - each sea world has its own: Earth's beadlet anemone, Sequoia's glow
    anemone (existing), Verdance's jade anemone, Mirewood's mire anemone;
  - small clusters per tile, in the shallows;
  - mostly near rock: a zone can require a rocky bed, meaning the world's
    rock or a step in the bed (a ledge, its foot, a bank). A second, rarer
    zone lets them grow in patches elsewhere.
- **Schools of fish** (extends `Fauna`):
  - a schooling species' herd is ONE fauna record: an anchor that wanders
    and flees, and is clamped to the water, as solo swimmers already do;
  - its fish are a boids flock round the anchor: cohesion, alignment,
    separation, fleeing the nearest player, and kept in the water column of
    the tile each fish is over;
  - the anchor is one multiplayer record (plus a fish count) on the existing
    `fauna` live channel. Every client runs the same flock step round it;
  - one instanced draw per species, as before.
  - Sequoia gets a small schooling fish, the glimmer sprat (item 196, icon
    drawn by `scripts/gen-item-icons.py`), in its fishing table.
- **Rules kept:** every species, plant or animal, is on one planet only, and
  the roster checks and tests are extended. Lifeless worlds grow and spawn
  nothing. Every number is in `SeaFloraConfig` or `FaunaConfig`.

## Impact

- `src/config/SeaFloraConfig.ts`, `src/mockups/SeaFlora.ts`,
  `src/planet/SeaFloraZones.ts`, `src/config/SolarSystemConfig.ts` (the
  sea flora tables).
- `src/config/FaunaConfig.ts`, `src/planet/Fauna.ts`,
  `src/planet/Schooling.ts` (new and pure: the flock step, testable),
  `src/config/FishRosters.ts`, `src/player/Inventory.ts`,
  `public/textures/fish/sprat.png`.
- Tests: `scripts/sea-flora.test.ts`, `scripts/ocean-life.test.ts`.
- No save changes. Plants come from the seed, and animals spawn lazily.
