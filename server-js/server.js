// Tenebris JS multiplayer server.
//
// A relay with persistence, not a simulation: each client simulates itself
// and the server forwards poses, owns the shared list of block edits, and
// sends that list to everyone who joins. Every edit is appended to
// EDIT_LOG on the same message it arrives (the repo's "world edits persist
// immediately" rule), and the log is replayed on boot. Same-tile edits
// collapse to the latest when the log is compacted.
//
// Worlds: the server hosts any number of worlds, each with its own terrain
// seed and its own edit log (DATA_DIR/worlds/<id>.log, listed in
// DATA_DIR/worlds/index.json). Players browse and create them over HTTP and
// join one over the websocket:
//   GET  /worlds                 -> [{ id, name, seed, players, edits, created }]
//   POST /worlds { name, seed? } -> { id, name, seed, ... }
//   ws   /?world=<id>            (default: 'main', the original world)
// The old single-world log (js-edits.log) becomes world 'main' on first boot.
//
// Protocol (JSON text frames):
//   client -> server
//     { t: 'hello', name, look }   look = the avatar's colours / hair style
//         (the client checks values against its palette); resent on change
//     { t: 'pose', planet, p: [x,y,z], q: [x,y,z,w], a? }
//         a = [loop, shotKind, shotSeq, held]: what the player is doing
//         (src/net/AvatarPose.ts; openspec avatar-anims). Optional (older
//         clients omit it); relayed when it is four small integers, else
//         dropped - never the pose
//     { t: 'edit', planet, tile, depth, block }
//     { t: 'rec', kind, planet, key, data }   placed objects (torches, felled
//         trees, machines and their contents, launch pads and their rockets,
//         landed rockets): the latest data per (kind, planet, key) is kept
//         and logged like an edit; data null removes it
//     { t: 'live', ch, data }   relayed to the world, never stored (fauna
//         snapshots from the planet's host, rockets in flight) - except the
//         'status' channel: the player's own summary (items, suit, missions;
//         src/net/AdminReport.ts) for the admin portal, kept per player in
//         memory and never relayed
//   client -> server over HTTP
//     POST /maps/<world>/<planet>?player=<id>&key=<uploadKey>   a map image
//         (webp / png) of a planet the player has drawn with the game's map
//         renderer; kept per world + planet in DATA_DIR/maps/ for the portal
//   server -> client
//     { t: 'welcome', id, now, world: { id, name, seed, created }, edits: [[planet, tile, depth, block], ...],
//       records: [[kind, planet, key, data], ...], players: [{ id, name, look, planet, p, q, a? }],
//       uploadKey, maps: { planet: madeAtMs } }
//         uploadKey signs this connection's map uploads; maps says which
//         planets of the world have a map and when it was made
//         now is the server clock (ms): every client derives the world's time
//         of day from (now - created) so the sun is the same for everyone
//     { t: 'join', id, name, look }   { t: 'leave', id }
//     { t: 'pose', id, planet, p, q, a? }
//     { t: 'edit', id, planet, tile, depth, block }
//     { t: 'rec', id, kind, planet, key, data }   { t: 'live', id, ch, data }
//     { t: 'notice', text }   an operator message (admin portal)
//   close codes: 4004 no such world (deleted), 4001 kicked by an operator,
//   4010 the world was reset (the client drops its local copy and reloads)
//
// Operator portal: /admin (admin.js), enabled by the ADMIN_TOKEN secret.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { WebSocketServer } from 'ws';
import { handleAdmin } from './admin.js';
import { placeOn } from './geo.js';
import { cleanStatus, STATUS_CHANNEL } from './status.js';

