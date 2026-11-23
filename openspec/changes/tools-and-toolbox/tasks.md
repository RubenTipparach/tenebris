# Tasks

## 1. Data

- [x] 1.1 `src/config/ToolConfig.ts`: tiers (uses, speed), rod casts, toolbox order, bar colours.
- [x] 1.2 Tool items (15) in `ItemType` / `ITEM_DATA` with `tool` metadata; `DIG_WITH` block-drop map.
- [x] 1.3 Icons from `scripts/gen-item-icons.py` (pickaxe, axe, shovel x 5 tiers).

## 2. Inventory

- [x] 2.1 `InventorySlot.uses`, the toolbox (indices 36-39), kind-checked moves, stack-size-aware merge.
- [x] 2.2 `giveTool` (auto-equip or inventory), save/load with the toolbox and `uses`, old saves load.
- [x] 2.3 Held stack: `halfUp`, `takeHalf`, `placeHeld`, `returnHeld`; the save includes it.

## 3. Play

- [x] 3.1 `src/player/Tools.ts`: tool for a job, mining multiplier, `wearAt` with spare promotion.
- [x] 3.2 Mining (blocks and trees) uses the multiplier and wears the tool; the inventory saves the same frame.
- [x] 3.3 Fishing: the toolbox rod (`0`), one use per cast.
- [x] 3.4 Recipes + mission unlocks.

## 4. UI

- [x] 4.1 Inventory panel: toolbox row, durability bars on every slot, right-click split with a cursor stack.
- [x] 4.2 HUD toolbox strip beside the hotbar, durability bars on the hotbar.

## 5. Verify

- [x] 5.1 `scripts/tools.test.ts`, all tests, `npx tsc --noEmit -p .`, `npx vite build`, `npx openspec validate --all --strict`.
- [x] 5.2 Headless Playwright screenshots: toolbox panel, a worn tool's bar.
- [ ] 5.3 Owner's in-game check: craft tools, dig faster, watch one wear out, split stacks.
