# Proposal: new resources, industry, power storage and nuclear engines

## Why

The owner, 2026-11-21: "Can we get more resources like clay, oil, uranium,
refineries, buckets, cooking? Add recipes and missions as needed. I want
more denser power storage capabilities and build nuclear reactors in space
that allow for more efficient engines. So branching out the crafting trees
so that you can develop more advanced engine[s]."

Today the tech tree stops at the titanium vacuum engine. Power is on or off,
with no amount and no storage: a machine runs if a cable reaches a running
steam engine. There is no oil, uranium, clay on Earth, food, or refining, so
the late game has nothing to build toward.

## What Changes

- **New resources**, each placed by the terrain generator on the worlds
  where it belongs:
  - **Clay:** on Earth's riverbanks and lake shores; Vesper's clay ground
    gives it too.
  - **Oil:** deep pockets on Earth and the jungle moons.
  - **Uranium ore:** deep, on the Moon, Cinder and the metal asteroids.
  - **Lava:** on the volcanic worlds, scooped with a bucket.
  - Each new block gets its own drawn texture and each item its own icon.
- **Buckets** carry more than water: crude oil and lava. A lava bucket is a
  long-burning furnace fuel.
- **Clay and cooking:**
  - clay fires into bricks in the furnace;
  - bricks build a kiln (pottery: clay pots) and an oven;
  - a campfire and the oven cook fish into dishes, and a clay pot with
    water makes fish stew;
  - eating a dish gives a timed "well fed" bonus.
- **Oil industry:**
  - a pump jack on an oil pocket pumps crude oil;
  - a refinery turns crude into kerosene, a denser rocket fuel, and
    plastic, a new part for electronics and batteries.
- **A real power grid:**
  - generators produce watts and machines draw watts;
  - each cable network balances supply against demand every tick;
  - batteries store energy and smooth it out, in three tiers that get
    denser: lead-acid (sulphur and iron), lithium-ion (lithium and cobalt),
    then a solid-state cell (titanium and plastic).
- **Nuclear:**
  - a centrifuge enriches uranium, and enriched uranium is made into fuel
    rods;
  - a fission reactor can only be built off-world, on an airless body or
    in orbit (`orbital-motion` frames). It is a big generator;
  - a nuclear fabricator, which only runs on reactor power, builds the new
    engine tier.
- **Two new engine tiers:**
  - tier 3, the nuclear thermal engine: twice the vacuum engine's
    efficiency;
  - tier 4, the ion drive: very efficient and very gentle. It needs a
    reactor core part in the stack to run.
  - A reactor core part and a battery pack part join the rocket parts.
- **Missions.** New branches in the mission tree (`navigation-and-orbits`):
  clay and cooking, oil, power storage, and nuclear. The nuclear branch ends
  in launching on an ion drive. Every new recipe is reached by a mission,
  which the coverage test enforces.

## Capabilities

### New Capabilities
- `resources`: the new blocks and items, where they generate, and how they
  are gathered (buckets included).
- `cooking`: campfire, kiln, oven, dishes, eating and the well-fed bonus.
- `oil-industry`: pump jack, refinery, kerosene and plastic.
- `power-grid`: watts, networks, demand and supply, and battery storage
  tiers.
- `nuclear`: enrichment, fuel rods, the off-world reactor and the nuclear
  fabricator.
- `building-materials`: brick, clay, concrete, steel girder and steel-framed glass blocks and their recipe chains.
- `rocket-tiers`: the nuclear thermal engine, the ion drive, the reactor
  core and battery pack parts, and how they change a rocket's performance.

### Modified Capabilities
- None in `openspec/specs/` yet. The mission tree is in the open change
  `navigation-and-orbits`; its data gains the new branches here (design
  decision 9).

## Impact

- **Items and blocks:** `Inventory.ts`, `blockTypes.ts`, `HexBlock.ts`,
  the texture generators, `gen-item-icons.py`, and the terrain worker's
  ore and pocket placement.
- **Machines:** new managers next to the existing ones (`src/planet/*`),
  saved and synced through the one object path (`GameStorage` records and
  `restoreSavedObject`).
- **Power:** `CableNode` networks get a grid solver. The steam and hydro
  generators, the electric furnace, the computer and the printer get watt
  ratings.
- **Rockets:** `RocketConfig.PARTS`, `RocketPerformance` and the tech
  report.
- **Missions:** `src/config/Missions.ts`.
