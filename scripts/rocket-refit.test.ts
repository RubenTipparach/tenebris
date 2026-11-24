// Docking and refits away from home (openspec space-exploration,
// rocket-refit 4.1-4.4). Run: npx tsx scripts/rocket-refit.test.ts
import './stub-shaders';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const el = () => ({ style: {} as Record<string, string>, innerHTML: '', textContent: '', hidden: false, disabled: false, remove() {}, append() {}, appendChild() {}, addEventListener() {}, querySelector: () => el(), classList: { add() {}, remove() {}, toggle() {} } });
(globalThis as unknown as { document: unknown }).document = { getElementById: () => null, createElement: el, body: { appendChild() {} }, addEventListener() {}, head: { appendChild() {} } };
(globalThis as unknown as { requestAnimationFrame: () => number }).requestAnimationFrame = () => 0;

const THREE = await import('three');
const { ItemType } = await import('../src/player/Inventory');
const { stackProblems, fitSlots } = await import('../src/rocket/RocketPerformance');
const { planRefit, stackAfter, refitKitIn } = await import('../src/rocket/Refit');
const { stackPartHeights, ROCKET_SEGMENT_HEIGHT } = await import('../src/planet/LaunchPad');
const I = ItemType;
const STARTER = [I.ROCKET_ENGINE, I.MEDIUM_FUEL_TANK, I.COMMAND_MODULE];

test('the stack rules: a flyable stack has none; a stack without its command module is refused', () => {
  assert.deepEqual(stackProblems(STARTER), []);
  assert.ok(stackProblems([I.ROCKET_ENGINE, I.MEDIUM_FUEL_TANK]).some(p => /Command Module/.test(p)));
  assert.ok(stackProblems([I.MEDIUM_FUEL_TANK, I.ROCKET_ENGINE, I.COMMAND_MODULE]).some(p => /bottom/.test(p)));
  assert.ok(stackProblems([I.ROCKET_ENGINE, I.MEDIUM_FUEL_TANK, I.STAGE_SEPARATOR, I.MEDIUM_FUEL_TANK, I.COMMAND_MODULE]).some(p => /Stage 2 has no engine/.test(p)));
});

test('a refit swaps the bottom engine, keeps the rocket flyable, and refuses to remove the command module', () => {
  const swap = planRefit(STARTER, { kind: 'swap', index: 0, itemType: I.VACUUM_ENGINE });
  assert.equal(swap.refused, null);
  assert.equal(swap.takenOff, I.ROCKET_ENGINE);
  assert.equal(swap.putOn, I.VACUUM_ENGINE);
  assert.deepEqual(stackAfter(STARTER, { kind: 'swap', index: 0, itemType: I.VACUUM_ENGINE }), [I.VACUUM_ENGINE, I.MEDIUM_FUEL_TANK, I.COMMAND_MODULE]);
  assert.match(planRefit(STARTER, { kind: 'remove', index: 2 }).refused ?? '', /Command Module/);
  assert.equal(planRefit(STARTER, { kind: 'addTop', itemType: I.CARGO_BAY }).refused, null);
});

test('the kit: a plain one is used up per refit, the mk2 is kept; no kit, no refit', () => {
  assert.equal(refitKitIn([{ itemType: I.REFIT_KIT, quantity: 1 }]), 'once');
  assert.equal(refitKitIn([{ itemType: I.REFIT_KIT, quantity: 1 }, { itemType: I.REFIT_KIT_MK2, quantity: 1 }]), 'reusable');
  assert.equal(refitKitIn([{ itemType: I.PARACHUTE, quantity: 2 }]), null);
});

test('parts stack bottom up the same way on the pad and in a refit', () => {
  const h = stackPartHeights(STARTER, ROCKET_SEGMENT_HEIGHT);
  assert.equal(h.length, 3);
  assert.ok(h[0] < h[1] && h[1] < h[2]);
});

test('slots follow a new stack, items packed, refused when they would not fit', () => {
  const slots = [{ itemType: I.NONE, quantity: 0 }, { itemType: I.ICE, quantity: 3 }, { itemType: I.NONE, quantity: 0 }];
  assert.ok(fitSlots(slots, 2));
  assert.deepEqual(slots, [{ itemType: I.ICE, quantity: 3 }, { itemType: I.NONE, quantity: 0 }]);
  assert.equal(fitSlots([{ itemType: I.ICE, quantity: 1 }, { itemType: I.WOOD, quantity: 1 }], 1), false);
});

// ---- the flight manager applying a refit to a parked rocket (part meshes stubbed)
test('a refit in space: the kit is spent, the engine is swapped from the cargo, the old one goes into the cargo', async () => {
  const { RocketFlightManager } = await import('../src/rocket/RocketFlightManager');
  const { RocketPart } = await import('../src/planet/RocketPart');
  const scene = new THREE.Scene();
  const fm = new RocketFlightManager(scene, new THREE.PerspectiveCamera(), { isKeyPressed: () => false } as never);
  const assets = { geometry: new THREE.BoxGeometry(), material: new THREE.ShaderMaterial() };
  const items = new Map<number, number>();
  fm.setRefitSupport({ loadRocketPartAssets: async () => assets, getLaunchPads: () => [] } as never, {
    count: (t) => items.get(t) ?? 0,
    take: (t, n) => { const have = items.get(t) ?? 0; items.set(t, have - Math.min(have, n)); return Math.min(have, n); },
    give: (t, n) => { items.set(t, (items.get(t) ?? 0) + n); return 0; },
  });
  const pivot = new THREE.Group();
  const parts = STARTER.map((t, i) => { const g = new THREE.Group(); g.position.y = i * 2; pivot.add(g); return new RocketPart(t, 'x' as never, g, new THREE.ShaderMaterial(), i); });
  const cargo = [{ itemType: I.VACUUM_ENGINE, quantity: 1 }, { itemType: I.NONE, quantity: 0 }, { itemType: I.NONE, quantity: 0 }, { itemType: I.NONE, quantity: 0 }];
  const equipment = [{ itemType: I.REFIT_KIT, quantity: 1 }, { itemType: I.NONE, quantity: 0 }, { itemType: I.NONE, quantity: 0 }];
  const rocket = fm.getLandedRocketManager().createLandedRocket(pivot, parts, new THREE.Vector3(0, 5000, 0), new THREE.Quaternion(), new THREE.Vector3(0, 1, 0), 50, cargo, null, 'k1', null, equipment);
  assert.equal(await fm.applyRefit(rocket, { kind: 'swap', index: 0, itemType: I.VACUUM_ENGINE }), 'Start a refit first');
  assert.ok(fm.startRefit(rocket));
  assert.equal(equipment[0].quantity, 0, 'the plain kit is used up');
  assert.equal(await fm.applyRefit(rocket, { kind: 'swap', index: 0, itemType: I.VACUUM_ENGINE }), null);
  assert.deepEqual(rocket.parts.map(p => p.itemType), [I.VACUUM_ENGINE, I.MEDIUM_FUEL_TANK, I.COMMAND_MODULE]);
  assert.ok(cargo.some(s => s.itemType === I.ROCKET_ENGINE), 'the old engine is in the cargo hold');
  assert.ok(!cargo.some(s => s.itemType === I.VACUUM_ENGINE), 'the new one came out of it');
  assert.match((await fm.applyRefit(rocket, { kind: 'remove', index: 2 })) ?? '', /Command Module/);
  fm.endRefit(rocket);
  assert.equal(fm.startRefit(rocket), false, 'no kit left, no new refit');
});
