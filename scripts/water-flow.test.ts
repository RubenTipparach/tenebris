// Water flow and shape (openspec water-flow): the liquid rule
// (src/water/Liquid.ts, Luanti's transform on hex columns) on small hex
// fixtures, and the corner-height mesher (src/water/LiquidMesh.ts).
//
// Run: npx tsx scripts/water-flow.test.ts
import { Liquid, LiquidWorld, FLOW_BIT, FALLING_BIT, LEVEL_MASK, CELL_SOURCE, CELL_AIR } from '../src/water/Liquid';
import { cellReader, cornerLevel, cornerLevels, meshLiquidColumn, sideFloor, WaterTarget, FACE_CAP, FACE_FALL, FACE_STILL } from '../src/water/LiquidMesh';
import { flowTile } from '../src/water/FlowTile';
import { buildChunkGeometryImmediate } from '../src/planet/ChunkGeometryBuilder';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
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
  meshLiquidColumn(P.column(edgeT), 4, read, dims, () => out);
  const radii = [];
  for (let i = 0; i < out.positions.length; i += 3) radii.push(Math.hypot(out.positions[i], out.positions[i + 1], out.positions[i + 2]));
  const floor = P.R - 1;   // depth 1: top = radius - (maxDepth-1-1) = R, floor one block under
  ok(out.positions.length > 0 && radii.every(r => r >= floor - 1e-6 && r <= floor + 0.9 + 1e-6), '7. a flowing edge cell is meshed within its cell, under the sheet');
  const sidesOverAir = P.column(edgeT).edges.filter(n => n >= 0 && read(n, 1) === CELL_AIR).length;
  ok(out.positions.length / 3 === 18 + 6 * sidesOverAir, `7. top + one side per air neighbour (${sidesOverAir})`);
  const out2: WaterTarget = { positions: [], normals: [], uvs: [], colors: [], skyLight: [], torchLight: [], indices: [], vertexOffset: 0 };
  meshLiquidColumn(P.column(P.id(2, 0)), 4, read, dims, () => out2);
  ok(out2.positions.length / 3 === 18, '7. a cell surrounded by water has no sides');
}

