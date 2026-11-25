import { gameStorage } from '../engine/GameStorage';
import { netSync } from '../net/NetSync';
import { PlayerConfig } from '../config/PlayerConfig';
import { NPC_CONFIG, NPC_RECORDS, NpcWorld, isInhabited } from '../shared/npc';
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
}
