# Design: industry-and-nuclear

## Context

See `proposal.md` for why. The pieces it builds on:

- **Items and blocks:** items are `ItemType` and `ITEM_DATA` in
  `src/player/Inventory.ts`, with icons from `scripts/gen-item-icons.py`.
  Blocks are `HexBlockType` and `BLOCK_FACES` in `src/shared/blockTypes.ts`,
  with textures from `scripts/gen-biome-textures.py`. Every new biome look
  is its own drawn block (CLAUDE.md, block-textures skill).
- **Ores:** veins placed by `generateOreVeins` in the terrain worker from
  per-planet `oreConfigs`, each with a depth range and a chance; metal-rich
  bodies get more.
- **Buckets:** `BUCKET` and `WATER_BUCKET`. Filling one from a water block
  already exists.
- **Machines:** one manager each in `src/planet/*`, a UI in
  `src/player/*UI.ts`, saved and synced as object records through
  `GameStorage` and restored through `restoreSavedObject`. That is the one
  path, and new machines join it.
- **Power:** a machine counts as powered if `CableNodeManager` connects it
  to a running steam engine. There are no amounts and no storage.
- **Rockets:** the `RocketConfig.PARTS` table and `RocketPerformance`
  (delta-v, thrust-to-weight, fuel). A new part is a row in that table.
- **Missions:** the tree in `src/config/Missions.ts`, from
  `navigation-and-orbits`. Its coverage test requires every recipe to be
  reached by a mission.

## Goals / Non-Goals

**Goals:**
- Each new system goes through the existing path:
  - items through `ITEM_DATA`;
  - machines through the object records;
  - parts through `PARTS`;
  - fuel through `FUEL_SOURCES`;
  - unlocks through the mission tree.
- Power becomes quantities on the existing cable networks, not a second
  grid.

**Non-Goals:**
- Hunger or survival. The well-fed bonus is a reward, not a need.
- Fluids in pipes. Oil moves in buckets and machine tanks.
- Radiation, meltdowns and waste.
- Fusion and antimatter, which come after.

## Decisions

### 1. Resources

- **Clay:**
  - a new `CLAY` block, Earth's own;
  - generated in the worker's shore pass, where sand meets water near
    rivers and lakes, in low-frequency patches;
  - mined, it drops a `CLAY` item.
  - Vesper's `VESPER_CLAY` also drops `CLAY` (it is clay), but stays its
    own block.
- **Oil:**
  - a new `OIL_SAND` block, placed as pockets (vein spread) deep on Earth,
    Verdance and Mirewood;
  - mined it gives nothing useful, so oil is pumped;
  - a bucket used on it gives `CRUDE_OIL_BUCKET` and turns it to stone.
- **Uranium:** a new `ORE_URANIUM` block, a vein ore with low chance and
  deep, on the Moon (beside titanium), Cinder and the metal asteroids.
- **Lava:** the volcanic worlds' existing `MAGMA` is the lava. A bucket
  used on it gives `LAVA_BUCKET` and turns it to basalt.
- **Generation:** all of it is deterministic per seed, in the per-planet
  ore and pocket config, never hard-coded per planet in the worker.

### 2. Clay and cooking

- **Furnace smelts:**
  - `CLAY` makes `BRICK`;
  - `LAVA_BUCKET` is a fuel worth 12 smelts and gives the `BUCKET` back.
- **Stations** are crafted and placed:
  - `CAMPFIRE` (sticks and stone) cooks fish;
  - `KILN` (bricks) makes `CLAY_POT` from clay;
  - `OVEN` (bricks and an iron ingot) cooks fish and makes stew.
- **Recipes:**
  - any fish becomes `COOKED_FISH`;
  - fish, `WATER_BUCKET` and `CLAY_POT` make `FISH_STEW` and give `BUCKET`
    back.