// ---- 9. faces wind outward (the depth pre-pass draws water's far side by winding) ----
{
  const P = patch(4, 4, () => 1);
  P.place(0, 0, 2, HexBlockType.WATER);    // a source on a ledge: top, six sides, a bottom
  const read = cellReader(t => P.blocks[t], (t, d) => P.liquid.flowAt(t, d));
  const out: WaterTarget = { positions: [], normals: [], uvs: [], colors: [], skyLight: [], torchLight: [], indices: [], vertexOffset: 0 };
  const col = P.column(P.id(0, 0));
  meshLiquidColumn(col, 4, read, { radius: P.R + 2, maxDepth: 4, blockHeight: 1, waterSurfaceOffset: 0.1 }, () => out);
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

// ---- 10. the flow texture's data: face kinds and flow vectors (PBD water-look.js) ----
{
  const newOut = (): WaterTarget => ({ positions: [], normals: [], uvs: [], colors: [], skyLight: [], torchLight: [], indices: [], vertexOffset: 0 });
  /** Each vertex's liquidFlow as [x, y, z, kind], and its position. */
  const faces = (out: WaterTarget) => {
    const lf = out.liquidFlow ?? [];
    const vs: Array<{ f: number[]; kind: number; p: number[] }> = [];
    for (let i = 0; i < out.positions.length / 3; i++) {
      vs.push({ f: lf.slice(4 * i, 4 * i + 3), kind: lf[4 * i + 3] % 3, p: out.positions.slice(3 * i, 3 * i + 3) });
    }
    return vs;
  };
  const P = patch(10, 4, () => 1);
  P.place(0, 0, 1, HexBlockType.WATER);
  P.settle();
  const read = cellReader(t => P.blocks[t], (t, d) => P.liquid.flowAt(t, d));
  const dims = { radius: P.R + 2, maxDepth: 4, blockHeight: 1, waterSurfaceOffset: 0.1 };
  const mesh = (t: number) => { const out = newOut(); meshLiquidColumn(P.column(t), 4, read, dims, () => out); return out; };

  const src = mesh(P.id(0, 0));
  ok((src.liquidFlow ?? []).length === src.positions.length / 3 * 4, '10. every vertex carries liquidFlow');
  ok(faces(src).every(v => v.kind === FACE_CAP && Math.hypot(v.f[0], v.f[1], v.f[2]) === 0), '10. a source cap has zero flow (the sea stands still)');

  // a cap on the slope east of the source: its flow points downhill, away from the source
  const t = P.id(3, 0);
  const caps = faces(mesh(t)).filter(v => v.kind === FACE_CAP);
  const c0 = P.column(P.id(0, 0)).center, c3 = P.column(t).center;
  const away = [c3.x - c0.x, c3.y - c0.y, c3.z - c0.z];
  const f = caps[0].f, sp = Math.hypot(f[0], f[1], f[2]);
  const cosAway = (f[0] * away[0] + f[1] * away[1] + f[2] * away[2]) / (sp * Math.hypot(away[0], away[1], away[2]));
  ok(caps.length === 18 && sp >= WaterConfig.FLOW_MIN_SPEED && sp <= WaterConfig.FLOW_MAX_SPEED, `10. a sloped cap has a flow (speed ${sp.toFixed(2)})`);
  ok(cosAway > 0.5, `10. it points downhill, away from the source, within a hex side (cos ${cosAway.toFixed(2)})`);
  const up = [c3.x, c3.y, c3.z].map(x => x / P.R);
  ok(Math.abs(f[0] * up[0] + f[1] * up[1] + f[2] * up[2]) < 1e-6 * sp + 1e-9, '10. and lies in the tangent plane');
  ok(caps.every(v => v.f.every((x, k) => x === f[k])), '10. one flow vector for the whole cap');
  const sides = faces(mesh(P.id(8, 0))).filter(v => v.kind !== FACE_CAP);
  ok(sides.length > 0 && sides.every(v => v.kind === FACE_FALL), '10. a flowing cell\'s sides over air are falling faces');

  // a fall: the column beside the terrace (test 2's drop)
  const D = patch(6, 10, (q, r) => (q + r / 2 <= -1 ? 6 : 2));
  D.place(-3, 0, 6, HexBlockType.WATER);
  D.settle();
  const readD = cellReader(tt => D.blocks[tt], (tt, d) => D.liquid.flowAt(tt, d));
  const outD = newOut();
  meshLiquidColumn(D.column(D.id(0, 0)), 10, readD, { radius: D.R + 2, maxDepth: 10, blockHeight: 1, waterSurfaceOffset: 0.1 }, () => outD);
  const fall = faces(outD).filter(v => v.kind === FACE_FALL);
  ok(fall.length > 0, `10. the fall's sides are marked falling (${fall.length / 6} faces)`);
  ok(fall.every(v => Math.abs(Math.hypot(v.f[0], v.f[1], v.f[2]) - 1) < 1e-6), '10. a side carries its unit along-face direction');

  // a source on a ledge: its sides are still walls
  const L = patch(4, 4, () => 1);
  L.place(0, 0, 2, HexBlockType.WATER);
  const outL = newOut();
  meshLiquidColumn(L.column(L.id(0, 0)), 4, cellReader(tt => L.blocks[tt], (tt, d) => L.liquid.flowAt(tt, d)), dims, () => outL);
  const kinds = new Set(faces(outL).map(v => v.kind));
  ok(kinds.has(FACE_STILL) && !kinds.has(FACE_FALL), '10. a source\'s sides are still walls');
}

// ---- 11. the flow tile is water.png, its tones PBD's TEX_IDX ----
{
  const png = readFileSync(new URL('../public/textures/water.png', import.meta.url));
  let i = 8, w = 0, h = 0, plte: number[] = [], idat: Buffer[] = [];
  while (i < png.length) {
    const len = png.readUInt32BE(i), type = png.toString('ascii', i + 4, i + 8), d = png.subarray(i + 8, i + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); }
    if (type === 'PLTE') plte = [...d];
    if (type === 'IDAT') idat.push(d);
    i += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const rgba: number[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = raw[y * (w + 1) + 1 + x]; rgba.push(plte[3 * k], plte[3 * k + 1], plte[3 * k + 2], 255); }
  const tile = flowTile(rgba, w, h);
  const TEX_IDX = '0000011000111100100000000000000000010121000000001000000000001012001000000100000000001001000000000000000000110010010000000000000000000101201000001000000000000122000000000000000010112221010001000000000000000000001000000002100020001001100000010000000000000000';
  let same = w === 16 && h === 16;
  for (let y = 0; y < 16 && same; y++) for (let x = 0; x < 16; x++) {
    if (tile.data[((15 - y) * 16 + x) * 4 + 3] !== +TEX_IDX[y * 16 + x] * 127) { same = false; break; }
  }
  ok(same, '11. water.png ranked by luminance gives PBD\'s TEX_IDX tones (flipped so v runs up)');
  ok(tile.mean.every(c => c > 0 && c < 1), '11. the tile has a mean colour to fade to');
}

// ---- 12. a waterfall meets the water under and beside it with no slit (sideFloor) ----
{
  const newOut = (): WaterTarget => ({ positions: [], normals: [], uvs: [], colors: [], skyLight: [], torchLight: [], indices: [], vertexOffset: 0 });
  const W = { CELL_AIR, CELL_SOURCE };
  const FL = FLOW_BIT | 3;
  // the rule
  ok(sideFloor(W.CELL_AIR, W.CELL_AIR, false, 0, 0.9) === 0 && sideFloor(W.CELL_AIR, W.CELL_AIR, true, 0, 0.9) === 0, '12. over air: the whole side, from the floor');
  ok(sideFloor(FL, W.CELL_AIR, true, 0, 0.9) === 0.9 && sideFloor(W.CELL_SOURCE, W.CELL_AIR, true, 0, 0.9) === 0.9, '12. a full cell beside lower water: the strip from the sheet');
  ok(sideFloor(FL, W.CELL_AIR, false, 0, 0.9) === null && sideFloor(W.CELL_SOURCE, W.CELL_AIR, false, 0, 0.9) === null, '12. water beside water at its own level: no face (no z-fight)');
  ok(sideFloor(W.CELL_SOURCE, W.CELL_SOURCE, true, 0, 0.9) === null && sideFloor(FL, FL, true, 0, 0.9) === null, '12. two full cells side by side: no face');

  // a fall into a sea, cells set by hand: sources on depth 1, a source at depth 4 over
  // (0,0) pouring down through depths 2..3 (falling, flowing) into the sea
  const P = patch(4, 6, () => 1);
  for (const [q, r] of P.qr) P.blocks[P.id(q, r)][1] = HexBlockType.WATER;
  P.blocks[P.id(0, 0)][4] = HexBlockType.WATER;
  const falling = (t: number, d: number) => (t === P.id(0, 0) && (d === 2 || d === 3) ? FLOW_BIT | FALLING_BIT | 7 : 0);
  const read = cellReader(t => P.blocks[t], falling);
  const dims = { radius: P.R + 2, maxDepth: 6, blockHeight: 1, waterSurfaceOffset: 0.1 };
  // topR(d) = R + 2 - (5 - d)
  const top1 = P.R - 2, sheet1 = top1 - 0.1;
  const out = newOut();
  meshLiquidColumn(P.column(P.id(0, 0)), 6, read, dims, () => out);
  const radius = (i: number) => Math.hypot(out.positions[3 * i], out.positions[3 * i + 1], out.positions[3 * i + 2]);
  const kinds = out.liquidFlow ?? [];
  const sideTris: number[][] = [];
  for (let i = 0; i < out.positions.length / 3; i += 3) if (kinds[4 * i + 3] % 3 !== FACE_CAP) sideTris.push([radius(i), radius(i + 1), radius(i + 2)]);
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
  const strips = sideTris.filter(t => t.every(r => near(r, sheet1) || near(r, top1)));
  ok(strips.length === 12, `12. the sea cell under the fall draws a strip on all six sides, sheet to top (${strips.length / 2} quads)`);
  const fallFoot = sideTris.filter(t => t.some(r => near(r, top1)) && t.every(r => r >= top1 - 1e-6));
  ok(fallFoot.length === 12, `12. and the fall's sides start at that same top, so they join (${fallFoot.length / 2} quads)`);
  // the sea round it: flat at the sheet, no faces between its cells
  const outN = newOut();
  meshLiquidColumn(P.column(P.id(2, 0)), 6, read, dims, () => outN);
  const rn = Array.from({ length: outN.positions.length / 3 }, (_, i) => Math.hypot(outN.positions[3 * i], outN.positions[3 * i + 1], outN.positions[3 * i + 2]));
  ok(rn.length === 18 && rn.every(r => r <= sheet1 + 1e-6), '12. the open sea is one flat cap at the sheet, no sides between its cells');

  // a fall down a cliff landing on ground: its foot cell beside the spreading water
  const D = patch(6, 10, (q, r) => (q + r / 2 <= -1 ? 6 : 2));
  D.place(-3, 0, 6, HexBlockType.WATER);
  D.settle();
  const readD = cellReader(tt => D.blocks[tt], (tt, d) => D.liquid.flowAt(tt, d));
  const foot = D.id(0, 0);
  const col = D.column(foot);
  const lower = col.edges.filter(nb => nb >= 0 && (readD(nb, 2) & FLOW_BIT) && !(readD(nb, 3) & FLOW_BIT) && readD(nb, 3) !== CELL_SOURCE).length;
  const outD = newOut();
  meshLiquidColumn(col, 10, readD, { radius: D.R + 2, maxDepth: 10, blockHeight: 1, waterSurfaceOffset: 0.1 }, () => outD);
  const top2 = D.R + 2 - 7, sheet2 = top2 - 0.1;
  let footStrips = 0;
  for (let i = 0; i < outD.positions.length / 3; i += 3) {
    const rs = [0, 1, 2].map(k => Math.hypot(outD.positions[3 * (i + k)], outD.positions[3 * (i + k) + 1], outD.positions[3 * (i + k) + 2]));
    if (rs.every(r => Math.abs(r - sheet2) < 1e-6 || Math.abs(r - top2) < 1e-6) && rs.some(r => Math.abs(r - sheet2) < 1e-6)) footStrips++;
  }
  ok(lower > 0 && footStrips === 2 * lower, `12. a cliff fall's foot draws the strip toward each lower neighbour (${footStrips / 2} of ${lower})`);
}

// ---- 13. water never changes the terrain mesh, so a water change remeshes only the water ----
// (Planet.updateLiquid -> rebuildChunkWater leaves a chunk's terrain alone)
{
  const P = patch(5, 10, (q, r) => (q + r / 2 <= -1 ? 6 : 2));
  const cols = P.qr.map((_, t) => {
    const c = P.column(t);
    return { tileIndex: t, tile: { index: t, vertices: c.vertices, center: c.center, neighbors: P.nbs[t] }, blocks: P.blocks[t] };
  });
  const config = (liquid: Liquid) => ({
    radius: P.R + 2, blockHeight: 1, seaLevel: 3, maxDepth: 10, deepThreshold: 1, waterSurfaceOffset: 0.1,
    sunDirection: { x: 0, y: 0, z: 1 }, uvScale: 1, liquid,
  });
  const meshOf = (liquid: Liquid) => {
    const out = buildChunkGeometryImmediate(cols, new Map(), config(liquid));
    const keys = Object.keys(out).filter(k => !k.startsWith('water')).sort();
    const terrain = JSON.stringify(keys.map(k => [k, out[k]?.positions, out[k]?.skyLight, out[k]?.blockLight]));
    return { terrain, water: out['waterData']?.positions.length ?? 0 };
  };
  const dry = meshOf(P.liquid);
  P.place(-3, 0, 6, HexBlockType.WATER);
  P.settle();
  const wet = meshOf(P.liquid);
  ok(dry.water === 0 && wet.water > 0, `13. the fall is meshed as water (${wet.water / 3} vertices)`);
  ok(dry.terrain === wet.terrain, '13. and the terrain buffers (faces, sky light, block light) are identical with or without it');
}
