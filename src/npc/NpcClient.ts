import { gameStorage } from '../engine/GameStorage';
import { netSync } from '../net/NetSync';
import { PlayerConfig } from '../config/PlayerConfig';
import { NPC_CONFIG, NPC_RECORDS, NpcClock, NpcWorld, TraderState, VillageState, deliver, isInhabited } from '../shared/npc';
import { LocalNpcStore, NpcRecordMap } from './LocalNpcStore';

/**
 * The client's NPC state (openspec friendship-npcs, task 3.1).
 *
 * - Single player: this client is the world's only player, so it runs the
 *   shared session (src/shared/npc/session.ts) itself - waking the planet
 *   the player arrives on (creating its villages on the first visit, else
 *   the capped catch-up from its saved npcClock), ticking it while the
 *   player is there and putting it to sleep on the way out - the exact
 *   code path the server runs.
 * - Online: the server runs that session; its `village` / `trader` /
 *   `npcClock` records arrive through NetSync and are kept here. A client's
 *   own writes (deliveries, trades: group 4) go out as ordinary versioned
 *   records.
 */
export class NpcClient {
  readonly store: LocalNpcStore;
  private world: NpcWorld | null = null;
  private planet: string | null = null;
  private lastTickMs = 0;

  constructor() {
    const saved = gameStorage.getNpcRecords();
    this.store = new LocalNpcStore((saved && typeof saved === 'object' ? saved : {}) as NpcRecordMap, (r) => gameStorage.saveNpcRecords(r));
    // The server's records (never uploaded from here: the server owns them)
    for (const kind of [NPC_RECORDS.VILLAGE, NPC_RECORDS.TRADER, NPC_RECORDS.CLOCK]) {
      netSync.onRecord(kind, (planet, key, data) => this.store.write(kind, planet, key, data));
    }
  }

  /** Single player runs the session; online the server does. */
  private local(): NpcWorld | null {
    if (netSync.online()) return null;
    if (!this.world || this.world.seed !== PlayerConfig.TERRAIN_SEED) {
      this.world = new NpcWorld(PlayerConfig.TERRAIN_SEED, {
        get: (k, p, key) => this.store.get(k, p, key),
        write: (k, p, key, data) => this.store.write(k, p, key, data),
      }, (m) => console.log(`[NPC] ${m}`));
    }
    return this.world;
  }

  /** The player is on `body` now (null: in space). Wakes and sleeps planets in single player. */
  setPlanet(body: string | null, nowMs = Date.now()): void {
    if (body === this.planet) return;
    const w = this.local();
    if (w && this.planet) w.sleep(this.planet, nowMs);
    this.planet = body;
    if (w && body && isInhabited(body)) {
      w.wake(body, nowMs);
      this.lastTickMs = nowMs;
    }
  }

  /** Once a frame: single player ticks the player's planet at the server's rate. */
  update(nowMs = Date.now()): void {
    const w = this.local();
    if (!w || !this.planet || nowMs - this.lastTickMs < NPC_CONFIG.SERVER_TICK_S * 1000) return;
    this.lastTickMs = nowMs;
    w.tick(this.planet, nowMs);
  }

  /** The page is closing: put the planet to sleep so the next load catches up from now. */
  shutdown(nowMs = Date.now()): void {
    const w = this.local();
    if (w && this.planet) w.sleep(this.planet, nowMs);
  }

  /** The world's seed (the villages' request draws are seeded by it). */
  seed(): number {
    return PlayerConfig.TERRAIN_SEED;
  }

  /** A village's record as this client has it (null: not heard of yet). */
  village(body: string, index: number): VillageState | null {
    return (this.store.get(NPC_RECORDS.VILLAGE, body, String(index)) as VillageState | null) ?? null;
  }

  /** A trader's record as this client has it (null: not heard of yet). */
  trader(index: number): TraderState | null {
    return (this.store.get(NPC_RECORDS.TRADER, NPC_RECORDS.TRADER_PLANET, String(index)) as TraderState | null) ?? null;
  }

  /** A barter used a trader's stock: kept here and, online, a versioned write (a lost race rolls back and refunds). */
  writeTrader(index: number, t: TraderState): void {
    this.store.write(NPC_RECORDS.TRADER, NPC_RECORDS.TRADER_PLANET, String(index), t);
    netSync.record(NPC_RECORDS.TRADER, NPC_RECORDS.TRADER_PLANET, String(index), t);
  }

  /**
   * The planet's NPC clock now: single player's running session, else the
   * server's last stamp run on to now while the planet is awake.
   */
  clockNow(body: string, nowMs = Date.now()): number {
    const T = this.world?.awake.get(body)?.T;
    if (T !== undefined) return T;
    const c = this.store.get(NPC_RECORDS.CLOCK, body, NPC_RECORDS.CLOCK_KEY) as NpcClock | null;
    if (!c) return 0;
    return c.awake ? c.T + Math.max(0, nowMs - c.at) / 1000 : c.T;
  }

  /**
   * A player's change to a village (a delivery): kept and saved here at
   * once, and online sent as a versioned record write - if someone else
   * changed the village first the server refuses it, the record rolls back
   * to the server's and the trade ledger hands the items back.
   */
  writeVillage(body: string, index: number, v: VillageState, settled?: (accepted: boolean) => void): void {
    this.store.write(NPC_RECORDS.VILLAGE, body, String(index), v);
    netSync.record(NPC_RECORDS.VILLAGE, body, String(index), v, settled);
  }

  /** Debug (headless shots, single player): show a village's structures at a stage (a visual check of the drawing, not a game rule). */
  debugSetStructure(index: number, structure: number, stage: number): void {
    const body = this.planet;
    const v = body ? this.village(body, index) : null;
    if (!body || !v || netSync.online()) return;
    this.store.write(NPC_RECORDS.VILLAGE, body, String(index), { ...v, structure, stage });
  }

  /** Debug (headless shots): the first village on the player's planet with a build request open, else -1. */
  debugOpenBuild(): number {
    const body = this.planet;
    if (!body) return -1;
    for (let i = 0; ; i++) {
      const v = this.store.get(NPC_RECORDS.VILLAGE, body, String(i)) as VillageState | null;
      if (!v) return -1;
      if (v.requests.some(r => r.fam === 'build')) return i;
    }
  }

  /**
   * Debug (headless shots, single player): complete the build request open
   * on the player's planet through the delivery rule, as a full delivery
   * would. Returns the village index, or -1 when none is open.
   */
  debugCompleteBuild(): number {
    const w = this.local();
    const body = this.planet;
    const T = body ? w?.awake.get(body)?.T : undefined;
    const i = this.debugOpenBuild();
    if (!w || !body || T === undefined || i < 0) return -1;
    const v = this.store.get(NPC_RECORDS.VILLAGE, body, String(i)) as VillageState;
    const q = v.requests.find(r => r.fam === 'build')!;
    const res = deliver({ worldSeed: w.seed, body, index: i }, v, q.id, q.need - q.got, T);
    this.store.write(NPC_RECORDS.VILLAGE, body, String(i), res.village);
    return i;
  }
}
