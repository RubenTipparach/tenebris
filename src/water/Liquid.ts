// The liquid rule (openspec water-flow): how water moves through the hex
// columns. One copy, used by every planet through Planet.ts.
//
// A port of Luanti's ServerMap::transformLiquidsLocal and get_max_liquid_level
// (src/servermap.cpp at a10dc8dbff3b0af8295ae55df44f65b1d9ee92c7), adapted to
// the hex grid by Pale Blue Dot (water-flow/liquid.js) and ported here to
// Tenebris's columns.
//   Luanti: Copyright (C) 2010-2024 celeron55, Perttu Ahola <celeron55@gmail.com>
//   and contributors.
//   SPDX-License-Identifier: LGPL-2.1-or-later. This file is offered under the
//   same licence; the licence text is beside it as src/water/COPYING.LESSER.
//
// What changed for hex (as in PBD): eight neighbours (up, the six sides - five
// at a pentagon - and down) for Luanti's six; the renew threshold is a setting,
// 3 on hex; one liquid kind, so the liquid_kind bookkeeping falls away; a cell
// in a column that is not loaded is a neutral, not CONTENT_IGNORE. Viscosity is
// water's, 1, so it is left out.
//
// Tenebris storage (design.md "Storage"):
//   - a SOURCE is a HexBlockType.WATER block in column.blocks, as it always was
//     (the ocean, a placed bucket, an old save's water);
//   - a FLOWING cell is AIR in column.blocks plus a level byte held here, in a
//     per-column Uint8Array: 0x80 | (falling ? 0x08 : 0) | level 0..7. Flowing
//     water is derived state: it is never saved or synced, every client
//     re-creates it by ticking from the same sources and edits.
// Only cells an edit touched are ever queued, so the ocean (all sources, all
// at rest) costs nothing.

import { HexBlockType } from '../shared/blockTypes';

export const LIQUID_LEVEL_MAX = 7;
/** A flowing cell's byte: this bit set, FALLING if it flows down, the level in the low 3 bits. */
export const FLOW_BIT = 0x80;
export const FALLING_BIT = 0x08;
export const LEVEL_MASK = 0x07;

/**
 * A cell as the mesher and the smoothing read it: UNKNOWN (column not loaded),
 * AIR, SOLID, CLEAR (a see-through solid: glass, ice), SOURCE, or a flowing
 * cell's byte (>= FLOW_BIT).
 */
export const CELL_UNKNOWN = -1;
export const CELL_AIR = 0;
export const CELL_SOLID = 1;
export const CELL_CLEAR = 2;
export const CELL_SOURCE = 3;

export const isFlowCode = (c: number): boolean => c >= FLOW_BIT;
export const isWetCode = (c: number): boolean => c === CELL_SOURCE || c >= FLOW_BIT;
export const levelOf = (c: number): number => c & LEVEL_MASK;
export const isFallingCode = (c: number): boolean => c >= FLOW_BIT && (c & FALLING_BIT) !== 0;

// The rule's kinds
const AIR = 0, SOLID = 1, FLOW = 2, SRC = 3, NEUTRAL = -1;
const UPPER = 0, SAME = 1, LOWER = 2;

/** Settings of the rule (WaterConfig supplies the game's). */
export interface LiquidRules {
  range: number;
  renew: number;
  dropBoost: number;
  maxCellsPerTick: number;
}

/** The world the rule runs in: Planet's columns, or a test fixture. */
export interface LiquidWorld {
  /** The neighbouring columns in a fixed order, or undefined if this column is not loaded. */
  neighbors(tile: number): readonly number[] | undefined;
  /** Cells in the column (depth 0 = bedrock, height-1 = sky). */
  height(tile: number): number;
  /** The block at a cell; only called for loaded columns and depths in range. */
  block(tile: number, depth: number): number;
  /** A cell renewed into a source (Luanti's infinite water): write a WATER block (derived, not an edit). */
  setSource(tile: number, depth: number): void;
  /** A cell's water changed: its mesh (and its neighbours') need rebuilding. */
  cellChanged(tile: number, depth: number): void;
}

/** What the mesher reads: the flowing levels, and where this tick changed a cell, what it was before. */
export interface LiquidView {
  flowAt(tile: number, depth: number): number;
  prevAt(tile: number, depth: number): number | undefined;
  /** The tick the current state is (mod 256), stamped on smoothed vertices. */
  readonly tickStamp: number;
}

// A cell's key: depth fits in 12 bits (columns are far shorter), the tile index above it
const KEY_STRIDE = 4096;
export const cellKey = (tile: number, depth: number): number => tile * KEY_STRIDE + depth;
const keyOf = cellKey;

