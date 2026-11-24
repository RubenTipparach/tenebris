// A planet's NPC state as a whole, and the records it is stored in
// (openspec friendship-npcs, design 3 and 4). One code path for the
// multiplayer server (server-js/server.js, through server-js/npc-core.js)
// and single player (task 3.1): create a planet's villages on its first
// visit, and advance the planet - its villages and the traders on it - by
// a span of its NPC clock.
//
// Pure: no three.js, no DOM.
import { NPC_CONFIG } from '../../config/NpcConfig';
import { registerWorldTimeSubsystem, catchUpSeconds, WorldTimeSubsystem } from '../worldTime';
import { buildPopulation } from './population';
import { ClockOf, TraderState, advanceTradersOn } from './traders';
import { AdvanceOptions, VillageState, advanceVillage, createVillage } from './village';

/**
 * The record kinds and keys (GameStorage / NetSync record path):
 *   village   planet = body,     key = village index   data = VillageState
 *   npcClock  planet = body,     key = 'clock'         data = NpcClock
 *   trader    planet = 'traders', key = trader index   data = TraderState
 */
export const NPC_RECORDS = {
  VILLAGE: 'village',
  CLOCK: 'npcClock',
  CLOCK_KEY: 'clock',
  TRADER: 'trader',
  TRADER_PLANET: 'traders',
} as const;

/**
 * When a planet's NPC clock was last advanced: its clock T (seconds) as of
 * wall time `at` (ms). `awake` while someone is on it: its clock then runs
 * on from (T, at) with wall time.
 */
export interface NpcClock {
  T: number;
  at: number;
  awake: boolean;
}

export interface PlanetNpc {
  T: number;
  villages: VillageState[];
}

/** The NPC clock of a planet at wall time nowMs (it only runs while awake). */
export const clockNow = (c: NpcClock, nowMs: number): number =>
  c.awake ? c.T + Math.max(0, nowMs - c.at) / 1000 : c.T;

/** A planet's villages on its first visit, its clock at T. Null when nobody lives there. */
export function createPlanetNpc(worldSeed: number, body: string, T = 0): PlanetNpc | null {
  const pop = buildPopulation(worldSeed, body);
  if (!pop) return null;
  return {
    T,
    villages: pop.villages.map(v => createVillage({ worldSeed, body, index: v.index }, v.residents.length, T)),
  };
}

export interface PlanetAdvance {
  planet: PlanetNpc;
  traders: TraderState[];
  changedVillages: number[];
  changedTraders: number[];
}

/**
 * The planet's clock moves on by dtS: each village's events, then the
 * traders on it. `clockOf` gives every other world's clock (a trader that
 * moves on starts its stay there). Inputs are not changed.
 */
export function advancePlanet(worldSeed: number, body: string, planet: PlanetNpc, traders: readonly TraderState[], dtS: number, clockOf: ClockOf, opts: AdvanceOptions = {}): PlanetAdvance {
  const t0 = planet.T, t1 = planet.T + Math.max(0, dtS);
  const villages = planet.villages.map((v, index) => advanceVillage({ worldSeed, body, index }, v, t0, t1, opts));
  const changedVillages = villages.flatMap((v, i) => (JSON.stringify(v) !== JSON.stringify(planet.villages[i]) ? [i] : []));
  const here: ClockOf = (b) => (b === body ? t1 : clockOf(b));
  const moved = advanceTradersOn(worldSeed, traders, body, t1, here);
  return { planet: { T: t1, villages }, traders: moved.traders, changedVillages, changedTraders: moved.changed };
}

// ---- time compression (CLAUDE.md; src/shared/worldTime.ts) ------------------

/** NPCs: the first subsystem of the world-time catch-up. */
export const NPC_WORLD_TIME: WorldTimeSubsystem = { id: 'npc', capS: NPC_CONFIG.CATCH_UP_CAP_S };
registerWorldTimeSubsystem(NPC_WORLD_TIME);

/**
 * A planet nobody was on gets its first occupant: the time since its clock
 * was stamped (`lastMs`), capped, is applied in one step as a catch-up.
 */
export function catchUpPlanet(worldSeed: number, body: string, planet: PlanetNpc, traders: readonly TraderState[], lastMs: number, nowMs: number, clockOf: ClockOf): PlanetAdvance & { dtS: number } {
  const dtS = catchUpSeconds(NPC_WORLD_TIME, lastMs, nowMs);
  return { ...advancePlanet(worldSeed, body, planet, traders, dtS, clockOf, { catchUp: true }), dtS };
}
