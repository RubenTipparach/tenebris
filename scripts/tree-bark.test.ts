// Tree bark (and every cylinder part) is painted per quad, never per
// triangle: a hash of one triangle's centre gave a quad's two halves
// different colours - the birch's black triangles. And the Earth trees are
// textured: their bark and leaves use the atlas's colour cells
// (scripts/gen-tree-textures.py), painted in neutral light and shade.
//   npx tsx scripts/tree-bark.test.ts
import './stub-shaders';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const THREE = await import('three');
const { TreeBuilder } = await import('../src/planet/Tree');

const build = (species: string, seed: number) => {
  const tree = new TreeBuilder().createTree(new THREE.Vector3(0, 100, 0), new THREE.Vector3(0, 1, 0), { species: species as never, seed });
  return (tree.children.find((c) => (c as THREE.Mesh).isMesh) as THREE.Mesh).geometry;
};

test("a birch's trunk quads are each one colour (no split triangles)", () => {
  const SIDES = 8, ROWS = 16;   // buildBirch's trunk
  for (let seed = 1; seed <= 12; seed++) {
    const col = build('birch', seed).getAttribute('color');
    for (let q = 0; q < SIDES * ROWS; q++) {
      // both triangles of a quad: the same paint (the bake's light varies smoothly, so compare loosely)
      const c = (i: number) => [col.getX(i), col.getY(i), col.getZ(i)];
      const a = c(q * 6), b = c(q * 6 + 3);
      for (let k = 0; k < 3; k++) assert.ok(Math.abs(a[k] - b[k]) < 0.25, `seed ${seed} quad ${q}: ${a} vs ${b}`);
    }
  }
});

test('Earth trees use the colour texture cells, painted neutral grey', () => {
  for (const species of ['pine', 'oak', 'birch']) {
    const g = build(species, 3);
    const cells = new Set(Array.from(g.getAttribute('texCell').array as Float32Array, Math.round));
    assert.ok([...cells].every(c => c >= 4), `${species}: colour cells only (${[...cells]})`);
    assert.ok(cells.size >= 2, `${species}: bark and leaves`);
    const col = g.getAttribute('color');
    for (let i = 0; i < col.count; i += 37) {
      const r = col.getX(i), gg = col.getY(i), b = col.getZ(i);
      assert.ok(Math.abs(r - gg) < 0.02 && Math.abs(gg - b) < 0.02, `${species}: grey paint (${r},${gg},${b})`);
    }
  }
});
