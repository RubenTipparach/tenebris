// Trees are static, so the part of their light the sun doesn't change is
// baked into their vertices once (bakeTreeLight, TREE_LIGHT): darker at the
// foot and under the crown, and a smoothed shading normal for the shader's
// soft sun term. The bake must not depend on the sun (it is not rebuilt as
// the day turns) and the smoothed normal must be a unit vector everywhere.
// Run: npx tsx scripts/tree-light.test.ts
import './stub-shaders';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { BufferGeometry } from 'three';

const THREE = await import('three');
const { bakeTreeLight } = await import('../src/planet/Tree');
const { TREE_LIGHT } = await import('../src/config/LightingConfig');

/** A trunk and a crown, flat shaded like the tree builders make them, white */
function tree(): BufferGeometry[] {
  const trunk = new THREE.CylinderGeometry(0.3, 0.3, 2, 6).toNonIndexed().translate(0, 1, 0);
  const crown = new THREE.IcosahedronGeometry(1.5, 0).toNonIndexed().translate(0, 3.5, 0);
  for (const g of [trunk, crown]) {
    g.computeVertexNormals();
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count * 3).fill(1), 3));
  }
  return [trunk, crown];
}

const lum = (g: BufferGeometry, i: number) => g.getAttribute('color').getX(i);

test('the foot and the underside are darker; the top of the crown keeps its colour', () => {
  const geoms = tree();
  bakeTreeLight(geoms, new THREE.Vector3(), new THREE.Vector3(0, 1, 0));
  const [trunk, crown] = geoms;
  const pos = trunk.getAttribute('position');
  let foot = 1;
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) < 0.01) foot = Math.min(foot, lum(trunk, i));
  assert.ok(foot <= TREE_LIGHT.AO_BASE + 1e-6, `foot ${foot}`);
  const cp = crown.getAttribute('position');
  let topI = 0, botI = 0;
  for (let i = 0; i < cp.count; i++) {
    if (cp.getY(i) > cp.getY(topI)) topI = i;
    if (cp.getY(i) < cp.getY(botI)) botI = i;
  }
  assert.ok(lum(crown, topI) > 0.9, `crown top ${lum(crown, topI)}`);
  assert.ok(lum(crown, botI) < lum(crown, topI), 'the crown is darker underneath');
  for (const v of [foot, lum(crown, topI), lum(crown, botI)]) assert.ok(v > 0 && v <= 1);
});

test('every vertex gets a unit smoothed shading normal, rolling across the crown', () => {
  const geoms = tree();
  bakeTreeLight(geoms, new THREE.Vector3(), new THREE.Vector3(0, 1, 0));
  const crown = geoms[1];
  const sn = crown.getAttribute('shadeNormal');
  assert.ok(sn, 'shadeNormal baked');
  const v = new THREE.Vector3();
  for (let i = 0; i < sn.count; i++) assert.ok(Math.abs(v.fromBufferAttribute(sn, i).length() - 1) < 1e-5);
  // a flat face's three corners no longer share one normal (no facet edge)
  const a = new THREE.Vector3().fromBufferAttribute(sn, 0), b = new THREE.Vector3().fromBufferAttribute(sn, 1);
  assert.ok(a.angleTo(b) > 0.01, 'smoothed: corners of one facet differ');
});

test('the bake is the same on any tree axis (rotated with it) and needs no sun', () => {
  const up = new THREE.Vector3(1, 1, 0).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
  const base = new THREE.Vector3(5, -2, 7);
  const a = tree(), b = tree();
  for (const g of b) g.applyQuaternion(q).translate(base.x, base.y, base.z);
  bakeTreeLight(a, new THREE.Vector3(), new THREE.Vector3(0, 1, 0));
  bakeTreeLight(b, base, up);
  for (let k = 0; k < 2; k++) {
    for (let i = 0; i < a[k].getAttribute('color').count; i++) {
      assert.ok(Math.abs(lum(a[k], i) - lum(b[k], i)) < 1e-5);
    }
  }
});
