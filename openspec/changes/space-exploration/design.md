# Design

## Context

See proposal.md for why. What exists today (surveyed from the code):

- **Bodies** (`src/config/SolarSystemConfig.ts`):
  - 34 landable bodies besides Earth, plus the Sun (`SUN_POSITION` 2300,0,700) and two visual-only gas giants (`GAS_GIANTS`: Brontes, Aurelia: no gravity, no collision).
  - Per-body flags: `hasAtmosphere`, `breathable`, `terrain.hasWater`, `volcanoes`, `iceCover`, `metalRich`. There is no temperature, radiation or atmosphere density.
  - No ocean world exists. Only Earth, Sequoia, Metropole Prime (id `ferrum`), Verdance and Mirewood have air, and all five are breathable.
- **Missions** (`src/config/Missions.ts`, `MissionTracker.ts`, `MissionsPanel.ts`):
  - Each mission has one parent plus hidden `after` gates.
  - Objectives are matched from `GameEvents`; body-keyed kinds are only `landed` and `caughtOn`.
  - Ids are saved, so they are never renamed. The completion toast lives in `MissionsPanel` `onComplete`.
  - Branches are only row labels; there is no branch-level unlock.
- **Rockets** (`RocketConfig.PARTS`, `RocketPerformance.computeRocketStats`):
  - Tiers 1-4: chemical, vacuum, nuclear thermal, and the ion drive, which needs a reactor core.
  - Equipment slots (parachute, solar array, battery pack) and engine modes exist.
  - There is no staging. A rocket can only be edited on its pad (`LaunchPadUI`). A parked rocket is a `LandedRocket` holding a `pad` reference.
- **Re-entry** (`REENTRY`, `inAtmosphereShell`, `reentryStep`):
  - Re-entry is uniform: it depends only on `hasAtmosphere`.
  - The parachute's rules are also uniform.
- **Survival** (`Survival.ts`, `AirSystem.ts`): air only. Exposure comes from vacuum or unbreathable air; there is one suit item and oxygen tanks. No heat, cold or radiation.
- **Vehicles:** only the rocket. Swimming is player physics. Gas giants have no entry mechanic.

Project rules that shape the approach (CLAUDE.md):
- One code path per piece of logic.
- Extend existing systems; don't rebuild them.
- No magic numbers: config tables.
- Every item has an icon.
- Per-planet flora and fauna rosters are disjoint and tested.
- Never tint a biome: draw new blocks.
- World edits persist on the same frame.
- Multiplayer objects sync through the one save/restore path.

## Goals / Non-Goals

**Goals:**
- A tree that provably covers every body, and stays covering as bodies are added.
- Two routes that are pleasant to fly in order, with each body feeding a later one and both routes feeding the end.
- Every new system lands as an extension of the existing one: missions, part table and stats model, equipment, survival gauges, save and record paths.
- Phased delivery, each phase playable on its own.

**Non-Goals:**
- Orbital mechanics for parked craft. A rocket parked in space stays where it was left, as today.
- Docking two rockets together in flight.
- Life support beyond air plus the new temperature and radiation gauges (food, water, sanity).
- The Rust port. This change is JS client and JS server only.
- Making gas giants landable. They gain an atmosphere and gravity, not a surface.

## Decisions

### 1. The route

The Moon is the root. From it the tree splits into two routes:
- **Sunward:** systems nearer the Sun than Earth, ordered by nearest next system.
- **Outward:** systems farther out. The order of the seven outer systems was chosen by trying every order and scoring total travel plus a penalty for stepping back toward the Sun. The best order travels about 26,400 units in all, against 37,000 for a strict distance-from-the-Sun sort, which crosses the Sun twice.

Moons follow their planet. Each asteroid is a side trip off the major body nearest it.