const PORT = Number(process.env.PORT || 8080);
const DATA_DIR = process.env.DATA_DIR || '/data';
const WORLDS_DIR = path.join(DATA_DIR, 'worlds');
const WORLD_INDEX = path.join(WORLDS_DIR, 'index.json');
const LEGACY_EDIT_LOG = path.join(DATA_DIR, 'js-edits.log');
const MAPS_DIR = path.join(DATA_DIR, 'maps');   // <world>/<planet>.<webp|png>
// The game's items, missions and bodies (scripts/gen-admin-data.ts)
const GAME_DATA = JSON.parse(fs.readFileSync(new URL('./game-data.json', import.meta.url), 'utf8'));
const BODIES = new Map(GAME_DATA.bodies.map(b => [b.id, b]));
const MAX_PLAYERS = Number(process.env.MAX_PLAYERS || 64);   // whole server
const MAX_WORLDS = Number(process.env.MAX_WORLDS || 100);
const CREATE_COOLDOWN_MS = 20_000;   // per address, so the list can't be flooded
const MAX_EDITS_PER_SECOND = 40;     // per client, to bound log growth from a bad client
const MAX_RECS_PER_SECOND = 40;      // object records, per client
const MAX_LIVE_PER_SECOND = 30;      // relayed live frames, per client
const MAX_RECORDS_PER_WORLD = 20_000;
const MAX_MESSAGE_BYTES = 16 * 1024; // a chest or a rocket's cargo fits easily
const MAX_MAP_BYTES = 512 * 1024;    // one planet map image
const MAP_MIN_UPLOAD_GAP_MS = 20_000; // per player, so a client can't churn the disk
const MAP_TYPES = { 'image/webp': 'webp', 'image/png': 'png' };
const SPACE_ALT_RADII = 0.5;         // higher than this many body radii: 'in space'
const KIND = /^[a-zA-Z][a-zA-Z0-9]{0,23}$/;
const KEY = /^[A-Za-z0-9:_.-]{1,64}$/;
const CHANNEL = /^[a-zA-Z][a-zA-Z0-9]{0,23}$/;
// Planet ids are the client's SolarSystemConfig body ids. Accept any id of
// that shape rather than keeping a second list here that must be updated
// with every new planet (and silently drops edits when it isn't).
const PLANET_ID = /^[a-z][a-z0-9_]{1,23}$/;
const isPlanetId = (v) => typeof v === 'string' && PLANET_ID.test(v);
const MAIN_WORLD = { id: 'main', name: 'Tenebris', seed: 12345, created: 0 };
const recKey = (r) => `${r[0]}|${r[1]}|${r[2]}`;

// ---- worlds ---------------------------------------------------------------
// id -> { id, name, seed, created, edits: Map, log, players: Set<playerId> }
const worlds = new Map();

const cleanName = (s) => String(s ?? '').replace(/[^\x20-\x7e]/g, '').trim().slice(0, 32);

