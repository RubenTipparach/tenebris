// Tree bark is painted per quad (cylinder sides), never per triangle: a
// hash of one triangle's centre gave a quad's two halves different
// colours - the birch's black triangles. On a built birch, every trunk
// quad's two triangles are the same shade class (mark or white bark), and
// the marks are there.
//   npx tsx scripts/tree-bark.test.ts
import './stub-shaders';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const THREE = await import('three');
const { TreeBuilder } = await import('../src/planet/Tree');

test("a birch's trunk quads are never split dark / light", () => {
  const SIDES = 10, ROWS = 36;   // buildBirch's trunk
  let marks = 0, quads = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const tree = new TreeBuilder().createTree(new THREE.Vector3(0, 100, 0), new THREE.Vector3(0, 1, 0), { species: 'birch', seed });
    const mesh = tree.children.find((c) => (c as THREE.Mesh).isMesh) as THREE.Mesh;
    const col = mesh.geometry.getAttribute('color');
    const lum = (i: number) => 0.299 * col.getX(i) + 0.587 * col.getY(i) + 0.114 * col.getZ(i);
    // the trunk is the first part: its side quads, two triangles each, come first
    for (let q = 0; q < SIDES * ROWS; q++) {
      const dark = [];
      for (let v = 0; v < 6; v++) dark.push(lum(q * 6 + v) < 0.4);
      assert.ok(dark.every(d => d === dark[0]), `seed ${seed} quad ${q}: one shade (${dark.join(',')})`);
      if (dark[0]) marks++;
      quads++;
    }
  }
  assert.ok(marks > 0.05 * quads && marks < 0.4 * quads, `some bark marks (${marks} of ${quads})`);
});
