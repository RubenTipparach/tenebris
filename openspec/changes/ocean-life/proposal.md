# Proposal: ocean life - flora and fauna

## Why

The owner, 2026-11-22: "We need more ocean life - flora and fauna".

Today four worlds have seas (Earth, Sequoia, and the jungle moons Verdance
and Mirewood), and under their water is bare hex seabed:
- **Fish:** they exist only as catches. Earth has six species in
  `FISH_ROSTERS` and Sequoia two; nothing is seen swimming.
- **The jungle moons** have no fish at all. This is the "known gap" in
  CLAUDE.md's per-planet roster rule.
- **Animals:** the fauna system (`FaunaConfig.ts`, `Fauna.ts`) has walkers,
  hoppers, fliers and floaters, all spawned on land.
- **Plants:** no plant grows under water.

Pale Blue Dot's `ocean-environments` design (reefs, kelp forests, crabs,
jellyfish, a water bestiary) is the reference. This change takes the parts
that make a sea feel alive now.

## What Changes

- **Sea fauna:** a `swim` motion for the fauna system. Swimmers spawn in
  water, keep between the seabed and the surface, school, and flee the
  player. Seabed crawlers walk on submerged ground.
  - **Visible fish:** each ocean world's catchable fish swim there, the same
    species as its fishing table, one roster.
  - **Earth:** crabs (seabed), jellyfish (drift) and sea turtles.
  - **Sequoia:** a lantern squid (glows) and a shell crawler.
  - **Verdance and Mirewood:** a creature each, of their own.
- **Fish for the jungle moons:** three catchable species each, with their own
  icons, in `FISH_ROSTERS`. This closes the known gap.
- **Sea flora:** plants on submerged seabed near the player, swaying with the
  water, each world's own. Earth grows coral in warm shallows, kelp in cooler
  water and seagrass. Sequoia grows glow anemones and sea fans. Each jungle
  moon has its own, such as reeds and lily pads on one and swamp weed on the
  other.
- **Rules kept:**
  - every species, animal or plant, lives on exactly one planet, and the
    roster checks prove it;
  - lifeless worlds stay lifeless;
  - every new item has an icon.

## Impact

- Fauna: `src/config/FaunaConfig.ts` (a swim motion, water species),
  `src/planet/Fauna.ts` (water spawning and swimming),
  `src/planet/FaunaModels.ts`, `scripts/gen-fauna-anims.py`.
- Fish: `src/config/FishRosters.ts`, `src/player/Inventory.ts` (new fish
  items) and their icons.
- Flora: a sea-flora module beside `src/mockups/GroundClutter.ts`, and its
  per-planet table in `SolarSystemConfig`.
- All of it is lit by the sky light table (openspec sky-lighting).
- No save changes: animals spawn lazily, and plants are derived from the
  seed.
