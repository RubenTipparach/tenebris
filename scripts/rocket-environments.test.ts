// Atmospheres, the heat shield, the Sun and gas giants (openspec
// space-exploration 2.4-2.7). Run: npx tsx scripts/rocket-environments.test.ts
import './stub-shaders';
import assert from 'node:assert/strict';
import { test } from 'node:test';

// Toasts are page UI: a bare stand-in document lets the controller show them here
const el = () => ({ style: {} as Record<string, string>, innerHTML: '', remove() {}, appendChild() {}, classList: { add() {}, remove() {} } });
(globalThis as unknown as { document: unknown }).document = { getElementById: () => null, createElement: el, body: { appendChild() {} } };
(globalThis as unknown as { requestAnimationFrame: (f: () => void) => number }).requestAnimationFrame = () => 0;

const THREE = await import('three');
const { ROCKET_CONFIG } = await import('../src/config/RocketConfig');
const { reentryStep, chuteDescentSpeed, chuteLandingSpeed, solarHeat, shieldsFitted, useShield } = await import('../src/rocket/RocketPerformance');
const { RocketController } = await import('../src/rocket/RocketController');
const { RocketState } = await import('../src/rocket/RocketState');
const { onGameEvent } = await import('../src/engine/GameEvents');
const { ItemType } = await import('../src/player/Inventory');

const R = ROCKET_CONFIG.REENTRY;
const DT = 1 / 60;
const back = { heat: 0, leftAtmosphere: true };

test('Earth density keeps the old numbers', () => {
  const v = R.safeSpeed + 40;
  const a = reentryStep(back, true, v, DT);
  const b = reentryStep(back, true, v, DT, { density: 1 });
  assert.equal(a.heat, b.heat);
  assert.ok(Math.abs(a.heat - 40 * R.heatPerMs * DT) < 1e-9);
});

test('thick air heats faster at the same speed; vacuum not at all', () => {
  const v = R.safeSpeed + 20;
  const earth = reentryStep(back, true, v, DT, { density: 1 }).heat;
  const thalassa = reentryStep(back, true, v, DT, { density: 2.5 }).heat;
  assert.ok(thalassa > earth * 2);
  assert.equal(reentryStep(back, false, v, DT, { density: 0 }).heat, 0);
});

test('a heat shield takes its share of the heat, and says how much', () => {
  const v = R.safeSpeed + 60;
  const bare = reentryStep(back, true, v, DT).heat;
  const shielded = reentryStep(back, true, v, DT, { shieldShare: R.shieldShare });
  assert.ok(Math.abs(shielded.heat - bare * (1 - R.shieldShare)) < 1e-9);
  assert.ok(Math.abs(shielded.absorbed - bare * R.shieldShare) < 1e-9);
});

test('a chute lands slower in thick air, faster in thin', () => {
  assert.ok(chuteLandingSpeed(2.5) < chuteLandingSpeed(1) && chuteLandingSpeed(0.5) > chuteLandingSpeed(1));
  let fall = 40, fallThick = 40;
  for (let i = 0; i < 600; i++) { fall = chuteDescentSpeed(fall, 9.8, DT, 1); fallThick = chuteDescentSpeed(fallThick, 9.8, DT, 2.5); }
  assert.ok(Math.abs(fall - chuteLandingSpeed(1)) < 0.01 && Math.abs(fallThick - chuteLandingSpeed(2.5)) < 0.01);
});

test('the Sun heats only inside its close-pass distance, most at its surface', () => {
  const r = 500;
  assert.equal(solarHeat(r * ROCKET_CONFIG.SUN_PASS.closePassRadii + 1, r, 1), 0);
  assert.ok(Math.abs(solarHeat(r, r, 1) - ROCKET_CONFIG.SUN_PASS.heatPerS) < 1e-9);
  assert.ok(solarHeat(r * 1.3, r, 1) > 0 && solarHeat(r * 1.3, r, 1) < ROCKET_CONFIG.SUN_PASS.heatPerS);
});

test('heat shields are counted and worn through one at a time', () => {
  const eq = [{ itemType: ItemType.HEAT_SHIELD, quantity: 2 }];
  assert.equal(shieldsFitted(eq), 2);
  assert.ok(useShield(eq));
  assert.equal(shieldsFitted(eq), 1);
});

// ---- the controller flying past a gas giant and the Sun
const events: Array<[string, unknown]> = [];
onGameEvent((type, key) => events.push([type, key]));
type Internals = { planets: unknown[]; position: THREE.Vector3; velocity: THREE.Vector3; equipment: unknown; heat: number;
  hasLaunched: boolean; chargeWh: number; stateMachine: { forceState: (s: string) => void; getState: () => string };
  sunPosition: { x: number; y: number; z: number }; updatePhysics: (dt: number) => void; updateReentry: (dt: number, flying: boolean) => void;
  updateClosestPlanet: () => void; inAtmosphere: boolean; computeInAtmosphere: () => boolean; getCrashReason: () => string };

