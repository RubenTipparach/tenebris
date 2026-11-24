// A craft never spends ingredients it can't pay out: Inventory.fitsAfter, the
// check the crafting grid and the electronics workbench make first.
// Run: npx tsx scripts/craft-room.test.ts
import { Inventory, ItemType } from '../src/player/Inventory';

const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const I = ItemType;

// Fill all 36 hotbar + bag slots
function full(): Inventory {
  const inv = new Inventory();
  for (let i = 0; i < 36; i++) inv.setSlot(i, I.STONE, 64);
  return inv;
}

// Full, 9 planks (more than one craft's 8): spending 8 leaves the stack, no room for a chest
let inv = full();
inv.setSlot(0, I.WOOD, 9);
ok(!inv.fitsAfter([{ itemType: I.WOOD, quantity: 8 }], [{ itemType: I.STORAGE_CHEST, quantity: 1 }]),
  'full inventory, the planks stack outlives the craft: a chest does not fit');

// Full, exactly 8 planks: spending them frees their slot - the chest fits there
inv = full();
inv.setSlot(0, I.WOOD, 8);
ok(inv.fitsAfter([{ itemType: I.WOOD, quantity: 8 }], [{ itemType: I.STORAGE_CHEST, quantity: 1 }]),
  'the ingredients\' own slot, emptied by the craft, takes the result');

// Full but the output stacks onto a part-filled stack of itself
inv = full();
inv.setSlot(0, I.LOG, 4);
inv.setSlot(1, I.WOOD, 60);
ok(inv.fitsAfter([{ itemType: I.LOG, quantity: 1 }], [{ itemType: I.WOOD, quantity: 4 }]),
  'planks stack onto a part-filled planks stack with no free slot');
inv.setSlot(1, I.WOOD, 62);
ok(!inv.fitsAfter([{ itemType: I.LOG, quantity: 1 }], [{ itemType: I.WOOD, quantity: 4 }]),
  'but not when the stack has room for only part of them');

// Room anywhere: plain yes; asking changes nothing
inv = new Inventory();
inv.setSlot(0, I.WOOD, 8);
ok(inv.fitsAfter([{ itemType: I.WOOD, quantity: 8 }], [{ itemType: I.STORAGE_CHEST, quantity: 1 }]), 'an empty bag always has room');
ok(inv.getItemCount(I.WOOD) === 8 && inv.getItemCount(I.STORAGE_CHEST) === 0, 'fitsAfter only simulates: the inventory is untouched');
