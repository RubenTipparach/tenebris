// Launch pads sit ON the ground and the walker stands on them: the pad's top
// is PAD_TOP_LIFT above the ground (never buried), older saves (flush in the
// ground, or a slab on it) settle onto it, a pad hex registers its top as the
// tile's floor (Planet.floorTopRadius via ObjectFloors) and takes it away
// again, and its edge is a step the walker climbs without a jump.
// Run: npx tsx scripts/pad-floor.test.ts
import './stub-shaders';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const THREE = await import('three');
const { ROCKET_CONFIG } = await import('../src/config/RocketConfig');
const { PlayerConfig } = await import('../src/config/PlayerConfig');
const { padTopRadius, padLevelOf, settledPadTop, unburiedPadTop, LaunchPadManager } = await import('../src/planet/LaunchPad');
const { objectFloorTop } = await import('../src/planet/ObjectFloors');

// A planet's depth maths (Planet.depthToRadius): radius 100, 40 layers of 1 m
const ground = { getBlockHeight: () => 1, getMaxDepth: () => 40, depthToRadius: (d: number) => 100 - (40 - 1 - d) * 1 };
const close = (a: number, b: number, msg?: string) => assert.ok(Math.abs(a - b) < 1e-9, msg ?? `${a} != ${b}`);

test('a pad sits on the ground block under its level, its top PAD_TOP_LIFT up', () => {
  const level = 30;                                  // the air block over ground block 29
  const groundTop = ground.depthToRadius(level - 1);
  const top = padTopRadius(ground, level);
  close(top, groundTop + ROCKET_CONFIG.PAD_TOP_LIFT);
  assert.ok(top > groundTop, 'the pad top is above the ground top, not buried');
  // its slab reaches a sliver into the ground (no gap at its foot, no fighting faces)
  const underside = top - ROCKET_CONFIG.PAD_THICKNESS;
  assert.ok(underside < groundTop && underside > groundTop - 0.1);
  assert.equal(padLevelOf(ground, top), level);
});

test('older saves settle onto the ground at the new lift', () => {
  const level = 25;
  const groundTop = ground.depthToRadius(level - 1);
  const now = padTopRadius(ground, level);
  for (const lift of ROCKET_CONFIG.PAD_SAVED_TOP_LIFTS) {
    close(settledPadTop(ground, groundTop + lift), now, `a pad saved at lift ${lift}`);
  }
  close(settledPadTop(ground, now), now, 'a current save stays put');
});

test('a pad is never under ground built up on its footprint', () => {
  const top = padTopRadius(ground, 25);
  close(unburiedPadTop(top, [], 1), top);
  const higher = ground.depthToRadius(25);           // a block built on one hex
  close(unburiedPadTop(top, [higher], 1), higher + ROCKET_CONFIG.PAD_TOP_LIFT);
  close(unburiedPadTop(top, [top - 1], 1), top, 'lower ground does not move it');
});

test('a floor block with a pad on it is stood on at the pad top', () => {
  const blockTop = ground.depthToRadius(24);
  const padTop = padTopRadius(ground, 25);
  close(objectFloorTop(blockTop, 1, undefined), blockTop);
  close(objectFloorTop(blockTop, 1, padTop), padTop);
  // a cave floor under the pad's ground, or a ledge above it, is not lifted
  close(objectFloorTop(blockTop - 3, 1, padTop), blockTop - 3);
  close(objectFloorTop(blockTop + 2, 1, padTop), blockTop + 2);
});

test("the pad's edge is a step, a whole block still needs a jump", () => {
  assert.ok(ROCKET_CONFIG.PAD_TOP_LIFT <= PlayerConfig.AUTO_STEP_HEIGHT, 'the walker steps onto a pad');
  assert.ok(PlayerConfig.AUTO_STEP_HEIGHT < 1, 'a whole block is not a step');
});

test('a pad hex registers its top as the floor, and takes it away again', () => {
  const tops = new Map<number, number>();
  const floors = { setObjectTop: (i: number, t: number | null) => { if (t === null) tops.delete(i); else tops.set(i, t); } };
  const m = Object.create(LaunchPadManager.prototype) as InstanceType<typeof LaunchPadManager>;
  const mm = m as unknown as Record<string, unknown>;
  mm.baseMaterial = new THREE.MeshBasicMaterial();
  mm.launchPads = [];
  mm.launchPadMeshes = [];
  mm.scene = new THREE.Scene();
  const R = padTopRadius(ground, 25);
  const hexAt = (index: number, angle: number) => {
    const c = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)).multiplyScalar(100);
    const verts = Array.from({ length: 6 }, (_, k) => c.clone().add(new THREE.Vector3(Math.cos(k), Math.sin(k), 0)));
    return { index, neighbors: [], center: c, vertices: verts, innerRadius: R - ROCKET_CONFIG.PAD_THICKNESS, floors };
  };
  const pad = {
    mesh: new THREE.Group(), position: new THREE.Vector3(), planetCenter: new THREE.Vector3(), outerRadius: R,
    hexes: new Map(), placedTiles: new Set<number>(), rocketTileIndex: -1, towerTileIndex: -1, centerTileIndex: 1,
    towerTileCenter: new THREE.Vector3(), isComplete: false, surroundingTileIndices: [], blockHeight: 1,
    rocketParts: [], segmentCount: 0, segmentMeshes: [], rocketMeshes: [], stash: [],
  } as unknown as Parameters<typeof m.addHex>[0];
  (mm.launchPads as unknown[]).push(pad);
  assert.ok(m.addHex(pad, hexAt(1, 0)));
  assert.ok(m.addHex(pad, hexAt(2, 0.02)));
  assert.equal(tops.get(1), R);
  assert.equal(tops.get(2), R);
  assert.ok(m.removeHex(pad, 2));
  assert.equal(tops.has(2), false, 'a hex taken up is no floor');
  m.removeLaunchPad(pad);
  assert.equal(tops.size, 0, 'a removed pad leaves no floors behind');
});