| Route | Order (moons and side trips indented) | Distance to Sun |
|---|---|---|
| root | **Moon** | 2025 |
| sunward | **Sequoia**; Rime, Ember | 1533 |
| sunward | **Metropole Prime**; Lodestone | 1559 |
| sunward | **Umbra**; Nyx, Brand; asteroid Grit | 1715 |
| sunward | **Vesper**; Sable; asteroids Talus, Magnetite | 1967 |
| sunward | **The Sun** (close pass) | 0 |
| outward | **Kessel**; asteroid Sleet | 3164 |
| outward | **Thalassa** (new ocean world) | 3596 |
| outward | **Aurelia** (gas giant skim); Mirewood, Ashfall, Ingot, Calyx | 4876 |
| outward | **Cinder**; Scoria; asteroid Nickel | 3908 |
| outward | **Nerith**; asteroid Ferrite | 3891 |
| outward | **Halcyon**; Glint | 4349 |
| outward | **Tessaly**; asteroid Clinker | 5278 |
| outward | **Brontes** (gas giant skim); Verdance, Pyrra, Glacia, Obol; asteroid Hailstone | 8666 |

That makes 38 visit missions: 35 landable bodies including Thalassa, two gas giants and the Sun.

Alternative considered: a single nearest-neighbour chain over all bodies. It wanders across the Sun repeatedly and loses the "toward the Sun / away from the Sun" shape the owner asked for.

### 2. What each body gives

Each visit mission's `unlocks` names its reward.
- Major bodies give the headline items.
- Moons and asteroids give upgrades and refuelling, so no visit is empty. Upgrades are mk2 tanks, cargo, batteries and solar, chutes, radiators and the like.
- Every body keeps its existing ores and fuel (ice).

| Body | New resource | Reward (recipe unlocked) | Used for |
|---|---|---|---|
| Moon | (titanium, lithium, uranium exist) | ion thruster, stage separator | ion upper stages; staging |
| Sequoia | resin | heat shield | gas giants, Sun, Thalassa |
| Rime | - | refit kit | refits away from home |
| Ember | (basalt, sulfur exist) | ceramic plating, gas-core engine | fission tier 2 |
| Metropole Prime | salvage, refined into superconductor | submarine | Thalassa (outward) |
| Lodestone | rare-earth ore, made into magnets | fission-fragment drive | magnetic fission |
| Umbra | radiotrophic fungus | radiation lining | hardened suit |
| Nyx | - | mk2 battery pack | |
| Brand | (sulfur exists) | pulse unit, nuclear pulse drive | heavy lift off big bodies |
| Grit | - | mk2 cargo bay | |
| Vesper | silica, made into aerogel | thermal suit | hot and cold worlds |
| Sable | - | radiator | engine and suit cooling near the Sun |
| Talus, Magnetite | - | mk2 solar array; mk2 fuel tank | |
| The Sun | coronal field data | magnetic confinement coil | fusion torch (needs both routes) |
| Kessel | - | radioisotope generator (RTG) | power far from the Sun |
| Sleet | - | cryo tank | carries helium-3 and deuterium |
| Thalassa | deuterium (deep, by submarine) | gas-giant diver | helium-3 and metallic hydrogen |
| Aurelia | helium-3 (diver) | D-He3 fusion drive | fusion tier 1 |
| Mirewood | - | drogue parachute | thick atmospheres |
| Ashfall | - | heat shield mk2 | |
| Ingot | - | large cargo bay | |
| Calyx | - | suit heater | longer cold stays |
| Cinder | - | compact reactor core | |
| Scoria, Nickel | - | mk2 radiator; mk2 reactor fuel rod | |
| Nerith, Ferrite | - | deep-hull submarine; mk3 fuel tank | Thalassa deep band |
| Halcyon | crystal | laser crystal | hardened suit visor; fusion ignition |
| Glint | - | survey drone (beacons placed from orbit) | small, airless bodies |
| Tessaly | cryogenic coolant | coolant loop | fusion torch |
| Clinker | - | mk2 refit kit (reusable) | |
| Brontes | metallic hydrogen (deep diver) | magnetic fusion torch | the end of the ladder |
| Verdance, Pyrra, Glacia, Obol, Hailstone | - | deep diver hull, heat shield mk3, mk2 suit heater, mk3 battery, mk3 cargo | |

