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

// ---- self-destruct: hold the key for SELF_DESTRUCT_HOLD_S; letting go cancels
const { ROCKET_CONFIG } = await import('../src/config/RocketConfig');
type SD = { hasLaunched: boolean; updateSelfDestruct: (dt: number, input: { selfDestruct?: boolean }) => void };
const HOLD = ROCKET_CONFIG.SELF_DESTRUCT_HOLD_S;

test('holding self-destruct for the hold time blows the rocket up', () => {
  const c = flying(false);
  const sd = c as unknown as SD;
  sd.hasLaunched = true;
  sd.updateSelfDestruct(HOLD * 0.6, { selfDestruct: true });
  assert.ok(c.getSelfDestructProgress() > 0.5 && internals(c).stateMachine.getState() === RocketState.IN_FLIGHT);
  sd.updateSelfDestruct(HOLD * 0.5, { selfDestruct: true });
  assert.equal(internals(c).stateMachine.getState(), RocketState.CRASHED);
  assert.equal(c.getCrashReason(), 'selfDestruct');
});

test('letting go cancels, and it never fires on the pad', () => {
  const c = flying(false);
  const sd = c as unknown as SD;
  sd.hasLaunched = true;
  sd.updateSelfDestruct(HOLD * 0.9, { selfDestruct: true });
  sd.updateSelfDestruct(0.016, { selfDestruct: false });
  assert.equal(c.getSelfDestructProgress(), 0);
  sd.updateSelfDestruct(HOLD * 0.5, { selfDestruct: true });
  assert.equal(internals(c).stateMachine.getState(), RocketState.IN_FLIGHT, 'the hold starts over');
  const pad = flying(false);
  (pad as unknown as SD).updateSelfDestruct(HOLD * 2, { selfDestruct: true });
  assert.equal(pad.getSelfDestructProgress(), 0, 'not launched: no self-destruct');
});

// ---- refuelling only on a body's ground (owner: exiting and re-entering in space refuelled the ship)
type Fuelled = { closestPlanet: unknown; position: InstanceType<typeof THREE.Vector3>; setFuelTotal: (n: number) => void; stageCapacities: number[] };
function tanked(altitude: number | null): Ctl {
  const c = new RocketController(new THREE.Scene());
  const f = c as unknown as Fuelled;
  f.stageCapacities = [100];
  f.setFuelTotal(10);
  if (altitude !== null) {
    f.closestPlanet = { id: 'moon', center: new THREE.Vector3(), radius: 50, gravityStrength: 0.2, name: 'Moon' };
    f.position = new THREE.Vector3(0, 50 + altitude, 0);
  }
  return c;
}

test('refuelling draws fuel on the ground, and never floating in space', () => {
  let asked = 0;
  RocketController.fuelSource = () => { asked++; return 0; };
  try {
    tanked(1).refuel();
    assert.equal(asked, 1, 'on the ground it draws from the fuel source');
    tanked(200).refuel();
    tanked(null).refuel();   // near no body at all
    assert.equal(asked, 1, 'in space it draws nothing');
  } finally {
    RocketController.fuelSource = null;
  }
});
