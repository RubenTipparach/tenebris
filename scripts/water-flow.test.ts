// Water flow and shape (openspec water-flow): the liquid rule
// (src/water/Liquid.ts, Luanti's transform on hex columns) on small hex
// fixtures, and the corner-height mesher (src/water/LiquidMesh.ts).
//
// Run: npx tsx scripts/water-flow.test.ts
import { Liquid, LiquidWorld, FLOW_BIT, FALLING_BIT, LEVEL_MASK, CELL_SOURCE, CELL_AIR } from '../src/water/Liquid';
import { cellReader, cornerLevel, cornerLevels, meshLiquidColumn, WaterTarget, TWEEN_EASE, TWEEN_SWEEP, TWEEN_GONE } from '../src/water/LiquidMesh';
import { edgeNeighbors } from '../src/shared/voxelLight';
import { HexBlockType } from '../src/shared/blockTypes';
import { WaterConfig } from '../src/config/WaterConfig';

const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };

const DIRS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
const hexDist = (q: number, r: number) => Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
const RULES = { range: WaterConfig.RANGE, renew: WaterConfig.RENEW_SOURCES, dropBoost: WaterConfig.DROP_BOOST, maxCellsPerTick: WaterConfig.MAX_CELLS_PER_TICK };

/** A hex patch of radius N, H layers; ground(q, r) = solid layers from the bottom. */
function patch(N: number, H: number, ground: (q: number, r: number) => number) {
  const ids = new Map<string, number>();
  const qr: Array<[number, number]> = [];
  for (let q = -N; q <= N; q++) for (let r = -N; r <= N; r++) {
    if (hexDist(q, r) > N) continue;
    ids.set(q + ',' + r, qr.length);
    qr.push([q, r]);
  }
  const id = (q: number, r: number) => ids.get(q + ',' + r) ?? -1;
  const blocks = qr.map(([q, r]) => {
    const b = new Array(H).fill(HexBlockType.AIR);
    for (let d = 0; d < ground(q, r) && d < H; d++) b[d] = HexBlockType.STONE;
    return b;
  });
  const nbs = qr.map(([q, r]) => DIRS.map(([a, b]) => id(q + a, r + b)).filter(n => n >= 0));
  const changed: number[] = [];
  const world: LiquidWorld = {
    neighbors: t => nbs[t],
    height: t => blocks[t].length,
    block: (t, d) => blocks[t][d],
    setSource: (t, d) => { blocks[t][d] = HexBlockType.WATER; },
    cellChanged: (t, d) => { changed.push(t, d); },
  };
  const liquid = new Liquid(world, RULES);
  const place = (q: number, r: number, d: number, b: HexBlockType) => { blocks[id(q, r)][d] = b; liquid.touch(id(q, r), d); };
  const settle = (max = 200) => { let n = 0; while (liquid.pending > 0 && n < max) { liquid.tick(); n++; } return n; };
  // Sphere-mapped geometry for the mesher: a big radius, so the patch is nearly flat
  const R = 1000, S = 1;
  const onSphere = (x: number, y: number) => { const l = Math.hypot(x, y, R); return { x: x / l * R, y: y / l * R, z: R / l * R }; };
  const centre = (q: number, r: number) => [S * Math.sqrt(3) * (q + r / 2), S * 1.5 * r];
  const verts = qr.map(([q, r]) => {
    const [cx, cy] = centre(q, r);
    return [0, 1, 2, 3, 4, 5].map(i => { const a = Math.PI / 180 * (60 * i - 30); return onSphere(cx + S * Math.cos(a), cy + S * Math.sin(a)); });
  });
  const centres = qr.map(([q, r]) => { const [cx, cy] = centre(q, r); return onSphere(cx, cy); });
  const column = (t: number) => ({ tileIndex: t, vertices: verts[t], center: centres[t], edges: edgeNeighbors(verts[t], nbs[t], n => verts[n]) });
  return { id, blocks, liquid, place, settle, changed, column, qr, nbs, R };
}

