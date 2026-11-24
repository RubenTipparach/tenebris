// RCS thruster lines: for each commanded turn (WASD / Q / E) the jets are a
// couple that turns the rocket about exactly that axis, the right way, with
// no net push. Run: npx tsx scripts/rocket-rcs.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { rcsJets, createRcsLines, setRcsLines } from '../src/rocket/RocketRcsVisuals';

const center = new THREE.Vector3(0, 5, 0), H = 10;

function torqueAndForce(cmd: THREE.Vector3) {
  const jets = rcsJets(cmd, H, center);
  const torque = new THREE.Vector3(), force = new THREE.Vector3();
  for (const j of jets) {
    const push = j.dir.clone().negate();           // the exhaust goes one way, the push the other
    force.add(push);
    torque.add(j.from.clone().sub(center).cross(push));
  }
  return { jets, torque, force };
}

test('each single turn fires a couple about its own axis, the commanded way', () => {
  for (let axis = 0; axis < 3; axis++) {
    for (const sign of [1, -1]) {
      const cmd = new THREE.Vector3(); cmd.setComponent(axis, sign);
      const { jets, torque, force } = torqueAndForce(cmd);
      assert.equal(jets.length, 2, 'two jets');
      assert.ok(force.length() < 1e-9, 'no net push - the rocket turns, it does not drift');
      const want = new THREE.Vector3(); want.setComponent(axis, sign);
      assert.ok(torque.clone().normalize().distanceTo(want) < 1e-9, `axis ${axis} sign ${sign}: torque ${torque.toArray()}`);
    }
  }
});

test('pitch and roll jets fire at the nose and the tail; a spin about the nose fires at the sides', () => {
  const pitch = rcsJets(new THREE.Vector3(1, 0, 0), H, center).map(j => j.from.y - center.y);
  assert.ok(pitch.some(y => y > H / 4) && pitch.some(y => y < -H / 4), 'nose and tail');
  const spin = rcsJets(new THREE.Vector3(0, 1, 0), H, center).map(j => j.from.y - center.y);
  assert.ok(spin.every(y => Math.abs(y) < 1e-9), 'at the middle of the hull');
});

test('no turn, no lines; a combined turn draws every jet', () => {
  const lines = createRcsLines();
  setRcsLines(lines, rcsJets(new THREE.Vector3(), H, center));
  assert.ok(!lines.visible && lines.geometry.drawRange.count === 0);
  setRcsLines(lines, rcsJets(new THREE.Vector3(1, -1, 1), H, center), () => 0);
  assert.ok(lines.visible && lines.geometry.drawRange.count === 12);
});
