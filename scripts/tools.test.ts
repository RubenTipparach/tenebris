// Tools and the toolbox (openspec tools-and-toolbox), and the right-click split.
// Run: npx tsx scripts/tools.test.ts
import { existsSync } from 'fs';
import { join } from 'path';
import { Inventory, ItemType, ITEM_DATA, TOOLBOX_START, halfUp, toolOf, toolMaxUses, usesLeft, toolCondition, DIG_WITH } from '../src/player/Inventory';
import { CRAFTING_RECIPES, TOOL_RECIPES } from '../src/player/CraftingSystem';
import { MISSIONS } from '../src/config/Missions';
import { TOOL_TIERS, ROD_USES, TOOLBOX } from '../src/config/ToolConfig';
import { breakSeconds, mineTimeMult, toolIndexFor, wearAt, digKind } from '../src/player/Tools';

const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const I = ItemType;
const TIERS = Object.keys(TOOL_TIERS) as (keyof typeof TOOL_TIERS)[];
const KINDS = ['PICKAXE', 'AXE', 'SHOVEL'];
const TOOLS = TIERS.flatMap(t => KINDS.map(k => I[`${t.toUpperCase()}_${k}` as keyof typeof ItemType]));

// ---- the items, their icons and recipes
ok(TOOLS.length === 15 && TOOLS.every(t => toolOf(t) !== undefined), 'fifteen tier tools, each tagged with kind and tier');
ok(TOOLS.every(t => ITEM_DATA[t].stackSize === 1), 'tools stack to 1');
ok(TOOLS.every(t => existsSync(join('public', ITEM_DATA[t].texture))), 'every tool has its icon on disk');
ok(toolOf(I.FISHING_ROD)?.kind === 'rod' && toolMaxUses(I.FISHING_ROD) === ROD_USES, 'the fishing rod is a tool with ROD_USES casts');
const recipeOutputs = new Set(CRAFTING_RECIPES.map(r => r.output.itemType));
ok(TOOLS.every(t => recipeOutputs.has(t)), 'every tier tool has a crafting recipe');
ok(TOOL_RECIPES.every(r => r.inputs.filter(i => i.itemType === I.STICK).length === 2), 'every tool recipe takes two sticks');
const unlocked = new Map<number, string>();
for (const m of MISSIONS) for (const u of m.unlocks) unlocked.set(u, m.id);
ok(TOOLS.every(t => unlocked.has(t)), 'every tool recipe is unlocked by a mission');
ok(unlocked.get(I.ROCK_PICKAXE) === 'stone' && unlocked.get(I.IRON_PICKAXE) === 'ingots' && unlocked.get(I.TITANIUM_PICKAXE) === 'titanium', 'rock by Dig stone, iron by Smelt iron, titanium by Smelt titanium');

// ---- uses from config (the owner's examples: rock ~200, iron ~500)
ok(toolMaxUses(I.ROCK_PICKAXE) === TOOL_TIERS.rock.uses && TOOL_TIERS.rock.uses === 200, 'rock pickaxe: 200 uses');
ok(toolMaxUses(I.IRON_PICKAXE) === TOOL_TIERS.iron.uses && TOOL_TIERS.iron.uses === 500, 'iron pickaxe: 500 uses');
ok(TIERS.every((t, i) => i === 0 || (TOOL_TIERS[t].uses > TOOL_TIERS[TIERS[i - 1]].uses && TOOL_TIERS[t].mineTimeMult < TOOL_TIERS[TIERS[i - 1]].mineTimeMult)),
  'each tier lasts longer and digs faster than the one before');

// ---- break time
ok(digKind(I.STONE) === 'pickaxe' && digKind(I.DIRT) === 'shovel' && digKind(I.LOG) === 'axe' && digKind(I.FURNACE) === null, 'stone wants a pickaxe, dirt a shovel, logs an axe, a furnace nothing');
let inv = new Inventory();
ok(breakSeconds(inv, I.STONE) === ITEM_DATA[I.STONE].mineTime, 'bare hands: stone at its own time');
ok(inv.giveTool(I.ROCK_PICKAXE) === 'toolbox', 'a crafted pickaxe with a free toolbox slot is equipped there');
ok(Math.abs(breakSeconds(inv, I.STONE) - ITEM_DATA[I.STONE].mineTime * TOOL_TIERS.rock.mineTimeMult) < 1e-9, 'rock pickaxe: stone time x the rock multiplier');
ok(breakSeconds(inv, I.DIRT) === ITEM_DATA[I.DIRT].mineTime, 'a pickaxe does not speed up dirt');
inv.addItem(I.IRON_PICKAXE, 1);
inv.setSelectedSlot(0);
ok(toolIndexFor(inv, 'pickaxe') === 0 && Math.abs(mineTimeMult(inv, I.STONE).mult - TOOL_TIERS.iron.mineTimeMult) < 1e-9, 'a pickaxe in the selected hotbar slot is used before the toolbox one');
inv.setSelectedSlot(1);
ok(toolIndexFor(inv, 'pickaxe') === inv.toolboxIndex('pickaxe'), 'otherwise the toolbox pickaxe is used');

