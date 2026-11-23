# Design: tools-and-toolbox

## 1. Where the numbers live

`src/config/ToolConfig.ts` imports nothing from the player code (so
`Inventory.ts` can import it without a cycle). It holds:

| tier     | uses | mining time x |
|----------|------|---------------|
| rock     | 200  | 0.60 |
| copper   | 300  | 0.45 |
| iron     | 500  | 0.35 |
| steel    | 800  | 0.25 |
| titanium | 1200 | 0.18 |

and the rod's 150 casts, the toolbox order and the durability bar colours.
A tool item says its kind and tier in `ITEM_DATA[item].tool`, beside the
`rocketPart` metadata other items carry - one table for every item.

## 2. Which tool digs a block

The mining time of a block is already `ITEM_DATA[blockToItem(block)].mineTime`.
The tool is read off the same item (`DIG_WITH` in `Inventory.ts`): stone,
ores, moon rock, basalt, glass and the building blocks want a pickaxe;
dirt, sand, snow, clay and the soils a shovel; wood, logs and leaves an axe.
Anything else (machines, a torch) has no tool and breaks at its own time.

## 3. The toolbox, after tenebris

tenebris-rs has no separate toolbox panel - a tool works from the selected
hotbar slot (`interact::best_tool_for`) and `mining::best_tool` picks the
best of a kind. The owner asked for a toolbox, so the JS client keeps both
rules: the selected hotbar slot wins when it holds a tool of the right kind,
else the toolbox's tool of that kind is used. Exactly one tool per kind sits
in the toolbox, so "which tool" is never ambiguous.

The toolbox is four more slots of the ONE slot type (`InventorySlot`), held
by `Inventory` and addressed as indices 36..39 by the same `getSlot` /
`mergeOrSwapSlots` the panels already use, so drag and drop needs no new
path. A move that would put a non-tool, or the wrong kind, into a toolbox
slot is refused. Counting and paying (`hasItem`, `removeItem`,
`getItemCount`, `addItem`) cover only the hotbar and bag, as before.

The rod: fishing runs while a rod is in the selected hotbar slot (as today)
or while the toolbox rod is out (`0` toggles it; picking a hotbar slot puts
it away).

## 4. Durability

`InventorySlot.uses?` is uses LEFT. Absent means fresh - the same "0 is
fresh" sentinel tenebris-rs uses for `ItemStack::dur`, so every slot and
every save written before this change reads as a fresh tool, never a broken
one. Tools stack to 1, so wear never fuses two tools; `mergeOrSwapSlots`
now honours each item's own stack size (it used a flat 64, which would have
let two rods merge).

`Tools.wearAt(inventory, index)` spends a use: the slot keeps `uses - 1`, or
on the last use the slot empties and the best spare of that kind in the
hotbar or bag is moved into the toolbox. The caller toasts and saves the
inventory on the same frame (the inventory save is the one save path).

## 5. Crafting

`Inventory.giveTool(item)` - used by the crafting grid for every tool
output - equips into the empty toolbox slot of that kind, else
`addItem` (hotbar first). The toast says which happened.

## 6. Right-click split (held stack)

The inventory panel had drag and drop only. A small held stack now lives on
`Inventory` (`takeHalf(index)` / `placeHeld(index)` / `returnHeld()`), so it
is pure and testable: `takeHalf` lifts `ceil(n / 2)` and leaves the rest;
`placeHeld` drops onto an empty slot, merges with the same item up to its
stack size, or swaps. The save exports the held stack as if it were back
in the inventory, so a closed tab never loses it. Closing the panel returns
it. `halfUp(n)` is the one rounding rule; the chest and furnace panels'
"take half" right-click now call it too.

## 7. Multiplayer

Inventories are per-player saves and are not published through NetSync
today; tools ride the inventory, so nothing new is synced.