Cross-route links (so both routes are needed):
- The submarine comes from Metropole (sunward) and is used at Thalassa (outward).
- The hardened suit needs Umbra's fungus (sunward) and Halcyon's crystal (outward).
- The fusion torch needs coronal data (sunward, the Sun) and helium-3, deuterium, metallic hydrogen and coolant (outward).

### 3. Engine ladder

Real propulsion concepts, scaled to game stats. They are new entries in `ROCKET_CONFIG.PARTS` and go through the existing `computeRocketStats` model.

| Tier | Engine | Thrust | Isp | Dry kg | Needs | Gate |
|---|---|---|---|---|---|---|
| 1 | Chemical (exists) | 39 kN | 90 | 100 | - | Earth |
| 2 | Vacuum (exists) | 26 kN | 200 | 150 | - | Moon titanium |
| 2 | **Solar-electric ion thruster** | 0.6 kN | 2000 | 60 | draws charge while firing | Moon |
| 3 | Nuclear thermal (exists) | 30 kN | 500 | 300 | - | uranium |
| 3 | **Gas-core nuclear** ("nuclear lightbulb") | 60 kN | 1200 | 500 | fuel rods to build | Ember |
| 4 | Nuclear-electric ion drive (exists) | 1.5 kN | 3000 | 120 | reactor core | |
| 4 | **Fission-fragment drive** (magnetic fission) | 4 kN | 9000 | 300 | reactor core, magnets | Lodestone |
| 4 | **Nuclear pulse drive** ("Orion", fission bombs) | 400 kN | 2500 | 1500 | pulse units in cargo | Brand |
| 5 | **D-He3 fusion drive** | 25 kN | 12000 | 600 | helium-3 in cargo | Aurelia |
| 6 | **Magnetic fusion torch** | 120 kN | 30000 | 900 | helium-3 and deuterium in cargo | Brontes, plus the coil from the Sun |

**Charge and consumables:**
- The solar-electric thruster spends the rocket's charge (the existing `rocket-power` system), so solar arrays, battery packs and the RTG matter.
- Consumable engines draw their item from cargo through the same fuel-source path as refuelling (`RocketController.fuelSource`). The pulse drive uses pulse units; the fusion engines use helium-3 and deuterium.

**Tuning:** the numbers are first drafts. `scripts/rocket-tech-report.ts` is extended to print each tier's delta-v and the trips it makes, and the numbers are tuned there.

### 4. Staging

`STAGE_SEPARATOR` is a part (type `SEPARATOR`) in the existing stack list.
- **Stages:** a pure `stagesOf(parts)` splits the bottom-to-top list at separators. `computeRocketStats` runs per stage and sums the results.
- **Fuel:** the active stage's tanks feed its engines. Fuel moves from one number to `stageFuel: number[]`. An old save's single `fuel` loads as a one-stage array, so old saves are unchanged.
- **Dropping a stage:** `ROCKET_INPUTS.STAGE` (B) detaches the active stage's part meshes into a debris group. The debris inherits the rocket's velocity and falls under gravity until it hits the ground or times out, and is then disposed. It is never saved.
- **Saves and sync:** the pad and parked-rocket records keep only attached parts. Multiplayer already rebuilds a remote ship when its part list changes (`RocketSync` restack).

Alternative considered: separate physics bodies for dropped stages that can be recovered. That was rejected as too much for its value; the spec makes dropped stages gone for good.

### 5. Refit

There is one stack editor. `LaunchPadUI`'s stack panel is generalised over a stack host interface: the parts list, cargo, fuel per stage, and a save hook. A launch pad and a parked rocket both implement it.
- **Docking:** `LandedRocketUI` gains Dock when a complete, empty pad on the same body is within `REFIT.DOCK_RADIUS_M`. Dock moves the parts, fuel, cargo and equipment to the pad through the pad's save path.
- **Refit kit:** equipment that opens the editor on the parked rocket itself. Parts move between the rocket's cargo and the player's inventory, and the kit is used up (the mk2 kit is not).
- **Flyable check:** one `stackProblems(parts)` check refuses a stack with no command module or with unmet `requires`. The pad uses it too.
- **Off-world pads:** pads already appear placeable anywhere. A test confirms that a pad completes and launches on the Moon.

