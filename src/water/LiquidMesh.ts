// The shape of water (openspec water-flow): every water cell of a column as
// triangles for the water material, one copy for all three column meshers
// (the main-thread chunk builder, the geometry worker and Planet's fallback).
//
// Luanti's drawLiquidNode on the hex columns, as Pale Blue Dot draws it
// (waterfall.js cellPieces / water_flow.rs liquid_mesh):
//   - a flowing cell's top is sloped: each corner sits at the level of the
//     cells sharing it (full where any is a source or has water on it, at the
//     floor where two or more are air, else the mean of the flowing levels);
//   - sides are drawn over air (a solid, or another wet cell, has none);
//   - a cell with water on it has no top and full-height sides, so a fall
//     reads as one column; beside water that is not full it draws the strip
//     from that water's sheet up to its top (sideFloor), so a fall meets the
//     pool it lands in with no slit;
//   - sources (the ocean, a placed bucket) are flat at the sheet height, as
//     they always were.
// And the smoothing between two ticks (PBD's Pour tab): each vertex carries
// where it was last tick (liquidPrev.xyz) and how to get here (liquidPrev.w),
// and water.vert eases it on the tick clock:
//   S1 the same cell both ticks: its levels ease (smoothstep);
//   S2 a newly wet cell starts as a thin sheet on the side its water came
//      from and its front sweeps across (no fade in place);
//   S3 a newly wet cell under water grows down from the water above;
//   S4 a dried cell is drawn one more tick, shrinking toward where it drained,
//      then hidden.
// And the flow texture (PBD water-look.js, Tenebris C's water_fs): each vertex
// carries liquidFlow - xyz a direction, w its face code (FACE_* + 3 x the
// axis a cap's tile is projected along). A cap's xyz is its flow (the corner
// levels' least-squares slope, downhill, length = speed; zero on a flat cap,
// so sources and the sea stand still); a side's is the unit direction along
// its bottom edge. water.vert pans the tile along a cap's flow and stands it
// up on a side, a flowing side panning down.
// Pure (no THREE) so the geometry worker runs it.

import { HexBlockType, isClearSolid } from '../shared/blockTypes';
import { Vec3 } from '../shared/vec3';
import { WaterConfig } from '../config/WaterConfig';
import {
  CELL_AIR, CELL_CLEAR, CELL_SOLID, CELL_SOURCE, CELL_UNKNOWN, cellKey,
  isFlowCode, isWetCode, levelOf, LIQUID_LEVEL_MAX,
} from './Liquid';

/** A cell as the mesher reads it: CELL_* or a flowing cell's byte. */
export type CellReader = (tile: number, depth: number) => number;

/** The cell code of a block (and the flowing byte the liquid holds there). */
export function cellCode(block: number | undefined, flowByte: number): number {
  if (block === undefined) return CELL_UNKNOWN;
  if (block === HexBlockType.WATER) return CELL_SOURCE;
  if (block === HexBlockType.AIR) return flowByte !== 0 ? flowByte : CELL_AIR;
  return isClearSolid(block) ? CELL_CLEAR : CELL_SOLID;
}

/** Column geometry the cell radii come from. */
export interface LiquidDims {
  radius: number;
  maxDepth: number;
  blockHeight: number;
  waterSurfaceOffset: number;
}

/** The water buffer (the shape every column mesher's GeometryData has). */
export interface WaterTarget {
  positions: number[];
  normals: number[];
  uvs: number[];
  colors: number[];
  skyLight: number[];
  torchLight: number[];
  indices: number[];
  vertexOffset: number;
  /** Per vertex: where it was last tick (xyz) and its smoothing mode + 4 x tick stamp (w). */
  liquidPrev?: number[];
  /** Per vertex: the flow texture's direction (xyz) and face code (w) - see FACE_*. */
  liquidFlow?: number[];
}

/** One column to mesh: its tile outline and the neighbour across each edge (edge i joins vertex i and i+1). */
export interface LiquidColumn {
  tileIndex: number;
  vertices: Vec3[];
  center: Vec3;
  edges: number[];
}

/** How a vertex moves between ticks (liquidPrev.w mod 4; water.vert reads it). */
export const TWEEN_STATIC = 0;
export const TWEEN_EASE = 1;
export const TWEEN_SWEEP = 2;
export const TWEEN_GONE = 3;

