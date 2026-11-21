# Tasks

## 1. Foundation: items, blocks, generation, buckets

- [ ] 1.1 New ItemTypes + ITEM_DATA (names, stack sizes, mine times) for every item in design 1-6, each with an icon from scripts/gen-item-icons.py. Verify: a test that every ItemType has ITEM_DATA and an existing icon file.
- [ ] 1.2 New blocks CLAY, OIL_SAND, ORE_URANIUM with drawn textures (block-textures skill: Sweaft-64 palette, top-left light, no AA) and BLOCK_FACES; drops (clay -> CLAY item, Vesper clay too). Verify: scripts/block-audit.py sheet shows them.
- [ ] 1.3 Generation: clay on Earth's shores, oil pockets deep on Earth/Verdance/Mirewood, uranium veins deep on the Moon/Cinder/metal asteroids, all in per-planet config. Verify: a worker test or headless scan finds each where it belongs and never elsewhere (uranium absent on Earth).
- [ ] 1.4 Buckets: bucket on OIL_SAND -> CRUDE_OIL_BUCKET (cell to stone), on MAGMA -> LAVA_BUCKET (cell to basalt); LAVA_BUCKET as furnace fuel (12 smelts, bucket back); CLAY -> BRICK smelt. Verify: tests + headless scoop on Cinder.

## 2. Cooking

- [ ] 2.1 Campfire, Kiln, Oven machines (place, UI as item slot grids incl. the hotbar, save/sync via records): cooked fish, clay pot, fish stew (bucket back). Verify: headless cook a fish and a stew.
- [ ] 2.2 Eating (use a dish in hand) and the well-fed state (FoodConfig, saved, HUD chip; mining and jetpack modifiers). Verify: test of the timer/restart; headless mining time drops while fed.

## 3. Power grid and batteries

- [ ] 3.1 PowerConfig ratings; per-network solver over CableNodeManager networks (supply, demand, battery charge/discharge), driving the existing isPowered flags; network readout in machine UIs. Verify: tests of the solver (overload stops machines, battery covers the gap and drains, surplus charges).
- [ ] 3.2 Lead-acid, lithium-ion, solid-state batteries (recipes, placeable, charge saved). Verify: test capacities are increasing; headless a battery runs a furnace with the engine off.

## 4. Oil industry

- [ ] 4.1 Pump jack (needs OIL_SAND below, powered, tank, drains the pocket, "No oil here"). Verify: headless pump over a pocket fills a bucket.
- [ ] 4.2 Refinery (crude -> kerosene + plastic, bucket back), KEROSENE in FUEL_SOURCES at 40 units. Verify: test of fuel units; headless refine.

## 5. Nuclear

- [ ] 5.1 Centrifuge (uranium ore -> enriched), fuel rod recipe at the workbench. Verify: headless enrich.
- [ ] 5.2 Reactor: airless-only placement with the refusal message, fuel rods, 50 kW while fuelled. Verify: refused on Earth, runs on the Moon (headless).
- [ ] 5.3 Nuclear fabricator: runs only on reactor-powered networks; makes the nuclear parts. Verify: refuses on steam power; prints on the Moon.

## 6. Rocket tiers

- [ ] 6.1 PARTS rows for the nuclear thermal engine, ion drive, reactor core, battery pack; `requires` in computeRocketStats (ion needs a reactor core) with the reason shown and launch refused. Verify: tests of delta-v ordering and the ion requirement.
- [ ] 6.2 Rocket tech report lists tier 3 and 4 builds. Verify: report output.

## 7. Missions

- [ ] 7.1 New branches (clay and cooking, oil, power storage, nuclear) per design 7; coverage test passes with every new recipe reached; new events where needed (cooked, ate, pumped, refined, reactorBuilt, launchedWith). Verify: missions test suite.