/** Luanti's get_max_liquid_level. */
export function maxLiquidLevel(nbLevel: number, nbDown: boolean, t: number, cur: number, dropBoost: number): number {
  let max = cur;
  if (t === UPPER) {
    if (nbLevel + dropBoost > cur) {
      max = LIQUID_LEVEL_MAX;
      if (nbLevel + dropBoost < LIQUID_LEVEL_MAX) max = nbLevel + dropBoost;
    } else if (nbLevel > cur) max = nbLevel;
  } else if (t === SAME) {
    if (!nbDown && nbLevel > 0 && nbLevel - 1 > max) max = nbLevel - 1;
  }
  return max;
}

export class Liquid implements LiquidView {
  private readonly flow = new Map<number, Uint8Array>();
  // Luanti's UniqueQueue: a cell already waiting is not pushed again
  private queue: number[] = [];
  private head = 0;
  private readonly waiting = new Set<number>();
  // what each cell this tick changed was before it (the smoothing's "previous tick")
  private readonly prev = new Map<number, number>();
  private ticks = 0;
  private accumulator = 0;

  constructor(private readonly world: LiquidWorld, private readonly rules: LiquidRules) {}

  get tickStamp(): number { return this.ticks & 255; }
  get tickCount(): number { return this.ticks; }
  get pending(): number { return this.queue.length - this.head; }

  /** The flowing byte at a cell (0 = no flowing water; sources are WATER blocks). */
  flowAt(tile: number, depth: number): number {
    const col = this.flow.get(tile);
    return col && depth >= 0 && depth < col.length ? col[depth] : 0;
  }

  /** The cell code before this tick changed it, or undefined if this tick left it alone. */
  prevAt(tile: number, depth: number): number | undefined {
    return this.prev.get(keyOf(tile, depth));
  }

  /** The cell code (CELL_* or a flow byte) at a cell, as the world has it now. */
  codeAt(tile: number, depth: number): number {
    const k = this.kind(tile, depth);
    if (k === NEUTRAL) return CELL_UNKNOWN;
    if (k === SRC) return CELL_SOURCE;
    if (k === FLOW) return this.flowAt(tile, depth);
    return k === AIR ? CELL_AIR : CELL_SOLID;
  }

  /**
   * An edit (a block placed or removed, a source placed or scooped, terrain
   * loaded with saved edits): the cell and its eight neighbours are queued.
   * A cell that is no longer air loses any flowing water it held.
   */
  touch(tile: number, depth: number): void {
    if (!this.world.neighbors(tile)) return;
    if (this.flowAt(tile, depth) !== 0 && this.world.block(tile, depth) !== HexBlockType.AIR) {
      this.flow.get(tile)![depth] = 0;
      this.world.cellChanged(tile, depth);
    }
    this.push(tile, depth);
    this.eachNeighbour(tile, depth, (t, d) => this.push(t, d));
  }

  /** Advance by dt seconds: one tick per tickSeconds, at most maxTicks this call. */
  update(dt: number, tickSeconds: number, maxTicks: number): void {
    this.accumulator += dt;
    let n = 0;
    while (this.accumulator >= tickSeconds && n < maxTicks) {
      this.accumulator -= tickSeconds;
      this.tick();
      n++;
    }
    if (this.accumulator >= tickSeconds) this.accumulator = 0;
  }

  /** How far through the current tick we are, 0..1 (the smoothing's clock). */
  tickFraction(tickSeconds: number): number {
    return Math.min(1, Math.max(0, this.accumulator / tickSeconds));
  }

  /** One tick: the queue as it stands, at most once (transformLiquids' rate limit). */
  tick(): number {
    this.ticks++;
    this.prev.clear();
    const n = Math.min(this.pending, this.rules.maxCellsPerTick);
    let changed = 0;
    for (let c = 0; c < n; c++) {
      const key = this.queue[this.head++];
      this.waiting.delete(key);
      if (this.transformOne(Math.floor(key / KEY_STRIDE), key % KEY_STRIDE)) changed++;
    }
    if (this.head > 4096 && this.head * 2 > this.queue.length) {
      this.queue = this.queue.slice(this.head);
      this.head = 0;
    }
    return changed;
  }

  /** Forget everything (the planet's terrain was unloaded). */
  clear(): void {
    this.flow.clear();
    this.queue = [];
    this.head = 0;
    this.waiting.clear();
    this.prev.clear();
    this.accumulator = 0;
  }