const flowOf = (b: number) => (b & FLOW_BIT) ? b & LEVEL_MASK : -1;

// ---- 1. a source on flat ground spreads RANGE cells, levels stepping down, then stops ----
{
  const P = patch(10, 4, () => 1);
  P.place(0, 0, 1, HexBlockType.WATER);
  const ticks = P.settle();
  ok(P.liquid.pending === 0, `1. the flow settles (${ticks} ticks)`);
  let stepped = true;
  for (let k = 1; k <= 9; k++) {
    const want = k <= RULES.range ? RULES.range - k : -1;
    for (const [q, r] of P.qr) if (hexDist(q, r) === k) {
      const got = flowOf(P.liquid.flowAt(P.id(q, r), 1));
      if (got !== want) { stepped = false; console.log(`   at ${q},${r} (ring ${k}) level ${got}, want ${want}`); }
    }
  }
  ok(stepped, '1. ring k holds level RANGE-k (7 next to the source ... 0 at the edge), dry beyond');
  ok(P.blocks[P.id(0, 0)][2] === HexBlockType.AIR && P.liquid.flowAt(P.id(0, 0), 2) === 0, '1. nothing climbs above the source');
}

// ---- 2. a drop: water runs off a ledge, falls, and spreads on the ground below ----
{
  // the west half is a terrace 6 high, the east half ground 2 high
  const P = patch(6, 10, (q, r) => (q + r / 2 <= -1 ? 6 : 2));
  P.place(-3, 0, 6, HexBlockType.WATER);
  P.settle();
  const lipQ = -1;   // the first ground cell east of the terrace on row r=0 is q=0; the column q=0 is the fall
  let falling = 0, bottom = 0;
  for (let d = 2; d < 6; d++) {
    const b = P.liquid.flowAt(P.id(0, 0), d);
    if (b & FALLING_BIT) falling++;
  }
  for (const [q, r] of P.qr) if (q + r / 2 > 0.5 && P.liquid.flowAt(P.id(q, r), 2) & FLOW_BIT) bottom++;
  ok(falling >= 3, `2. water falls down the drop beside the ledge (${falling} falling cells at q=0)`);
  ok(bottom >= 6, `2. and spreads over the ground below (${bottom} wet ground cells)`);
  void lipQ;
}

// ---- 3. removing the source drains everything ----
{
  const P = patch(8, 4, () => 1);
  P.place(0, 0, 1, HexBlockType.WATER);
  P.settle();
  const wet = () => P.qr.reduce((n, [q, r]) => n + (P.liquid.flowAt(P.id(q, r), 1) ? 1 : 0), 0);
  const before = wet();
  P.place(0, 0, 1, HexBlockType.AIR);
  P.settle(400);
  ok(before > 30 && wet() === 0, `3. the source scooped: ${before} flowing cells drain to ${wet()}`);
}

// ---- 4. three sources renew a cell; two do not ----
{
  const P = patch(4, 4, () => 1);
  // (0,0) has neighbours (1,0) and (0,1), which touch each other; and the cell above
  P.place(1, 0, 1, HexBlockType.WATER);
  P.place(0, 1, 1, HexBlockType.WATER);
  P.settle();
  ok(P.blocks[P.id(0, 0)][1] === HexBlockType.AIR && flowOf(P.liquid.flowAt(P.id(0, 0), 1)) === 7, '4. two source neighbours: a flowing cell at level 7, not a source');
  P.place(-1, 1, 1, HexBlockType.WATER);   // a third side neighbour of (0,0)
  P.settle();
  ok(P.blocks[P.id(0, 0)][1] === HexBlockType.WATER, '4. three source neighbours renew the cell into a source');
}