- **Eating:** a dish in hand plus right-click (the use action) eats it.
- **Well fed:** a timed `wellFed` state with a strength and a time left,
  saved with the player.
  - Its effects: mining time × (1 − strength) and jetpack drain ×
    (1 − strength).
  - A HUD chip shows the time left.
  - Cooked fish gives 0.15 for 3 min; stew gives 0.3 for 8 min.
  - Numbers are in a `FoodConfig`.

### 3. Oil industry

- **Pump jack:**
  - a machine on the surface over an `OIL_SAND` column, which it checks
    straight down;
  - powered, it pumps 1 crude-oil unit every N seconds into a tank;
  - each pumped unit turns one `OIL_SAND` cell in that column to stone, so
    pockets run dry.
- **Refinery:**
  - a powered machine;
  - 1 crude unit gives 2 `KEROSENE` and 1 `PLASTIC`, and gives the empty
    bucket back when fed buckets.
- **Kerosene** joins `ROCKET_CONFIG.FUEL_SOURCES` at 40 units, against
  rocket fuel's 25.
- **Plastic** is an ingredient in the solid-state battery, the battery
  pack part, and a better CPU recipe line.

### 4. The power grid

- **Networks:** each cable-connected network (the existing
  `CableNodeManager` connectivity) gets a solver that runs each tick, or at
  a fixed rate, over its members.
  - `supply` is the sum of running generators' watts.
  - `demand` is the sum of working machines' watts.
  - Batteries charge from any surplus and discharge to cover any shortfall,
    each limited by its own rate and capacity.
  - If the network is still short, its machines stop: `isPowered = false`.
    That flag stays the one input every machine already reads, so machines
    don't change.
- **Ratings,** in `PowerConfig`:

  | machine | watts |
  | --- | --- |
  | steam engine | 2 kW |
  | hydro generator | 1 kW |
  | reactor | 50 kW |
  | electric furnace | 1 kW |
  | computer | 0.2 kW |
  | 3D printer | 0.8 kW |
  | pump jack | 0.5 kW |
  | refinery | 1.5 kW |
  | centrifuge | 2 kW |
  | nuclear fabricator | 20 kW |

