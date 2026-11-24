import { MISSIONS, MISSION_BRANCHES, Mission, MissionBranch, MissionObjective, STARTER_RECIPES } from '../config/Missions';
import type { GameEventType, GameEventKey } from '../engine/GameEvents';
import type { RecipeGate } from './RecipeGate';

/**
 * Mission tree progress (openspec navigation-and-orbits, missions): which
 * missions are done, each open mission's counts, and which recipes that
 * unlocks. Pure logic (no DOM) so it can be tested; MissionsPanel draws it.
 *
 * A mission is OPEN when its parent and its hidden `after` gates are done.
 * Every open mission counts at once (branches run side by side); only what
 * happens after a mission opens counts. "gained" objectives read the
 * inventory itself: progress is how far the held count has risen above the
 * lowest it has been since the mission opened.
 */

export type MissionStateName = 'done' | 'now' | 'open' | 'locked';

export interface MissionSave {
  v: 2;
  done: string[];
  prog: Record<string, number[]>;                 // per open mission, per objective
  low: Record<string, Record<string, number>>;    // per open mission, per gained item
  seen: Record<string, string[][]>;               // per open mission, per distinct objective
  legacy: number[];                               // recipe outputs open from an old world
  /** The gate rule the save was made under: GATE_RULE_ALL_LOCKED once every
   *  recipe waits on a mission; missing in a save from before that. */
  rule?: number;
  /** The open mission the player picked to work on (null/missing: the
   *  first open one in the tree's order) */
  focus?: string | null;
  /** Branches whose unlock toast has been shown (MISSION_BRANCHES announcedBy) */
  announced?: string[];
}

/** Saves made since every recipe (not only the ones a mission named) waits on a mission. */
export const GATE_RULE_ALL_LOCKED = 2;

/** The first version's linear save (its ids are the tree's). */
interface LinearSave { index: number; progress?: number[]; low?: Record<string, number> }
const LINEAR_IDS = ['logs', 'planks', 'stone', 'furnace', 'iron', 'ingots', 'workbench', 'printer', 'padblocks', 'pad', 'parts', 'assemble', 'launch', 'moon'];

/** What the world already has, for an existing world's first look at the tree. */
export interface WorldState {
  held: (item: number) => number;
  placedMachines: (item: number) => number;
  padComplete: boolean;
  rocketAssembled: boolean;
}

const BY_ID = new Map(MISSIONS.map(m => [m.id, m]));
const UNLOCKED_BY = new Map<number, Mission>();
for (const m of MISSIONS) for (const u of m.unlocks) UNLOCKED_BY.set(u, m);
const STARTER = new Set<number>(STARTER_RECIPES);

export class MissionTracker implements RecipeGate {
  private done = new Set<string>();
  private prog: Record<string, number[]> = {};
  private low: Record<string, Record<string, number>> = {};
  private seen: Record<string, string[][]> = {};
  private legacy = new Set<number>();
  private focus: string | null = null;
  private announced = new Set<string>();
  public onComplete: ((mission: Mission) => void) | null = null;
  public onChange: (() => void) | null = null;

  constructor(saved?: MissionSave | LinearSave | null) {
    if (saved && (saved as MissionSave).v === 2) {
      const s = saved as MissionSave;
      for (const id of s.done ?? []) if (BY_ID.has(id)) this.done.add(id);
      this.prog = { ...(s.prog ?? {}) };
      this.low = { ...(s.low ?? {}) };
      this.seen = { ...(s.seen ?? {}) };
      for (const o of s.legacy ?? []) this.legacy.add(o);
      this.focus = typeof s.focus === 'string' ? s.focus : null;
      for (const b of s.announced ?? []) this.announced.add(b);
    } else if (saved && Number.isInteger((saved as LinearSave).index)) {
      // the first version's line: everything before its index is done
      LINEAR_IDS.slice(0, (saved as LinearSave).index).forEach(id => this.done.add(id));
    }
    this.closeAncestors();
    this.fitAll();
  }

  public save(): MissionSave {
    return { v: 2, done: [...this.done], prog: { ...this.prog }, low: { ...this.low }, seen: { ...this.seen }, legacy: [...this.legacy], rule: GATE_RULE_ALL_LOCKED, focus: this.focus, announced: [...this.announced] };
  }

  // ---- the tree ----------------------------------------------------------

