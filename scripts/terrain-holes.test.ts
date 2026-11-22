// Terrain holes after digging (owner: "I mined some dirt and holes appeared
// in the geom"). Drives the real Planet mesh paths headless: the flat build
// through the real geometry worker, the block edit, the per-chunk rebuild,
// and checks every exposed face of every solid cell round the dug cells is
// in the visible terrain meshes, by raycasting them as the browser probe did.
//
// The bug: a flat (worker) build posted BEFORE a dig came back AFTER it, and
// replaced the per-chunk meshes the dig had rebuilt with its older snapshot.
// The dug block came back in the mesh while the world had it as air, so
// stepping into it put the camera inside a cell whose neighbours had culled
// their faces against it: straight through the ground to sky and the far
// side of the planet.
//
// Run: npx tsx scripts/terrain-holes.test.ts
import { register } from 'node:module';
import * as THREE from 'three';

// Planet's shader imports (?raw, .vert/.frag through vite) are stubbed
register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(spec, ctx, next) {
  if (/\\.(vert|frag|glsl)(\\?raw)?$/.test(spec) || spec.endsWith('?raw')) return { url: 'stub:' + spec, shortCircuit: true };
  return next(spec, ctx);
}
export async function load(url, ctx, next) {
  if (url.startsWith('stub:')) return { format: 'module', source: 'export default "";', shortCircuit: true };
  return next(url, ctx);
}`));

const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };

// The geometry worker, run in-process: its onmessage is installed on `self`
let workerOut: unknown = null;
const workerSelf: { postMessage: (r: unknown) => void; onmessage?: (e: { data: unknown }) => void } = { postMessage: (r) => { workerOut = r; } };
(globalThis as unknown as { self: unknown }).self = workerSelf;
await import('../src/workers/geometryWorker');
const runWorker = (msg: unknown) => { workerOut = null; workerSelf.onmessage!({ data: msg }); return workerOut as Record<string, unknown>; };

const { Planet } = await import('../src/planet/Planet');
const { HexBlockType } = await import('../src/shared/blockTypes');
const AIR = HexBlockType.AIR, WATER = HexBlockType.WATER;

console.log = ((orig) => (...a: unknown[]) => { if (typeof a[0] === 'string' && /^(PASS|FAIL)/.test(a[0])) orig(...a); })(console.log);

/* eslint-disable @typescript-eslint/no-explicit-any */
type P = any;

// A small planet with flat ground: every column solid up to SURFACE
const SURFACE = 12;
function makePlanet(): P {
  const p: P = new Planet(new THREE.Scene(), 30, 3, { name: 'test', isSpawnPlanet: true });
  p.meshBuilder = { getMaterial: () => new THREE.MeshBasicMaterial(), isSolid: (b: number) => b !== AIR && b !== WATER };
  p.initializeLODChunks();
  p.createBatchedMeshGroup();
  for (const tile of p.polyhedron.tiles) {
    const blocks = new Array(p.MAX_DEPTH).fill(AIR);
    for (let d = 0; d <= SURFACE; d++) blocks[d] = d === SURFACE ? HexBlockType.GRASS : HexBlockType.DIRT;
    p.columns.set(tile.index, { tile, blocks, isDirty: false, boundingSphere: new THREE.Sphere(tile.center.clone(), 40) });
  }
  p.cachedNearbyTiles = new Set(p.polyhedron.tiles.map((t: { index: number }) => t.index));
  let posted: unknown = null;
  p.geometryWorker = { postMessage: (m: unknown) => { posted = m; } };
  p.takePosted = () => { const m = posted; posted = null; return m; };
  p.detailedTerrainEnabled = true;
  return p;
}

// Every exposed face (top under air, side toward an air neighbour) of every
// solid cell in `tiles` must be hit by a ray from the open cell into it
function holes(p: P, tiles: Iterable<number>): string[] {
  const meshes: THREE.Mesh[] = [];
  p.batchedMeshGroup.updateMatrixWorld(true);
  p.batchedMeshGroup.traverseVisible((o: THREE.Object3D) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
  const bh = p.getBlockHeight();
  const cell = (t: number, d: number) => p.getTileByIndex(t).center.clone().normalize().multiplyScalar(p.depthToRadius(d) - bh / 2);
  const rc = new THREE.Raycaster();
  const hit = (from: THREE.Vector3, to: THREE.Vector3) => {
    rc.set(from, to.clone().sub(from).normalize()); rc.far = from.distanceTo(to);
    return rc.intersectObjects(meshes, false).length > 0;
  };
  const out: string[] = [];
  for (const t of tiles) {
    for (let d = 1; d < p.getMaxDepth() - 1; d++) {
      const b = p.getBlock(t, d);
      if (b === AIR || b === WATER) continue;
      if (p.getBlock(t, d + 1) === AIR && !hit(cell(t, d + 1), cell(t, d))) out.push(`top ${t}@${d}`);
      for (const n of p.getTileByIndex(t).neighbors) {
        if (p.getBlock(n, d) === AIR && !hit(cell(n, d), cell(t, d))) out.push(`side ${t}@${d} from ${n}`);
      }
    }
  }
  return out;
}

const around = (p: P, t: number) => { const s = new Set<number>([t]); for (const n of p.getTileByIndex(t).neighbors) { s.add(n); for (const m of p.getTileByIndex(n).neighbors) s.add(m); } return s; };
const pentagon = (p: P) => p.polyhedron.tiles.find((t: { vertices: unknown[] }) => t.vertices.length === 5).index as number;
const hexagon = (p: P) => p.polyhedron.tiles.find((t: { vertices: unknown[] }) => t.vertices.length === 6).index as number;

// Dig two blocks down at t, the way the frame loop does: setBlock, then the
// planet's update rebuilds the dirty chunks
function dig(p: P, t: number) {
  p.currentPlayerTileIndex = t;
  for (const d of [SURFACE, SURFACE - 1]) p.setBlock(t, d, AIR);
  p.rebuildDirtyColumns();
}

// ---- the flat build on its own, and the dig rebuild on its own
{
  const p = makePlanet();
  p.startWorkerBuild();
  p.handleWorkerResult(runWorker(p.takePosted()));
  const t = hexagon(p);
  ok(holes(p, around(p, t)).length === 0, 'flat (worker) build: every face of untouched ground drawn');
  dig(p, t);
  ok(p.hasTransitionedToChunkMeshes, 'a dig switches to per-chunk meshes');
  const h = holes(p, around(p, t));
  ok(h.length === 0, `dig rebuild (hexagon): every face round the hole drawn ${h.slice(0, 3).join(', ')}`);
  const q = pentagon(p);
  dig(p, q);
  const hq = holes(p, around(p, q));
  ok(hq.length === 0, `dig rebuild (pentagon): every face round the hole drawn ${hq.slice(0, 3).join(', ')}`);
}

// ---- the bug: a flat build in flight when the block breaks
{
  const p = makePlanet();
  p.startWorkerBuild();                 // snapshot posted
  const snapshot = p.takePosted();
  const t = hexagon(p);
  dig(p, t);                            // dig + per-chunk rebuild before it returns
  ok(holes(p, around(p, t)).length === 0, 'in-flight flat build: the dig rebuild itself is whole');
  p.handleWorkerResult(runWorker(snapshot)); // the older snapshot lands
  const h = holes(p, around(p, t));
  ok(h.length === 0, `in-flight flat build: its older snapshot does not undo the dig (${h.length} missing faces${h.length ? ': ' + h.slice(0, 3).join(', ') : ''})`);
  ok(!p.isWorkerBuildActive, 'the dropped build no longer counts as in flight');
  // and the next dig still rebuilds in place
  const n = p.getTileByIndex(t).neighbors[0];
  dig(p, n);
  const h2 = holes(p, new Set([...around(p, t), ...around(p, n)]));
  ok(h2.length === 0, `a second dig after it: every face drawn ${h2.slice(0, 3).join(', ')}`);
  // only one copy of the terrain: no flat meshes left beside the chunk groups
  const flat = p.batchedMeshGroup.children.filter((c: THREE.Object3D) => (c as THREE.Mesh).isMesh).length;
  ok(flat === 0, `no stale flat meshes drawn beside the chunk meshes (${flat})`);
}

// ---- a flat build result that lands before the frame's rebuild still ends whole
{
  const p = makePlanet();
  p.startWorkerBuild();
  const snapshot = p.takePosted();
  const t = hexagon(p);
  p.currentPlayerTileIndex = t;
  for (const d of [SURFACE, SURFACE - 1]) p.setBlock(t, d, AIR);
  p.handleWorkerResult(runWorker(snapshot)); // lands between the edit and the update
  p.rebuildDirtyColumns();                   // the update
  const h = holes(p, around(p, t));
  ok(h.length === 0, `flat result between the edit and the rebuild: every face drawn ${h.slice(0, 3).join(', ')}`);
}
