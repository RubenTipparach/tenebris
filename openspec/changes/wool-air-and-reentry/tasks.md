# Tasks

## 1. Foundation

- [x] 1.1 Items: WOOL, LEATHER, SHEARS, CARPET (block), WOOL_CLOTHING, PARACHUTE (rocket part), EMPTY_TANK, OXYGEN_TANK, GAS_COLLECTOR, SPACE_SUIT, each with ITEM_DATA and a drawn icon; CARPET block with its own texture. Verify: industry test (every item has an icon).
- [x] 1.2 Recipes for all of them and the missions of design 5, with new objective kinds. Verify: missions test (every recipe reached once, no overlapping lines).
- [x] 1.3 Lithium deposit on airless bodies; `breathable` per body; SurvivalConfig. Verify: deposit test.

## 2. Ranching

- [ ] 2.1 Sheep and cow species, models, anims (Earth only). Verify: roster check; headless shot of a herd.
- [ ] 2.2 Shearing and hitting animals (ray pick, shorn state, cow hits, drops, MP host action). Verify: headless shear and kill.

## 3. Rocket power

- [ ] 3.1 Flight charge, drain, flat-battery effects, POWER gauge, saved charge. Verify: tests of the drain (15 minutes) and packs.
- [ ] 3.2 Swapping a lithium-ion battery into a landed rocket. Verify: headless.

## 4. Re-entry and parachutes

- [ ] 4.1 Re-entry heat, damage, burn-up, HEAT gauge, glow. Verify: tests of the heat model.
- [ ] 4.2 Parachute part: key and auto open, tear speed, no vacuum, canopy, repack, chuteLanded. Verify: tests; headless descent.

## 5. Air and suits

- [x] 5.1 Exposure, breath, oxygen tanks, death and respawn, AIR chip. Verify: tests of the air state machine; headless on the Moon.
  - Verified: scripts/air.test.ts (breath, tanks, recovery, exposure table); headless Moon run: AIR chip counts down, "You ran out of air", respawn on Earth; the pause menu holds the clock.
- [x] 5.2 Suit slot, worn state saved, avatar suit. Verify: headless.
  - Verified: headless right-click wear, suit slot shown and clicked off (hotbar first), worn state back after a reload; avatar suit mesh tested in scripts/air.test.ts (not seen in MP).
- [x] 5.3 Gas collector machine. Verify: power test; headless bottling.
  - Verified: scripts/power.test.ts; headless: placed on Earth, refused on the Moon ("No air to collect here"), fills on (forced) grid power.
