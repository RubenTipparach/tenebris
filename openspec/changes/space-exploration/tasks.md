# Tasks

## 1. Exploration tree, toast and survey beacons

- [ ] 1.1 Add `space`, `sunward` and `outward` branches to `MISSION_BRANCHES`, with an `announcedBy: 'assemble'` field on `space`; verify the tree panel shows the three rows in a headless screenshot.
- [ ] 1.2 Announce the exploration tree: show the unlock toast (with the body count) when `assemble` completes, and keep `announced` in the mission save so it shows once; verify with a `missions.test.ts` case (toast once, not again after reload) and a headless run.
- [ ] 1.3 Add the survey beacon item (icon, recipe unlocked by `assemble`) as a placed object saved and synced through the existing placed-object path, emitting `surveyed` with the body id and showing on the system map; verify placing one on the Moon persists across a reload and a second MP client sees it.
- [ ] 1.4 Add the `surveyed`, `closePass` and `skimmed` objective kinds, and pass the body id on `chuteLanded`; verify with `missions.test.ts` cases for each kind and body matching.
- [ ] 1.5 Add one visit mission for every body in the order of design §1: reuse the `moon` and `sequoia` ids, put moons under their planet and asteroids under their nearest major body, and give each a placeholder unlock of an existing item; verify the tree renders both routes in a headless screenshot.
- [ ] 1.6 Add the coverage and route tests: one visit mission per body in `SOLAR_SYSTEM` + `GAS_GIANTS` (except Earth), naming any missing body; moons after their parent; asteroids under their nearest major body. Verify the tests pass, and fail when a test body is added without a mission.
- [ ] 1.7 Show exploration progress (visited / total) on the branch plaque and visit-mission side panels; verify in a headless screenshot.
- [ ] 1.8 Keep veteran worlds: count a body already landed on as surveyed in `satisfiedNow`; verify a saved-world fixture that landed on the Moon and Sequoia loads with both visits done and no recipe re-locked.

## 2. Environments, atmospheres, heat shield, Sun and gas giants

- [ ] 2.1 Add `environment { temperature, radiation, atmosphereDensity }` to every body and gas giant config (values from design §6-7); verify a test that `atmosphereDensity > 0` exactly where `hasAtmosphere` is true plus the gas giants.
- [ ] 2.2 Generalise `Survival.ts` exposure into the hazard table (air, heat, cold, radiation) with `SurvivalConfig.ENVIRONMENT` gauge lengths, cabin and suit protection; verify `air.test.ts` is unchanged and new cases pass (cold drains on Tessaly in a space suit; the cabin protects; recovery when safe).
- [ ] 2.3 Show one HUD chip per draining gauge in `AirSystem`; verify a headless screenshot on a cold body.
- [ ] 2.4 Scale `reentryStep` heat and parachute braking by `atmosphereDensity`; verify `rocket-survival.test.ts` keeps Earth's numbers and adds thick- and thin-atmosphere cases.
- [ ] 2.5 Add the heat shield equipment (icon, wear, removal when worn out); verify tests that a shield cuts heat gain and wears by what it absorbs.
- [ ] 2.6 Give the gas giants a gravity well, an atmosphere shell, a crush depth and a `skimmed` event; verify a test of skim in/out completing the visit, and burning up without a shield.
- [ ] 2.7 Add the Sun's radiant heat inside `SUN.closePassRadii` and the `closePass` event; verify a test of a shielded pass surviving and an unshielded one burning up.
- [ ] 2.8 Show environment (temperature, radiation, atmosphere) on the system map and visit cards; verify in a headless screenshot. Ask the owner to check the gauges and re-entry feel in game.

## 3. Staging

- [ ] 3.1 Add the `STAGE_SEPARATOR` part (icon, model, part type) and a pure `stagesOf(parts)`; verify unit tests: no separator gives one stage, and two separators give three.
- [ ] 3.2 Make `computeRocketStats` per stage plus the total, and show stages on the pad readout; verify tests that a stack with no separator has the same stats as before, and a headless pad screenshot.
- [ ] 3.3 Move fuel to `stageFuel[]` on rockets, pads and parked rockets, loading old `fuel` as one stage; verify an old-save fixture loads unchanged, and a test that only the active stage's tanks drain.
- [ ] 3.4 Add `ROCKET_INPUTS.STAGE` (B): drop the active stage as falling debris and recompute the rocket; refuse on the last stage; keep only attached parts on the pad record; verify tests for drop and refusal, plus a headless flight that stages and keeps flying. Ask the owner to stage in game.

## 4. Refit

