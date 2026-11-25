// A full inventory never loses items: Inventory.give puts what doesn't fit
// in the overflow sink (the game drops it in a sack at the player's feet),
// and the sack stacks with the same rule as the inventory (addToSlots).
// Run: npx tsx scripts/overflow-sack.test.ts
import { Inventory, ItemType, InventorySlot, addToSlots } from '../src/player/Inventory';

const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const I = ItemType;
type Drop = { itemType: ItemType; quantity: number };

// All 36 hotbar + bag slots full of stone, with a sink recording drops
function full(): { inv: Inventory; drops: Drop[] } {
  const inv = new Inventory();
  for (let i = 0; i < 36; i++) inv.setSlot(i, I.STONE, 64);
  const drops: Drop[] = [];
  inv.setOverflowSink((items) => drops.push(...items));
  return { inv, drops };
}
const dropped = (drops: Drop[], t: ItemType) => drops.filter(d => d.itemType === t).reduce((n, d) => n + d.quantity, 0);

// Mining a block into a full inventory: it goes in the sack
let { inv, drops } = full();
ok(inv.give(I.DIRT, 1) === 1 && dropped(drops, I.DIRT) === 1, 'a full inventory: a mined block drops in the sack');

// Part fits (a part-filled stack), the rest drops - nothing lost, nothing doubled
({ inv, drops } = full());
inv.setSlot(0, I.WOOD, 62);
ok(inv.give(I.WOOD, 4) === 2, 'two planks top up the stack, two overflow');
ok(inv.getItemCount(I.WOOD) === 64 && dropped(drops, I.WOOD) === 2, 'the inventory and the sack hold all four between them');

// Room: nothing drops
({ inv, drops } = full());
inv.setSlot(5, I.NONE, 0);
ok(inv.give(I.STORAGE_CHEST, 1) === 0 && drops.length === 0 && inv.getItemCount(I.STORAGE_CHEST) === 1, 'with a free slot nothing drops');

// addItem still leaves the remainder to the caller (a chest stack stays in the chest)
({ inv, drops } = full());
ok(inv.addItem(I.DIRT, 3) === 3 && drops.length === 0, 'addItem never drops: its caller keeps the remainder');

// A tool with its toolbox slot full and no inventory room drops too
({ inv, drops } = full());
const first = inv.giveTool(I.ROCK_PICKAXE);
const second = inv.giveTool(I.ROCK_PICKAXE);
ok(first === 'toolbox' && second === 'full' && dropped(drops, I.ROCK_PICKAXE) === 1, 'a second tool with no room drops in the sack');

// A refused MP trade giving items back into a full inventory: they drop
({ inv, drops } = full());
const r = inv.undoTrade({ [I.COAL]: -5 });
ok(r.overflow === 5 && dropped(drops, I.COAL) === 5, 'an undone trade with no room drops what it gives back');

// The sack stacks like the inventory: merging into what is there
const sack: InventorySlot[] = Array.from({ length: 3 }, () => ({ itemType: I.NONE, quantity: 0 }));
addToSlots(sack, I.DIRT, 10);
addToSlots(sack, I.DIRT, 60);
ok(sack[0].quantity === 64 && sack[1].itemType === I.DIRT && sack[1].quantity === 6, 'a second drop merges into the sack\'s dirt stack first');
ok(addToSlots(sack, I.STONE, 64) === 0 && addToSlots(sack, I.LOG, 1) === 1, 'a full sack hands back what does not fit (it spills to the next tile)');
