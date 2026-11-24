// A planet's forest rides its orbit: the batched tree meshes sit under the
// planet's attach root (src/world/PlanetFrames.ts) and must follow it when it
// moves. They had their world matrix frozen, so Sequoia's trees hung in space
// where they were built while the planet orbited away.
// Run: npx tsx scripts/tree-frames.test.ts
import './stub-shaders';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const THREE = await import('three');
// No page here: textures are not what this checks
THREE.TextureLoader.prototype.load = function () { return new THREE.Texture(); } as typeof THREE.TextureLoader.prototype.load;
const { FloraTreeManager } = await import('../src/planet/Tree');

test('batched flora follows its planet root when the planet moves', () => {
  const scene = new THREE.Scene();
  const root = new THREE.Group();           // the planet's attach root
  scene.add(root);
  const center = new THREE.Vector3(800, 100, 400);  // configured centre
  const mgr = new FloraTreeManager(root as unknown as THREE.Scene, ['redwood']);
  mgr.setChunkLookup(() => 0);
  const spot = center.clone().add(new THREE.Vector3(0, 200, 0));
  mgr.addTree(spot, center, undefined, 1);
  mgr.updateVisibility(new Set([0]));
  const meshes = root.children.filter(o => (o as THREE.Mesh).isMesh && o.visible) as THREE.Mesh[];
  assert.ok(meshes.length > 0, 'a batched chunk mesh was built under the root');
  const where = () => { scene.updateMatrixWorld(true); const m = meshes[0]; m.geometry.computeBoundingSphere(); return m.geometry.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld); };
  const before = where();
  assert.ok(before.distanceTo(spot) < 40, 'built at the tree');
  // The planet moves along its orbit: the root carries its objects
  root.position.set(500, 0, -300);
  const after = where();
  assert.ok(after.distanceTo(spot.clone().add(root.position)) < 40, `the forest moved with the planet (${after.toArray().map(v => v.toFixed(0))})`);
});
