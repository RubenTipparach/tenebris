// Mission tree tests (openspec navigation-and-orbits, tasks 7.1, 9.1-9.3).
// Run: npx tsx scripts/missions.test.ts
import { MISSIONS, MISSION_BRANCHES, STARTER_RECIPES } from '../src/config/Missions';
import { MissionTracker } from '../src/player/MissionTracker';
import { ItemType, ITEM_DATA } from '../src/player/Inventory';
import { CRAFTING_RECIPES } from '../src/player/CraftingSystem';
import { ELECTRONICS_RECIPES } from '../src/player/ElectronicsWorkbenchUI';
import { PRINTER_RECIPES } from '../src/player/Printer3DUI';
import { SMELTING_RECIPES, ELECTRIC_SMELTING_RECIPES } from '../src/config/SmeltingRecipes';
import { COOKERS } from '../src/config/CookingConfig';
import { FABRICATOR_RECIPES } from '../src/config/PowerConfig';

const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const byId = new Map(MISSIONS.map(m => [m.id, m]));

// ---- 9.1 the tree's shape
const roots = MISSIONS.filter(m => !m.parent);
ok(roots.length === 1 && roots[0].id === 'logs', 'one root: Chop a tree');
ok(MISSIONS.every(m => !m.parent || byId.has(m.parent)), 'every parent exists');
ok(MISSIONS.every(m => (m.after ?? []).every(a => byId.has(a))), 'every hidden gate exists');
ok(new Set(MISSIONS.map(m => m.id)).size === MISSIONS.length, 'ids are unique');
const cyclic = MISSIONS.filter(m => { const seen = new Set<string>(); let c: string | undefined = m.id; while (c) { if (seen.has(c)) return true; seen.add(c); c = byId.get(c)?.parent; } return false; });
ok(cyclic.length === 0, 'no cycles');
ok(MISSIONS.every(m => MISSION_BRANCHES.some(b => b.id === m.branch)), 'every mission is on a known branch');
ok(MISSIONS.every(m => ITEM_DATA[m.icon]?.texture), 'every card has an icon');

// ---- every recipe and smelt is reached by a mission (the owner: "missions
// should encourage players to go through the tech tree")
const outputs = new Map<number, string>();
for (const r of CRAFTING_RECIPES) outputs.set(r.output.itemType, `crafting ${r.name}`);
for (const r of ELECTRONICS_RECIPES) outputs.set(r.output.itemType, `workbench ${r.name}`);
for (const r of PRINTER_RECIPES) outputs.set(r.output, `printer ${r.name}`);
for (const r of [...SMELTING_RECIPES, ...ELECTRIC_SMELTING_RECIPES]) outputs.set(r.output, `smelt ${ItemType[r.output]}`);
for (const [kind, c] of Object.entries(COOKERS)) for (const r of c.recipes) outputs.set(r.output, `${kind} ${ItemType[r.output]}`);
for (const r of FABRICATOR_RECIPES) outputs.set(r.output, `fabricator ${ItemType[r.output]}`);
const reached = new Set<number>();
for (const m of MISSIONS) { m.unlocks.forEach(u => reached.add(u)); m.objectives.forEach(o => { if (o.item !== undefined) reached.add(o.item); }); }
const unreached = [...outputs].filter(([o]) => !reached.has(o)).map(([, n]) => n);
ok(unreached.length === 0, `every recipe output is unlocked or asked for by a mission${unreached.length ? ': missing ' + unreached.join(', ') : ''}`);
const unlockNotRecipe = MISSIONS.flatMap(m => m.unlocks).filter(u => !outputs.has(u));
ok(unlockNotRecipe.length === 0, `every unlock names a real recipe output${unlockNotRecipe.length ? ': ' + unlockNotRecipe.map(u => ItemType[u]).join(', ') : ''}`);
// A mission never asks for what only it unlocks (it could never finish)
const selfLock = MISSIONS.filter(m => m.objectives.some(o => o.item !== undefined && m.unlocks.includes(o.item)));
ok(selfLock.length === 0, `no mission needs its own unlock${selfLock.length ? ': ' + selfLock.map(m => m.id).join(', ') : ''}`);
// The owner: "recipe should be locked until missions completed". Every
// recipe is a starter or in EXACTLY one mission's unlocks; none is open by
// default in a new world.
const starters = new Set<number>(STARTER_RECIPES);
const namings = new Map<number, number>();
for (const m of MISSIONS) for (const u of m.unlocks) namings.set(u, (namings.get(u) ?? 0) + 1);
const badGate = [...outputs].filter(([o]) => (starters.has(o) ? 1 : 0) + (namings.get(o) ?? 0) !== 1).map(([o, n]) => `${n} (${starters.has(o) ? 'starter+' : ''}${namings.get(o) ?? 0})`);
ok(badGate.length === 0, `every recipe is a starter or one mission's unlock, never both or none${badGate.length ? ': ' + badGate.join(', ') : ''}`);
ok(STARTER_RECIPES.every(o => outputs.has(o)) && STARTER_RECIPES.length <= 4, 'the starter list is short and names real recipes');
const fresh = new MissionTracker(null);
const openAtStart = [...outputs].filter(([o]) => fresh.recipeOpen(o) !== starters.has(o)).map(([, n]) => n);
ok(openAtStart.length === 0, `a new world opens only the starters${openAtStart.length ? ': ' + openAtStart.join(', ') : ''}`);
const lockedNames = [...outputs.keys()].filter(o => !starters.has(o)).filter(o => !fresh.lockedBy(o) || fresh.lockedBy(o) === '?');
ok(lockedNames.length === 0, 'every locked recipe names its mission');

