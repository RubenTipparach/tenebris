// NPC models and clips (openspec friendship-npcs, task 3.2): every species
// builds a model, its baked clips (public/animations/npc_<id>.anim.json,
// scripts/gen-npc-anims.py) have idle / move / talk and only name parts the
// model has, and no two species share a signature feature.
//   npx tsx scripts/npc-models.test.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { assertNpcRostersDisjoint } from '../src/config/NpcConfig';
import { buildNpcModel, npcAnimId, npcSpecies } from '../src/npc/NpcModels';

const anim = (id: string) => JSON.parse(readFileSync(new URL(`../public/animations/${npcAnimId(id)}.anim.json`, import.meta.url), 'utf8'));

test('every species builds a standing model of its height', () => {
  for (const s of npcSpecies()) {
    const m = buildNpcModel(s);
    const pos = m.geometry.getAttribute('position');
    let minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < pos.count; i++) { minY = Math.min(minY, pos.getY(i)); maxY = Math.max(maxY, pos.getY(i)); }
    assert.ok(Math.abs(minY) < 0.05, `${s.id} stands on y=0 (min ${minY})`);
    assert.ok(maxY > s.look.heightM * 0.8, `${s.id} is about its height (${maxY} vs ${s.look.heightM})`);
    const names = m.parts.map(p => p.name);
    for (const n of ['body', 'head', 'legL', 'legR', 'armL', 'armR']) assert.ok(names.includes(n), `${s.id} has ${n}`);
    if (s.look.arms > 1) assert.ok(names.includes('arm2L') && names.includes('arm2R'), `${s.id} has a second arm pair`);
  }
});

test('every species has idle, move and talk clips naming only its own parts', () => {
  for (const s of npcSpecies()) {
    const file = anim(s.id);
    const names = new Set(buildNpcModel(s).parts.map(p => p.name));
    for (const clip of ['idle', 'move', 'talk']) {
      const c = file.clips[clip];
      assert.ok(c, `${s.id} has a ${clip} clip`);
      for (const [part, frames] of Object.entries(c.tracks) as [string, number[][]][]) {
        assert.ok(names.has(part), `${s.id}.${clip} track '${part}' is a model part`);
        assert.equal(frames.length, file.frames);
      }
    }
  }
});

test('species and signature features are unique to a world', () => {
  assertNpcRostersDisjoint();
  const feats = npcSpecies().map(s => s.look.feature);
  assert.equal(new Set(feats).size, feats.length);
});
