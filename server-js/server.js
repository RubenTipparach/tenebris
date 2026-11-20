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
//     { t: 'hello', name }
//     { t: 'pose', planet, p: [x,y,z], q: [x,y,z,w] }
//     { t: 'edit', planet, tile, depth, block }
//   server -> client
//     { t: 'welcome', id, world: { id, name, seed }, edits: [[planet, tile, depth, block], ...], players: [{ id, name, planet, p, q }] }
//     { t: 'join', id, name }   { t: 'leave', id }
//     { t: 'pose', id, planet, p, q }
//     { t: 'edit', id, planet, tile, depth, block }
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT || 8080);
const DATA_DIR = process.env.DATA_DIR || '/data';
const WORLDS_DIR = path.join(DATA_DIR, 'worlds');
const WORLD_INDEX = path.join(WORLDS_DIR, 'index.json');
const LEGACY_EDIT_LOG = path.join(DATA_DIR, 'js-edits.log');
const MAX_PLAYERS = Number(process.env.MAX_PLAYERS || 64);   // whole server
const MAX_WORLDS = Number(process.env.MAX_WORLDS || 100);
const CREATE_COOLDOWN_MS = 20_000;   // per address, so the list can't be flooded
const MAX_EDITS_PER_SECOND = 40;     // per client, to bound log growth from a bad client
const KNOWN_PLANETS = new Set(['earth', 'moon', 'sequoia']);
const MAIN_WORLD = { id: 'main', name: 'Tenebris', seed: 12345, created: 0 };

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
  const w = { ...meta, edits, log, players: new Set() };
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
  for (const w of worlds.values()) total += w.edits.size;
  console.log(`loaded ${worlds.size} world(s), ${total} edits`);
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

const worldInfo = (w) => ({ id: w.id, name: w.name, seed: w.seed, created: w.created, players: w.players.size, edits: w.edits.size });

function recordEdit(w, e) {
  w.edits.set(`${e[0]}:${e[1]}:${e[2]}`, e);
  fs.appendFileSync(w.log, JSON.stringify(e) + '\n');
}

// ---- players --------------------------------------------------------------
let nextId = 1;
const players = new Map(); // id -> { ws, world, name, planet, p, q, editWindow, editCount }

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

function onMessage(id, raw) {
  const pl = players.get(id);
  if (!pl) return;
  const w = pl.world;
  let m;
  try { m = JSON.parse(raw); } catch { return; }
  if (!m || typeof m !== 'object') return;

  if (m.t === 'hello' && typeof m.name === 'string') {
    pl.name = m.name.replace(/[^\x20-\x7e]/g, '').slice(0, 24) || pl.name;
    broadcast(w, { t: 'join', id, name: pl.name }, id);
  } else if (m.t === 'pose' && KNOWN_PLANETS.has(m.planet) && isVec(m.p, 3) && isVec(m.q, 4)) {
    pl.planet = m.planet; pl.p = m.p; pl.q = m.q;
    broadcast(w, { t: 'pose', id, planet: m.planet, p: m.p, q: m.q }, id);
  } else if (m.t === 'edit' && KNOWN_PLANETS.has(m.planet) && Number.isInteger(m.tile) && Number.isInteger(m.depth) && Number.isInteger(m.block)
             && m.tile >= 0 && m.tile < 1_000_000 && m.depth >= 0 && m.depth < 256 && m.block >= 0 && m.block < 256) {
    const now = Date.now();
    if (now - pl.editWindow > 1000) { pl.editWindow = now; pl.editCount = 0; }
    if (++pl.editCount > MAX_EDITS_PER_SECOND) return;
    const e = [m.planet, m.tile, m.depth, m.block];
    recordEdit(w, e);
    broadcast(w, { t: 'edit', id, planet: m.planet, tile: m.tile, depth: m.depth, block: m.block }, id);
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

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('ok');
    return;
  }
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

const wss = new WebSocketServer({ server, maxPayload: 4096 });
wss.on('connection', (ws, req) => {
  if (players.size >= MAX_PLAYERS) {
    ws.close(1013, 'server full');
    return;
  }
  const worldId = new URL(req.url ?? '/', 'http://x').searchParams.get('world') || MAIN_WORLD.id;
  const w = worlds.get(worldId);
  if (!w) {
    ws.close(4004, 'no such world');
    return;
  }
  const id = nextId++;
  players.set(id, { ws, world: w, name: `Player ${id}`, planet: 'earth', p: [0, 0, 0], q: [0, 0, 0, 1], editWindow: 0, editCount: 0 });
  send(ws, {
    t: 'welcome',
    id,
    world: { id: w.id, name: w.name, seed: w.seed },
    edits: [...w.edits.values()],
    players: [...w.players].map(pid => [pid, players.get(pid)]).filter(([, p]) => p)
      .map(([pid, p]) => ({ id: pid, name: p.name, planet: p.planet, p: p.p, q: p.q })),
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
