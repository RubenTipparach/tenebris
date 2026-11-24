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
 * - Map uploads: a picture of a planet's map for the admin portal (openspec
 *   admin-monitor), sent over HTTP by the transport, signed with the key
 *   the server gave this connection.
 *
 * Handlers for remote traffic are registered per kind / channel. They run
 * for OTHER players' messages only; a system applying a remote record must
 * not send it back (use `applyingRemote()` to tell).
 */

export type RecordHandler = (planet: string, key: string, data: any | null) => void;
export type LiveHandler = (fromId: number, data: any) => void;
/** This client's own copy of every record of a kind (its local save). */
export type LocalRecords = () => Array<{ planet: string; key: string; data: object }>;

interface Transport {
  sendRecord(kind: string, planet: string, key: string, data: object | null): void;
  sendLive(ch: string, data: unknown): void;
  uploadMap(planet: string, image: Blob): Promise<boolean>;
}

const recordHandlers = new Map<string, RecordHandler>();
const localLists = new Map<string, LocalRecords>();
// What was last sent / received per record address, so re-saving an
// unchanged object (the periodic machine saves) sends nothing
const lastState = new Map<string, string>();
// Addresses the server is known to hold, remembered per world in
// localStorage: on joining, a local object the server no longer has was
// removed by someone else (if it's in here) or made offline (if not - it's
// uploaded)
let known = new Set<string>();
let knownKey: string | null = null;
const address = (kind: string, planet: string, key: string) => `${kind}|${planet}|${key}`;

function loadKnown(worldId: string): void {
  knownKey = `tenebris_w_${worldId.replace(/[^a-z0-9]/gi, '')}_synced`;
  try {
    known = new Set(JSON.parse(localStorage.getItem(knownKey) ?? '[]'));
  } catch {
    known = new Set();
  }
}
let knownSaveTimer: number | null = null;
function saveKnown(): void {
  if (!knownKey || knownSaveTimer !== null) return;
  // batched: a join can touch thousands of records
  knownSaveTimer = window.setTimeout(() => {
    knownSaveTimer = null;
    try {
      localStorage.setItem(knownKey!, JSON.stringify([...known]));
    } catch {
      // storage full or blocked: the next join just re-uploads
    }
  }, 500);
}
const liveHandlers = new Map<string, LiveHandler>();
let transport: Transport | null = null;
let remoteDepth = 0;
let clockOffsetMs = 0;       // server clock - local clock
let worldEpochMs: number | null = null;
let myId = 0;
// Other players: id -> the planet they're on
const peers = new Map<number, string>();
// ...and where they are (world position, last reported)
const peerPos = new Map<number, [number, number, number]>();
// The world's planet maps on the server: planet -> when made (local clock)
let maps: Record<string, number> = {};

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
    const addr = address(kind, planet, String(key));
    const json = JSON.stringify(data);
    if (lastState.get(addr) === json) return;
    lastState.set(addr, json);
    if (data) known.add(addr);
    else known.delete(addr);
    saveKnown();
    transport.sendRecord(kind, planet, String(key), data);
  },

  /** Relay a live frame to the world. No-op offline. */
  live(ch: string, data: unknown): void {
    transport?.sendLive(ch, data);
  },

  /**
   * Apply other players' records of a kind. `local` lists this client's own
   * copies, so joining can reconcile them with the server's.
   */
  onRecord(kind: string, handler: RecordHandler, local?: LocalRecords): void {
    recordHandlers.set(kind, handler);
    if (local) localLists.set(kind, local);
  },

  onLive(ch: string, handler: LiveHandler): void {
    liveHandlers.set(ch, handler);
  },

  /** True while a remote record is being applied (so the system doesn't echo it). */
  applyingRemote(): boolean {
    return remoteDepth > 0;
  },

  /** The server's planet maps of this world: planet -> when made (local clock ms). */
  serverMaps(): Readonly<Record<string, number>> {
    return maps;
  },

  /** Upload a planet's map picture for the admin portal. False offline or when refused. */
  async uploadMap(planet: string, image: Blob): Promise<boolean> {
    if (!transport) return false;
    const ok = await transport.uploadMap(planet, image);
    if (ok) maps = { ...maps, [planet]: Date.now() };
    return ok;
  },

  /** Ids of the other players on a planet. */
  peersOn(planet: string): number[] {
    const out: number[] = [];
    for (const [id, p] of peers) if (p === planet) out.push(id);
    return out;
  },

  /** World positions of the other players on a planet (last reported pose). */
  peerPositionsOn(planet: string): [number, number, number][] {
    const out: [number, number, number][] = [];
    for (const [id, p] of peers) {
      const pos = peerPos.get(id);
      if (p === planet && pos) out.push(pos);
    }
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

export function attachTransport(t: Transport | null, id = 0, serverNow?: number, epoch?: number, worldId?: string, serverMaps?: Record<string, number>): void {
  transport = t;
  myId = id;
  lastState.clear();
  if (!t) { peers.clear(); peerPos.clear(); }
  if (t && worldId) loadKnown(worldId);
  if (serverNow !== undefined) clockOffsetMs = serverNow - Date.now();
  // the server's times on this client's clock
  maps = {};
  for (const [planet, at] of Object.entries(serverMaps ?? {})) if (typeof at === 'number') maps[planet] = at - clockOffsetMs;
  worldEpochMs = epoch ?? null;
}

export function setPeer(id: number, planet: string | null, pos?: ArrayLike<number>): void {
  if (planet === null) { peers.delete(id); peerPos.delete(id); return; }
  peers.set(id, planet);
  if (pos && pos.length >= 3) peerPos.set(id, [pos[0], pos[1], pos[2]]);
}

/**
 * Joining: reconcile this client's objects with the server's, then apply the
 * server's. A local object the server lacks is removed when the server had
 * it before (someone took it away meanwhile), else uploaded (made offline).
 */
export function applySnapshot(records: Array<[string, string, string, any]>): void {
  const onServer = new Set(records.map(([k, p, key]) => address(k, p, key)));
  for (const [kind, list] of localLists) {
    for (const { planet, key, data } of list()) {
      const addr = address(kind, planet, key);
      if (onServer.has(addr)) continue;
      if (known.has(addr)) dispatchRecord(kind, planet, key, null);
      else netSync.record(kind, planet, key, data);
    }
  }
  for (const [kind, planet, key, data] of records) dispatchRecord(kind, planet, key, data);
  known = new Set([...onServer, ...[...known].filter(a => lastState.has(a))]);
  saveKnown();
}

export function dispatchRecord(kind: string, planet: string, key: string, data: any | null): void {
  const addr = address(kind, planet, key);
  lastState.set(addr, JSON.stringify(data));
  if (data) known.add(addr);
  else known.delete(addr);
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