// ---- 5. the same edits give the same water (MP clients derive the same flows) ----
{
  const run = () => {
    const P = patch(7, 8, (q, r) => 1 + ((q * 7 + r * 13) & 3));
    P.place(0, 0, 5, HexBlockType.WATER);
    P.settle(5);
    P.place(2, -1, 4, HexBlockType.WATER);
    P.place(1, 0, 2, HexBlockType.AIR);
    P.settle();
    return P.qr.map((_, t) => Array.from({ length: 8 }, (_, d) => P.liquid.codeAt(t, d)).join(',')).join(';');
  };
  ok(run() === run(), '5. same edits, same result');
}

// ---- 6. the ocean stays at rest: sources with no edit near them are never queued ----
{
  const P = patch(6, 4, () => 1);
  for (const [q, r] of P.qr) P.blocks[P.id(q, r)][1] = HexBlockType.WATER;   // a sea, written like terrain gen (no touch)
  ok(P.liquid.pending === 0 && P.liquid.tick() === 0, '6. an untouched sea costs nothing per tick');
  P.place(3, 0, 1, HexBlockType.STONE);
  P.place(3, 0, 1, HexBlockType.AIR);    // dug back out beside the sea
  P.settle();
  ok(P.blocks[P.id(3, 0)][1] === HexBlockType.WATER, '6. a cell dug out beside the sea refills as sea (renewed)');
}

// ---- 7. corner heights (Luanti drawLiquidNode on hex) ----
{
  const src = { code: CELL_SOURCE, above: false }, air = { code: CELL_AIR, above: false };
  const f = (l: number) => ({ code: FLOW_BIT | l, above: false });
  ok(cornerLevel([f(3), src, air]) === 1, '7. a corner touching a source is full');
  ok(cornerLevel([f(3), air, air]) === WaterConfig.CORNER_DRY_LEVEL, '7. a corner with two air cells sits at the floor');
  ok(Math.abs(cornerLevel([f(7), f(5), null]) - (7.5 / 8 + 5.5 / 8) / 2) < 1e-9, '7. else the mean of the flowing levels');
  ok(cornerLevel([f(2), { code: CELL_AIR, above: true }, air]) === 1, '7. water on a neighbour fills the corner');

  const P = patch(10, 4, () => 1);
  P.place(0, 0, 1, HexBlockType.WATER);
  P.settle();
  const read = cellReader(t => P.blocks[t], (t, d) => P.liquid.flowAt(t, d));
  const lvSrc = cornerLevels(P.column(P.id(0, 0)), 1, read);
  ok(lvSrc.every(l => l === 1), '7. a source is flat at the sheet');
  const lv = cornerLevels(P.column(P.id(3, 0)), 1, read);
  const hi = Math.max(...lv), lo = Math.min(...lv);
  ok(hi > lo + 0.05, `7. a flowing cell's top slopes (${lo.toFixed(2)}..${hi.toFixed(2)})`);

  // mesh it: top corners at the levels, sides only over air
  const out: WaterTarget = { positions: [], normals: [], uvs: [], colors: [], skyLight: [], torchLight: [], indices: [], vertexOffset: 0 };
  const dims = { radius: P.R + 2, maxDepth: 4, blockHeight: 1, waterSurfaceOffset: 0.1 };
  const edgeT = P.id(8, 0);
  meshLiquidColumn(P.column(edgeT), 4, read, null, 0, dims, () => out);
  const radii = [];
  for (let i = 0; i < out.positions.length; i += 3) radii.push(Math.hypot(out.positions[i], out.positions[i + 1], out.positions[i + 2]));
  const floor = P.R - 1;   // depth 1: top = radius - (maxDepth-1-1) = R, floor one block under
  ok(out.positions.length > 0 && radii.every(r => r >= floor - 1e-6 && r <= floor + 0.9 + 1e-6), '7. a flowing edge cell is meshed within its cell, under the sheet');
  const sidesOverAir = P.column(edgeT).edges.filter(n => n >= 0 && read(n, 1) === CELL_AIR).length;
  ok(out.positions.length / 3 === 18 + 6 * sidesOverAir, `7. top + one side per air neighbour (${sidesOverAir})`);
  const out2: WaterTarget = { positions: [], normals: [], uvs: [], colors: [], skyLight: [], torchLight: [], indices: [], vertexOffset: 0 };
  meshLiquidColumn(P.column(P.id(2, 0)), 4, read, null, 0, dims, () => out2);
  ok(out2.positions.length / 3 === 18, '7. a cell surrounded by water has no sides');
}

