// Tenebris JS multiplayer server.
//
// A relay with persistence, not a simulation: each client simulates itself
// and the server forwards poses, owns the shared list of block edits, and
// sends that list to everyone who joins. Every edit is appended to
// EDIT_LOG on the same message it arrives (the repo's "world edits persist
// immediately" rule), and the log is replayed on boot. Same-tile edits
// collapse to the latest when the log is compacted.
//
// Protocol (JSON text frames):
//   client -> server
//     { t: 'hello', name }
//     { t: 'pose', planet, p: [x,y,z], q: [x,y,z,w] }
//     { t: 'edit', planet, tile, depth, block }
//   server -> client
//     { t: 'welcome', id, edits: [[planet, tile, depth, block], ...], players: [{ id, name, planet, p, q }] }
//     { t: 'join', id, name }   { t: 'leave', id }
//     { t: 'pose', id, planet, p, q }
//     { t: 'edit', id, planet, tile, depth, block }
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT || 8080);
const DATA_DIR = process.env.DATA_DIR || '/data';
const EDIT_LOG = path.join(DATA_DIR, 'js-edits.log');
const MAX_PLAYERS = Number(process.env.MAX_PLAYERS || 32);
const MAX_EDITS_PER_SECOND = 40;     // per client, to bound log growth from a bad client
const KNOWN_PLANETS = new Set(['earth', 'moon', 'sequoia']);

// ---- persistent edits -----------------------------------------------------
const edits = new Map(); // "planet:tile:depth" -> [planet, tile, depth, block]

function loadEdits() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(EDIT_LOG)) return;
  const lines = fs.readFileSync(EDIT_LOG, 'utf8').split('\n');
  for (const line of lines) {
    if (!line) continue;
    try {
      const e = JSON.parse(line);
      edits.set(`${e[0]}:${e[1]}:${e[2]}`, e);
    } catch {
      // a torn last line after a crash - skip it
    }
  }
  // Compact: one line per edited block
  const tmp = `${EDIT_LOG}.tmp`;
  fs.writeFileSync(tmp, [...edits.values()].map(e => JSON.stringify(e)).join('\n') + (edits.size ? '\n' : ''));
  fs.renameSync(tmp, EDIT_LOG);
  console.log(`loaded ${edits.size} edits from ${EDIT_LOG}`);
}

function recordEdit(e) {
  edits.set(`${e[0]}:${e[1]}:${e[2]}`, e);
  fs.appendFileSync(EDIT_LOG, JSON.stringify(e) + '\n');
}

// ---- players --------------------------------------------------------------
let nextId = 1;
const players = new Map(); // id -> { ws, name, planet, p, q, editWindow, editCount }

function send(ws, msg) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}
function broadcast(msg, exceptId) {
  const data = JSON.stringify(msg);
  for (const [id, pl] of players) {
    if (id !== exceptId && pl.ws.readyState === pl.ws.OPEN) pl.ws.send(data);
  }
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isVec = (v, n) => Array.isArray(v) && v.length === n && v.every(isNum);

function onMessage(id, raw) {
  const pl = players.get(id);
  if (!pl) return;
  let m;
  try { m = JSON.parse(raw); } catch { return; }
  if (!m || typeof m !== 'object') return;

  if (m.t === 'hello' && typeof m.name === 'string') {
    pl.name = m.name.replace(/[^\x20-\x7e]/g, '').slice(0, 24) || pl.name;
    broadcast({ t: 'join', id, name: pl.name }, id);
  } else if (m.t === 'pose' && KNOWN_PLANETS.has(m.planet) && isVec(m.p, 3) && isVec(m.q, 4)) {
    pl.planet = m.planet; pl.p = m.p; pl.q = m.q;
    broadcast({ t: 'pose', id, planet: m.planet, p: m.p, q: m.q }, id);
  } else if (m.t === 'edit' && KNOWN_PLANETS.has(m.planet) && Number.isInteger(m.tile) && Number.isInteger(m.depth) && Number.isInteger(m.block)
             && m.tile >= 0 && m.tile < 1_000_000 && m.depth >= 0 && m.depth < 256 && m.block >= 0 && m.block < 256) {
    const now = Date.now();
    if (now - pl.editWindow > 1000) { pl.editWindow = now; pl.editCount = 0; }
    if (++pl.editCount > MAX_EDITS_PER_SECOND) return;
    const e = [m.planet, m.tile, m.depth, m.block];
    recordEdit(e);
    broadcast({ t: 'edit', id, planet: m.planet, tile: m.tile, depth: m.depth, block: m.block }, id);
  }
}

// ---- http + websocket -----------------------------------------------------
loadEdits();

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('ok');
    return;
  }
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end(`Tenebris JS server - ${players.size} player(s) online, ${edits.size} block edits saved\n`);
});

const wss = new WebSocketServer({ server, maxPayload: 4096 });
wss.on('connection', (ws) => {
  if (players.size >= MAX_PLAYERS) {
    ws.close(1013, 'server full');
    return;
  }
  const id = nextId++;
  players.set(id, { ws, name: `Player ${id}`, planet: 'earth', p: [0, 0, 0], q: [0, 0, 0, 1], editWindow: 0, editCount: 0 });
  send(ws, {
    t: 'welcome',
    id,
    edits: [...edits.values()],
    players: [...players].filter(([pid]) => pid !== id).map(([pid, p]) => ({ id: pid, name: p.name, planet: p.planet, p: p.p, q: p.q })),
  });
  ws.on('message', (data) => onMessage(id, data.toString()));
  ws.on('close', () => {
    players.delete(id);
    broadcast({ t: 'leave', id });
  });
  ws.on('error', () => ws.close());
});

server.listen(PORT, () => console.log(`tenebris js server on :${PORT}, data in ${DATA_DIR}`));