/** A face's kind for the flow texture (liquidFlow.w mod 3; water.vert reads it). */
export const FACE_CAP = 0;     // a top or a bottom: the tile pans along its flow
export const FACE_FALL = 1;    // a flowing cell's side: the tile stands, panning down, with froth
export const FACE_STILL = 2;   // a source's side: the tile stands still

type V = [number, number, number];
/** f: the face's liquidFlow (direction xyz, face code w), the same on all its vertices. */
interface Piece { id: string; v: V[]; alt: V[]; n: V[]; uv: number[]; f: [number, number, number, number]; }

const norm = (a: V): V => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const scale = (a: V, s: number): V => [a[0] * s, a[1] * s, a[2] * s];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V, b: V): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: V): number => Math.hypot(a[0], a[1], a[2]);

interface CornerCell { code: number; above: boolean; }

/**
 * A corner's level (0..1 of the cell's water height) from the cells round it
 * (PBD water_flow.rs corner_level): full where any is a source or has water
 * on it; near the floor where two or more are air; else the mean of the
 * flowing levels; mid-height where none flows (all solid).
 */
export function cornerLevel(cells: Array<CornerCell | null>): number {
  let sum = 0, count = 0, air = 0;
  for (const c of cells) {
    if (!c) continue;
    if (c.above || c.code === CELL_SOURCE) return 1;
    if (isFlowCode(c.code)) { sum += (levelOf(c.code) + 0.5) / (LIQUID_LEVEL_MAX + 1); count++; }
    else if (c.code === CELL_AIR) air++;
  }
  return air >= 2 ? WaterConfig.CORNER_DRY_LEVEL : count > 0 ? sum / count : WaterConfig.CORNER_ENCLOSED_LEVEL;
}

/** The six (five) corner levels of a wet cell's top, as the mesher draws them. */
export function cornerLevels(col: LiquidColumn, depth: number, view: CellReader): number[] {
  const t = col.tileIndex;
  const n = col.vertices.length;
  if (isWetCode(view(t, depth + 1))) return new Array(n).fill(1);
  const me: CornerCell = { code: view(t, depth), above: false };
  const sides = col.edges.map(nb => {
    if (nb < 0) return null;
    const code = view(nb, depth);
    return code === CELL_UNKNOWN ? null : { code, above: isWetCode(view(nb, depth + 1)) };
  });
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(cornerLevel([me, sides[(i + n - 1) % n], sides[i]]));
  return out;
}

/**
 * A cap's flow from its corner heights (PBD liquidMesh: "Luanti turns the
 * flowing texture down the corner gradient"): the least-squares slope of the
 * corners over the cell's tangent plane, pointing downhill, its length the
 * speed (WaterConfig.FLOW_*); zero where the cap is (nearly) flat.
 * up: the cell's outward unit direction; offsets: each corner's tangent
 * offset from the cell centre (metres); heights: each corner's height (metres).
 */