### 6. Environments

Each body config gains `environment: { temperature, radiation, atmosphereDensity }`.
- Gas giants and the Sun get the same fields in their tables.
- `hasAtmosphere` stays. A test asserts `atmosphereDensity > 0` exactly when `hasAtmosphere` is true, plus the gas giants. One fact, checked so it can't drift.

**Gauges:** `Survival.ts` generalises the air exposure rule into one table of hazards: air, heat, cold and radiation.
- Each hazard has a gauge length in seconds (`SurvivalConfig.ENVIRONMENT`) and the same rules: the cabin protects, a suit rated for it protects, otherwise the gauge drains, and it recovers when safe.
- `AirSystem`'s chip becomes one chip per draining gauge.
- The gauges are long enough to plant a beacon unprotected (about 60 s), so gear is about staying, not about arriving.

**Suits:** suit tiers are items in the one suit slot, with protection sets in `SurvivalConfig.SUITS`.
- Space suit: vacuum.
- Thermal suit: vacuum, hot and cold.
- Hardened suit: everything, including scorching, frozen and high radiation.

**Temperature and radiation by body:**

| Class | Bodies |
|---|---|
| Scorching | Ember, Brand, Pyrra, Ashfall |
| Hot | Cinder, Vesper, Sable, Lodestone |
| Temperate | Earth, Moon, Sequoia, Metropole, Thalassa, Verdance, Mirewood, Scoria |
| Cold | Umbra, Nyx, Rime, Kessel, Nerith, Halcyon, Ingot, and the rock asteroids |
| Frozen | Tessaly, Glint, Calyx, Glacia, Obol, and the ice asteroids |

High radiation is on the gas giants' moons and close to the Sun.

### 7. Atmospheres, the heat shield, the Sun and gas giants

**Heat and braking:**
- `reentryStep` and the parachute braking take the body's `atmosphereDensity` as a factor. Heat gain and chute drag both scale with it, and the safe speed scales inversely.
- Draft densities: Earth 1, Sequoia 1.2, Metropole 1, Verdance and Mirewood 1.5, Thalassa 2.5, gas giants 8.

**Heat shield:**
- Equipment with a heat capacity. While it has capacity it absorbs a share of the heat gained (`REENTRY.shieldShare`) and wears down by what it absorbs.
- A worn-out shield is removed from the equipment.

**Gas giants:**
- They gain a gravity well and an atmosphere shell at their cloud top (`GAS_GIANTS` entries get `gravity` and `environment`). A rocket entering heats like any atmosphere.
- Below a set depth, a rocket is crushed.
- A visit is a 'skimmed' event: in, then out, intact.

**The Sun:** inside `SUN.closePassRadii` × its radius, the Sun heats the rocket by proximity (a radiant source added to the same heat sum). Leaving the radius intact emits 'closePass'.

### 8. Missions mechanics

- **Branches:** the exploration branches are `space` (the Moon), `sunward` and `outward`, laid out by the existing tree layout.
- **Toast:** `MISSION_BRANCHES` entries can name `announcedBy: <missionId>`. When that mission completes, `MissionsPanel` shows "Space exploration unlocked - visit N bodies" once. The ids already announced are kept in the mission save (`announced: string[]`).
- **New objective kinds,** each body-keyed through `GameEvents`:
  - `surveyed`: a survey beacon is placed. The beacon is a placed object, so it is saved and synced through the existing placed-object path and marked on the system map.
  - `closePass`
  - `skimmed`
  - `chuteLanded` now carries the body id.