// ---- crafting: auto-equip vs inventory
inv = new Inventory();
ok(inv.giveTool(I.IRON_AXE) === 'toolbox' && inv.getToolbox()[TOOLBOX.KINDS.indexOf('axe')].itemType === I.IRON_AXE, 'first axe: toolbox');
ok(inv.giveTool(I.ROCK_AXE) === 'inventory' && inv.getSlot(0)?.itemType === I.ROCK_AXE, 'second axe: inventory, hotbar first');
ok(inv.getToolbox()[TOOLBOX.KINDS.indexOf('axe')].itemType === I.IRON_AXE, '...and the toolbox axe is unchanged');
ok(inv.giveTool(I.FISHING_ROD) === 'toolbox', 'a crafted rod goes to the toolbox');

// ---- durability
inv = new Inventory();
inv.giveTool(I.ROCK_PICKAXE);
const pick = inv.toolboxIndex('pickaxe');
ok(usesLeft(inv.getSlot(pick)!) === 200 && toolCondition(inv.getSlot(pick)!) === 1, 'a fresh rock pickaxe: 200 uses left, condition 1');
let w = wearAt(inv, pick);
ok(w.kind === 'worn' && w.left === 199 && inv.getSlot(pick)!.uses === 199, 'one block: 199 left');
for (let n = 0; n < 198; n++) wearAt(inv, pick);
ok(usesLeft(inv.getSlot(pick)!) === 1, 'after 199 blocks: 1 left');
w = wearAt(inv, pick);
ok(w.kind === 'broke' && inv.getSlot(pick)!.itemType === I.NONE, 'the 200th block breaks it and the slot empties');
inv.giveTool(I.ROCK_PICKAXE);
inv.addItem(I.ROCK_PICKAXE, 1);
inv.addItem(I.IRON_PICKAXE, 1);
inv.getSlot(pick)!.uses = 1;
w = wearAt(inv, pick);
ok(w.kind === 'broke' && w.spare === I.IRON_PICKAXE && inv.getSlot(pick)!.itemType === I.IRON_PICKAXE, 'a broken toolbox tool is replaced by the best spare');
ok(inv.getItemCount(I.IRON_PICKAXE) === 0 && inv.getItemCount(I.ROCK_PICKAXE) === 1, '...taken out of the inventory');
ok(wearAt(inv, 5).kind === 'none', 'wearing a non-tool slot does nothing');
// The rod: one use per cast
inv.giveTool(I.FISHING_ROD);
inv.toggleRod();
const rod = toolIndexFor(inv, 'rod')!;
wearAt(inv, rod);
ok(inv.isRodOut() && usesLeft(inv.getSlot(rod)!) === ROD_USES - 1, 'the toolbox rod out (0): a cast costs one use');
inv.setSelectedSlot(2);
ok(!inv.isRodOut(), 'picking a hotbar slot puts the rod away');

// ---- the toolbox only takes tools of its kind
inv = new Inventory();
inv.addItem(I.FISH_MINNOW, 3);
inv.addItem(I.STEEL_SHOVEL, 1);
inv.mergeOrSwapSlots(0, inv.toolboxIndex('pickaxe'));
ok(inv.getSlot(0)!.itemType === I.FISH_MINNOW && inv.getSlot(inv.toolboxIndex('pickaxe'))!.itemType === I.NONE, 'a fish dropped on the pickaxe slot does not move');
inv.mergeOrSwapSlots(1, inv.toolboxIndex('pickaxe'));
ok(inv.getSlot(1)!.itemType === I.STEEL_SHOVEL, 'a shovel dropped on the pickaxe slot does not move');
inv.mergeOrSwapSlots(1, inv.toolboxIndex('shovel'));
ok(inv.getSlot(inv.toolboxIndex('shovel'))!.itemType === I.STEEL_SHOVEL, 'a shovel dropped on the shovel slot is equipped');
// Two worn tools never fuse
inv = new Inventory();
inv.addItem(I.IRON_AXE, 1); inv.addItem(I.IRON_AXE, 1);
inv.getSlot(0)!.uses = 10; inv.getSlot(1)!.uses = 400;
inv.mergeOrSwapSlots(0, 1);
ok(inv.getSlot(0)!.quantity === 1 && inv.getSlot(1)!.quantity === 1 && inv.getSlot(1)!.uses === 10 && inv.getSlot(0)!.uses === 400, 'two worn axes swap, never merge');
ok(inv.hasItem(I.IRON_AXE, 2) && inv.getItemCount(I.IRON_AXE) === 2, 'tools in the hotbar / bag count as held');

