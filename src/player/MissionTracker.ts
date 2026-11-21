import { MISSIONS, Mission, MissionObjective } from '../config/Missions';
import type { GameEventType, GameEventKey } from '../engine/GameEvents';

/**
 * Mission progress: which mission is open, and each objective's count. Pure
 * logic (no DOM) so it can be tested; src/player/MissionsPanel.ts draws it.
 *
 * Only what happens after a mission opens counts. "gained" objectives read
 * the inventory itself: progress is how far the held count has risen above
 * the lowest it has been since the mission opened, so items arriving by any
 * path count and using some up never takes progress back.
 */

export interface MissionSave {
  index: number;            // the open mission; MISSIONS.length when all done
  progress: number[];       // per objective of the open mission
  low: Record<string, number>; // per gained item: the lowest held since it opened
}

/** What the world already has, for skipping missions on an existing save. */
export interface WorldState {
  held: (item: number) => number;
  placedMachines: (item: number) => number;
  padComplete: boolean;
  rocketAssembled: boolean;
}

export class MissionTracker {
  private state: MissionSave;
  public onComplete: ((mission: Mission) => void) | null = null;
  public onChange: (() => void) | null = null;

  constructor(saved?: MissionSave | null) {
    this.state = saved && Number.isInteger(saved.index)
      ? { index: Math.min(saved.index, MISSIONS.length), progress: [...(saved.progress ?? [])], low: { ...(saved.low ?? {}) } }
      : { index: 0, progress: [], low: {} };
    this.fitProgress();
  }

  public save(): MissionSave {
    return { index: this.state.index, progress: [...this.state.progress], low: { ...this.state.low } };
  }

  public current(): Mission | null {
    return MISSIONS[this.state.index] ?? null;
  }

  public currentIndex(): number {
    return this.state.index;
  }

  public progress(): number[] {
    return this.state.progress;
  }

  /**
   * An existing world without mission progress: skip every mission the world
   * already satisfies, so a veteran starts where they are. Stops at the first
   * mission it can't tell is done (a launch or a landing can't be read back).
   */
  public skipSatisfied(world: WorldState): number {
    let skipped = 0;
    while (this.current() && this.current()!.objectives.every(o => satisfiedNow(o, world))) {
      this.state.index++;
      skipped++;
    }
    this.state.progress = [];
    this.state.low = {};
    this.fitProgress();
    return skipped;
  }

  /** Start "gained" counts from what is held now (a mission just opened). */
  public baseline(held: (item: number) => number): void {
    const m = this.current();
    if (!m) return;
    for (const o of m.objectives) {
      if (o.kind === 'gained' && o.item !== undefined && this.state.low[o.item] === undefined) {
        this.state.low[o.item] = held(o.item);
      }
    }
  }

  /** Read the inventory: progress on "gained" objectives. */
  public sample(held: (item: number) => number): void {
    const m = this.current();
    if (!m) return;
    let changed = false;
    m.objectives.forEach((o, i) => {
      if (o.kind !== 'gained' || o.item === undefined) return;
      const now = held(o.item);
      const low = Math.min(this.state.low[o.item] ?? now, now);
      if (low !== this.state.low[o.item]) { this.state.low[o.item] = low; changed = true; }
      const p = Math.min(o.count, Math.max(this.state.progress[i], now - low));
      if (p !== this.state.progress[i]) { this.state.progress[i] = p; changed = true; }
    });
    if (changed) this.afterProgress(held);
  }

  /** Something the player did (src/engine/GameEvents). */
  public event(type: GameEventType, key: GameEventKey, n: number, held: (item: number) => number): void {
    const m = this.current();
    if (!m) return;
    let changed = false;
    m.objectives.forEach((o, i) => {
      if (o.kind !== type) return;
      if (o.item !== undefined && o.item !== key) return;
      if (o.body !== undefined && o.body !== key) return;
      const p = Math.min(o.count, this.state.progress[i] + n);
      if (p !== this.state.progress[i]) { this.state.progress[i] = p; changed = true; }
    });
    if (changed) this.afterProgress(held);
  }

  private afterProgress(held: (item: number) => number): void {
    const m = this.current();
    if (m && m.objectives.every((o, i) => this.state.progress[i] >= o.count)) {
      this.state.index++;
      this.state.progress = [];
      this.state.low = {};
      this.fitProgress();
      this.baseline(held);
      this.onComplete?.(m);
    }
    this.onChange?.();
  }

  private fitProgress(): void {
    const m = this.current();
    const n = m ? m.objectives.length : 0;
    this.state.progress = Array.from({ length: n }, (_, i) => this.state.progress[i] ?? 0);
  }
}

function satisfiedNow(o: MissionObjective, w: WorldState): boolean {
  switch (o.kind) {
    case 'gained':
    case 'crafted':
      return o.item !== undefined && (w.held(o.item) >= o.count || w.placedMachines(o.item) >= 1);
    case 'placed':
      return o.item !== undefined && w.placedMachines(o.item) >= o.count;
    case 'padComplete':
      return w.padComplete;
    case 'assembled':
      return w.rocketAssembled;
    default:
      return false;  // a launch or a landing can't be read back
  }
}