- **Visit missions:** each one is `landed` + `surveyed`, plus `chuteLanded` where there is atmosphere.
- **Existing ids:** the existing `moon` and `sequoia` missions become the Moon's and Sequoia's visit missions; their ids are kept and the `surveyed` objective is added. `satisfiedNow` counts a body already landed on as surveyed, so veteran worlds keep their progress. Other existing missions (`moonmetal`, `vacuum`, `explorer`, …) keep their ids and parents.
- **Unlock owner:** the survey beacon recipe is unlocked by `assemble`, alongside the toast.
- **Tests:** coverage (one visit mission per body), routes (moons after their parent, asteroid under its nearest major body), and rewards (every visit unlocks something). They live in `scripts/missions.test.ts` and read the real config tables.

### 9. Thalassa

A new `SOLAR_SYSTEM` body at (1500, -200, 4200), radius 150.
- **Terrain:** the Earth-style generator with a high sea level and island noise, so at least 90% is ocean. A deep floor holds the deuterium band.
- **Air:** atmosphere density 2.5, breathable.
- **Blocks:** its own blocks (seabed, island ground), drawn by the block-textures skill.
- **Life:** its own sea flora, fish and island tree species, listed in the flora and fish rosters, with the disjointness asserts extended.
- **Placement check:** `bodyClearanceProblems` must pass. The distance checks above show at least 1,000 units of clearance.

### 10. Submarines

One vehicle module, `src/vehicles/Submarine.ts`, placed next to the rocket code and following the parked-rocket pattern.
- **Placing:** a placeable item; it is boarded with Interact (F).
- **Piloting:** a quaternion-backed attitude (CLAUDE.md rule), buoyancy, drag and ballast (rise and sink keys).
- **Parking and sync:** leaving parks it. It is saved and synced as a placed-object record kind (`submarine`) through `GameStorage` save, `NetSync` and `restoreSavedObject`.

**Fluids:** the medium is either voxel water (oceans) or a gas giant's fluid sphere, below its cloud top. Both feed the same `depthAt` and `densityAt`, so one physics path covers both.
- Each hull type has a crush depth (`SUBMARINE.HULLS`).
- Depth bands per body give resources over time held in the band (`SUBMARINE.BANDS`).
- The gas-giant diver is the same vehicle class with a gas hull. It is released from a skimming rocket's cargo and docks back into it.

### Phasing

Each phase is playable on its own. Visit missions whose reward items arrive in later phases unlock an existing item until then. The "every visit unlocks a recipe it owns" test is turned on in the final phase.

1. Tree, toast, beacons, coverage
2. Environments, atmospheres, heat shield, Sun pass, gas giant entry
3. Staging
4. Refit
5. Engine ladder
6. Resources and suits
7. Thalassa
8. Submarine and diver
9. Rewards wiring and integration

## Risks / Trade-offs

- [Scope: 38 missions and roughly 45 new items, each needing an icon] → Phased delivery. Icons come from one generated atlas script per batch. Placeholder rewards keep early phases playable.
- [Balance: delta-v and gauge numbers are guesses] → Every number lives in config. The rocket tech report prints the trips each tier makes, and tuning happens there.
- [Saves: fuel per stage and new mission objectives on old ids] → `fuel` migrates to `stageFuel`; `satisfiedNow` covers landed bodies. Old saves are tested by loading a fixture.
- [Multiplayer: stage drops, refits and submarines must sync] → They go only through the existing record paths (part list, landed rocket, placed objects). No new sync code.
- [Gas giant physics is new ground] → It is limited to a spherical fluid volume and a crush depth, with no surface.
- [Visual and feel changes can't be proven by tests: staging, submarine handling, Thalassa's look] → Each phase ends with headless screenshots, then asks the owner to check in game.

## Migration Plan

- Old saves load unchanged.
  - Pads and parked rockets with a single `fuel` read as one stage.
  - Mission saves gain `announced` and the new objectives.
  - Worlds that landed on the Moon or Sequoia keep those visits done.
- Each phase ships through the normal deploy ("Deploy everything", since the server's admin data lists items).
- Rollback is by phase revert. The added save fields are ignored by older clients.

## Open Questions

- Exact engine and density numbers: tuned in phase 5 with the tech report. The specs fix only the orderings (which is higher or lower), not values.
- Thalassa's island tree, flora and fish species names and looks: chosen when the art is drawn in phase 7.
