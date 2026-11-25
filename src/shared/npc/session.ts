// A game world's NPCs over time (openspec friendship-npcs, design 3 and 4):
// which planets are awake, waking one when its first player arrives (create
// on first visit, else the capped catch-up), ticking awake planets, and
// putting a planet to sleep when its last player leaves. ONE code path for
// the multiplayer server (server-js/server.js, through npc-core.js) and the
// single-player client (src/npc/NpcClient.ts): each hands it a record store.
//
// Pure: no three.js, no DOM.
import { NPC_CONFIG, inhabitedWorld } from '../../config/NpcConfig';
import { NPC_RECORDS, NpcClock, PlanetAdvance, advancePlanet, catchUpPlanet, createPlanetNpc } from './planet';
import { ClockOf, TraderState, createTraders } from './traders';
import type { VillageState } from './village';

const NREC = NPC_RECORDS;
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/**
 * Where a world's NPC records live. `write` stores a record and sends it on:
 * `toPlanet` = the players on that planet, null = everyone in the world.
 */
export interface NpcStore {
  get(kind: string, planet: string, key: string): unknown | null;
  write(kind: string, planet: string, key: string, data: object, toPlanet: string | null): void;
}

/** An awake planet: its clock T as of wall time lastMs; stampMs = when npcClock was last written. */
export interface AwakePlanet { T: number; lastMs: number; stampMs: number }

export class NpcWorld {
  readonly awake = new Map<string, AwakePlanet>();

  constructor(
    readonly seed: number,
    private readonly store: NpcStore,
    private readonly log: (msg: string) => void = () => {},
  ) {}

  /** The stored clock record of a planet (null: never visited). */
  storedClock(body: string): NpcClock | null {
    return (this.store.get(NREC.CLOCK, body, NREC.CLOCK_KEY) as NpcClock | null) ?? null;
  }

  /** Every planet's NPC clock now: in memory while awake, else its stamped record (0 if never visited). */
  clockOf(): ClockOf {
    return (body) => this.awake.get(body)?.T ?? this.storedClock(body)?.T ?? 0;
  }

  traders(): (TraderState | null)[] {
    return range(NPC_CONFIG.TRADERS.BAND.length).map(i => (this.store.get(NREC.TRADER, NREC.TRADER_PLANET, String(i)) as TraderState | null) ?? null);
  }

  /** The band exists from the first time a planet wakes (a cleared trader is put back where it would have started). */
  ensureTraders(): TraderState[] {
    const have = this.traders();
    if (have.every(Boolean)) return have as TraderState[];
    const fresh = createTraders(this.seed, this.clockOf());
    return have.map((t, i) => {
      if (t) return t;
      this.store.write(NREC.TRADER, NREC.TRADER_PLANET, String(i), fresh[i], null);
      return fresh[i];
    });
  }

  /** A planet's villages at clock T; any missing (first visit, or cleared) are created then. */
  villagesOf(body: string, T: number): VillageState[] {
    const n = inhabitedWorld(body)?.villages ?? 0;
    const have = range(n).map(i => (this.store.get(NREC.VILLAGE, body, String(i)) as VillageState | null) ?? null);
    if (have.every(Boolean)) return have as VillageState[];
    const fresh = createPlanetNpc(this.seed, body, T)!;
    return have.map((v, i) => {
      if (v) return v;
      this.store.write(NREC.VILLAGE, body, String(i), fresh.villages[i], body);
      return fresh.villages[i];
    });
  }

  /** Store what an advance changed; true when anything did. */
  private apply(body: string, res: PlanetAdvance): boolean {
    for (const i of res.changedVillages) this.store.write(NREC.VILLAGE, body, String(i), res.planet.villages[i], body);
    for (const i of res.changedTraders) this.store.write(NREC.TRADER, NREC.TRADER_PLANET, String(i), res.traders[i], null);
    return res.changedVillages.length + res.changedTraders.length > 0;
  }

  private stamp(body: string, T: number, at: number, awake: boolean): void {
    this.store.write(NREC.CLOCK, body, NREC.CLOCK_KEY, { T, at, awake }, body);
  }

  /** The first player arrives: create (first visit) or catch up, then its clock runs. Returns the catch-up applied (s). */
  wake(body: string, now: number): number {
    if (!inhabitedWorld(body) || this.awake.has(body)) return 0;
    const clock = this.storedClock(body);
    const T0 = clock?.T ?? 0;
    const traders = this.ensureTraders();
    const villages = this.villagesOf(body, T0);
    let T = T0, dtS = 0;
    if (clock) {
      const res = catchUpPlanet(this.seed, body, { T: T0, villages }, traders, clock.at, now, this.clockOf());
      this.apply(body, res);
      T = res.planet.T;
      dtS = res.dtS;
      if (dtS > 0) this.log(`npc ${body}: caught up ${Math.round(dtS)} s`);
    }
    this.stamp(body, T, now, true);
    this.awake.set(body, { T, lastMs: now, stampMs: now });
    return dtS;
  }

  /** Time passes on an awake planet. */
  tick(body: string, now: number): void {
    const a = this.awake.get(body);
    if (!a) return;
    const dtS = (now - a.lastMs) / 1000;
    if (!(dtS > 0)) return;
    const traders = this.ensureTraders();
    const res = advancePlanet(this.seed, body, { T: a.T, villages: this.villagesOf(body, a.T) }, traders, dtS, this.clockOf());
    a.T = res.planet.T;
    a.lastMs = now;
    if (this.apply(body, res) || now - a.stampMs >= NPC_CONFIG.CLOCK_STAMP_S * 1000) {
      this.stamp(body, a.T, now, true);
      a.stampMs = now;
    }
  }

  /** The last player leaves: advance to now, stamp the clock asleep. */
  sleep(body: string, now: number): void {
    this.tick(body, now);
    const a = this.awake.get(body);
    if (!a) return;
    this.stamp(body, a.T, now, false);
    this.awake.delete(body);
  }

  tickAll(now: number): void {
    for (const body of [...this.awake.keys()]) this.tick(body, now);
  }

  /** Forget who is where without stamping (a world reset / delete: its records are going). */
  forget(): void {
    this.awake.clear();
  }

  /** The (kind, key) pairs of a planet's NPC records, for bringing an arriving player up to date. */
  static planetRecordKeys(body: string): Array<[string, string]> {
    return [...range(inhabitedWorld(body)?.villages ?? 0).map(i => [NREC.VILLAGE, String(i)] as [string, string]), [NREC.CLOCK, NREC.CLOCK_KEY]];
  }
}