// Every made/placed/gained thing a mission asks for is open by the time it opens
const ancestors = (id: string): Set<string> => {
  const s = new Set<string>();
  const go = (x?: string) => { const m = x ? byId.get(x) : undefined; if (!m) return; for (const p of [m.parent, ...(m.after ?? [])]) if (p && !s.has(p)) { s.add(p); go(p); } };
  go(id);
  return s;
};
const unlockedBy = new Map<number, string>();
for (const m of MISSIONS) for (const u of m.unlocks) unlockedBy.set(u, m.id);
const lockedAsk = MISSIONS.flatMap(m => m.objectives
  .filter(o => o.item !== undefined && outputs.has(o.item) && !starters.has(o.item) && !ancestors(m.id).has(unlockedBy.get(o.item) ?? ''))
  .map(o => `${m.id}:${ItemType[o.item!]}`));
ok(lockedAsk.length === 0, `every objective's recipe is unlocked before its mission opens${lockedAsk.length ? ': ' + lockedAsk.join(', ') : ''}`);

// ---- counting
const held: Record<number, number> = {};
const h = (i: number) => held[i] ?? 0;
held[ItemType.LOG] = 10;
const t = new MissionTracker(null);
t.baseline(h); t.sample(h);
ok(t.progress(byId.get('logs')!)[0] === 0, 'logs held before the mission opens do not count');
held[ItemType.LOG] = 13; t.sample(h);
ok(t.progress(byId.get('logs')!)[0] === 3, 'gaining 3 logs counts 3');
held[ItemType.LOG] = 2; t.sample(h);
ok(t.progress(byId.get('logs')!)[0] === 3, 'using logs up never takes progress back');
let done = '';
t.onComplete = (m) => { done = m.id; };
held[ItemType.LOG] = 6; t.sample(h);
ok(done === 'logs' && t.now()!.id === 'planks', 'the 4th log completes Chop a tree; Make planks is Now');
t.event('crafted', ItemType.WOOD, 8, h);
t.event('crafted', ItemType.STICK, 4, h);
ok(t.isDone('planks'), 'planks and sticks complete Make planks');
ok(t.openMissions().some(m => m.id === 'rod') && t.openMissions().some(m => m.id === 'stone'), 'branches open side by side (stone and the rod)');
t.event('crafted', ItemType.FISHING_ROD, 1, h);
t.event('caught', ItemType.FISH_MINNOW, 1, h); t.event('caught', ItemType.FISH_MINNOW, 1, h); t.event('caught', ItemType.FISH_PERCH, 1, h);
ok(t.isDone('fish'), 'three fish complete Catch fish');
t.event('caught', ItemType.FISH_MINNOW, 1, h); t.event('caught', ItemType.FISH_MINNOW, 1, h);
ok(t.progress(byId.get('fishkinds')!)[0] === 1, 'kinds count each species once');
t.event('caught', ItemType.FISH_PERCH, 1, h); t.event('caught', ItemType.FISH_EEL, 1, h);
ok(t.isDone('fishkinds'), 'three kinds complete Three kinds of fish');
ok(t.state(byId.get('alienfish')!) === 'locked', 'Fish another world waits on its hidden gate (the Moon)');