function flyer(): Internals {
  const c = new RocketController(new THREE.Scene()) as unknown as Internals;
  c.stateMachine.forceState(RocketState.IN_FLIGHT);
  c.hasLaunched = true;
  c.chargeWh = 1e6;
  // it flew here from elsewhere: out of every atmosphere since launch
  (c as unknown as { leftAtmosphere: boolean }).leftAtmosphere = true;
  c.sunPosition = { x: 1e7, y: 0, z: 0 };
  return c;
}
const { bodyEnvironment } = await import('../src/config/SolarSystemConfig');
const giant = { id: 'aurelia', name: 'Aurelia', center: new THREE.Vector3(), radius: 380, gravityStrength: 0, hasAtmosphere: true, atmosphereDensity: bodyEnvironment('aurelia').atmosphereDensity, gasGiant: true };

test('dipping below a gas giant\'s cloud tops and climbing out is a skim', () => {
  const c = flyer();
  c.planets = [giant];
  events.length = 0;
  c.position.set(giant.radius * 0.98, 0, 0); c.velocity.set(0, 0, 0);
  c.updateClosestPlanet(); c.updatePhysics(DT);
  c.position.set(giant.radius * (ROCKET_CONFIG.GAS_GIANT_FLIGHT.skimExitMult + 0.05), 0, 0);
  c.updateClosestPlanet(); c.updatePhysics(DT);
  assert.ok(events.some(([t, k]) => t === 'skimmed' && k === 'aurelia'));
});

test('sinking below the crush depth destroys the rocket', () => {
  const c = flyer();
  c.planets = [giant];
  c.position.set(giant.radius * (1 - ROCKET_CONFIG.GAS_GIANT_FLIGHT.crushDepth) - 1, 0, 0); c.velocity.set(0, 0, 0);
  c.updateClosestPlanet(); c.updatePhysics(DT);
  assert.equal(c.stateMachine.getState(), RocketState.CRASHED);
  assert.equal(c.getCrashReason(), 'crushed');
});

test('a fast dip into a gas giant burns up a rocket without a shield, not one with shields', () => {
  for (const shields of [0, 4]) {
    const c = flyer();
    c.planets = [giant];
    c.equipment = shields ? [{ itemType: ItemType.HEAT_SHIELD, quantity: shields }] : [];
    c.position.set(giant.radius * 1.2, 0, 0); c.velocity.set(-60, 0, 0);
    for (let i = 0; i < 120 && c.stateMachine.getState() !== RocketState.CRASHED; i++) {
      c.updateClosestPlanet(); c.inAtmosphere = c.computeInAtmosphere(); c.updateReentry(DT, true);
    }
    assert.equal(c.stateMachine.getState() === RocketState.CRASHED, shields === 0, `${shields} shields`);
  }
});

test('a close pass of the Sun with shields survives and counts; touching it burns up', () => {
  const c = flyer();
  c.planets = [];
  c.equipment = [{ itemType: ItemType.HEAT_SHIELD, quantity: 4 }];
  c.sunPosition = { x: 0, y: 0, z: 0 };
  events.length = 0;
  const r = 500;
  c.position.set(r * 1.5, 0, 0);
  for (let i = 0; i < 60; i++) c.updateReentry(DT, true);
  c.position.set(r * ROCKET_CONFIG.SUN_PASS.closePassRadii + 10, 0, 0);
  c.updateReentry(DT, true);
  assert.notEqual(c.stateMachine.getState(), RocketState.CRASHED);
  assert.ok(events.some(([t, k]) => t === 'closePass' && k === 'sun'));
  const d = flyer();
  d.planets = [];
  d.sunPosition = { x: 0, y: 0, z: 0 };
  d.position.set(r * 0.99, 0, 0);
  d.updateReentry(DT, true);
  assert.equal(d.stateMachine.getState(), RocketState.CRASHED);
});

// The ground clamp parks a touching-down rocket at exactly the grounded
// distance; read back, rounding can put it a hair above, and a landing that
// only compared the altitude hovered in LANDING forever (found by the
// space-exploration integration run on Rime). A touchdown is the clamp.
test('a gentle touchdown lands wherever the body sits (no hover from rounding)', () => {
  const stuck: string[] = [];
  for (const [cx, cy, cz] of [[900, 450, 100], [-2200, 300, 1700], [5000, -300, 1900], [0, 0, 0]]) {
    for (const [dx, dy, dz] of [[0.3, 1, 0.2], [1, 0.1, -0.4], [-0.6, -0.5, 0.7]]) {
      const body = { id: 'rock', name: 'Rock', center: new THREE.Vector3(cx, cy, cz), radius: 30, gravityStrength: 0.3, hasAtmosphere: false, atmosphereDensity: 0 };
      const c = flyer() as Internals & { orientation: THREE.Quaternion; checkStateTransitions: () => void };
      c.planets = [body];
      const up = new THREE.Vector3(dx, dy, dz).normalize();
      c.orientation.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
      c.position.copy(body.center).addScaledVector(up, body.radius + 1.5);
      c.velocity.copy(up).multiplyScalar(-0.5);
      for (let i = 0; i < 600 && c.stateMachine.getState() !== RocketState.LANDED; i++) {
        c.updateClosestPlanet(); c.updatePhysics(DT); c.checkStateTransitions();
      }
      if (c.stateMachine.getState() !== RocketState.LANDED) stuck.push(`${cx},${cy},${cz} dir ${dx},${dy},${dz}: ${c.stateMachine.getState()}`);
    }
  }
  assert.deepEqual(stuck, []);
});
