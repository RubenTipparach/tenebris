// World time: the "time compression on resume" rule (CLAUDE.md). A
// long-running simulation advances only while someone is there; when a
// player returns, the wall-clock time since it was last advanced is applied
// in one step, capped, so a world left for months settles instead of
// blowing up. This module owns that cap rule and the list of subsystems
// that take part; each subsystem declares its own cap in its config.
//
// Subsystems (register at load):
//   npc   villages and traders (src/shared/npc/planet.ts, cap
//         NpcConfig CATCH_UP_CAP_S)
//
// Used unchanged by the single-player client and, bundled into
// server-js/npc-core.js, by the multiplayer server.
// Pure: no three.js, no DOM.

export interface WorldTimeSubsystem {
  id: string;
  capS: number;            // the longest absence a catch-up applies (seconds)
}

const subsystems: WorldTimeSubsystem[] = [];

/** Add a subsystem (once per id). */
export function registerWorldTimeSubsystem(s: WorldTimeSubsystem): void {
  if (!subsystems.some(x => x.id === s.id)) subsystems.push(s);
}

/** Every subsystem that takes part, in registration order. */
export const worldTimeSubsystems = (): readonly WorldTimeSubsystem[] => subsystems.slice();

/**
 * Seconds a catch-up applies for an absence from lastMs to nowMs: never
 * negative (a clock set back), never more than the subsystem's cap, and
 * nothing for a subsystem never stamped (lastMs not a finite number).
 */
export function catchUpSeconds(s: WorldTimeSubsystem, lastMs: number, nowMs: number): number {
  if (!Number.isFinite(lastMs) || !Number.isFinite(nowMs)) return 0;
  return Math.min(s.capS, Math.max(0, (nowMs - lastMs) / 1000));
}