// ---- 9.2 unlocking
const t5 = new MissionTracker(null);
ok(!t5.recipeOpen(ItemType.ROCKET_ENGINE) && t5.lockedBy(ItemType.ROCKET_ENGINE) === 'Raise the tower', 'a new world has the rocket engine locked by Raise the tower');
ok(t5.recipeOpen(ItemType.WOOD) && t5.recipeOpen(ItemType.STICK), 'the starters (planks, sticks) are open in a new world');
ok(!t5.recipeOpen(ItemType.COAL) && t5.lockedBy(ItemType.COAL) === 'Build a furnace', 'coal waits on Build a furnace');
ok(!t5.recipeOpen(ItemType.INGOT_IRON) && !t5.recipeOpen(ItemType.CAMPFIRE) && !t5.recipeOpen(ItemType.COOKED_FISH), 'smelts, machines and dishes start locked');
const t10 = new MissionTracker({ v: 2, done: ['logs', 'planks'], prog: {}, low: {}, seen: {}, legacy: [] });
t10.keepWhatTheWorldHas({ held: (i) => (i === ItemType.CAMPFIRE ? 1 : 0), placedMachines: (i) => (i === ItemType.KILN ? 1 : 0), padComplete: false, rocketAssembled: false });
ok(t10.recipeOpen(ItemType.CAMPFIRE) && t10.recipeOpen(ItemType.KILN) && !t10.recipeOpen(ItemType.OVEN), 'a save from before every recipe was locked keeps what it carries and has placed');
ok(new MissionTracker(t10.save()).recipeOpen(ItemType.KILN) && t10.save().rule !== undefined, 'what it kept survives a save; the save records the new rule');
const t6 = new MissionTracker(null);
t6.skipSatisfied({ held: (i) => (i === ItemType.ROCKET_ENGINE ? 1 : 0), placedMachines: () => 0, padComplete: false, rocketAssembled: false });
ok(t6.recipeOpen(ItemType.ROCKET_ENGINE), 'an old world carrying an engine keeps its recipe');

// ---- an existing world skips what it already has
const t3 = new MissionTracker(null);
const skipped = t3.skipSatisfied({
  held: (i) => (i === ItemType.LOG ? 5 : i === ItemType.WOOD ? 4 : i === ItemType.STICK ? 4 : i === ItemType.STONE ? 20 : 0),
  placedMachines: (i) => (i === ItemType.FURNACE ? 1 : 0),
  padComplete: false, rocketAssembled: false,
});
ok(t3.isDone('furnace') && t3.now()!.id === 'iron', `an existing world starts where it is (skipped ${skipped}, now ${t3.now()?.id})`);

// ---- the first version's linear save migrates
const t7 = new MissionTracker({ index: 11, progress: [0], low: {} } as never);
ok(t7.isDone('parts') && t7.isDone('tower') && t7.isDone('printer') && t7.isDone('raremetals') && !t7.isDone('assemble'), 'a linear save at Build the rocket keeps its done missions and their parents');
const t8 = new MissionTracker(t7.save());
ok(t8.isDone('parts') && !t8.isDone('assemble'), 'the tree save round-trips');

// ---- landing, smelting and 9.3 reached
const t4 = new MissionTracker({ v: 2, done: ['logs', 'planks', 'stone', 'furnace'], prog: {}, low: {}, seen: {}, legacy: [] });
t4.event('reached', undefined, 1, h);
ok(t4.isDone('map'), 'reaching a far waypoint completes Read the map');
t4.event('smelted', ItemType.INGOT_IRON, 3, h);
ok(!t4.isDone('ingots'), 'smelting before its mission opens does not count');
const lateIds = ['moon', 'moonmetal', 'titanium', 'vacuum', 'icefuel', 'sequoia', 'explorer', 'alienfish'];
const t9 = new MissionTracker({ v: 2, done: MISSIONS.filter(m => !lateIds.includes(m.id) && m.branch !== 'nuclear').map(m => m.id), prog: {}, low: {}, seen: {}, legacy: [] });
t9.event('landed', 'earth', 1, h);
ok(!t9.isDone('moon'), 'landing on Earth does not count for the Moon');
t9.event('landed', 'moon', 1, h);
ok(t9.isDone('moon') && t9.recipeOpen(ItemType.VACUUM_ENGINE), 'landing on the Moon unlocks the vacuum tier');
t9.event('caughtOn', 'earth', 1, h);
ok(!t9.isDone('alienfish'), 'a fish on Earth is not an alien fish');
t9.event('caughtOn', 'moon', 1, h);
ok(t9.isDone('alienfish'), 'a fish on another world completes Fish another world');
held[ItemType.ORE_TITANIUM] = 3; t9.sample(h);
t9.event('smelted', ItemType.INGOT_TITANIUM, 2, h);
t9.event('smelted', ItemType.INGOT_TITANIUM, 2, h);
ok(t9.isDone('titanium'), 'smelting titanium completes Smelt titanium');
t9.event('landed', 'cinder', 1, h); t9.event('landed', 'cinder', 1, h);
ok(!t9.isDone('explorer'), 'the same world twice counts once for Explorer');