  public isDone(id: string): boolean {
    return this.done.has(id);
  }

  public isOpen(m: Mission): boolean {
    if (this.done.has(m.id)) return false;
    if (m.parent && !this.done.has(m.parent)) return false;
    return (m.after ?? []).every(a => this.done.has(a));
  }

  public openMissions(): Mission[] {
    return MISSIONS.filter(m => this.isOpen(m));
  }

  /** The mission to do next: the one the player picked while it is still
   *  open, else the first open one in the tree's order. */
  public now(): Mission | null {
    const picked = this.focus ? BY_ID.get(this.focus) : undefined;
    if (picked && this.isOpen(picked)) return picked;
    return MISSIONS.find(m => this.isOpen(m)) ?? null;
  }

  /**
   * Pick the mission to work on. Only an open mission can be picked - one
   * whose parent (and every gate) is done, so it sits next to a completed
   * node. False (and nothing changes) for a done or locked one. Once the
   * picked mission is done, now() falls back to the tree's order.
   */
  public setFocus(id: string): boolean {
    const m = BY_ID.get(id);
    if (!m || !this.isOpen(m)) return false;
    this.focus = id;
    this.onChange?.();
    return true;
  }

  public state(m: Mission): MissionStateName {
    if (this.done.has(m.id)) return 'done';
    if (!this.isOpen(m)) return 'locked';
    return this.now() === m ? 'now' : 'open';
  }

  /**
   * The branches a just-finished mission announces (MISSION_BRANCHES
   * `announcedBy`), each only the first time - the caller shows the toast.
   */
  public announceAfter(missionId: string): MissionBranch[] {
    const out: MissionBranch[] = [];
    for (const b of MISSION_BRANCHES) {
      if (b.announcedBy !== missionId || this.announced.has(b.id)) continue;
      this.announced.add(b.id);
      out.push(b.id);
    }
    return out;
  }

  /** Has this body's visit mission been done (space exploration)? */
  public visited(bodyId: string): boolean {
    const m = MISSIONS.find(x => x.visit === bodyId);
    return !!m && this.done.has(m.id);
  }

  /** Space exploration progress: bodies visited (visit missions done) of all of them */
  public visits(): { done: number; total: number } {
    const all = MISSIONS.filter(m => m.visit);
    return { done: all.filter(m => this.done.has(m.id)).length, total: all.length };
  }

  /** Counts per objective: full for a done mission, zero for a locked one. */
  public progress(m: Mission): number[] {
    if (this.done.has(m.id)) return m.objectives.map(o => o.count);
    return m.objectives.map((_, i) => this.prog[m.id]?.[i] ?? 0);
  }

  public allDone(): boolean {
    return MISSIONS.every(m => this.done.has(m.id));
  }

  // ---- unlocking (RecipeGate) --------------------------------------------

  /** Every recipe is locked until its mission is done, but the starters
   *  and what an old world already had (legacy). */
  public recipeOpen(output: number): boolean {
    if (STARTER.has(output) || this.legacy.has(output)) return true;
    const by = UNLOCKED_BY.get(output);
    return !!by && this.done.has(by.id);
  }

  public lockedBy(output: number): string | null {
    if (this.recipeOpen(output)) return null;
    // the coverage test keeps every recipe on a mission; '?' never shows
    return UNLOCKED_BY.get(output)?.title ?? '?';
  }

  // ---- an existing world -------------------------------------------------

  /**
   * An existing world's first look at the tree: every mission it already
   * satisfies is done (so a veteran starts where they are), and every
   * recipe whose output it carries or has placed stays open, so no world
   * loses a recipe it could use before. Returns how many were done.
   */
  public skipSatisfied(world: WorldState): number {
    let skipped = 0;
    for (let changed = true; changed;) {
      changed = false;
      for (const m of this.openMissions()) {
        if (m.objectives.every(o => satisfiedNow(o, world))) {
          this.done.add(m.id);
          skipped++;
          changed = true;
        }
      }
    }
    this.keepWhatTheWorldHas(world);
    this.prog = {};
    this.low = {};
    this.seen = {};
    this.fitAll();
    return skipped;
  }

