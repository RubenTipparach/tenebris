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
import { MISSION_TREE_UI } from '../src/config/Missions';
import { packTree, linkProblems, clampPan } from '../src/player/MissionTreeLayout';

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
const lateIds = ['moon', 'moonmetal', 'titanium', 'vacuum', 'icefuel', 'sequoia', 'explorer', 'alienfish', 'recharge', 'spacewalk'];
// (space exploration visits sit under the Moon: leave them out, or closing
// their ancestors would mark the Moon done)
const t9 = new MissionTracker({ v: 2, done: MISSIONS.filter(m => !lateIds.includes(m.id) && m.branch !== 'nuclear' && !m.visit).map(m => m.id), prog: {}, low: {}, seen: {}, legacy: [] });
t9.event('landed', 'earth', 1, h);
ok(!t9.isDone('moon'), 'landing on Earth does not count for the Moon');
t9.event('landed', 'moon', 1, h);
ok(!t9.isDone('moon'), 'landing alone is not the Moon visit: it needs a survey beacon too');
t9.event('surveyed', 'moon', 1, h);
ok(t9.isDone('moon') && t9.recipeOpen(ItemType.VACUUM_ENGINE), 'landing on the Moon and planting a beacon unlocks the vacuum tier');
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

// ---- the tree panel: no line crosses a card or plaque, and lines from
// different parents never meet, at every zoom level (the owner: "make sure
// paths don't overlap on the research tree")
MISSION_TREE_UI.LEVELS.forEach((L, i) => {
  const t = packTree(L);
  const probs = linkProblems(L, t);
  ok(probs.length === 0, `zoom ${i}: no overlapping lines${probs.length ? ' - ' + probs.slice(0, 3).map(p => `${p.link.parent}->${p.link.child} ${p.what}`).join('; ') : ''}`);
  ok(t.links.length === MISSIONS.filter(m => m.parent).length, `zoom ${i}: a line to every mission with a parent`);
});

// ---- pan bounds (the owner: "make sure the player cant pan too far away
// from mission content area"): however far the tree is dragged, at any zoom
// level, at least PAN_KEEP_PX of some card stays inside the view, and a pan
// that already shows a card is left alone
{
  const W = 900, H = 520, keep = MISSION_TREE_UI.PAN_KEEP_PX;
  const far = 1e5;
  MISSION_TREE_UI.LEVELS.forEach((L, i) => {
    const t = packTree(L);
    const inView = (px: number, py: number) => [...t.cards.values()].some(p => {
      const vx = Math.min(W, px + p.x + L.cardW) - Math.max(0, px + p.x);
      const vy = Math.min(H, py + p.y + L.cardH) - Math.max(0, py + p.y);
      return vx >= Math.min(keep, L.cardW) && vy >= Math.min(keep, L.cardH);
    });
    let all = true;
    for (const [dx, dy] of [[far, 0], [-far, 0], [0, far], [0, -far], [far, far], [-far, -far], [far, -far], [-far, far]]) {
      const c = clampPan(L, t, dx, dy, W, H, keep);
      if (!inView(c.x, c.y)) all = false;
    }
    ok(all, `zoom ${i}: a drag far off any side stops with a card in view`);
    // A pan that shows a card (one centred in the view) is left alone. (The
    // whole tree's centre can fall between branch blocks now it is this big.)
    const card = [...t.cards.values()][Math.floor(t.cards.size / 2)];
    const px = Math.round(W / 2 - card.x - L.cardW / 2), py = Math.round(H / 2 - card.y - L.cardH / 2);
    const centred = clampPan(L, t, px, py, W, H, keep);
    ok(centred.x === px && centred.y === py, `zoom ${i}: a pan showing a card is not moved`);
  });
}

// ---- 9.7 picking the mission to do
{
  const t = new MissionTracker();
  const first = t.now()!;
  // finish missions in tree order until two are open at once
  while (t.openMissions().length < 2) {
    const m = t.now()!;
    (t as unknown as { done: Set<string> }).done.add(m.id);
    (t as unknown as { fitAll: () => void }).fitAll();
  }
  const [a, b] = t.openMissions();
  ok(t.now() === a, 'with no pick, now is the first open mission');
  ok(t.setFocus(b.id) && t.now() === b, 'picking an open mission makes it now');
  ok(t.state(b) === 'now' && t.state(a) === 'open', 'the picked card is Now and the other stays Open');
  const reloaded = new MissionTracker(t.save());
  ok(reloaded.now()?.id === b.id, 'the pick survives a save and reload');
  const locked = MISSIONS.find(m => t.state(m) === 'locked')!;
  ok(!t.setFocus(locked.id) && t.now() === b, 'a locked mission cannot be picked');
  ok(!t.setFocus(first.id) && t.now() === b, 'a done mission cannot be picked');
  // finish the picked one: now goes back to the tree's order
  t.event(b.objectives[0].kind as never, (b.objectives[0].item ?? b.objectives[0].body) as never, 999, () => 999);
  if (!t.isDone(b.id)) (t as unknown as { done: Set<string> }).done.add(b.id);
  ok(t.now() === MISSIONS.find(m => t.isOpen(m)), 'once the pick is done, now falls back to the first open mission');
}

