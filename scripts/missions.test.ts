// Mission tracker tests (openspec navigation-and-orbits, task 7.1).
// Run: npx tsx scripts/missions.test.ts
import { MissionTracker } from '../src/player/MissionTracker';
import { ItemType } from '../src/player/Inventory';

const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const held: Record<number, number> = {};
const h = (i: number) => held[i] ?? 0;

// Only what happens after a mission opens counts
held[ItemType.LOG] = 10;
const t = new MissionTracker(null);
t.baseline(h);
t.sample(h);
ok(t.progress()[0] === 0, 'logs held before the mission opens do not count');
held[ItemType.LOG] = 13; t.sample(h);
ok(t.progress()[0] === 3, 'gaining 3 logs counts 3');
held[ItemType.LOG] = 2; t.sample(h);
ok(t.progress()[0] === 3, 'using logs up never takes progress back');
let done = '';
t.onComplete = (m) => { done = m.id; };
held[ItemType.LOG] = 6; t.sample(h);
ok(done === 'logs' && t.current()!.id === 'planks', 'the 4th log completes Chop a tree');

// Events count only for their item, capped at the objective
t.event('crafted', ItemType.STICK, 4, h);
ok(t.progress()[0] === 0, 'crafting sticks does not count for planks');
t.event('crafted', ItemType.WOOD, 8, h);
ok(t.current()!.id === 'stone', 'crafting 8 planks completes Make planks');

// Save and restore
const t2 = new MissionTracker(t.save());
ok(t2.current()!.id === 'stone', 'progress survives a save');

// An existing world skips what it already has
const t3 = new MissionTracker(null);
const skipped = t3.skipSatisfied({
  held: (i) => (i === ItemType.LOG ? 5 : i === ItemType.WOOD ? 4 : i === ItemType.STONE ? 20 : 0),
  placedMachines: (i) => (i === ItemType.FURNACE ? 1 : 0),
  padComplete: false,
  rocketAssembled: false,
});
ok(skipped === 4 && t3.current()!.id === 'iron', `an existing world starts where it is (skipped ${skipped}, at ${t3.current()!.id})`);

// Landing counts only on the right body
const t4 = new MissionTracker({ index: 13, progress: [0], low: {} });
t4.event('landed', 'earth', 1, h);
ok(t4.current()!.id === 'moon', 'landing on Earth does not count for the Moon');
t4.event('landed', 'moon', 1, h);
ok(t4.current() === null, 'landing on the Moon finishes the chain');