function saveIndex() {
  const list = [...worlds.values()].map(w => ({ id: w.id, name: w.name, seed: w.seed, created: w.created }));
  const tmp = `${WORLD_INDEX}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(list, null, 1));
  fs.renameSync(tmp, WORLD_INDEX);
}

function openWorld(meta) {
  const log = path.join(WORLDS_DIR, `${meta.id}.log`);
  const edits = new Map(); // "planet:tile:depth" -> [planet, tile, depth, block]
  if (fs.existsSync(log)) {
    for (const line of fs.readFileSync(log, 'utf8').split('\n')) {
      if (!line) continue;
      try {
        const e = JSON.parse(line);
        edits.set(`${e[0]}:${e[1]}:${e[2]}`, e);
      } catch {
        // a torn last line after a crash - skip it
      }
    }
    // Compact: one line per edited block
    const tmp = `${log}.tmp`;
    fs.writeFileSync(tmp, [...edits.values()].map(e => JSON.stringify(e)).join('\n') + (edits.size ? '\n' : ''));
    fs.renameSync(tmp, log);
  }
  // Placed objects: one line per record, latest wins, null data = removed
  const recLog = path.join(WORLDS_DIR, `${meta.id}.rec.log`);
  const records = new Map(); // "kind|planet|key" -> [kind, planet, key, data]
  if (fs.existsSync(recLog)) {
    for (const line of fs.readFileSync(recLog, 'utf8').split('\n')) {
      if (!line) continue;
      try {
        const r = JSON.parse(line);
        if (r[3] === null) records.delete(recKey(r));
        else records.set(recKey(r), r);
      } catch {
        // torn last line
      }
    }
    const tmp = `${recLog}.tmp`;
    fs.writeFileSync(tmp, [...records.values()].map(r => JSON.stringify(r)).join('\n') + (records.size ? '\n' : ''));
    fs.renameSync(tmp, recLog);
  }
  // Planet maps players uploaded: planet -> { at, ext }
  const maps = new Map();
  const mapDir = path.join(MAPS_DIR, meta.id);
  if (fs.existsSync(mapDir)) {
    for (const f of fs.readdirSync(mapDir)) {
      const m = /^([a-z][a-z0-9_]{1,23})\.(webp|png)$/.exec(f);
      if (m) maps.set(m[1], { at: Math.round(fs.statSync(path.join(mapDir, f)).mtimeMs), ext: m[2] });
    }
  }
  const w = { ...meta, edits, log, records, recLog, maps, mapDir, players: new Set() };
  worlds.set(w.id, w);
  return w;
}

function loadWorlds() {
  fs.mkdirSync(WORLDS_DIR, { recursive: true });
  let list = [];
  if (fs.existsSync(WORLD_INDEX)) {
    try { list = JSON.parse(fs.readFileSync(WORLD_INDEX, 'utf8')); } catch { list = []; }
  }
  if (!list.some(w => w.id === MAIN_WORLD.id)) {
    // First boot with worlds: the old single world becomes 'main'
    if (fs.existsSync(LEGACY_EDIT_LOG)) fs.renameSync(LEGACY_EDIT_LOG, path.join(WORLDS_DIR, 'main.log'));
    list.unshift(MAIN_WORLD);
  }
  for (const meta of list) openWorld(meta);
  saveIndex();
  let total = 0;
  let recs = 0;
  for (const w of worlds.values()) { total += w.edits.size; recs += w.records.size; }
  console.log(`loaded ${worlds.size} world(s), ${total} edits, ${recs} objects`);
}

function createWorld(name, seed) {
  const id = crypto.randomBytes(4).toString('hex');
  const w = openWorld({
    id,
    name: cleanName(name) || `World ${worlds.size + 1}`,
    seed: Number.isInteger(seed) && Math.abs(seed) < 2 ** 31 ? seed : crypto.randomInt(1, 2 ** 31 - 1),
    created: Date.now(),
  });
  saveIndex();
  return w;
}

const worldInfo = (w) => ({ id: w.id, name: w.name, seed: w.seed, created: w.created, players: w.players.size, edits: w.edits.size + w.records.size });

function recordEdit(w, e) {
  w.edits.set(`${e[0]}:${e[1]}:${e[2]}`, e);
  fs.appendFileSync(w.log, JSON.stringify(e) + '\n');
}

function recordObject(w, r) {
  if (r[3] === null) w.records.delete(recKey(r));
  else w.records.set(recKey(r), r);
  fs.appendFileSync(w.recLog, JSON.stringify(r) + '\n');
}

// A per-client rate window: false once the client has sent more than
// `max` of this kind of message in the last second
function allow(pl, kind, max) {
  const now = Date.now();
  const win = pl.rate[kind] ?? (pl.rate[kind] = { start: now, count: 0 });
  if (now - win.start > 1000) { win.start = now; win.count = 0; }
  return ++win.count <= max;
}

// ---- operator actions (admin portal) --------------------------------------
const CLOSE_KICKED = 4001;
const CLOSE_DELETED = 4004;
const CLOSE_RESET = 4010;

function closeWorldPlayers(w, code, reason) {
  for (const pid of [...w.players]) players.get(pid)?.ws.close(code, reason);
}

function renameWorld(w, name) {
  const clean = cleanName(name);
  if (!clean) return false;
  w.name = clean;
  saveIndex();
  return true;
}

// Delete a world and its files ('main' stays: it is the default world)
function deleteWorld(w) {
  if (w.id === MAIN_WORLD.id) return false;
  closeWorldPlayers(w, CLOSE_DELETED, 'world deleted');
  worlds.delete(w.id);
  for (const f of [w.log, w.recLog]) fs.rmSync(f, { force: true });
  dropMaps(w);
  saveIndex();
  return true;
}

// A world's planet maps (its terrain is gone or about to change wholesale)
function dropMaps(w) {
  fs.rmSync(w.mapDir, { recursive: true, force: true });
  w.maps.clear();
}

// Back to fresh terrain: every edit and object gone, same name and seed
function resetWorld(w) {
  closeWorldPlayers(w, CLOSE_RESET, 'world reset');
  w.edits.clear();
  w.records.clear();
  for (const f of [w.log, w.recLog]) fs.writeFileSync(f, '');
  dropMaps(w);
  return true;
}

// Remove every object record of one kind (e.g. a torch-spam cleanup);
// players online see them go at once
function clearRecordKind(w, kind) {
  let n = 0;
  for (const r of [...w.records.values()]) {
    if (r[0] !== kind) continue;
    const gone = [r[0], r[1], r[2], null];
    recordObject(w, gone);
    broadcast(w, { t: 'rec', id: 0, kind: r[0], planet: r[1], key: r[2], data: null });
    n++;
  }
  return n;
}

function kickPlayer(id, reason) {
  const pl = players.get(id);
  if (!pl) return false;
  pl.ws.close(CLOSE_KICKED, String(reason || 'kicked').slice(0, 100));
  return true;
}

function noticeWorld(w, text) {
  const clean = String(text ?? '').replace(/[^\x20-\x7e]/g, '').trim().slice(0, 200);
  if (!clean) return false;
  broadcast(w, { t: 'notice', text: clean });
  return true;
}

// What the portal shows of a player: who, where (lat / lon / altitude on
// their planet, and map u v), and their last status frame
function playerInfo(p) {
  const body = BODIES.get(p.planet);
  const at = body ? placeOn(p.p, body) : null;
  const riding = p.status?.ride === 'rocket';
  const place = riding ? 'rocket' : at && body && at.alt > SPACE_ALT_RADII * body.radius ? 'space' : 'surface';
  return {
    id: p.id, name: p.name, look: p.look, planet: p.planet, since: p.joinedAt, lastSeen: p.lastSeen,
    place, at, status: p.status,
  };
}

const startedAt = Date.now();
function serverStatus() {
  const mem = process.memoryUsage();
  return {
    uptimeS: Math.round((Date.now() - startedAt) / 1000),
    rssMb: Math.round(mem.rss / 1048576),
    heapMb: Math.round(mem.heapUsed / 1048576),
    players: players.size,
    maxPlayers: MAX_PLAYERS,
    worlds: [...worlds.values()].map(w => {
      const kinds = {};
      for (const r of w.records.values()) kinds[r[0]] = (kinds[r[0]] ?? 0) + 1;
      return {
        id: w.id, name: w.name, seed: w.seed, created: w.created,
        edits: w.edits.size, records: w.records.size, kinds,
        players: [...w.players].map(pid => players.get(pid)).filter(Boolean).map(playerInfo),
        maps: Object.fromEntries([...w.maps].map(([planet, m]) => [planet, m.at])),
      };
    }),
  };
}


// ---- players --------------------------------------------------------------
let nextId = 1;
const players = new Map(); // id -> { ws, world, name, planet, p, q, rate }

function send(ws, msg) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}
// Everyone in a world, except one player
function broadcast(w, msg, exceptId) {
  const data = JSON.stringify(msg);
  for (const id of w.players) {
    const pl = players.get(id);
    if (id !== exceptId && pl && pl.ws.readyState === pl.ws.OPEN) pl.ws.send(data);
  }
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isVec = (v, n) => Array.isArray(v) && v.length === n && v.every(isNum);
// The pose frame's action field: four integers, each within a 16-bit
// protocol bound (the client decodes the exact ranges)
const ACTION_LEN = 4;
const ACTION_MAX = 0xffff;
const isAction = (v) => Array.isArray(v) && v.length === ACTION_LEN
  && v.every(x => Number.isInteger(x) && x >= 0 && x <= ACTION_MAX);
// An avatar look: a few short string fields (the client validates the values)
function cleanLook(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const out = {};
  for (const [k, x] of Object.entries(v).slice(0, 12)) {
    if (/^[a-z]{1,12}$/.test(k) && typeof x === 'string' && /^[#a-z0-9]{1,16}$/i.test(x)) out[k] = x;
  }
  return out;
}

function onMessage(id, raw) {
  const pl = players.get(id);
  // nothing from a connection being closed (kicked, world reset / deleted)
  if (!pl || pl.ws.readyState !== pl.ws.OPEN) return;
  const w = pl.world;
  let m;
  try { m = JSON.parse(raw); } catch { return; }
  if (!m || typeof m !== 'object') return;
  pl.lastSeen = Date.now();

  if (m.t === 'hello' && typeof m.name === 'string') {
    pl.name = m.name.replace(/[^\x20-\x7e]/g, '').slice(0, 24) || pl.name;
    pl.look = cleanLook(m.look) ?? pl.look;
    broadcast(w, { t: 'join', id, name: pl.name, look: pl.look }, id);
  } else if (m.t === 'pose' && isPlanetId(m.planet) && isVec(m.p, 3) && isVec(m.q, 4)) {
    const a = isAction(m.a) ? m.a : undefined;
    pl.planet = m.planet; pl.p = m.p; pl.q = m.q; pl.a = a;
    broadcast(w, { t: 'pose', id, planet: m.planet, p: m.p, q: m.q, a }, id);
  } else if (m.t === 'edit' && isPlanetId(m.planet) && Number.isInteger(m.tile) && Number.isInteger(m.depth) && Number.isInteger(m.block)
             && m.tile >= 0 && m.tile < 1_000_000 && m.depth >= 0 && m.depth < 256 && m.block >= 0 && m.block < 256) {
    if (!allow(pl, 'edit', MAX_EDITS_PER_SECOND)) return;
    const e = [m.planet, m.tile, m.depth, m.block];
    recordEdit(w, e);
    broadcast(w, { t: 'edit', id, planet: m.planet, tile: m.tile, depth: m.depth, block: m.block }, id);
  } else if (m.t === 'rec' && typeof m.kind === 'string' && KIND.test(m.kind) && isPlanetId(m.planet)
             && typeof m.key === 'string' && KEY.test(m.key) && (m.data === null || (typeof m.data === 'object' && !Array.isArray(m.data)))) {
    if (!allow(pl, 'rec', MAX_RECS_PER_SECOND)) return;
    const r = [m.kind, m.planet, m.key, m.data];
    if (r[3] !== null && !w.records.has(recKey(r)) && w.records.size >= MAX_RECORDS_PER_WORLD) return;
    recordObject(w, r);
    broadcast(w, { t: 'rec', id, kind: m.kind, planet: m.planet, key: m.key, data: m.data }, id);
  } else if (m.t === 'live' && m.ch === STATUS_CHANNEL) {
    if (!allow(pl, 'live', MAX_LIVE_PER_SECOND)) return;
    const st = cleanStatus(m.data);
    if (st) pl.status = { ...st, at: Date.now() };
  } else if (m.t === 'live' && typeof m.ch === 'string' && CHANNEL.test(m.ch)) {
    if (!allow(pl, 'live', MAX_LIVE_PER_SECOND)) return;
    broadcast(w, { t: 'live', id, ch: m.ch, data: m.data ?? null }, id);
  }
}

// ---- http + websocket -----------------------------------------------------
loadWorlds();

const lastCreate = new Map(); // address -> time

function json(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json',
    // the game is served from other origins (heavyphoton.com, itch.io, GitHub Pages)
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
  });
  res.end(JSON.stringify(body));
}

// A planet map from a player of that world (their connection's key)
function uploadMap(req, res, url) {
  const [, , worldId, planet] = url.pathname.split('/');
  const w = worlds.get(worldId);
  const pl = players.get(Number(url.searchParams.get('player')));
  const ext = MAP_TYPES[(req.headers['content-type'] || '').split(';')[0].trim()];
  if (!w || !isPlanetId(planet) || !pl || pl.world !== w || url.searchParams.get('key') !== pl.uploadKey) {
    return json(res, 403, { error: 'Not a player of that world' });
  }
  if (!ext) return json(res, 415, { error: 'webp or png only' });
  if (Number(req.headers['content-length'] || 0) > MAX_MAP_BYTES) return json(res, 413, { error: 'Too big' });
  if (Date.now() - pl.lastMapAt < MAP_MIN_UPLOAD_GAP_MS) return json(res, 429, { error: 'Too soon' });
  pl.lastMapAt = Date.now();
  const chunks = [];
  let size = 0;
  req.on('data', (c) => { size += c.length; if (size > MAX_MAP_BYTES) req.destroy(); else chunks.push(c); });
  req.on('end', () => {
    if (size > MAX_MAP_BYTES || !worlds.has(w.id)) return json(res, 400, { error: 'Dropped' });
    fs.mkdirSync(w.mapDir, { recursive: true });
    const old = w.maps.get(planet);
    const file = path.join(w.mapDir, `${planet}.${ext}`);
    fs.writeFileSync(`${file}.tmp`, Buffer.concat(chunks));
    fs.renameSync(`${file}.tmp`, file);
    if (old && old.ext !== ext) fs.rmSync(path.join(w.mapDir, `${planet}.${old.ext}`), { force: true });
    w.maps.set(planet, { at: Date.now(), ext });
    json(res, 201, { ok: true });
  });
}

// A world's planet map: its file, type and when it was made, or null
function mapFile(w, planet) {
  const m = w.maps.get(planet);
  return m ? { file: path.join(w.mapDir, `${planet}.${m.ext}`), type: `image/${m.ext}`, at: m.at } : null;
}

const admin = { worlds, players, serverStatus, renameWorld, deleteWorld, resetWorld, clearRecordKind, kickPlayer, noticeWorld, gameData: GAME_DATA, mapFile };

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) return handleAdmin(req, res, url, admin);
  if (url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('ok');
    return;
  }
  if (url.pathname.startsWith('/maps/') && req.method === 'OPTIONS') return json(res, 204, {});
  if (url.pathname.startsWith('/maps/') && req.method === 'POST') return uploadMap(req, res, url);
  if (url.pathname === '/worlds' && req.method === 'OPTIONS') return json(res, 204, {});
  if (url.pathname === '/worlds' && req.method === 'GET') {
    // busiest first, then newest
    const list = [...worlds.values()].map(worldInfo)
      .sort((a, b) => (b.players - a.players) || (a.id === 'main' ? -1 : b.id === 'main' ? 1 : b.created - a.created));
    return json(res, 200, list);
  }
  if (url.pathname === '/worlds' && req.method === 'POST') {
    const addr = (req.headers['fly-client-ip'] || req.socket.remoteAddress || '').toString();
    if (Date.now() - (lastCreate.get(addr) ?? 0) < CREATE_COOLDOWN_MS) return json(res, 429, { error: 'Wait a moment before creating another world' });
    if (worlds.size >= MAX_WORLDS) return json(res, 409, { error: 'This server is full of worlds' });
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 1024) req.destroy(); });
    req.on('end', () => {
      let m = {};
      try { m = JSON.parse(body || '{}'); } catch { return json(res, 400, { error: 'Bad request' }); }
      lastCreate.set(addr, Date.now());
      const w = createWorld(m.name, Number(m.seed));
      console.log(`created world ${w.id} "${w.name}" seed ${w.seed}`);
      json(res, 201, worldInfo(w));
    });
    return;
  }
  res.writeHead(200, { 'content-type': 'text/plain' });
  let edits = 0;
  for (const w of worlds.values()) edits += w.edits.size;
  res.end(`Tenebris JS server - ${players.size} player(s) online in ${worlds.size} world(s), ${edits} block edits saved\n`);
});

const wss = new WebSocketServer({ server, maxPayload: MAX_MESSAGE_BYTES });
wss.on('connection', (ws, req) => {
  if (players.size >= MAX_PLAYERS) {
    ws.close(1013, 'server full');
    return;
  }
  const worldId = new URL(req.url ?? '/', 'http://x').searchParams.get('world') || MAIN_WORLD.id;
  const w = worlds.get(worldId);
  if (!w) {
    ws.close(CLOSE_DELETED, 'no such world');
    return;
  }
  const id = nextId++;
  const uploadKey = crypto.randomBytes(12).toString('hex');
  players.set(id, { ws, world: w, name: `Player ${id}`, planet: 'earth', p: [0, 0, 0], q: [0, 0, 0, 1], look: null, rate: {}, id, joinedAt: Date.now(), lastSeen: Date.now(), status: null, uploadKey, lastMapAt: 0 });
  send(ws, {
    t: 'welcome',
    id,
    now: Date.now(),
    world: { id: w.id, name: w.name, seed: w.seed, created: w.created },
    edits: [...w.edits.values()],
    records: [...w.records.values()],
    players: [...w.players].map(pid => [pid, players.get(pid)]).filter(([, p]) => p)
      .map(([pid, p]) => ({ id: pid, name: p.name, look: p.look, planet: p.planet, p: p.p, q: p.q, a: p.a })),
    uploadKey,
    maps: Object.fromEntries([...w.maps].map(([planet, m]) => [planet, m.at])),
  });
  w.players.add(id);
  ws.on('message', (data) => onMessage(id, data.toString()));
  ws.on('close', () => {
    players.delete(id);
    w.players.delete(id);
    broadcast(w, { t: 'leave', id });
  });
  ws.on('error', () => ws.close());
});

server.listen(PORT, () => console.log(`tenebris js server on :${PORT}, data in ${DATA_DIR}`));