- [ ] 4.1 Generalise `LaunchPadUI`'s stack editor over a stack host (pad or parked rocket) with one `stackProblems(parts)` check; verify the pad editor behaves as before (existing tests) and `stackProblems` tests.
- [ ] 4.2 Confirm launch pads complete and launch on the Moon, fixing any Earth-only assumption; verify a headless build-and-launch on the Moon.
- [ ] 4.3 Add Dock to `LandedRocketUI` (an empty complete pad within `REFIT.DOCK_RADIUS_M` on the same body) moving parts, fuel, cargo and equipment to the pad; verify a test and a headless dock on the Moon, persisting over a reload.
- [ ] 4.4 Add the refit kit (and the mk2 reusable kit) opening the editor on a parked rocket, landed or in space, using cargo and inventory; verify a test of an engine swap in space (kit used up, stats updated) and refusal without a kit.

## 5. Engine ladder

- [ ] 5.1 Add the solar-electric ion thruster: it draws charge while firing, with no reactor needed; verify `rocket-power` tests that it thrusts on charge and stops when the charge is empty.
- [ ] 5.2 Add the gas-core engine, fission-fragment drive (requires a reactor core and magnets) and nuclear pulse drive (pulse units from cargo); verify tests of the specs' orderings (more Isp and thrust than nuclear thermal; refused without a reactor core; TWR above 1 for heavy stacks; pulse units consumed).
- [ ] 5.3 Add the D-He3 fusion drive and magnetic fusion torch, drawing helium-3 and deuterium from cargo through the fuel-source path; verify tests that the torch has the highest delta-v and TWR above 1 on Earth.
- [ ] 5.4 Extend `scripts/rocket-tech-report.ts` with every tier and tune the config numbers until each route's next hop is reachable with that tier; verify the report output is committed in the PR description.
- [ ] 5.5 Add a gating test: each new engine is unlocked by one visit mission and uses a resource from that body or an earlier body on its route; verify it passes.

## 6. Resources and suits

- [ ] 6.1 Add the body resources (resin, salvage and superconductor, rare-earth ore and magnets, radiotrophic fungus, silica and aerogel, crystal and laser crystal, cryogenic coolant, coronal field data, pulse units), each with an icon and blocks drawn by the block-textures skill, gathered only on their body; verify an icon test and a per-body gathering test.
- [ ] 6.2 Add the thermal and hardened suits (and suit heaters) with protection sets in `SurvivalConfig.SUITS`; verify tests: thermal on Tessaly holds, thermal on Glacia drains, hardened holds everywhere.
- [ ] 6.3 Add the upgrade parts (mk2/mk3 tanks, cargo, batteries, solar, radiators, drogue chute, RTG, cryo tank, compact reactor core, survey drone); verify `computeRocketStats` tests for each new stat they bring.

## 7. Thalassa

- [ ] 7.1 Add Thalassa to `SOLAR_SYSTEM` (design §9) with its own blocks; verify `bodyClearanceProblems` passes, and a headless from-orbit shot shows at least 90% ocean with islands.
- [ ] 7.2 Give Thalassa its own sea flora, fish and island tree, extending the roster disjointness asserts; verify the asserts pass and a headless underwater shot shows its species.
- [ ] 7.3 Add the deep deuterium band; verify a test that the band yields deuterium only below its depth. Ask the owner to check Thalassa in game.

## 8. Submarine and gas-giant diver

- [ ] 8.1 Add the submarine vehicle (place, board with F, pilot with a quaternion attitude, buoyancy, ballast, park), saved and synced as a placed-object record; verify tests for park/board/persist and a headless dive in Earth's sea.
- [ ] 8.2 Add hull crush depths and HUD depth/rating/health; verify a test that damage starts below the rating and the craft is lost at zero health.
- [ ] 8.3 Add depth-band resource collection for oceans and gas giants; verify tests for deuterium (Thalassa) and helium-3 (Aurelia band).
- [ ] 8.4 Add the gas-giant diver: released from a skimming rocket's cargo, descends in the gas giant's fluid sphere, docks back; verify a headless dive into Aurelia returning helium-3 to the cargo. Ask the owner to try the submarine and diver in game.

## 9. Rewards wiring and integration

- [ ] 9.1 Replace the placeholder unlocks with the rewards in design §2, and turn on the test that every visit mission unlocks a recipe it owns; verify the test and that every new item is unlocked by exactly one mission.
- [ ] 9.2 Add the cross-route test: with only sunward done the torch stays locked and its card names the outward reward; verify it passes.
- [ ] 9.3 Headless integration run: a debug save that teleports a rocket along both routes, completing each visit mission in order; verify the mission count reaches all bodies with no errors, and summarise the run in the PR.

## Workflow follow-up

- Ask the owner to play both routes in game before archiving the change.
- Archive the change after review, and sync its specs into `openspec/specs/`.
