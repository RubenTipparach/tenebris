/**
 * The one place game systems talk to multiplayer, so they don't need a
 * reference to the Multiplayer connection (and work unchanged offline,
 * where every send is a no-op).
 *
 * Two kinds of traffic beyond blocks and poses:
 *
 * - Records: placed objects. A record is the latest state of one thing,
 *   addressed by (kind, planet, key) - a torch, a felled tree, a furnace and
 *   its contents, a launch pad and its rocket. The server keeps the latest
 *   record per address and hands every record to a joining player, so
 *   records are the world's shared, persisted object state. data null =
 *   the thing is gone.
 * - Live frames: relayed to everyone in the world, never stored. For things
 *   that move every frame and only matter while someone is watching
 *   (animals simulated by a planet's host, rockets in flight).
 *
 * Handlers for remote traffic are registered per kind / channel. They run
 * for OTHER players' messages only; a system applying a remote record must
 * not send it back (use `applyingRemote()` to tell).
 */

export type RecordHandler = (planet: string, key: string, data: any | null) => void;
export type LiveHandler = (fromId: number, data: any) => void;

interface Transport {
  sendRecord(kind: string, planet: string, key: string, data: object | null): void;
  sendLive(ch: string, data: unknown): void;
}

const recordHandlers = new Map<string, RecordHandler>();
const liveHandlers = new Map<string, LiveHandler>();
let transport: Transport | null = null;
let remoteDepth = 0;
let clockOffsetMs = 0;       // server clock - local clock
let worldEpochMs: number | null = null;
let myId = 0;
// Other players: id -> the planet they're on
const peers = new Map<number, string>();

export const netSync = {
  /** Connected to a server world? */
  online(): boolean {
    return transport !== null;
  },

  myId(): number {
    return myId;
  },

  /** Publish an object's latest state (null = removed). No-op offline or while applying a remote record. */
  record(kind: string, planet: string, key: string | number, data: object | null): void {
    if (!transport || remoteDepth > 0) return;
    transport.sendRecord(kind, planet, String(key), data);
  },

  /** Relay a live frame to the world. No-op offline. */
  live(ch: string, data: unknown): void {
    transport?.sendLive(ch, data);
  },

  onRecord(kind: string, handler: RecordHandler): void {
    recordHandlers.set(kind, handler);
  },

  onLive(ch: string, handler: LiveHandler): void {
    liveHandlers.set(ch, handler);
  },

  /** True while a remote record is being applied (so the system doesn't echo it). */
  applyingRemote(): boolean {
    return remoteDepth > 0;
  },

  /** Ids of the other players on a planet. */
  peersOn(planet: string): number[] {
    const out: number[] = [];
    for (const [id, p] of peers) if (p === planet) out.push(id);
    return out;
  },

  /**
   * Whether this client simulates the shared things on `planet` (animals):
   * the lowest player id there. Always true offline.
   */
  isHost(planet: string): boolean {
    if (!transport) return true;
    for (const [id, p] of peers) if (p === planet && id < myId) return false;
    return true;
  },

  /**
   * Milliseconds since the server world was created, on the server's clock
   * (the same for every player), or null offline.
   */
  worldTimeMs(): number | null {
    if (!transport || worldEpochMs === null) return null;
    return Date.now() + clockOffsetMs - worldEpochMs;
  },
};

// ---- used by Multiplayer only ------------------------------------------

export function attachTransport(t: Transport | null, id = 0, serverNow?: number, epoch?: number): void {
  transport = t;
  myId = id;
  if (!t) peers.clear();
  if (serverNow !== undefined) clockOffsetMs = serverNow - Date.now();
  worldEpochMs = epoch ?? null;
}

export function setPeer(id: number, planet: string | null): void {
  if (planet === null) peers.delete(id);
  else peers.set(id, planet);
}

export function dispatchRecord(kind: string, planet: string, key: string, data: any | null): void {
  const h = recordHandlers.get(kind);
  if (!h) return;
  remoteDepth++;
  try {
    h(planet, key, data);
  } catch (e) {
    console.error(`[MP] applying ${kind} ${planet}/${key} failed`, e);
  } finally {
    remoteDepth--;
  }
}

export function dispatchLive(ch: string, fromId: number, data: any): void {
  const h = liveHandlers.get(ch);
  if (!h) return;
  try {
    h(fromId, data);
  } catch (e) {
    console.error(`[MP] live ${ch} failed`, e);
  }
}