  /** Flowing cells of these columns as [tile, depth, byte] triples (for the geometry worker). */
  flowCells(tiles: Iterable<number>): number[] {
    const out: number[] = [];
    for (const t of tiles) {
      const col = this.flow.get(t);
      if (!col) continue;
      for (let d = 0; d < col.length; d++) if (col[d] !== 0) out.push(t, d, col[d]);
    }
    return out;
  }

  // ---- the rule ----

  private kind(tile: number, depth: number): number {
    if (!this.world.neighbors(tile) || depth < 0 || depth >= this.world.height(tile)) return NEUTRAL;
    const b = this.world.block(tile, depth);
    if (b === HexBlockType.WATER) return SRC;
    if (b === HexBlockType.AIR) return this.flowAt(tile, depth) !== 0 ? FLOW : AIR;
    return SOLID;
  }

  private push(tile: number, depth: number): void {
    const key = keyOf(tile, depth);
    if (this.waiting.has(key)) return;
    this.waiting.add(key);
    this.queue.push(key);
  }

  /** The eight neighbours in Luanti's order: upper, the sides, lower. */
  private eachNeighbour(tile: number, depth: number, fn: (t: number, d: number, type: number) => void): void {
    fn(tile, depth + 1, UPPER);
    for (const n of this.world.neighbors(tile) ?? []) fn(n, depth, SAME);
    fn(tile, depth - 1, LOWER);
  }

  private setFlow(tile: number, depth: number, byte: number): void {
    let col = this.flow.get(tile);
    if (!col) {
      if (byte === 0) return;
      col = new Uint8Array(this.world.height(tile));
      this.flow.set(tile, col);
    }
    col[depth] = byte;
  }

  private readonly flows: Array<[number, number, number]> = [];
  private readonly airs: Array<[number, number, number]> = [];

  private transformOne(tile: number, depth: number): boolean {
    const k0 = this.kind(tile, depth);
    if (k0 === SOLID || k0 === NEUTRAL) return false;
    let numSources = 0;
    let flowingDown = false;
    const flows = this.flows, airs = this.airs;
    flows.length = 0;
    airs.length = 0;
    this.eachNeighbour(tile, depth, (t, d, type) => {
      const kn = this.kind(t, d);
      if (kn === AIR) {
        airs.push([t, d, type]);
        if (type !== UPPER && k0 !== AIR) this.push(t, d);
        if (type === LOWER) flowingDown = true;
      } else if (kn === SRC) {
        if (type !== LOWER) numSources++;   // do not count the source below
      } else if (kn === FLOW) {
        flows.push([t, d, type]);
        if (type === LOWER) flowingDown = true;
      }                                      // SOLID and NEUTRAL: neutrals
    });

    // decide on the type (and possibly level) of the current cell
    const range = Math.min(this.rules.range, LIQUID_LEVEL_MAX + 1);
    let newK: number;
    let newL = -1;
    if (numSources >= this.rules.renew || k0 === SRC) newK = SRC;
    else if (numSources >= 1) {
      newL = LIQUID_LEVEL_MAX;
      newK = newL >= LIQUID_LEVEL_MAX + 1 - range ? FLOW : AIR;
    } else {
      let max = -1;
      for (const [t, d, type] of flows) {
        const b = this.flowAt(t, d);
        max = maxLiquidLevel(b & LEVEL_MASK, (b & FALLING_BIT) !== 0, type, max, this.rules.dropBoost);
      }
      newL = max;
      newK = max >= LIQUID_LEVEL_MAX + 1 - range ? FLOW : AIR;
    }

    // has anything changed?
    const b0 = this.flowAt(tile, depth);
    const newByte = newK === FLOW ? FLOW_BIT | (flowingDown ? FALLING_BIT : 0) | (newL & LEVEL_MASK) : 0;
    if (newK === k0 && (k0 !== FLOW || b0 === newByte)) return false;

    const key = keyOf(tile, depth);
    if (!this.prev.has(key)) this.prev.set(key, this.codeAt(tile, depth));
    if (newK === SRC) {
      this.setFlow(tile, depth, 0);
      this.world.setSource(tile, depth);
    } else {
      this.setFlow(tile, depth, newByte);
    }
    this.world.cellChanged(tile, depth);

    // enqueue neighbours
    if (newK === SRC || newK === FLOW) {
      for (const [t, d, type] of flows) if (type !== UPPER) this.push(t, d);
      for (const [t, d, type] of airs) if (type !== UPPER) this.push(t, d);
    } else {
      for (const [t, d] of flows) this.push(t, d);   // this flow has turned to air; neighbouring flows may follow
    }
    return true;
  }
}
