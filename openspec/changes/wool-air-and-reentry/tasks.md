# Tasks

## 1. Foundation

- [x] 1.1 Items: WOOL, LEATHER, SHEARS, CARPET (block), WOOL_CLOTHING, PARACHUTE (rocket equipment, task 7.1), EMPTY_TANK, OXYGEN_TANK, GAS_COLLECTOR, SPACE_SUIT, each with ITEM_DATA and a drawn icon; CARPET block with its own texture. Verify: industry test (every item has an icon).
- [x] 1.2 Recipes for all of them and the missions of design 5, with new objective kinds. Verify: missions test (every recipe reached once, no overlapping lines).
- [x] 1.3 Lithium deposit on airless bodies; `breathable` per body; SurvivalConfig. Verify: deposit test.

## 2. Ranching

- [x] 2.1 Sheep and cow species, models, anims (Earth only). Verify: roster check; headless shot of a herd.
  Verified: scripts/ranching.test.ts (Earth-only roster, startup check, anim tracks match model parts); headless SP shot of a sheep and a cow herd spawned on Earth.
- [x] 2.2 Shearing and hitting animals (ray pick, shorn state, cow hits, drops, MP host action). Verify: headless shear and kill.
  Verified: scripts/ranching.test.ts (pick, wool range, shorn gives none, regrow, cow falls with leather); headless SP through PlanetBlockInteraction: shears gave wool, a 2nd shear gave none, the snapshot carried shorn=1, 3 hits removed a cow and gave leather. The MP action path (non-host to host, host 'drop' back) is untested with two clients.

## 3. Rocket power

- [x] 3.1 Flight charge, drain, flat-battery effects, POWER gauge, saved charge. Verify: tests of the drain (15 minutes) and packs.
  Verified: `scripts/rocket-survival.test.ts` (15.00 min cell, 45 min with a pack, no thrust when flat); headless POWER gauge drains in flight, flat battery stops the engines.
- [x] 3.2 Swapping a lithium-ion battery into a landed rocket. Verify: headless.
  Verified: headless - right-click path (`rechargeLanded`) used one battery, filled a flat rocket, and re-boarding kept the charge; swap math in the test.

## 4. Re-entry and parachutes

- [x] 4.1 Re-entry heat, damage, burn-up, HEAT gauge, glow. Verify: tests of the heat model.
  Verified: test (no heat leaving only or in a passive fall, heats on a powered dive back in, burns up at maxHeat); headless dive heated and drew the glow.
- [x] 4.2 Parachute part: key and auto open, tear speed, no vacuum, canopy, repack, chuteLanded. Verify: tests; headless descent.
  Verified: test (no vacuum, tears above maxOpenSpeed, holds terminalVelocity); headless auto-open at 45 m, canopy drawn, landed under it.

## 5. Air and suits

- [x] 5.1 Exposure, breath, oxygen tanks, death and respawn, AIR chip. Verify: tests of the air state machine; headless on the Moon.
  - Verified: scripts/air.test.ts (breath, tanks, recovery, exposure table); headless Moon run: AIR chip counts down, "You ran out of air", respawn on Earth; the pause menu holds the clock.
- [x] 5.2 Suit slot, worn state saved, avatar suit. Verify: headless.
  - Verified: headless right-click wear, suit slot shown and clicked off (hotbar first), worn state back after a reload; avatar suit mesh tested in scripts/air.test.ts (not seen in MP).
- [x] 5.3 Gas collector machine. Verify: power test; headless bottling.
  - Verified: scripts/power.test.ts; headless: placed on Earth, refused on the Moon ("No air to collect here"), fills on (forced) grid power.

## 6. Solar power

- [x] 6.1 Solar panel machine: sunlight from the tile's up and the sun direction, open sky, airless boost; recipe, mission, UI. Verify: power test (noon, 45 degrees, night, roof, airless, feeds a network).
- [x] 6.2 Solar array rocket part: inSunlight shadow test, charging in flight and landed, HUD SUN, flat toast once. Verify: rocket-survival test (stats, shadow, charge, cap).

## 7. Rocket equipment (owner, 2026-11-22)

- [x] 7.1 Parachute, solar array and battery pack as EQUIPMENT: `equipment` slots beside the cargo hold (PARTS equipmentSlots, the command module's 3), ROCKET_CONFIG.EQUIPMENT (mass, batteryWh, solarW, chutes; stacking counts), out of PARTS / rocketPart and their part textures; stats from stack + equipment in computeRocketStats. Verify: rocket-survival test (packs extend flight time, two arrays match the draw, a chute adds mass, only the three fit).
  - Verified: scripts/rocket-survival.test.ts; industry test (every rocket part has its model/texture) still passes.
- [x] 7.2 Parachute from the equipment: opening or tearing uses one up, landing closes it, no `chuteSpent` anywhere (controller, landed record, MP `cs`); HUD "CHUTES n [P]" / "CHUTE OPEN"; auto-open only at a survivable speed. Verify: test (consumed on open and on tear, none fitted opens nothing, vacuum uses none).
  - Verified: scripts/rocket-survival.test.ts; headless HUD read "CHUTES 1 [P]" after boarding with one fitted.
- [x] 7.3 Equipment rows in the launch pad panel (drag in from hotbar + bag, click out hotbar first, what it gives) and the landed-rocket panel (icons, opens the filtered cargo panel); saves and MP (pad record, landed record `eq`); migration of older stacks; `launchedWith` for fitted items. Verify: headless.
  - Verified: headless SP with the starter rocket: stone refused, chute + array + pack dropped in, readout "Power 60 kWh, Solar 40 kW, Chutes 1, Mass 508 kg", saved, back after a reload; flight HUD POWER 45:00 and CHUTES 1. Migration and the landed-record path are covered by the unit test only (no old save or second client was loaded).