// ---- 8. smoothing: the last tick's cells give each vertex where it was ----
{
  const P = patch(6, 4, () => 1);
  P.place(0, 0, 1, HexBlockType.WATER);
  P.liquid.tick();                       // ring 1 appears
  const read = cellReader(t => P.blocks[t], (t, d) => P.liquid.flowAt(t, d));
  const dims = { radius: P.R + 2, maxDepth: 4, blockHeight: 1, waterSurfaceOffset: 0.1 };
  const modes = (t: number) => {
    const out: WaterTarget = { positions: [], normals: [], uvs: [], colors: [], skyLight: [], torchLight: [], indices: [], vertexOffset: 0 };
    meshLiquidColumn(P.column(t), 4, read, (tt, d) => P.liquid.prevAt(tt, d), P.liquid.tickStamp, dims, () => out);
    const m = new Set<number>();
    for (let i = 3; i < (out.liquidPrev ?? []).length; i += 4) m.add(out.liquidPrev![i] % 4);
    return m;
  };
  ok(modes(P.id(1, 0)).has(TWEEN_SWEEP), '8. S2: a newly wet cell sweeps in');
  ok(modes(P.id(0, 0)).has(TWEEN_EASE), '8. S1: a cell wet both ticks eases');
  P.place(0, 0, 1, HexBlockType.AIR);
  P.liquid.tick();
  ok(modes(P.id(1, 0)).has(TWEEN_EASE) || modes(P.id(1, 0)).has(TWEEN_GONE), '8. the drained source\'s ring keeps easing / drains');
  P.liquid.tick(); P.liquid.tick();
  let gone = false;
  for (const [q, r] of P.qr) if (modes(P.id(q, r)).has(TWEEN_GONE)) gone = true;
  ok(gone, '8. S4: a dried cell is drawn one more tick, shrinking away');
}

// ---- 9. faces wind outward (the depth pre-pass draws water's far side by winding) ----
{
  const P = patch(4, 4, () => 1);
  P.place(0, 0, 2, HexBlockType.WATER);    // a source on a ledge: top, six sides, a bottom
  const read = cellReader(t => P.blocks[t], (t, d) => P.liquid.flowAt(t, d));
  const out: WaterTarget = { positions: [], normals: [], uvs: [], colors: [], skyLight: [], torchLight: [], indices: [], vertexOffset: 0 };
  const col = P.column(P.id(0, 0));
  meshLiquidColumn(col, 4, read, null, 0, { radius: P.R + 2, maxDepth: 4, blockHeight: 1, waterSurfaceOffset: 0.1 }, () => out);
  const c = [col.center.x, col.center.y, col.center.z];
  const cl = Math.hypot(c[0], c[1], c[2]);
  let outward = 0, tris = 0;
  for (let i = 0; i < out.positions.length; i += 9) {
    const v = [0, 1, 2].map(k => out.positions.slice(i + 3 * k, i + 3 * k + 3));
    const e1 = v[1].map((x, k) => x - v[0][k]), e2 = v[2].map((x, k) => x - v[0][k]);
    const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const m = v.reduce((a, p) => a.map((x, k) => x + p[k] / 3), [0, 0, 0]);
    // the triangle's centroid relative to the cell's middle
    const mid = c.map(x => x / cl * (P.R + 0.45));   // depth 2: floor R, sheet R + 0.9
    const rel = m.map((x, k) => x - mid[k]);
    if (n[0] * rel[0] + n[1] * rel[1] + n[2] * rel[2] > 0) outward++;
    tris++;
  }
  ok(tris === 6 + 12 + 6 && outward === tris, `9. every face of a lone cell winds outward (${outward}/${tris})`);
}