// ---- saves
inv = new Inventory();
inv.giveTool(I.IRON_PICKAXE);
inv.getSlot(inv.toolboxIndex('pickaxe'))!.uses = 37;
inv.addItem(I.ROCK_SHOVEL, 1);
inv.getSlot(0)!.uses = 5;
inv.addItem(I.STONE, 20);
const saved = JSON.parse(JSON.stringify(inv.exportForSave()));
ok(saved.length === TOOLBOX_START + TOOLBOX.KINDS.length, 'the save holds the 36 slots then the toolbox');
const back = new Inventory();
back.importFromSave(saved);
ok(back.getSlot(back.toolboxIndex('pickaxe'))!.itemType === I.IRON_PICKAXE && usesLeft(back.getSlot(back.toolboxIndex('pickaxe'))!) === 37, 'save round-trip: the toolbox pickaxe keeps 37 uses');
ok(usesLeft(back.getSlot(0)!) === 5 && back.getItemCount(I.STONE) === 20, 'save round-trip: a worn hotbar tool and the stone come back');
ok(saved.find((s: { itemType: number }) => s.itemType === I.STONE).uses === undefined, 'non-tools save no uses');
// An old save: 36 slots, no uses
const old = Array.from({ length: 36 }, () => ({ itemType: 0, quantity: 0 }));
old[0] = { itemType: I.FISHING_ROD, quantity: 1 };
old[4] = { itemType: I.DIRT, quantity: 12 };
const oldInv = new Inventory();
oldInv.importFromSave(old);
ok(oldInv.getSlot(0)!.itemType === I.FISHING_ROD && usesLeft(oldInv.getSlot(0)!) === ROD_USES, 'an old save loads: its rod is fresh, not broken');
ok(oldInv.getToolbox().every(s => s.itemType === I.NONE) && oldInv.getItemCount(I.DIRT) === 12, 'an old save loads with an empty toolbox and its items');

// ---- right-click split: half, rounded up
ok(halfUp(7) === 4 && halfUp(1) === 1 && halfUp(2) === 1 && halfUp(64) === 32 && halfUp(63) === 32, 'halfUp: 7 -> 4, 1 -> 1, 2 -> 1, 64 -> 32, 63 -> 32');
inv = new Inventory();
inv.addItem(I.TORCH, 7);
const held = inv.takeHalf(0);
ok(held?.quantity === 4 && inv.getSlot(0)!.quantity === 3, 'right-click 7 torches: 4 held, 3 stay');
ok(inv.takeHalf(0) === null, 'nothing more is picked up while holding');
inv.placeHeld(5);
ok(inv.getHeld() === null && inv.getSlot(5)!.itemType === I.TORCH && inv.getSlot(5)!.quantity === 4, 'a click on an empty slot puts the 4 down');
inv.takeHalf(5);
inv.placeHeld(0);
ok(inv.getSlot(0)!.quantity === 5 && inv.getSlot(5)!.quantity === 2, 'a click on the same item merges');
inv = new Inventory();
inv.addItem(I.DIRT, 1);
inv.takeHalf(0);
ok(inv.getHeld()?.quantity === 1 && inv.getSlot(0)!.itemType === I.NONE, 'a stack of 1 lifts whole');
inv.addItem(I.STONE, 10);
inv.placeHeld(0);
ok(inv.getSlot(0)!.itemType === I.DIRT && inv.getHeld()?.itemType === I.STONE && inv.getHeld()?.quantity === 10, 'a click on another item swaps it onto the cursor');
ok(inv.exportForSave().filter(s => s.itemType === I.STONE).reduce((a, s) => a + s.quantity, 0) === 10, 'the save counts a held stack as put back');
ok(inv.returnHeld() === 0 && inv.getItemCount(I.STONE) === 10 && inv.getHeld() === null, 'closing the panel puts the held stack back');
// A worn tool keeps its wear on the cursor
inv = new Inventory();
inv.addItem(I.IRON_PICKAXE, 1);
inv.getSlot(0)!.uses = 123;
inv.takeHalf(0);
inv.placeHeld(8);
ok(inv.getSlot(8)!.uses === 123 && inv.getSlot(0)!.itemType === I.NONE, 'a picked-up tool keeps its wear');
inv.takeHalf(8);
ok(!inv.placeHeld(inv.toolboxIndex('axe')) && inv.placeHeld(inv.toolboxIndex('pickaxe')), 'a held pickaxe goes in the pickaxe slot, not the axe slot');

// ---- the mining loop and fishing go through Tools (source guard: one path)
import { readFileSync } from 'fs';
const pbi = readFileSync('src/player/PlanetBlockInteraction.ts', 'utf8');
ok(/breakSeconds\(this\.inventory, itemType\)/.test(pbi) && (pbi.match(/this\.wearToolFor\(/g) ?? []).length >= 2, 'block and tree mining use breakSeconds and wear the tool');
const main = readFileSync('src/mainPlanet.ts', 'utf8');
ok(/toolIndexFor\(.*'rod'\)/.test(main) && /isRodOut\(\)/.test(main), 'fishing casts wear the rod in hand; the toolbox rod can be taken out');
ok(Object.values(DIG_WITH).every(k => TOOLBOX.KINDS.includes(k!)), 'every dig kind has a toolbox slot');