export function capFlow(up: V, offsets: V[], heights: number[]): V {
  // a tangent basis at the cell
  const ref: V = Math.abs(up[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const e1 = norm(sub(ref, scale(up, dot(ref, up))));
  const e2 = cross(up, e1);
  const n = heights.length;
  const mean = heights.reduce((a, b) => a + b, 0) / n;
  let sxx = 0, sxy = 0, syy = 0, bx = 0, by = 0;
  for (let i = 0; i < n; i++) {
    const x = dot(offsets[i], e1), y = dot(offsets[i], e2), h = heights[i] - mean;
    sxx += x * x; sxy += x * y; syy += y * y; bx += h * x; by += h * y;
  }
  const det = sxx * syy - sxy * sxy;
  if (Math.abs(det) < 1e-12) return [0, 0, 0];
  const gx = (syy * bx - sxy * by) / det, gy = (sxx * by - sxy * bx) / det;
  const gl = Math.hypot(gx, gy);
  if (gl < WaterConfig.FLOW_MIN_SLOPE) return [0, 0, 0];
  const sp = Math.min(WaterConfig.FLOW_MAX_SPEED, WaterConfig.FLOW_MIN_SPEED + WaterConfig.FLOW_SLOPE_K * gl);
  const g = [e1[0] * gx + e2[0] * gy, e1[1] * gx + e2[1] * gy, e1[2] * gx + e2[2] * gy] as V;
  return scale(g, -sp / gl);
}

/** The axis (0 x, 1 y, 2 z) a cap's tile is projected along: the cell's outward direction's largest component. */
export function capAxis(up: V): number {
  const a = up.map(Math.abs);
  return a[0] >= a[1] && a[0] >= a[2] ? 0 : a[1] >= a[2] ? 1 : 2;
}

/**
 * Where a wet cell's side toward one neighbour starts (radius), or null for
 * no side. nb / nbAbove: the neighbour's cell and the one on it; wetAbove:
 * water is on this cell (a fall, or the pool cell a fall lands in), so the
 * cell is full to its top; sheet: the radius of a full level (a surface
 * offset under the top).
 *   - over air: the whole side, from the floor;
 *   - a full (wet-above) cell beside water that is NOT full: the neighbour's
 *     surface meets this cell's edge at the sheet (its shared corners are full,
 *     cornerLevel), a surface offset under this cell's top, where the water on
 *     this cell starts - so the strip from the sheet to the top is drawn, or a
 *     fall shows a slit at its foot and wherever it passes lower water;
 *   - else none: solid, clear, unknown, or water as full as this cell (two
 *     faces there would z-fight).
 */
export function sideFloor(nb: number, nbAbove: number, wetAbove: boolean, floor: number, sheet: number): number | null {
  if (nb === CELL_AIR) return floor;
  if (wetAbove && isWetCode(nb) && !isWetCode(nbAbove)) return sheet;
  return null;
}

class ColumnShape {
  readonly n: number;
  readonly dirs: V[];
  readonly cdir: V;
  readonly uvs: Array<[number, number]> = [];
  readonly axis: number;

  constructor(readonly col: LiquidColumn, readonly dims: LiquidDims) {
    this.n = col.vertices.length;
    this.dirs = col.vertices.map(v => norm([v.x, v.y, v.z]));
    this.cdir = norm([col.center.x, col.center.y, col.center.z]);
    this.axis = capAxis(this.cdir);
    // the tile UVs every hex top uses (createFaceGeometry)
    for (let i = 0; i < this.n; i++) {
      const a = (i / this.n) * Math.PI * 2 - Math.PI / 2;
      this.uvs.push([0.5 + Math.cos(a) * 0.5, 0.5 + Math.sin(a) * 0.5]);
    }
  }

  topR(depth: number): number { return this.dims.radius - (this.dims.maxDepth - 1 - depth) * this.dims.blockHeight; }
  floorR(depth: number): number { return this.topR(depth) - this.dims.blockHeight; }
  /** The radius of a water level (0..1): 1 is the sheet, a surface offset under the cell's top. */
  levelR(depth: number, level: number): number {
    const f = this.floorR(depth);
    return f + level * (this.topR(depth) - this.dims.waterSurfaceOffset - f);
  }

  /** The pieces of one wet cell in one tick: 'top', 's<edge>' (a side over air), 'b' (a bottom over air). */
  pieces(view: CellReader, depth: number): Piece[] {
    const t = this.col.tileIndex, n = this.n, dirs = this.dirs;
    const above = view(t, depth + 1);
    const wetAbove = isWetCode(above);
    const lv = cornerLevels(this.col, depth, view);
    const floor = this.floorR(depth), top = this.topR(depth);
    const out: Piece[] = [];
    const capCode = FACE_CAP + 3 * this.axis;
    const sideCode = isFlowCode(view(t, depth)) ? FACE_FALL : FACE_STILL;

    // The top, unless water is on it or an opaque block caps it
    if (!wetAbove && above !== CELL_SOLID) {
      const mean = lv.reduce((a, b) => a + b, 0) / n;
      const flat = lv.every(l => l === lv[0]);
      const mid = scale(this.cdir, this.levelR(depth, mean));
      const v: V[] = [], nn: V[] = [], uv: number[] = [];
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const a = scale(dirs[i], this.levelR(depth, lv[i])), b = scale(dirs[j], this.levelR(depth, lv[j]));
        v.push(mid, a, b);
        let fn = this.cdir;
        if (!flat) {
          fn = norm(cross(sub(a, mid), sub(b, mid)));
          if (dot(fn, this.cdir) < 0) fn = scale(fn, -1);
        }
        nn.push(fn, fn, fn);
        uv.push(0.5, 0.5, this.uvs[i][0], this.uvs[i][1], this.uvs[j][0], this.uvs[j][1]);
      }
      let fl: V = [0, 0, 0];
      if (!flat) {
        const sheet = this.levelR(depth, 1);
        const offs = dirs.map(d => scale(sub(d, scale(this.cdir, dot(d, this.cdir))), sheet));
        fl = capFlow(this.cdir, offs, lv.map(l => this.levelR(depth, l)));
      }
      out.push({ id: 'top', v, alt: v.map(p => scale(norm(p), top)), n: nn, uv, f: [fl[0], fl[1], fl[2], capCode] });
    }

    // The sides: over air, floor to surface; and the seam strip (sideFloor)
    for (let s = 0; s < n; s++) {
      const nb = this.col.edges[s];
      if (nb < 0) continue;
      const bottom = sideFloor(view(nb, depth), view(nb, depth + 1), wetAbove, floor, this.levelR(depth, 1));
      if (bottom === null) continue;
      const z = (s + 1) % n;
      const ta = wetAbove ? top : this.levelR(depth, lv[s]);
      const tz = wetAbove ? top : this.levelR(depth, lv[z]);
      const A0 = scale(dirs[s], bottom), Z0 = scale(dirs[z], bottom), Z1 = scale(dirs[z], tz), A1 = scale(dirs[s], ta);
      const sn = norm(cross(sub(Z0, A0), sub(A1, A0)));
      const along = norm(sub(Z0, A0));
      out.push({
        id: 's' + s,
        v: [A0, Z0, Z1, A0, Z1, A1],
        alt: [A1, Z1, Z1, A1, Z1, A1],
        n: [sn, sn, sn, sn, sn, sn],
        uv: [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1],
        f: [along[0], along[1], along[2], sideCode],
      });
    }

    // The bottom, over air (a source on a ledge, the front of a fall for a tick)
    if (view(t, depth - 1) === CELL_AIR) {
      const mid = scale(this.cdir, floor), bn = scale(this.cdir, -1);
      const v: V[] = [], nn: V[] = [], uv: number[] = [];
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        v.push(mid, scale(dirs[j], floor), scale(dirs[i], floor));
        nn.push(bn, bn, bn);
        uv.push(0.5, 0.5, this.uvs[j][0], this.uvs[j][1], this.uvs[i][0], this.uvs[i][1]);
      }
      out.push({ id: 'b', v, alt: v, n: nn, uv, f: [0, 0, 0, capCode] });
    }
    return out;
  }

  /** The edge whose water is highest (a source counts above any level), or -1. */
  bestSide(view: CellReader, depth: number): number {
    let best = -1, bv = -1;
    for (let s = 0; s < this.n; s++) {
      const nb = this.col.edges[s];
      if (nb < 0) continue;
      const c = view(nb, depth);
      const v = c === CELL_SOURCE ? LIQUID_LEVEL_MAX + 1 : isFlowCode(c) ? levelOf(c) : -1;
      if (v > bv) { bv = v; best = s; }
    }
    return best;
  }

  /**
   * Where a cell that appears starts, or one that dries ends: squashed to a
   * thin sheet against an edge, or pressed up to its top / down to its floor.
   */
  squasher(depth: number, how: { side: number } | { to: 'top' | 'floor' }): (p: V) => V {
    const floor = this.floorR(depth);
    if ('to' in how) {
      const r = how.to === 'top' ? this.topR(depth) : floor;
      return p => scale(norm(p), r);
    }
    const a = this.dirs[how.side], b = this.dirs[(how.side + 1) % this.n];
    const mid: V = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    const out = norm(sub(mid, scale(this.cdir, dot(mid, this.cdir))));   // tangent, toward that edge
    const sheet = WaterConfig.ARRIVE_SHEET;
    return p => {
      const r = len(p);
      const d = dot(sub(p, scale(mid, r)), out);    // <= 0 inside the cell
      const onEdge = sub(p, scale(out, d));
      return scale(norm(onEdge), floor + (r - floor) * sheet);
    };
  }
}

