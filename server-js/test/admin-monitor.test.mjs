// The admin monitor end to end against a real server.js (openspec
// admin-monitor): a fake client joins, sends a pose, a status frame and a
// map, and the admin API returns them. Run: node --test server-js/test/admin-monitor.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket } from 'ws';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GAME = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'game-data.json'), 'utf8'));
// A 1x1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const freePort = () => new Promise((resolve) => {
  const s = net.createServer().listen(0, () => { const { port } = s.address(); s.close(() => resolve(port)); });
});

async function startServer() {
  const port = await freePort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'admin-monitor-'));
  const proc = spawn(process.execPath, [path.join(HERE, '..', 'server.js')], {
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, ADMIN_OPEN: '1' }, stdio: 'ignore',
  });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    if (await fetch(`${base}/health`).then(r => r.ok).catch(() => false)) break;
    await sleep(100);
  }
  return { base, ws: `ws://127.0.0.1:${port}`, dataDir, stop: () => { proc.kill(); fs.rmSync(dataDir, { recursive: true, force: true }); } };
}

function join(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const got = [];
    ws.on('message', (d) => {
      const m = JSON.parse(String(d));
      got.push(m);
      if (m.t === 'welcome') resolve({ ws, welcome: m, got, send: (o) => ws.send(JSON.stringify(o)) });
    });
    ws.on('error', reject);
  });
}

test('pose, status frame and map reach the admin API', async () => {
  const srv = await startServer();
  try {
    const a = await join(`${srv.ws}/?world=main`);
    const b = await join(`${srv.ws}/?world=main`);
    assert.match(a.welcome.uploadKey, /^[0-9a-f]{24}$/);
    assert.deepEqual(a.welcome.maps, {});

    const vesper = GAME.bodies.find(x => x.id === 'vesper');
    a.send({ t: 'hello', name: 'Ada', look: { shirt: '#ff004d', skin: '#ffccaa' } });
    // standing on Vesper's north pole, 2 m up
    a.send({ t: 'pose', planet: 'vesper', p: [vesper.position.x, vesper.position.y + vesper.radius + 2, vesper.position.z], q: [0, 0, 0, 1] });
    a.send({ t: 'live', ch: 'status', data: { v: 1, inv: [[0, 6, 4], [36, 120, 1, 150]], suit: { worn: false, tankS: 0 }, ride: 'walk', m: { done: ['logs'], now: 'planks', prog: [2, 0] } } });
    await sleep(200);

    // a map: refused without the key, kept with it
    const url = (key) => `${srv.base}/maps/main/vesper?player=${a.welcome.id}&key=${key}`;
    const refused = await fetch(url('nope'), { method: 'POST', headers: { 'content-type': 'image/png' }, body: PNG });
    assert.equal(refused.status, 403);
    const up = await fetch(url(a.welcome.uploadKey), { method: 'POST', headers: { 'content-type': 'image/png' }, body: PNG });
    assert.equal(up.status, 201);
    const again = await fetch(url(a.welcome.uploadKey), { method: 'POST', headers: { 'content-type': 'image/png' }, body: PNG });
    assert.equal(again.status, 429, 'uploads are rate limited per player');

    const s = await fetch(`${srv.base}/admin/api/status`).then(r => r.json());
    const main = s.worlds.find(w => w.id === 'main');
    const ada = main.players.find(p => p.name === 'Ada');
    assert.ok(ada, 'Ada is listed');
    assert.equal(ada.planet, 'vesper');
    assert.equal(ada.place, 'surface');
    assert.equal(ada.look.shirt, '#ff004d');
    assert.ok(Math.abs(ada.at.lat - 90) < 1e-9 && Math.abs(ada.at.alt - 2) < 1e-9 && Math.abs(ada.at.v) < 1e-9);
    assert.deepEqual(ada.status.inv, [[0, 6, 4], [36, 120, 1, 150]]);
    assert.deepEqual(ada.status.m, { done: ['logs'], now: 'planks', prog: [2, 0] });
    assert.ok(ada.lastSeen >= ada.since);
    assert.ok(main.maps.vesper > 0, 'the world lists its Vesper map');

    const img = await fetch(`${srv.base}/admin/api/maps/main/vesper`);
    assert.equal(img.headers.get('content-type'), 'image/png');
    assert.deepEqual(Buffer.from(await img.arrayBuffer()), PNG);
    assert.equal((await fetch(`${srv.base}/admin/api/maps/main/earth`)).status, 404);
    const gd = await fetch(`${srv.base}/admin/api/game-data`).then(r => r.json());
    assert.ok(gd.iconBase && gd.items['6'].name && gd.missions.length && gd.bodies.length);

    // the status frame is never relayed
    assert.ok(!b.got.some(m => m.t === 'live' && m.ch === 'status'), 'other players never get a status frame');
    // a new joiner learns which maps exist
    const c = await join(`${srv.ws}/?world=main`);
    assert.ok(c.welcome.maps.vesper > 0);

    // a reset drops the world's maps (and kicks everyone)
    await fetch(`${srv.base}/admin/api/worlds/main/reset`, { method: 'POST', body: '{}' });
    const after = await fetch(`${srv.base}/admin/api/status`).then(r => r.json());
    assert.deepEqual(after.worlds.find(w => w.id === 'main').maps, {});
    assert.ok(!fs.existsSync(path.join(srv.dataDir, 'maps', 'main', 'vesper.png')));
    for (const x of [a, b, c]) x.ws.close();
  } finally {
    srv.stop();
  }
});
