# Tenebris Tech Tree - design proposal

Status: PROPOSAL for review. The in-game guide (K) already renders the
live recipe table; this doc proposes how the tree itself should be
shaped - what gates what, which new items/blocks are needed, and where
automation plugs in. Nothing here is implemented until approved, except
where marked [SHIPPED].

## Design pillars

1. **Ore discovery gates a branch.** Holding a resource for the first
   time reveals its recipes; everything downstream of a metal stays
   hidden (`???`) until you've held that metal. Iron ore unlocks iron
   gear, gold ore unlocks electronics, etc. [SHIPPED - the discovery
   bitset already does this transitively: an iron pickaxe stays locked
   until you've held an iron ingot, which needs iron ore.]
2. **Enabler components, not flat costs.** Machines don't just cost
   metal - they require the *component* that explains them:
   - WIRE (copper) ......... anything powered
   - COPPER PIPE (copper) ... anything steam / fluid
   - CIRCUIT BOARD (gold) ... anything smart (computes / automates)
   So copper is the "utility" metal, gold is the "intelligence" metal,
   iron is the "structure" metal, tin exists to alloy bronze.
3. **Stations gate stages.** Furnace -> Electronics Workbench ->
   Computer + 3D Printer. Each stage's outputs are crafted AT the
   previous stage's flagship machine.
4. **Crafting takes time** [SHIPPED], and every "auto" machine drives
   the same timed pipeline the hand-craft uses - automation is the
   endgame reward, not a separate system.

## The tree (ASCII)

Legend: `-->` needs / feeds into    `@X` crafted at station X
        `[NEW]` new content this proposal adds

```
STAGE 0: WOOD          STAGE 1: STONE         STAGE 2: METALS (@furnace)     STAGE 3: MACHINERY              STAGE 4: ELECTRONICS (@workbench)   STAGE 5: AUTOMATION + ROCKETRY

log --+--> planks --+--> sticks --+
      |             |             +--> torch (+coal)
      |             |             +--> wood pickaxe --> [mines stone/ore]
      |             |             +--> wood axe
      |             |             +--> wood shovel
      |             |             +--> hoe --> [farming]
      |             |
      +--> storage chest (8 logs)
                    |
stone --------------+--> furnace ==========+
      +--> stone pickaxe (+sticks)         |
                                           |
coal ore ----> coal --[fuel for @furnace]--+
                                           |
copper ore --> copper --@furnace--> copper ingot --+--> WIRE ---------------+--> electric furnace (+iron)
                                                   +--> COPPER PIPE -----+  |--> power supply @wb
                                                   |                     |  |--> ram module @wb (+circuit)
tin ore -----> tin -----@furnace--> tin ingot -----+                     |  |
                        copper+tin ingots --> bronze ingot               |  |
                                                   |                     |  |
iron ore ----> iron ----@furnace--> iron ingot ----+--> iron pickaxe     |  |
                                                   +--> [structure metal]|  |
                                                   |                     |  |
                                          steam engine <-- iron+bronze+PIPE |        rocket engine  <-- bronze+iron @printer
                                          hydro generator <-- iron+copper+PIPE      fuel tank      <-- iron @printer
                                          electronics workbench <-- iron+copper     launch pad     <-- iron+bronze
                                                   |                        |        launch tower   <-- iron+bronze
gold ore [NEW] -> gold [NEW] -@furnace-> gold ingot [NEW]                   |             |
                                                   |                        |             v
                                                   +--> CIRCUIT BOARD <-- wire+GOLD      command module <-- circuit+gold+iron
                                                        (gold replaces iron here)         |
                                                             |                             v
                                                             +--> cpu chip @wb        [ROCKET FLIES]
                                                             +--> ram module @wb
                                                             +--> motherboard @wb
                                                             |
                                                             +--> computer   <-- mobo+cpu+ram+psu
                                                             +--> 3d printer <-- mobo+nozzle+psu+iron
                                                                       |
                                                                       +--> MINER DRILL [NEW]    <-- iron+bronze+circuit @printer
                                                                       +--> CONVEYOR TUBE [NEW]  <-- copper pipe+iron
                                                                       +--> AUTO-CRAFTER [NEW]   <-- motherboard+iron @printer
```

## Discovery gates (what unlocks what)

| You hold...            | ...these branches appear                       |
|------------------------|------------------------------------------------|
| log                    | planks, chest; then sticks, tools, hoe          |
| stone                  | stone pickaxe, furnace                          |
| coal                   | torch, all smelting (fuel)                      |
| copper ore -> ingot    | wire, copper pipe; then every powered machine   |
| tin ore -> ingot       | bronze; then engine/rocketry alloy costs        |
| iron ore -> ingot      | iron pickaxe, all machine frames, rocket shells |
| gold ore -> ingot [NEW]| circuit board; then ALL electronics + automation|
| wire                   | electric furnace, workbench components          |
| copper pipe            | steam engine, hydro generator, conveyor         |
| circuit board          | cpu/ram/mobo; then computer, printer, drill     |

## Proposed recipe changes

| Recipe          | Today                  | Proposed                     | Why |
|-----------------|------------------------|------------------------------|-----|
| circuit-board   | 2 wire + 1 iron ingot  | 2 wire + 1 GOLD ingot        | gold gates electronics |
| steam engine    | 6 iron + 2 cu + 1 brz  | 5 iron + 2 PIPE + 1 bronze   | pipes enable steam |
| hydro generator | 5 iron + 3 copper      | 4 iron + 2 PIPE + 1 copper   | pipes enable fluid |
| command module  | 4 cu + 3 iron + 1 circ | 2 GOLD + 3 iron + 1 circuit  | gold avionics |

## New content required

| Item / block        | Source                            | Role |
|---------------------|-----------------------------------|------|
| Gold ore (block 42) | worldgen, deep + rare (~1/3 of iron's rate) | gates Stage 4 |
| gold (raw item)     | mining gold ore (iron pickaxe TIER-2 required - first hard tier gate) | smelts to ingot |
| gold ingot          | @furnace, coal fuel               | circuit boards, avionics |
| MINER DRILL (block) | @3d printer: 4 iron + 2 bronze + 1 circuit | placed on an ore block, mines 1 ore / 10 s into itself; feeds an adjacent chest/conveyor. Needs cable power. |
| CONVEYOR TUBE (block)| hand: 2 copper pipe + 1 iron -> 4 | moves items 1/s between adjacent machines + chests, in its placed direction |
| AUTO-CRAFTER (block)| @3d printer: 1 motherboard + 4 iron | assigned one recipe; pulls inputs from adjacent chest, runs the SAME timed craft pipeline, pushes output |

## Craft times (all tunable per-recipe via `time:` in recipes.yaml) [SHIPPED]

| Stage             | Default time |
|-------------------|--------------|
| 0 wood/stone      | 1.5 s        |
| 1 smelting        | 2.5 s        |
| 2 machinery parts | 3.5 s        |
| 3 electronics     | 4.5 s        |
| printer builds    | 8-12 s (already per-recipe) |

## The automation loop this builds toward

```
   [MINER DRILL] --ore--> [CONVEYOR] --> [STORAGE CHEST] --> [CONVEYOR] --> [ELECTRIC FURNACE] --ingots--> [AUTO-CRAFTER] --parts--> [3D PRINTER]
        ^                                                          ^                  ^
        |                                                          |                  |
        +------ cable power from [STEAM ENGINE / HYDRO GEN] -------+------------------+
```

Mining, transporting, smelting, crafting - each machine replaces one
verb the player currently does by hand, and each is gated behind the
metal + component that makes it plausible.

## Open questions for review

1. Gold depth/rarity: rare-everywhere, or only on specific bodies
   (asteroids / Crag) to push space travel?
2. Should the MINER DRILL require the iron pickaxe tier to place, or is
   its recipe gate (circuit board) enough?
3. Conveyor: dumb directional push (cheap, proposed) vs. filtered
   routing (later)?
4. One more metal after gold (aluminium for rockets, like the JS), or
   keep the set tight?
