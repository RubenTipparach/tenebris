// Staging (openspec space-exploration, rocket-staging 3.1-3.4).
// Run: npx tsx scripts/rocket-staging.test.ts
import './stub-shaders';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const el = () => ({ style: {} as Record<string, string>, innerHTML: '', remove() {}, appendChild() {}, classList: { add() {}, remove() {} } });
(globalThis as unknown as { document: unknown }).document = { getElementById: () => null, createElement: el, body: { appendChild() {} } };
(globalThis as unknown as { requestAnimationFrame: () => number }).requestAnimationFrame = () => 0;

const THREE = await import('three');
const { ItemType } = await import('../src/player/Inventory');
const { stagesOf, stagedStats, stagedDeltaVWith, fillStages, computeRocketStats, deltaVWith } = await import('../src/rocket/RocketPerformance');
const { RocketController } = await import('../src/rocket/RocketController');
const { RocketPart } = await import('../src/planet/RocketPart');
const { RocketState } = await import('../src/rocket/RocketState');
const I = ItemType;

const ONE = [I.ROCKET_ENGINE, I.MEDIUM_FUEL_TANK, I.COMMAND_MODULE];
const TWO = [I.ROCKET_ENGINE, I.MEDIUM_FUEL_TANK, I.STAGE_SEPARATOR, I.VACUUM_ENGINE, I.MEDIUM_FUEL_TANK, I.COMMAND_MODULE];
const id = (t: number) => t;

test('no separator: one stage; separators split the stack, each dropping with the stage below', () => {
  assert.equal(stagesOf(ONE, id).length, 1);
  const two = stagesOf(TWO, id);
  assert.equal(two.length, 2);
  assert.deepEqual(two[0], [I.ROCKET_ENGINE, I.MEDIUM_FUEL_TANK, I.STAGE_SEPARATOR]);
  const three = stagesOf([...TWO.slice(0, 3), I.ROCKET_ENGINE, I.MEDIUM_FUEL_TANK, I.STAGE_SEPARATOR, I.VACUUM_ENGINE, I.COMMAND_MODULE], id);
  assert.equal(three.length, 3);
});

test('a stack with no separator has the same delta-v as before', () => {
  const plain = computeRocketStats(ONE);
  assert.ok(Math.abs(stagedStats(ONE).deltaV - plain.deltaV) < 1e-6);
  assert.ok(Math.abs(stagedDeltaVWith(ONE, 0, null, null, 60) - deltaVWith(plain, 60)) < 1e-6);
});

test('staging beats burning everything together: two stages have more delta-v than one stack of the same parts', () => {
  const staged = stagedStats(TWO);
  const lumped = computeRocketStats(TWO.filter(t => t !== I.STAGE_SEPARATOR));
  assert.equal(staged.stages.length, 2);
  assert.ok(staged.deltaV > lumped.deltaV, `${staged.deltaV.toFixed(0)} > ${lumped.deltaV.toFixed(0)}`);
});

test('fuel fills the stages from the bottom', () => {
  assert.deepEqual(fillStages(150, [100, 100]), [100, 50]);
  assert.deepEqual(fillStages(30, [100, 100]), [30, 0]);
});

// ---- in flight
function rocket(types: number[]) {
  const c = new RocketController(new THREE.Scene());
  const parts = types.map((t, i) => {
    const g = new THREE.Group();
    g.position.set(0, i * 2, 0);
    return new RocketPart(t, 'x' as never, g, new THREE.MeshBasicMaterial() as never, i);
  });
  c.initialize(parts, new THREE.Vector3(0, 100, 0), new THREE.Vector3(0, 1, 0), [], null);
  return { c, parts, x: c as unknown as { stateMachine: { forceState: (s: string) => void }; isThrustActive: boolean; throttle: number; chargeWh: number; hasLaunched: boolean; updatePhysics: (dt: number) => void; currentFuel: number; upperFuel: number[] } };
}

test("only the active stage's tanks drain", () => {
  const { c, x } = rocket(TWO);
  x.stateMachine.forceState(RocketState.IN_FLIGHT);
  x.isThrustActive = true; x.throttle = 1; x.chargeWh = 1e6;
  const upperBefore = [...x.upperFuel];
  for (let i = 0; i < 60; i++) x.updatePhysics(1 / 60);
  assert.ok(x.currentFuel < 100, 'the first stage burned');
  assert.deepEqual(x.upperFuel, upperBefore, 'the upper stage stayed full');
  assert.equal(c.getStageInfo().count, 2);
});

test('dropping a stage leaves the upper one active on its own tanks; the last stage will not drop', () => {
  const { c, parts, x } = rocket(TWO);
  x.stateMachine.forceState(RocketState.IN_FLIGHT);
  const dropped: unknown[] = [];
  c.onStageDropped = (ps) => dropped.push(...ps);
  const before = c.getCurrentMass();
  assert.ok(c.dropStage());
  assert.deepEqual(dropped, parts.slice(0, 3));
  assert.equal(c.getStageInfo().count, 1);
  assert.equal(x.currentFuel, 100, 'the upper stage is active with its full tank');
  assert.ok(c.getCurrentMass() < before, 'lighter');
  assert.equal(c.dropStage(), false);
});
