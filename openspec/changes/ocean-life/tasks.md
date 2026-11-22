# Tasks

- [x] 1.1 Swim motion, water spawning, schools. Visible fish from FISH_ROSTERS; Earth, Sequoia, Verdance and Mirewood creatures with models and anims; roster tests.
  - Verify: `npx tsx scripts/ocean-life.test.ts` (rosters disjoint, swimming fish == fishing table per planet, no water life on dry worlds, every model's clips name its parts, swim clamp over 20000 random columns); headless Earth shots show a minnow school, crabs, jellies, a turtle and an eel under the sea.
- [x] 1.2 Jungle-moon fish: items, icons, FISH_ROSTERS entries, fishing works there.
  - Verify: `npx tsx scripts/ocean-life.test.ts` (3 fish each on Verdance and Mirewood, items 190-195 with icons on disk, a campfire cooks each as "any fish"); Fishing.ts rolls from `FISH_ROSTERS[planet]`, so a line on either moon lands its own fish.
- [ ] 2.1 Sea flora: per-planet table, seabed scatter, sway, lighting.
- [ ] 3.1 Headless shots under water on each sea world; the owner's in-game look.
