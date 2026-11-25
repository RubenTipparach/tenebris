// Village structures (openspec friendship-npcs, task 3.4): what a village
// shows comes from its record alone - finished structures whole, the one
// being built at its stage (a staked plot before the first), later ones
// absent - and a completed build request moves it on.
//   npx tsx scripts/npc-structures.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NPC_CONFIG, createVillage, deliver, VillageState } from '../src/shared/npc';
import { buildStructureModel, structureStages } from '../src/npc/NpcStructures';

const S = NPC_CONFIG.STRUCTURES;
const ctx = { worldSeed: 4242, body: 'sequoia', index: 0 };

test('a new village shows only the first plot', () => {
  const v = createVillage(ctx, 6, 0);
  assert.deepEqual(structureStages(v), [0, ...S.slice(1).map(() => -1)]);
});

test('finished structures show whole, the next at its stage', () => {
  const v: VillageState = { ...createVillage(ctx, 6, 0), structure: 1, stage: 1 };
  assert.deepEqual(structureStages(v), [S[0].stages.length, 1, ...S.slice(2).map(() => -1)]);
  const done: VillageState = { ...v, structure: S.length, stage: 0 };
  assert.deepEqual(structureStages(done), S.map(s => s.stages.length));
});

test('completing a build request raises the next stage', () => {
  let v = createVillage(ctx, 6, 0);
  // make sure a build request is open (the record's own rules draw it)
  const q = { id: 999, fam: 'build' as const, item: S[0].stages[0].item, need: S[0].stages[0].amount, got: 0, fr: 1, structure: 0, stage: 0 };
  v = { ...v, requests: [...v.requests, q] };
  const before = structureStages(v);
  const res = deliver(ctx, v, q.id, q.need, 10);
  assert.ok(res.completed);
  assert.equal(before[0], 0);
  assert.equal(structureStages(res.village)[0], 1);
});

test('every structure builds a model at every stage, each built stage adding to the last', () => {
  S.forEach((s, i) => {
    assert.ok(buildStructureModel(i, 0, 0).geometry.getAttribute('position').count > 0, `${s.id} has a plot`);
    let last = 0;
    for (let st = 1; st <= s.stages.length; st++) {
      const n = buildStructureModel(i, st, 2).geometry.getAttribute('position').count;
      assert.ok(n > last, `${s.id} stage ${st} adds geometry`);
      last = n;
    }
  });
});