- **Batteries** are new placeable blocks:

  | battery | capacity | made from |
  | --- | --- | --- |
  | lead-acid | 10 kWh | iron and sulphur (Cinder's `SULFUR`) |
  | lithium-ion | 40 kWh | lithium, cobalt and copper |
  | solid-state | 150 kWh | titanium and plastic |

  - Each has a charge/discharge limit, and its charge is saved in its
    record.
- **Display:** a generator's or machine's UI shows its watts and its
  network's supply, demand and stored energy.
- **Alternative rejected:** a second, separate energy system. It would be
  two paths that must agree.

### 5. Nuclear

- **Enrichment:**
  - the centrifuge (powered) turns 4 `ORE_URANIUM` into 1
    `ENRICHED_URANIUM`;
  - the electronics workbench makes 2 enriched uranium and 1 titanium
    ingot into a `FUEL_ROD`.
- **Reactor:**
  - placeable only where `!planet.body_has_atmosphere` (the existing
    airless predicate), meaning the Moon, the moons, asteroids and barren
    worlds;
  - otherwise it refuses with "Reactors can only be built off-world";
  - it holds up to 4 fuel rods, each lasting 30 minutes of running;
  - it supplies 50 kW while it has a rod.
- **Nuclear fabricator:**
  - a printer-like machine that runs only if its network's supply includes
    a reactor;
  - it makes `NUCLEAR_THERMAL_ENGINE`, `ION_DRIVE`, `REACTOR_CORE` and
    `BATTERY_PACK`.
  - Its recipes (`FABRICATOR_RECIPES` in `src/config/PowerConfig.ts`; the
    ingredients are taken from the hotbar + bag when a job starts, and the
    job runs while the network has reactor power):

    | output | ingredients | time |
    | --- | --- | --- |
    | battery pack | 1 lithium-ion battery, 4 plastic, 4 aluminum ingots | 30 s |
    | nuclear thermal engine | 2 fuel rods, 12 titanium ingots, 1 vacuum engine, 1 CPU chip | 60 s |
    | reactor core | 4 fuel rods, 16 titanium ingots, 1 solid-state battery, 1 motherboard | 90 s |
    | ion drive | 8 titanium ingots, 8 plastic, 12 copper ingots, 2 CPU chips, 2 power supplies | 90 s |

- **The machines themselves** are made at the electronics workbench (3x3,
  `ELECTRONICS_RECIPES`), all gated by `RecipeGate`:

  | machine | grid (rows) |
  | --- | --- |
  | fuel rod | - E - / - Ti - / - E - (E = enriched uranium) |
  | lead-acid battery | Fe S Fe / S Cu S / Fe S Fe (S = sulfur) |
  | lithium-ion battery | Li Co Li / Cu Cu Cu / Li Co Li |
  | solid-state battery | Ti P Ti / P Ti P / Ti P Ti (P = plastic) |
  | pump jack | Fe Fe Fe / - Fe - / Cu PSU Cu |
  | refinery | Al Al Al / Cu Fe Cu / Al PSU Al |
  | centrifuge | Ti Ti Ti / Ti CPU Ti / Al PSU Al |
  | fission reactor | Ti Ti Ti / Ti MB Ti / Ti PSU Ti |
  | nuclear fabricator | Ti P Ti / CPU MB CPU / Ti PSU Ti |

### 6. Rocket tiers

These are new `PARTS` rows, priced into `RocketPerformance` with no new
model.

| part | tier | dry mass | thrust | specific impulse |
| --- | --- | --- | --- | --- |
| nuclear thermal engine | 3 | 300 kg | 30 kN | 500 s |
| ion drive | 4 | 120 kg | 1.5 kN | 3000 s |
| reactor core | 4 | 400 kg | | |
| battery pack | 3 | 60 kg | | |

- **Ion drive:** it only fires if the stack has a `REACTOR_CORE`.
  `computeRocketStats` gains a `requires` field, and an unmet requirement
  makes thrust zero and gives a reason, shown in the launch pad UI and
  refusing the launch.
- **Battery pack:** adds cargo slots (2), so it is useful before the ion
  drive.
- **Thrust-to-weight:** the ion drive is below 1 everywhere except tiny
  bodies. It is an in-space engine: launch with the lift engine and switch,
  as with the existing two-engine stacks.
- The tech report gains tier 3 and tier 4 builds.

### 6b. Engine modes (found while building tier 3 and 4)

**The problem:** every engine in a stack fires together. A lift engine and
an ion drive blend to a specific impulse of about 93 s, so neither high
tier can take off from Earth and the "lift with one, cruise on the other"
play doesn't exist.

**Engine modes:**
- A rocket with more than one engine type has a mode per type, plus All.
- A key cycles the mode in flight, shown on the HUD.
- Only engines of the active mode fire; the fuel is shared.
- `computeRocketStats` takes the mode. The pad stats show delta-v and
  thrust-to-weight per mode, so a player sees: lift on the chemical engine
  (high thrust-to-weight), then cruise on the ion drive (high delta-v).
- The mode is saved with the flight.

**The tech report:**
- It flies a lift-then-cruise profile: chemical until clear of the
  atmosphere, then the efficient engine.
- It reports ion trips analytically, because ion burns outlast the
  simulator's 1200 s cap.

### 7. Missions

New branches in `src/config/Missions.ts` (one parent each, ids
append-only):

- **Clay and cooking** (off the trunk):
  - Find clay → Fire bricks → Build a campfire → Cook fish → Build a kiln
    (pot) → Build an oven → Make stew → Eat well.
- **Oil** (off Electronics):
  - Find oil (a crude oil bucket) → Pump jack → Refinery → Kerosene → Fuel
    a rocket with kerosene.
- **Power storage** (off Power):
  - Lead-acid battery → Keep the lights on (run a network on battery) →
    Lithium-ion battery → Solid-state battery (gated on Plastic).
- **Nuclear** (off the Moon and beyond, gated on Lithium-ion):
  - Find uranium → Centrifuge → Fuel rods → Build a reactor off-world →
    Nuclear fabricator → Nuclear thermal engine → Launch on nuclear
    power → Reactor core and ion drive → Fly the ion drive.
- **Coverage:** the coverage test covers every new recipe.

### 9. Building materials

The owner, 2026-11-21: "Add things like alternate construction materials for
structure like concrete blocks, bricks (and clay) steel supported glass".

**Blocks**

Every block gets its own texture (block-textures skill) and its own icon:
- **Clay:** the `CLAY` item places the existing `CLAY` block.
- **Brick:** `BRICK_BLOCK`.
- **Concrete:** `CONCRETE_BLOCK`.
- **Steel girder:** `STEEL_GIRDER`, an open lattice that renders like the
  other cut-out blocks.
- **Steel-framed glass:** `STEEL_GLASS`. It is transparent like `GLASS`, in
  the same render path and face rules, so `sideFaceShows` treats it as
  glass.

**Items**
- `CEMENT`
- `STEEL_INGOT`

**Recipes**
- 4 `BRICK` make 1 `BRICK_BLOCK` (crafting).
- The kiln fires `CLAY` and `STONE` into `CEMENT`.
- `CEMENT`, 2 `SAND`, 2 `STONE` and a `WATER_BUCKET` make 4 `CONCRETE_BLOCK`
  and give the bucket back (crafting).
- The electric furnace alloys 2 `INGOT_IRON` and 1 `COAL` into a
  `STEEL_INGOT`. This is its first two-input recipe, a row in the smelting
  table.
- 2 `STEEL_INGOT` make 4 `STEEL_GIRDER`.
- `STEEL_INGOT` and 2 `GLASS` make 2 `STEEL_GLASS`.

**Strength** is mining time only; there is no structural simulation. The
mining times rise in this order:
- dirt;
- clay;
- brick;
- glass;
- concrete, steel glass and steel girder.

**Missions:** a Construction branch.
- It hangs off Light and storage.
- It runs: Clay block → Brick wall (place 8 brick blocks) → Cement →
  Concrete (place 8) → Steel (needs the electric furnace: a hidden gate on
  Power) → Girders → Steel-framed glass (place 4).

### 8. Build order

These are the dependencies that let parallel work not collide:

- **Foundation (one change):** every new `ItemType`, `ITEM_DATA` entry,
  icon, block, texture, generation placement and bucket rule.
- **After the foundation, in parallel:**
  - cooking;
  - power grid and batteries;
  - oil industry, which needs the grid;
  - nuclear, which needs the grid;
  - rocket tiers.
- **Missions last.**

## Risks / Trade-offs

- **The power grid changes how existing bases behave.** A base that ran on
  one steam engine with many machines may now be overloaded. → Ratings put
  1 steam engine ≈ 2 electric furnaces. The overloaded state is visible.
  Old saves keep their machines, which just stop until the player adds
  power.
- **The reactor being off-world only** depends on the airless predicate.
  Orbit (in flight) has no ground to place on. → "In space" means an
  airless body: the Moon base is the intended play.
- **Ion drive thrust-to-weight below 1** surprises players. → The stats
  panel says so, and the missions teach the lift-plus-ion stack.
- **Rocket balance.** → The tech report covers tier 3 and 4 across the
  synodic range, as for the others.

## Migration Plan

- New items and blocks only add ids. Old saves don't contain them.
- Machines in old saves get ratings: on load, a network with too little
  supply stops its machines, and that is visible.
- Battery records are new.
- Rollback: revert. No save field is removed.
