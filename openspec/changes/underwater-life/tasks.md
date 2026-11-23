# Tasks

- [x] 1.1 Wavy plants: travelling-wave sway, per-planet tall (deep) and short (shallow) wavy species on all four sea worlds.
  - Verify: `npx tsx scripts/sea-flora.test.ts` (each sea world has a tall wavy, a short wavy and an anemone of its own; rosters disjoint; tall plants only deeper than the short ones).
  - Earth: kelp / seagrass. Sequoia: ribbon weed / lumen grass. Verdance: streamer weed / reed beds. Mirewood: bog tresses / swamp weed. `wave` in `SEA_FLORA_SPECIES`, shapes `ribbon`, `streamer`, `tresses` in `src/mockups/SeaFlora.ts`.
- [x] 1.2 Anemones: one species per sea world, clustered, flutter, mostly on rocky beds.
  - Verify: sea-flora tests (rocky beds pick the anemone in the shallows; flat silt does not; a tile's anemones sit in one clump). A bed is rocky when it is the world's rock or a step in the bed: a ledge, its foot or a bank (`rockyBed`, `SEA_FLORA.LEDGE_STEP`).
- [x] 2.1 Boids schools: one anchor record per school, pure flock step, water clamp, flee; MP sends one record per school.
  - Verify: `npx tsx scripts/ocean-life.test.ts` (the flock holds together, keeps a separation, aligns, and flees a threat; schooling species per sea world; the glimmer sprat has an icon on disk).
  - Fish now flee at 3 units (inside the 5 unit underwater fog), so a school can be watched. The smallest drawn fish is 0.4 units long.
- [x] 3.1 Headless shots under water on Earth and one other sea world: kelp sways, anemones read as anemones, a school is visible.
  - Verify: `underwater-earth-*.png` and `underwater-sequoia-*.png` (Playwright, SwiftShader, `?debug&sp`). Between the two kelp frames 1.8 s apart, with the camera held still, 22% of the pixels change.
- [ ] 3.2 The owner's in-game look.
