// The rocket's chase camera rides the rocket's quaternion: a full pitch loop
// through the world poles never jumps the view (the old basis was rebuilt
// from world up and flipped there - the "gimbal snap"), and a roll turns the
// camera with the ship.
// Run: npx tsx scripts/rocket-camera.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { RocketCamera } from '../src/rocket/RocketCamera';

const STEP = Math.PI / 180; // 1 degree a step

function follow(q: THREE.Quaternion) {
  const cam = new THREE.PerspectiveCamera();
  const rc = new RocketCamera(cam);
  rc.setRocketTransform(new THREE.Vector3(), q);
  rc.reset(); rc.snap(); rc.update(0);
  return cam;
}

test('a full pitch loop through both world poles turns the view smoothly', () => {
  const q = new THREE.Quaternion();
  let prev = follow(q).quaternion.clone();
  for (let i = 0; i < 360; i++) {
    q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0).applyQuaternion(q), STEP)).normalize();
    const now = follow(q).quaternion.clone();
    // the camera turns exactly as far as the rocket did each step (1 degree)
    assert.ok(prev.angleTo(now) < STEP * 1.01, `step ${i}: view jumped ${(prev.angleTo(now) * 180 / Math.PI).toFixed(1)} deg`);
    prev = now;
  }
});

test('a roll turns the camera with the ship', () => {
  const pitched = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 1.2);
  const rolled = pitched.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.5));
  const a = follow(pitched).quaternion, b = follow(rolled).quaternion;
  assert.ok(Math.abs(a.angleTo(b) - 0.5) < 1e-6, 'the view rolled as far as the rocket');
});

test('the camera looks at the rocket and keeps the rocket nose as its up', () => {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.7, -2.1, 1.3));
  const cam = follow(q);
  const toRocket = cam.position.clone().negate().normalize();
  const look = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
  assert.ok(look.distanceTo(toRocket) < 1e-6, 'aimed at the rocket centre');
  const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
  const nose = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
  assert.ok(camUp.dot(nose) > 0.9, 'the rocket nose is up on screen');
});
