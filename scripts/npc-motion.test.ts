// NPC motion (openspec friendship-npcs, task 3.3): wandering near home,
// never onto water, stopping to talk, and settling an ungrounded home.
//   npx tsx scripts/npc-motion.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { NPC_CONFIG, rngFor } from '../src/shared/npc';
import { Ground, newNpcBody, settle, stepNpc, NpcState } from '../src/npc/NpcMotion';

const M = NPC_CONFIG.MOTION;
const R = 500;
// dry land where x > 0 (a sea on the other half)
const ground: Ground = { radiusM: R, walkable: (d) => d.x > 0 };
const metres = (a: THREE.Vector3, b: THREE.Vector3) => Math.acos(Math.max(-1, Math.min(1, a.dot(b)))) * R;

test('an ungrounded home settles onto the nearest dry ground', () => {
  const wet = new THREE.Vector3(-0.02, 1, 0).normalize(); // ~10 m out to sea
  assert.equal(ground.walkable(wet), false);
  const home = settle(wet, ground);
  assert.ok(ground.walkable(home), 'settled on dry ground');
  assert.ok(metres(wet, home) <= M.SETTLE_MAX_M, 'within the settle range');
  assert.ok(metres(wet, home) <= 14, `close by (${metres(wet, home).toFixed(1)} m)`);
});

test('a home with no ground in reach stays where it is', () => {
  const far = new THREE.Vector3(-1, 0, 0);
  assert.deepEqual(settle(far, ground).toArray(), far.toArray());
});

test('wandering for an hour stays near home and never steps onto water', () => {
  const rnd = rngFor(7, 'motion-test');
  const home = new THREE.Vector3(0.012, 1, 0).normalize(); // ~6 m from the shore
  const b = newNpcBody(home, rnd);
  let walks = 0, last = b.state;
  for (let t = 0; t < 3600; t += 0.05) {
    stepNpc(b, ground, 0.05, rnd);
    assert.ok(ground.walkable(b.dir), `on dry ground at t=${t.toFixed(2)}`);
    assert.ok(metres(home, b.dir) <= M.WANDER_M + M.ARRIVE_M + 1e-6, 'within wander range of home');
    if (b.state === NpcState.Walk && last !== NpcState.Walk) walks++;
    last = b.state;
  }
  assert.ok(walks > 50, `it walks about (${walks} walks)`);
});

test('talking holds it still and blends in the talk clip', () => {
  const rnd = rngFor(8, 'motion-test');
  const b = newNpcBody(new THREE.Vector3(1, 0, 0), rnd);
  b.state = NpcState.Walk; b.target.set(1, 0.01, 0).normalize(); b.timer = 10;
  b.talking = true;
  b.talkTo = new THREE.Vector3(1, 0, 0.01).normalize();
  const at = b.dir.clone();
  for (let i = 0; i < 100; i++) stepNpc(b, ground, 0.05, rnd);
  assert.equal(metres(at, b.dir), 0);
  assert.ok(b.talkW > 0.95 && b.moveW < 0.05);
  assert.ok(b.face.z > 0.95, 'it turns to face whoever it talks to');
});
