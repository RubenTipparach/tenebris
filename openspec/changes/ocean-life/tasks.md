# Tasks

- [ ] 1.1 Swim motion, water spawning, schools. Visible fish from FISH_ROSTERS; Earth, Sequoia, Verdance and Mirewood creatures with models and anims; roster tests.
- [ ] 1.2 Jungle-moon fish: items, icons, FISH_ROSTERS entries, fishing works there.
- [x] 2.1 Sea flora: per-planet table, seabed scatter, sway, lighting.
  - Verify: each sea world's `seaFlora` table (SolarSystemConfig) and the species looks (`src/config/SeaFloraConfig.ts`): Earth coral (warm, 1-3 deep) / kelp (cool water) / seagrass (1-2 deep); Sequoia glow anemones (1-3) / sea fans (3+); Verdance reed beds (1) / lily pads on the surface (2-3); Mirewood bladderwort under the surface (1-2) / swamp weed (2+). Zones in `src/planet/SeaFloraZones.ts` (pure), meshes in `src/mockups/SeaFlora.ts`, scattered from GroundClutter's one tile walk.
  - `npx tsx scripts/sea-flora.test.ts`: 30 pass - land + sea rosters disjoint (a leak throws), no sea flora on the 32 waterless bodies, zone picker deterministic, coral only warm and 1-3 deep (below 22 deg), kelp only where warmth <= 0.45, neighbouring seabed shares its zone 95-97%, no seabed plant above the water or into the bed, lily pads on the surface. Headless shots (Earth reef and kelp at noon, Sequoia anemones glowing at night and fans by day, Verdance, Mirewood): one draw call per species, 2-3 per sea world.
- [ ] 3.1 Headless shots under water on each sea world; the owner's in-game look.
