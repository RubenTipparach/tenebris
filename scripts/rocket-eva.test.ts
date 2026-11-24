// Exiting a rocket in space: out of every gravity well the pilot may climb
// out (the ship parks where it floats); in a gravity well in flight they may
// not; a ship parked in space re-boards in flight, not "landed".
// Run: npx tsx scripts/rocket-eva.test.ts
import './stub-shaders';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const THREE = await import('three');
const { RocketController } = await import('../src/rocket/RocketController');
const { RocketState } = await import('../src/rocket/RocketState');

type Ctl = InstanceType<typeof RocketController>;
const internals = (c: Ctl) => c as unknown as { isInGravityWell: boolean; gravityMultiplier: number; updateClosestPlanet: () => void; stateMachine: { forceState: (s: string) => void; getState: () => string } };

function flying(inWell: boolean): Ctl {
  const c = new RocketController(new THREE.Scene());
  const i = internals(c);
  i.stateMachine.forceState(RocketState.IN_FLIGHT);
  i.isInGravityWell = inWell;
  i.gravityMultiplier = inWell ? 1 : 0;
  return c;
}

test('in space a pilot can climb out, and the ship parks (DOCKED)', () => {
  const c = flying(false);
  assert.ok(c.isInSpace());
  assert.ok(c.canExitNow());
  assert.ok(c.exit());
  assert.equal(internals(c).stateMachine.getState(), RocketState.DOCKED);
});

test('in flight inside a gravity well there is no exit', () => {
  const c = flying(true);
  assert.ok(!c.isInSpace());
  assert.ok(!c.canExitNow());
  assert.ok(!c.exit());
});

test('a ship parked in space re-boards in flight; one on a surface re-boards landed', () => {
  for (const [inWell, want] of [[false, RocketState.IN_FLIGHT], [true, RocketState.LANDED]] as const) {
    const c = new RocketController(new THREE.Scene());
    const i = internals(c);
    i.updateClosestPlanet = () => { i.isInGravityWell = inWell; };
    c.boardLanded(new THREE.PerspectiveCamera());
    assert.equal(i.stateMachine.getState(), want);
  }
});
