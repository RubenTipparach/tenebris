# Tasks

- [x] 1.1 Swim motion, water spawning, schools. Visible fish from FISH_ROSTERS; Earth, Sequoia, Verdance and Mirewood creatures with models and anims; roster tests.
  - Verify: `npx tsx scripts/ocean-life.test.ts` (rosters disjoint, swimming fish == fishing table per planet, no water life on dry worlds, every model's clips name its parts, swim clamp over 20000 random columns); headless Earth shots show a minnow school, crabs, jellies, a turtle and an eel under the sea.
- [x] 1.2 Jungle-moon fish: items, icons, FISH_ROSTERS entries, fishing works there.
  - Verify: `npx tsx scripts/ocean-life.test.ts` (3 fish each on Verdance and Mirewood, items 190-195 with icons on disk, a campfire cooks each as "any fish"); Fishing.ts rolls from `FISH_ROSTERS[planet]`, so a line on either moon lands its own fish.
- [x] 2.1 Sea flora: per-planet table, seabed scatter, sway, lighting.
  - Verify: each sea world's `seaFlora` table (SolarSystemConfig) and the species looks (`src/config/SeaFloraConfig.ts`): Earth coral (warm, 1-3 deep) / kelp (cool water) / seagrass (1-2 deep); Sequoia glow anemones (1-3) / sea fans (3+); Verdance reed beds (1) / lily pads on the surface (2-3); Mirewood bladderwort under the surface (1-2) / swamp weed (2+). Zones in `src/planet/SeaFloraZones.ts` (pure), meshes in `src/mockups/SeaFlora.ts`, scattered from GroundClutter's one tile walk.
  - `npx tsx scripts/sea-flora.test.ts`: 30 pass - land + sea rosters disjoint (a leak throws), no sea flora on the 32 waterless bodies, zone picker deterministic, coral only warm and 1-3 deep (below 22 deg), kelp only where warmth <= 0.45, neighbouring seabed shares its zone 95-97%, no seabed plant above the water or into the bed, lily pads on the surface. Headless shots (Earth reef and kelp at noon, Sequoia anemones glowing at night and fans by day, Verdance, Mirewood): one draw call per species, 2-3 per sea world.
- [ ] 3.1 Headless shots under water on each sea world; the owner's in-game look.