// ---- industry-and-nuclear branches: their own events count
const before = (ids: string[]) => MISSIONS.filter(m => !ids.includes(m.id)).map(m => m.id);
const cookIds = ['cookfish', 'kiln', 'pot', 'oven', 'stew', 'eat', 'cement', 'concrete', 'steel', 'girders', 'steelglass'];
const t11 = new MissionTracker({ v: 2, done: before(cookIds), prog: {}, low: {}, seen: {}, legacy: [] });
ok(t11.recipeOpen(ItemType.COOKED_FISH) && !t11.recipeOpen(ItemType.KILN), 'a campfire done opens cooked fish, not yet the kiln');
t11.event('cooked', ItemType.COOKED_FISH, 1, h);
ok(t11.isDone('cookfish') && t11.recipeOpen(ItemType.KILN), 'cooking a fish completes Cook a fish and unlocks the kiln');
t11.event('placed', ItemType.KILN, 1, h); t11.event('cooked', ItemType.CLAY_POT, 1, h); t11.event('placed', ItemType.OVEN, 1, h);
t11.event('cooked', ItemType.FISH_STEW, 1, h); t11.event('ate', ItemType.COOKED_FISH, 1, h);
ok(t11.isDone('stew') && !t11.isDone('eat'), 'eating plain fish is not eating well');
t11.event('ate', ItemType.FISH_STEW, 1, h);
ok(t11.isDone('eat'), 'eating the stew completes Eat well');
const t12 = new MissionTracker({ v: 2, done: before(['onbattery', 'lithium', 'solidstate', 'uranium', 'centrifuge', 'fuelrods', 'reactor', 'fabricator', 'ntr', 'ntrlaunch', 'ioncore', 'ionflight']), prog: {}, low: {}, seen: {}, legacy: [] });
t12.event('onBattery', undefined, 1, h);
ok(t12.isDone('onbattery') && t12.recipeOpen(ItemType.BATTERY_LITHIUM), 'a network on battery completes Run on battery and unlocks lithium-ion');
t12.event('placed', ItemType.BATTERY_LITHIUM, 1, h);
held[ItemType.ORE_URANIUM] = 0; t12.baseline(h); held[ItemType.ORE_URANIUM] = 4; t12.sample(h);
t12.event('placed', ItemType.CENTRIFUGE, 1, h); t12.event('enriched', ItemType.ENRICHED_URANIUM, 1, h);
t12.event('crafted', ItemType.FUEL_ROD, 2, h); t12.event('reactorBuilt', ItemType.REACTOR, 1, h);
t12.event('placed', ItemType.NUCLEAR_FABRICATOR, 1, h); t12.event('crafted', ItemType.NUCLEAR_THERMAL_ENGINE, 1, h);
ok(t12.isDone('ntr') && !t12.recipeOpen(ItemType.ION_DRIVE), 'the nuclear chain runs to the engine; the ion drive waits on a nuclear launch');
t12.event('launchedWith', ItemType.ROCKET_ENGINE, 1, h);
ok(!t12.isDone('ntrlaunch'), 'a chemical launch is not a nuclear launch');
t12.event('launchedWith', ItemType.NUCLEAR_THERMAL_ENGINE, 1, h);
ok(t12.isDone('ntrlaunch') && t12.recipeOpen(ItemType.ION_DRIVE) && t12.recipeOpen(ItemType.REACTOR_CORE), 'a nuclear launch unlocks the ion drive and reactor core');