  /**
   * Every recipe whose output the world carries or has placed stays open
   * (an old world never loses a recipe it could use before). Also run once
   * for a tree save from before every recipe was locked (no `rule`).
   */
  public keepWhatTheWorldHas(world: WorldState): void {
    for (const output of UNLOCKED_BY.keys()) {
      if (world.held(output) > 0 || world.placedMachines(output) > 0) this.legacy.add(output);
    }
  }

  // ---- counting -----------------------------------------------------------

  /** Start "gained" counts from what is held now, for missions just opened. */
  public baseline(held: (item: number) => number): void {
    for (const m of this.openMissions()) {
      const low = (this.low[m.id] ??= {});
      for (const o of m.objectives) {
        if (o.kind === 'gained' && o.item !== undefined && low[o.item] === undefined) low[o.item] = held(o.item);
      }
    }
  }

  /** Read the inventory: progress on "gained" objectives. */
  public sample(held: (item: number) => number): void {
    let changed = false;
    for (const m of this.openMissions()) {
      const low = (this.low[m.id] ??= {});
      const prog = this.prog[m.id];
      m.objectives.forEach((o, i) => {
        if (o.kind !== 'gained' || o.item === undefined) return;
        const now = held(o.item);
        const l = Math.min(low[o.item] ?? now, now);
        if (l !== low[o.item]) { low[o.item] = l; changed = true; }
        const p = Math.min(o.count, Math.max(prog[i], now - l));
        if (p !== prog[i]) { prog[i] = p; changed = true; }
      });
    }
    if (changed) this.afterProgress(held);
  }

  /** Something the player did (src/engine/GameEvents). */
  public event(type: GameEventType, key: GameEventKey, n: number, held: (item: number) => number): void {
    let changed = false;
    for (const m of this.openMissions()) {
      const prog = this.prog[m.id];
      m.objectives.forEach((o, i) => {
        if (!matches(o, type, key)) return;
        let add = n;
        if (o.distinct) {
          const seen = ((this.seen[m.id] ??= [])[i] ??= []);
          const k = String(key);
          if (seen.includes(k)) return;
          seen.push(k);
          add = 1;
        }
        const p = Math.min(o.count, prog[i] + add);
        if (p !== prog[i]) { prog[i] = p; changed = true; }
      });
    }
    if (changed) this.afterProgress(held);
  }

  private afterProgress(held: (item: number) => number): void {
    for (let finished = true; finished;) {
      finished = false;
      for (const m of this.openMissions()) {
        if (m.objectives.every((o, i) => this.prog[m.id][i] >= o.count)) {
          this.done.add(m.id);
          if (this.focus === m.id) this.focus = null;
          delete this.prog[m.id];
          delete this.low[m.id];
          delete this.seen[m.id];
          this.fitAll();
          this.baseline(held);
          this.onComplete?.(m);
          finished = true;
        }
      }
    }
    this.onChange?.();
  }

  // Every done mission's parents and gates are done too (a migrated save)
  private closeAncestors(): void {
    for (const id of [...this.done]) {
      const stack = [id];
      while (stack.length) {
        const m = BY_ID.get(stack.pop()!);
        if (!m) continue;
        for (const p of [m.parent, ...(m.after ?? [])]) {
          if (p && !this.done.has(p)) { this.done.add(p); stack.push(p); }
        }
      }
    }
  }

  private fitAll(): void {
    for (const m of this.openMissions()) {
      const p = this.prog[m.id] ?? [];
      this.prog[m.id] = m.objectives.map((_, i) => p[i] ?? 0);
    }
  }
}

function matches(o: MissionObjective, type: GameEventType, key: GameEventKey): boolean {
  if (o.kind !== type) return false;
  if (o.item !== undefined && o.item !== key) return false;
  if (o.body !== undefined) {
    if (o.body === '*') return !(o.exclude ?? []).includes(String(key));
    return o.body === key;
  }
  return true;
}

function satisfiedNow(o: MissionObjective, w: WorldState): boolean {
  switch (o.kind) {
    case 'gained':
    case 'crafted':
    case 'smelted':
      return o.item !== undefined && (w.held(o.item) >= o.count || w.placedMachines(o.item) >= o.count);
    case 'placed':
      return o.item !== undefined && w.placedMachines(o.item) >= o.count;
    case 'padComplete':
      return w.padComplete;
    case 'assembled':
      return w.rocketAssembled;
    default:
      return false;  // a launch, landing, catch or waypoint can't be read back
  }
}
