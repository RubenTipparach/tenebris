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
 * - Shared use (openspec mp-shared-objects): every record has a version
 *   from the server, and a change is a compare-and-set on the version it
 *   was made on. One write per record is in flight at a time (later local
 *   changes wait and go as one); the server acks it, or refuses it when
 *   someone else changed the record first and sends the current record
 *   back. Then the change is undone: the record is rebuilt from the server's
 *   copy and the player's inventory gets back exactly what the refused
 *   change moved (the trade ledger, PlanetBlockInteraction), so two players
 *   at one chest can never both take the same stack.
 * - Chat: a line typed by a player, relayed by the server to the world;
 *   join / leave / operator notices show in the same log as system lines.
 *
 * Handlers for remote traffic are registered per kind / channel. They run
 * for OTHER players' messages only; a system applying a remote record must
 * not send it back (use `applyingRemote()` to tell).
 */

export type RecordHandler = (planet: string, key: string, data: any | null) => void;
export type LiveHandler = (fromId: number, data: any) => void;
/** This client's own copy of every record of a kind (its local save). */
export type LocalRecords = () => Array<{ planet: string; key: string; data: object }>;

/** Items a change moved into the player's inventory (itemType -> count; negative = out of it). */
export type ItemDelta = Record<number, number>;

/**
 * What a player's own action moved between their inventory and the object
 * it changed: `take` returns that since the action began (null outside a
 * player action - a machine's own tick moves nothing of theirs), `refund`
 * undoes it when the server refuses the change.
 */
export interface TradeLedger {
  take(): ItemDelta | null;
  refund(delta: ItemDelta): void;
}

/** A chat log line: a player's (id > 0) or a system line (join / leave / notice). */
export interface ChatLine { id: number; name: string; text: string; at: number; system?: boolean }
export type ChatHandler = (line: ChatLine) => void;

