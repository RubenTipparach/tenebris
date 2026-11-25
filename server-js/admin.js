// Operator portal for the JS multiplayer server.
//
//   GET  /admin                              the portal page (admin.html)
//   GET  /admin/api/status                   server + every world, who is online
//                                            (where, items, missions), its maps
//   GET  /admin/api/game-data                items / missions / bodies (game-data.json)
//                                            plus where the item icons are served
//   GET  /admin/api/maps/<world>/<planet>    a planet map players uploaded
//   POST /admin/api/worlds/<id>/rename       { name }
//   POST /admin/api/worlds/<id>/reset        every edit and object gone (same seed)
//   POST /admin/api/worlds/<id>/delete       not 'main'
//   POST /admin/api/worlds/<id>/notice       { text } a message to everyone in it
//   POST /admin/api/worlds/<id>/clear-kind   { kind } remove every object of a kind
//   POST /admin/api/players/<id>/kick        { reason }
//   POST /admin/api/npc-clock                { addMs } TEST ONLY (server run with
//                                            NPC_TEST_CLOCK=1, else 404): move the
//                                            NPC clock forward and tick at once
//
// The status's worlds each carry `npc` (openspec friendship-npcs): who is on
// which planet, every visited inhabited planet's villages (people, food
// store, building, open requests) and the travelling traders.
//
// Every API call needs `Authorization: Bearer <ADMIN_TOKEN>`. ADMIN_TOKEN is a
// Fly secret (`fly secrets set ADMIN_TOKEN=... -a tenebris`); without it the
// API answers 503 and nothing can be changed. The page itself holds no
// secret - it asks for the token and keeps it in the browser's storage.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PAGE = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'admin.html'), 'utf8');
const MAX_FAILS_PER_MINUTE = 10;   // per address: wrong tokens before a lockout
const MAX_BODY_BYTES = 2048;
// The item icons: the game's textures as the GitHub Pages build serves them
// (vite base /tenebris/js/ + an ITEM_DATA texture path)
const ICON_BASE = 'https://rubentipparach.github.io/tenebris/js';
const fails = new Map();           // address -> { start, count }

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

function sameSecret(a, b) {
  const x = crypto.createHash('sha256').update(a).digest();
  const y = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(x, y);
}

// null when the request may go on, else the response already sent
function authorize(req, res) {
  // ADMIN_OPEN=1 (server-js/fly.toml [env]): the portal needs no token - anyone
  // with the URL can reset or delete worlds and kick players. Owner's call,
  // "for now"; remove the line from fly.toml to lock it again.
  if (process.env.ADMIN_OPEN === '1') return null;
  const token = process.env.ADMIN_TOKEN;
  if (!token) return json(res, 503, { error: 'Admin is off: set the ADMIN_TOKEN secret (fly secrets set ADMIN_TOKEN=... -a tenebris)' }) || true;
  const addr = (req.headers['fly-client-ip'] || req.socket.remoteAddress || '').toString();
  const now = Date.now();
  const f = fails.get(addr);
  if (f && now - f.start < 60_000 && f.count >= MAX_FAILS_PER_MINUTE) return json(res, 429, { error: 'Too many wrong tokens - wait a minute' }) || true;
  const given = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (given && sameSecret(given, token)) return null;
  if (!f || now - f.start >= 60_000) fails.set(addr, { start: now, count: 1 });
  else f.count++;
  return json(res, 401, { error: 'Wrong or missing admin token' }) || true;
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > MAX_BODY_BYTES) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

export async function handleAdmin(req, res, url, admin) {
  if (url.pathname === '/admin' || url.pathname === '/admin/') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(PAGE);
    return;
  }
  if (!url.pathname.startsWith('/admin/api/')) return json(res, 404, { error: 'Not found' });
  if (authorize(req, res)) return;

  const parts = url.pathname.slice('/admin/api/'.length).split('/');
  if (req.method === 'GET' && parts[0] === 'status') return json(res, 200, admin.serverStatus());
  if (req.method === 'GET' && parts[0] === 'game-data') return json(res, 200, { ...admin.gameData, iconBase: ICON_BASE });
  if (req.method === 'GET' && parts[0] === 'maps' && parts.length === 3) {
    const w = admin.worlds.get(parts[1]);
    const m = w && admin.mapFile(w, parts[2]);
    if (!m) return json(res, 404, { error: 'No map yet' });
    res.writeHead(200, { 'content-type': m.type, 'cache-control': 'no-store' });
    fs.createReadStream(m.file).on('error', () => res.end()).pipe(res);
    return;
  }
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  const body = await readBody(req);

  if (parts[0] === 'npc-clock' && parts.length === 1) {
    const ok = admin.skewNpcClock(Number(body.addMs));
    return json(res, ok ? 200 : 404, ok ? { ok } : { error: 'Not found' });
  }
  if (parts[0] === 'players' && parts.length === 3 && parts[2] === 'kick') {
    const ok = admin.kickPlayer(Number(parts[1]), body.reason);
    console.log(`[admin] kick player ${parts[1]}: ${ok}`);
    return json(res, ok ? 200 : 404, ok ? { ok } : { error: 'No such player' });
  }
  if (parts[0] === 'worlds' && parts.length === 3) {
    const w = admin.worlds.get(parts[1]);
    if (!w) return json(res, 404, { error: 'No such world' });
    let ok = false, extra = {};
    switch (parts[2]) {
      case 'rename': ok = admin.renameWorld(w, body.name); break;
      case 'reset': ok = admin.resetWorld(w); break;
      case 'delete': ok = admin.deleteWorld(w); if (!ok) extra = { error: "The 'main' world can't be deleted (reset it instead)" }; break;
      case 'notice': ok = admin.noticeWorld(w, body.text); break;
      case 'clear-kind': {
        const n = typeof body.kind === 'string' ? admin.clearRecordKind(w, body.kind) : 0;
        ok = true;
        extra = { removed: n };
        break;
      }
      default: return json(res, 404, { error: 'Unknown action' });
    }
    console.log(`[admin] ${parts[2]} world ${w.id}: ${ok}`);
    return json(res, ok ? 200 : 400, { ok, ...extra });
  }
  return json(res, 404, { error: 'Not found' });
}
