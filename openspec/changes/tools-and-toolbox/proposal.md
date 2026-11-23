# Proposal: tools-and-toolbox - tiered tools that wear out

## Why

The owner, 2026-11-23: "add tools crafting and tiers of tools crafting, add
tool box like in tenebris, this should allow the player to dig faster,
fishing rod is considered a tool tooo, and tool auto equips when you craft
it, if already craft add as item in inventory, and have tool degrade as you
use them, a rock pick axe has like 200 uses, iron has 500 uses for example".

Later the same day: "add right click to split stack in half, round up".

Today the JS client digs every block at its bare-hands time and the fishing
rod never wears. The Rust port (`tenebris-rs`, `core::mining`) already has
the design: a tool kind per block (pickaxe on rock, axe on wood, shovel on
soft ground), tiers that only buy speed and durability, a per-slot use
budget where "no value" means fresh (so old saves load as fresh tools), a
damage bar on the slot, and the tool destroyed when its last use is spent.

## What Changes

- **Tools**: pickaxe, axe and shovel in five tiers - rock, copper, iron,
  steel, titanium - plus the existing fishing rod. Uses and speed per tier in
  `src/config/ToolConfig.ts` (rock 200, copper 300, iron 500, steel 800,
  titanium 1200; rod 150 casts).
- **Digging faster**: a block's mining time is multiplied by the tier's
  speed when the right kind of tool is at hand. Bare hands stay as today.
  Which tool digs a block is read off the item the block drops (the same item
  whose `mineTime` already sets the time).
- **The toolbox**: four tool slots (pickaxe, axe, shovel, rod) kept with the
  inventory. The tool for the job is picked automatically: a matching tool
  in the selected hotbar slot first (tenebris's equip rule), else the
  toolbox's. The rod is taken out with `0` (or a hotbar rod, as today).
- **Crafting a tool**: if the toolbox has no tool of that kind it is equipped
  there; otherwise it goes into the inventory, hotbar first.
- **Wear**: each block broken with a tool, each tree felled with an axe and
  each cast costs one use. Slots show a durability bar once a tool is worn.
  At 0 the tool breaks (toast), the slot empties, and a spare of the same
  kind from the inventory is moved into the toolbox.
- **Saves**: an inventory slot carries optional `uses` (uses left). The
  toolbox rides the saved inventory array after the 36 hotbar and bag slots.
  Old saves (no `uses`, 36 slots) load with fresh tools and an empty toolbox.
- **Recipes** at the crafting grid, unlocked by the mission tree: rock tools
  by Dig stone, copper and iron tools by Smelt iron (iron comes before copper
  in this tech tree, so copper tools are the cheap alternative, not a step
  before iron), steel by Make steel, titanium by Smelt titanium.
- **Right-click split**: in the inventory panel (hotbar row, bag and
  toolbox), right-clicking a stack picks up half of it, rounded up, onto the
  cursor; a click on a slot puts it down (empty slot, same item merges,
  else swap). The machine panels' existing "take half" right-click uses the
  same rounding helper.
- **Icons** for all fifteen new tools from `scripts/gen-item-icons.py`.

## Capabilities

### New Capabilities
- `tools`: tool kinds and tiers, the toolbox, wear, crafting, saves and the
  right-click split.

### Modified Capabilities
- None.

## Impact

- `src/config/ToolConfig.ts` (new), `src/player/Inventory.ts` (tool items,
  `uses`, toolbox, held stack, split), `src/player/Tools.ts` (new, pure:
  tool for a job, mining multiplier, wear), `src/player/CraftingSystem.ts`
  (recipes, auto-equip, toolbox row, durability bars, cursor stack),
  `src/player/PlanetBlockInteraction.ts` (mining speed and wear, HUD
  toolbox), `src/mainPlanet.ts` (rod wear, `0` key), `src/config/Missions.ts`,
  `src/engine/GameStorage.ts` (`SavedInventorySlot.uses`), `index.html`,
  `scripts/gen-item-icons.py`.
- Known gap: storage chests, cargo holds and machine slots keep only item
  and count, so a worn tool put in a chest comes back fresh. Carrying `uses`
  through those slot stores is follow-up work.
- Multiplayer: inventories are not synced today (each player's inventory is
  their own save), so the toolbox is not either.
- Tests: `scripts/tools.test.ts`.