interface Transport {
  sendRecord(kind: string, planet: string, key: string, data: object | null, base: number): void;
  sendChat(text: string): void;
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
// Record versions as the server last confirmed them (address -> v; absent = 0)
const versions = new Map<string, number>();
// A write the server has not answered yet, and what waits behind it
interface Pending { comp: ItemDelta | null; queued: { kind: string; planet: string; key: string; data: object | null; comp: ItemDelta | null } | null }
const pending = new Map<string, Pending>();
let ledger: TradeLedger | null = null;
// Joining uploads objects made offline: no player action, no trade
let uploading = false;
const chatHandlers: ChatHandler[] = [];

/** Sum two item deltas (null = nothing). */
export function addDelta(a: ItemDelta | null, b: ItemDelta | null): ItemDelta | null {
  if (!a) return b ? { ...b } : null;
  if (!b) return a;
  const out: ItemDelta = { ...a };
  for (const [k, n] of Object.entries(b)) out[Number(k)] = (out[Number(k)] ?? 0) + n;
  return out;
}

/** after - before, per item type, zeros dropped (the trade a player action made). */
export function diffCounts(before: Map<number, number>, after: Map<number, number>): ItemDelta {
  const out: ItemDelta = {};
  for (const k of new Set([...before.keys(), ...after.keys()])) {
    const d = (after.get(k) ?? 0) - (before.get(k) ?? 0);
    if (d !== 0) out[k] = d;
  }
  return out;
}

function sendVersioned(kind: string, planet: string, key: string, data: object | null): void {
  transport!.sendRecord(kind, planet, key, data, versions.get(address(kind, planet, key)) ?? 0);
}
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
let knownSaveTimer: ReturnType<typeof setTimeout> | null = null;
function saveKnown(): void {
  if (!knownKey || knownSaveTimer !== null) return;
  // batched: a join can touch thousands of records
  knownSaveTimer = setTimeout(() => {
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
    // A player's action: what it moved in or out of their inventory, so a
    // refused change can be undone (null for a machine's own tick)
    const comp = uploading ? null : ledger?.take() ?? null;
    const p = pending.get(addr);
    if (p) {
      // one write in flight per record: this one goes when that is answered
      p.queued = { kind, planet, key: String(key), data, comp: addDelta(p.queued?.comp ?? null, comp) };
      return;
    }
    pending.set(addr, { comp, queued: null });
    sendVersioned(kind, planet, String(key), data);
  },

  /** Where a player action's inventory trade is measured and undone (PlanetBlockInteraction). */
  setTradeLedger(l: TradeLedger | null): void {
    ledger = l;
  },

  /** Has this client a change to the record the server has not confirmed yet? */
  hasPending(kind: string, planet: string, key: string | number): boolean {
    return pending.has(address(kind, planet, String(key)));
  },

  /** Send a chat line (no-op offline). */
  chat(text: string): void {
    transport?.sendChat(text);
  },

  /** Lines for the chat log: players' lines and system lines (join / leave / notices). */
  onChat(handler: ChatHandler): void {
    chatHandlers.push(handler);
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
  // a new connection starts from the welcome's versions; an unanswered write
  // from the last one is forgotten (the server may or may not have it)
  versions.clear();
  pending.clear();
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
export function applySnapshot(records: Array<[string, string, string, any, number?]>): void {
  const onServer = new Set(records.map(([k, p, key]) => address(k, p, key)));
  for (const [k, p, key, , v] of records) if (typeof v === 'number') versions.set(address(k, p, key), v);
  for (const [kind, list] of localLists) {
    for (const { planet, key, data } of list()) {
      const addr = address(kind, planet, key);
      if (onServer.has(addr)) continue;
      if (known.has(addr)) dispatchRecord(kind, planet, key, null);
      else {
        uploading = true;
        try { netSync.record(kind, planet, key, data); } finally { uploading = false; }
      }
    }
  }
  for (const [kind, planet, key, data] of records) dispatchRecord(kind, planet, key, data);
  known = new Set([...onServer, ...[...known].filter(a => lastState.has(a))]);
  saveKnown();
}

export function dispatchRecord(kind: string, planet: string, key: string, data: any | null, v?: number): void {
  const addr = address(kind, planet, key);
  if (typeof v === 'number') versions.set(addr, v);
  // Another player's change landed before ours: the server will refuse ours
  // and send this record back with the refusal - apply it then, once
  if (pending.has(addr)) return;
  applyRecord(kind, planet, key, data);
}

function applyRecord(kind: string, planet: string, key: string, data: any | null): void {
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

/** The server took this client's write of a record (now at version v). */
export function ackRecord(kind: string, planet: string, key: string, v: number): void {
  const addr = address(kind, planet, key);
  versions.set(addr, v);
  const p = pending.get(addr);
  if (!p) return;
  if (!p.queued || !transport) { pending.delete(addr); return; }
  const q = p.queued;
  pending.set(addr, { comp: q.comp, queued: null });
  sendVersioned(q.kind, q.planet, q.key, q.data);
}

/**
 * The server refused this client's write (someone changed the record first):
 * rebuild the object from the server's copy and give the player back what
 * the refused changes moved.
 */
export function nackRecord(kind: string, planet: string, key: string, v: number, data: any | null): void {
  const addr = address(kind, planet, key);
  versions.set(addr, v);
  const p = pending.get(addr);
  pending.delete(addr);
  const comp = addDelta(p?.comp ?? null, p?.queued?.comp ?? null);
  if (data) known.add(addr);
  else known.delete(addr);
  applyRecord(kind, planet, key, data);
  if (comp && Object.values(comp).some(n => n !== 0)) ledger?.refund(comp);
}

/** A chat line for the log (from the server, or a system line made here). */
export function dispatchChat(line: ChatLine): void {
  for (const h of chatHandlers) {
    try {
      h(line);
    } catch (e) {
      console.error('[MP] chat handler failed', e);
    }
  }
}