function emit(out: WaterTarget, piece: Piece, cur: V[], prev: V[], mode: number, stamp: number): void {
  const base = out.vertexOffset;
  const lp = (out.liquidPrev ??= []);
  const lf = (out.liquidFlow ??= []);
  const f = piece.f;
  const w = mode === TWEEN_STATIC ? 0 : mode + 4 * stamp;
  for (let j = 0; j < cur.length; j++) {
    const p = cur[j], q = prev[j], nn = piece.n[j];
    out.positions.push(p[0], p[1], p[2]);
    out.normals.push(nn[0], nn[1], nn[2]);
    out.uvs.push(piece.uv[j * 2], piece.uv[j * 2 + 1]);
    out.colors.push(1, 1, 1);
    out.skyLight.push(1);
    out.torchLight.push(0);
    lp.push(q[0], q[1], q[2], w);
    lf.push(f[0], f[1], f[2], f[3]);
    out.indices.push(base + j);
  }
  out.vertexOffset += cur.length;
}

/**
 * Mesh every water cell of one column into the water buffer. `prev` is the
 * cell as the last tick left it (undefined: unchanged); null draws this
 * tick's water at rest, with no smoothing (the worker paths). `target` is
 * asked for the water buffer only when the column has water.
 */
export function meshLiquidColumn(
  col: LiquidColumn,
  height: number,
  cur: CellReader,
  prev: ((tile: number, depth: number) => number | undefined) | null,
  tickStamp: number,
  dims: LiquidDims,
  target: () => WaterTarget,
): void {
  const t = col.tileIndex;
  let shape: ColumnShape | null = null;
  let out: WaterTarget = null!;
  const P: CellReader | null = prev ? (tt, d) => prev(tt, d) ?? cur(tt, d) : null;
  for (let depth = 0; depth < height; depth++) {
    const wc = isWetCode(cur(t, depth));
    const wp = P ? isWetCode(P(t, depth)) : wc;
    if (!wc && !wp) continue;
    if (!shape) { shape = new ColumnShape(col, dims); out = target(); }
    if (!P) {
      for (const c of shape.pieces(cur, depth)) emit(out, c, c.v, c.v, TWEEN_STATIC, tickStamp);
    } else if (wc && wp) {
      // S1: the same cell in both ticks; its levels ease
      const cp = shape.pieces(cur, depth);
      const byId = new Map(shape.pieces(P, depth).map(p => [p.id, p]));
      for (const c of cp) {
        const p = byId.get(c.id);
        if (p) { emit(out, c, c.v, p.v, TWEEN_EASE, tickStamp); byId.delete(c.id); }
        else emit(out, c, c.v, c.alt, TWEEN_SWEEP, tickStamp);        // new this tick: grows from its collapsed self
      }
      for (const p of byId.values()) emit(out, p, p.alt, p.v, TWEEN_GONE, tickStamp);   // gone this tick: collapses away
    } else if (wc) {
      // S2 / S3: newly wet
      let how: { side: number } | { to: 'top' | 'floor' };
      if (isWetCode(P(t, depth + 1))) how = { to: 'top' };            // S3: falls in from the water above
      else { const s = shape.bestSide(P, depth); how = s >= 0 ? { side: s } : { to: 'top' }; }
      const sq = shape.squasher(depth, how);
      for (const c of shape.pieces(cur, depth)) emit(out, c, c.v, c.v.map(sq), TWEEN_SWEEP, tickStamp);
    } else {
      // S4: dried; drawn one more tick, shrinking back toward where it drained
      let how: { side: number } | { to: 'top' | 'floor' };
      if (isWetCode(cur(t, depth - 1))) how = { to: 'floor' };        // a fall's tail drains into the water under it
      else { const s = shape.bestSide(cur, depth); how = s >= 0 ? { side: s } : { to: 'floor' }; }
      const sq = shape.squasher(depth, how);
      for (const p of shape.pieces(P, depth)) emit(out, p, p.v.map(sq), p.v, TWEEN_GONE, tickStamp);
    }
  }
}

/** A cell reader over block arrays and flowing bytes (every mesher builds one the same way). */
export function cellReader(
  blocksOf: (tile: number) => ArrayLike<number> | undefined,
  flowAt: (tile: number, depth: number) => number,
): CellReader {
  return (tile, depth) => {
    const blocks = blocksOf(tile);
    if (!blocks) return CELL_UNKNOWN;
    if (depth < 0) return CELL_SOLID;
    if (depth >= blocks.length) return CELL_AIR;
    return cellCode(blocks[depth], flowAt(tile, depth));
  };
}

/** Flowing bytes from [tile, depth, byte] triples (what the geometry worker is sent). */
export function flowLookup(triples: ArrayLike<number> | undefined): (tile: number, depth: number) => number {
  if (!triples || triples.length === 0) return () => 0;
  const m = new Map<number, number>();
  for (let i = 0; i + 2 < triples.length; i += 3) m.set(cellKey(triples[i], triples[i + 1]), triples[i + 2]);
  return (tile, depth) => m.get(cellKey(tile, depth)) ?? 0;
}