// ---- space exploration (openspec space-exploration 1.2, 1.6, 1.8)
{
  const { exploredBodyIds, visitCoverageProblems, MISSION_BRANCHES: BRANCHES } = await import('../src/config/Missions');
  const { SOLAR_SYSTEM, GAS_GIANTS } = await import('../src/config/SolarSystemConfig');
  const probs = visitCoverageProblems(exploredBodyIds(), MISSIONS);
  ok(probs.length === 0, `every body but Earth has exactly one visit mission${probs.length ? ' - ' + probs.join('; ') : ''} (${exploredBodyIds().length} bodies)`);
  const fake = visitCoverageProblems([...exploredBodyIds(), 'testworld'], MISSIONS);
  ok(fake.length === 1 && fake[0].startsWith('testworld'), 'a body added without a visit mission fails, naming it');

  const visitOf = new Map(MISSIONS.filter(m => m.visit).map(m => [m.visit!, m]));
  const moonOk = SOLAR_SYSTEM.bodies.filter(b => b.orbit?.parent && b.id !== 'moon' && visitOf.has(b.orbit.parent))
    .every(b => visitOf.get(b.id)!.parent === visitOf.get(b.orbit!.parent)!.id);
  ok(moonOk, 'every moon is visited after (as a child of) its planet');

  const majors = [...SOLAR_SYSTEM.bodies.filter(b => b.type === 'planet' && b.id !== 'earth'), ...GAS_GIANTS]
    .filter(b => visitOf.has(b.id));
  const d = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  const asteroids = SOLAR_SYSTEM.bodies.filter(b => b.type === 'asteroid');
  const astOk = asteroids.every(a => {
    const near = majors.reduce((best, m) => d(a.position, m.position) < d(a.position, best.position) ? m : best);
    return visitOf.get(a.id)!.parent === visitOf.get(near.id)!.id;
  });
  ok(asteroids.length > 0 && astOk, `each of the ${asteroids.length} asteroids hangs off the major body nearest it`);

  const root = visitOf.get('moon')!;
  ok(root.branch === 'space' && visitOf.get('sequoia')!.parent === 'moon' && visitOf.get('kessel')!.parent === 'moon',
    'the Moon is the root; Sequoia (sunward) and Kessel (outward) both open from it');
  ok(BRANCHES.find(b => b.id === 'space')?.announcedBy === 'assemble', 'building the first rocket announces Space exploration');

  // The unlock toast shows once per world
  const ta = new MissionTracker();
  ok(ta.announceAfter('assemble').includes('space') && ta.announceAfter('assemble').length === 0, 'the branch is announced once');
  const tb = new MissionTracker(ta.save());
  ok(tb.announceAfter('assemble').length === 0, 'and not again after a reload');
  ok(tb.visits().total === exploredBodyIds().length && tb.visits().done === 0, 'visits count every body, none done yet');

  // A veteran world: its Moon and Sequoia landings stay done, nothing re-locks
  const doneIds = MISSIONS.filter(m => !m.visit || m.visit === 'moon' || m.visit === 'sequoia').map(m => m.id);
  const vet = new MissionTracker({ v: 2, done: doneIds, prog: {}, low: {}, seen: {}, legacy: [], rule: 2 });
  ok(vet.isDone('moon') && vet.isDone('sequoia') && vet.visits().done === 2, 'a veteran world keeps the Moon and Sequoia visited');
  ok(vet.recipeOpen(ItemType.VACUUM_ENGINE) && vet.recipeOpen(ItemType.SURVEY_BEACON), 'and keeps its recipes, the survey beacon among them');
  // Visiting: land + beacon on an airless moon, chute + beacon where there is air
  const tv = new MissionTracker({ v: 2, done: [...doneIds], prog: {}, low: {}, seen: {}, legacy: [], rule: 2 });
  tv.event('landed', 'rime', 1, h);
  ok(!tv.isDone('visit_rime'), 'landing on Rime alone is not a visit');
  tv.event('surveyed', 'rime', 1, h);
  ok(tv.isDone('visit_rime'), 'landing and a beacon on Rime visits it');
  tv.event('landed', 'ferrum', 1, h); tv.event('surveyed', 'ferrum', 1, h);
  ok(!tv.isDone('visit_ferrum'), 'Metropole Prime has air: a plain landing does not visit it');
  tv.event('chuteLanded', 'ferrum', 1, h);
  ok(tv.isDone('visit_ferrum'), 'a chute landing and a beacon visits it');
}

// ---- the survey beacon is a machine: placed, saved and synced on the machine record path
{
  const THREE = await import('three');
  const { newMachineState, machineRecord, machineFromRecord, wantsPower, machineSupplyW, tickMachine } = await import('../src/power/MachineLogic');
  const m = newMachineState(ItemType.SURVEY_BEACON, 42, 3, new THREE.Vector3(400, 51, 0), 0);
  ok(m.kind === 'surveyBeacon' && m.inputs.length === 0 && m.outputs.length === 0, 'a survey beacon is a machine with no slots');
  ok(!wantsPower(m, false) && machineSupplyW(m) === 0 && !tickMachine(m, 1, { oilBelow: false, reactorPower: false }).event, 'it draws and makes no power and does no work');
  const back = machineFromRecord(JSON.parse(JSON.stringify(machineRecord(m))));
  ok(back.kind === 'surveyBeacon' && back.tileIndex === 42 && back.position.distanceTo(m.position) < 1e-6, 'its saved record restores it');
}
