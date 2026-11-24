// NPCs on the server (openspec friendship-npcs, tasks 2.1-2.4), end to end
// against a real server.js: occupancy per planet from poses, a planet's
// population created on its first visit and advanced only while someone is
// on it (with the capped catch-up on return), server writes as versioned
// records to that planet's players, a stale delivery refused, and the admin
// API's view. The NPC clock is moved with the test-only admin hook
// (NPC_TEST_CLOCK=1). Run: node --test server-js/test/npc.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket } from 'ws';
import * as npc from '../npc-core.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const HOUR_MS = 3600_000;
// real time passes between steps while a planet is awake: allow this much
const SLACK_S = 5;

const freePort = () => new Promise((resolve) => {
  const s = net.createServer().listen(0, () => { const { port } = s.address(); s.close(() => resolve(port)); });
});

async function startServer() {
  const port = await freePort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'npc-'));
  const proc = spawn(process.execPath, [path.join(HERE, '..', 'server.js')], {
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, ADMIN_OPEN: '1', NPC_TEST_CLOCK: '1' }, stdio: 'ignore',
  });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    if (await fetch(`${base}/health`).then(r => r.ok).catch(() => false)) break;
    await sleep(100);
  }
  return {
    base, ws: `ws://127.0.0.1:${port}/?world=main`,
    status: async () => (await fetch(`${base}/admin/api/status`).then(r => r.json())).worlds.find(w => w.id === 'main'),
    skew: async (ms) => assert.equal((await fetch(`${base}/admin/api/npc-clock`, { method: 'POST', body: JSON.stringify({ addMs: ms }) })).status, 200),
    stop: () => { proc.kill(); fs.rmSync(dataDir, { recursive: true, force: true }); },
  };
}

function join(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const got = [];
    const waiters = [];
    ws.on('message', (d) => {
      const m = JSON.parse(String(d));
      got.push(m);
      for (const w of [...waiters]) if (w.match(m)) { waiters.splice(waiters.indexOf(w), 1); w.resolve(m); }
      if (m.t === 'welcome') {
        resolve({
          ws, welcome: m, got,
          send: (o) => ws.send(JSON.stringify(o)),
          at: (planet) => ws.send(JSON.stringify({ t: 'pose', planet, p: [0, 0, 0], q: [0, 0, 0, 1] })),
          next: (match) => new Promise((res, rej) => {
            waiters.push({ match, resolve: res });
            setTimeout(() => rej(new Error('timed out')), 3000);
          }),
          close: () => new Promise((res) => { ws.once('close', res); ws.close(); }),
        });
      }
    });
    ws.on('error', reject);
  });
}

// The latest copy of a record a client has seen (welcome or rec frames)
function latest(c, kind, planet, key) {
  let best = null;
  for (const r of c.welcome.records) if (r[0] === kind && r[1] === planet && r[2] === key) best = { data: r[3], v: r[4] };
  for (const m of c.got) if (m.t === 'rec' && m.kind === kind && m.planet === planet && m.key === key && (!best || m.v > best.v)) best = { data: m.data, v: m.v };
  return best;
}

const poll = async (f) => { for (let i = 0; i < 50; i++) { const v = await f(); if (v) return v; await sleep(50); } return f(); };
const npcRecords = (records) => records.filter(r => r[0] === 'village' || r[0] === 'npcClock');

test('occupancy per planet follows poses and disconnects', async () => {
  const srv = await startServer();
  try {
    const a = await join(srv.ws), b = await join(srv.ws);
    assert.deepEqual((await srv.status()).npc.occupancy, {}, 'nobody is on a planet before a pose');
    a.at('sequoia');
    assert.deepEqual(await poll(async () => { const o = (await srv.status()).npc.occupancy; return o.sequoia === 1 && o; }), { sequoia: 1 });
    b.at('sequoia');
    assert.deepEqual(await poll(async () => { const o = (await srv.status()).npc.occupancy; return o.sequoia === 2 && o; }), { sequoia: 2 });
    b.at('sequoia');   // the same planet again: no change
    await sleep(100);
    assert.deepEqual((await srv.status()).npc.occupancy, { sequoia: 2 });
    await a.close();
    assert.deepEqual(await poll(async () => { const o = (await srv.status()).npc.occupancy; return o.sequoia === 1 && o; }), { sequoia: 1 }, 'a disconnect leaves the planet');
    b.at('earth');
    assert.deepEqual(await poll(async () => { const o = (await srv.status()).npc.occupancy; return o.earth === 1 && o; }), { earth: 1 }, 'moving on leaves the old planet empty (0) and the others stay 0');
    await b.close();
    assert.deepEqual(await poll(async () => { const o = (await srv.status()).npc.occupancy; return !Object.keys(o).length && o; }), {});
  } finally {
    srv.stop();
  }
});

test('a population exists once visited and advances only while occupied, with a capped catch-up', async () => {
  const srv = await startServer();
  try {
    const a = await join(srv.ws);
    assert.equal(npcRecords(a.welcome.records).length, 0, 'an unvisited world has no NPC records');
    a.at('sequoia');
    const first = await poll(async () => (await srv.status()).npc.planets.find(p => p.body === 'sequoia'));
    assert.ok(first && first.awake, 'the first visit creates Sequoia\'s population and wakes it');
    const world = npc.inhabitedWorld('sequoia');
    const c = await join(srv.ws);
    const recs = npcRecords(c.welcome.records);
    assert.ok(recs.every(r => r[1] === 'sequoia'), 'only the visited planet has records (Cinder has none)');
    assert.equal(recs.filter(r => r[0] === 'village').length, world.villages, 'one village record per village');
    assert.equal(recs.filter(r => r[0] === 'npcClock').length, 1);
    assert.ok(c.welcome.records.some(r => r[0] === 'trader' && r[1] === 'traders'), 'the traders exist from the first visit');

    // the admin view: people, villages, requests, traders
    const pop = npc.buildPopulation(c.welcome.world.seed, 'sequoia');
    assert.equal(first.villages.length, world.villages);
    assert.deepEqual(first.villages.flatMap(v => v.residents.map(r => r.name)).sort(), pop.npcs.map(n => n.name).sort(), 'the portal lists the deterministic people');
    assert.ok(first.villages.every(v => v.residents.filter(r => r.role === 'elder').length === 1 && v.state.requests.length === npc.NPC_CONFIG.REQUESTS.OPEN));
    assert.equal((await srv.status()).npc.traders.length, npc.NPC_CONFIG.TRADERS.BAND.length);

    // leave: asleep for an hour, unchanged
    a.at('earth');
    const asleep = await poll(async () => { const p = (await srv.status()).npc.planets.find(x => x.body === 'sequoia'); return !p.awake && p; });
    const before = { T: asleep.T, food: asleep.villages.map(v => v.state.food) };
    const clockBefore = latest(c, 'npcClock', 'sequoia', 'clock');
    await srv.skew(HOUR_MS);
    const still = (await srv.status()).npc.planets.find(x => x.body === 'sequoia');
    assert.equal(still.T, before.T, 'an empty planet\'s clock does not move');
    assert.deepEqual(still.villages.map(v => v.state.food), before.food, 'and its villages do not change');
    assert.equal(latest(c, 'npcClock', 'sequoia', 'clock').v, clockBefore.v, 'no record is written while it is empty');

    // return: an hour at once
    a.at('sequoia');
    const back = await poll(async () => { const p = (await srv.status()).npc.planets.find(x => x.body === 'sequoia'); return p.awake && p; });
    assert.ok(Math.abs(back.T - before.T - 3600) <= SLACK_S, `the clock moved by the hour at once (${back.T - before.T} s)`);
    back.villages.forEach((v, i) => {
      const used = npc.NPC_CONFIG.FOOD.USE_PER_RESIDENT_PER_HOUR * v.state.pop;
      assert.ok(Math.abs(before.food[i] - v.state.food - used) < 0.2, `village ${i} used an hour of food`);
    });

    // a long absence: the cap
    a.at('earth');
    await poll(async () => !(await srv.status()).npc.planets.find(x => x.body === 'sequoia').awake);
    const T1 = (await srv.status()).npc.planets.find(x => x.body === 'sequoia').T;
    await srv.skew(npc.NPC_CONFIG.CATCH_UP_CAP_S * 1000 + 24 * HOUR_MS);
    a.at('sequoia');
    const capped = await poll(async () => { const p = (await srv.status()).npc.planets.find(x => x.body === 'sequoia'); return p.awake && p; });
    assert.ok(Math.abs(capped.T - T1 - npc.NPC_CONFIG.CATCH_UP_CAP_S) <= SLACK_S, `an absence past the cap advances by the cap (${capped.T - T1} s)`);
    assert.ok(capped.villages.every(v => v.state.food >= v.state.low - 0.1 && v.state.requests.some(q => q.fam === 'supply')),
      'a long absence leaves each store at its low mark with a supply request, never starved');
    for (const x of [a, c]) await x.close();
  } finally {
    srv.stop();
  }
});

test('server writes go to that planet only, and a delivery on a pre-tick version is refused', async () => {
  const srv = await startServer();
  try {
    const a = await join(srv.ws), b = await join(srv.ws);
    b.at('earth');
    a.at('sequoia');
    await a.next(m => m.t === 'rec' && m.kind === 'npcClock' && m.planet === 'sequoia');
    await sleep(100);
    assert.ok(a.got.some(m => m.t === 'rec' && m.id === 0 && m.kind === 'village'), 'the player on the planet gets its village records from the server (id 0)');
    assert.ok(!b.got.some(m => m.t === 'rec' && m.id === 0 && m.kind === 'village'), 'a player on another planet does not');
    assert.ok(b.got.some(m => m.t === 'rec' && m.kind === 'trader'), 'trader records go to the whole world');

    // A completes a request on the version it has
    const seed = a.welcome.world.seed;
    const ctx = { worldSeed: seed, body: 'sequoia', index: 0 };
    const v0 = latest(a, 'village', 'sequoia', '0');
    const clock = latest(a, 'npcClock', 'sequoia', 'clock').data;
    const T = npc.clockNow(clock, Date.now());
    const q = v0.data.requests[0];
    const done = npc.deliver(ctx, v0.data, q.id, q.need, T);
    assert.ok(done.completed);
    a.send({ t: 'rec', kind: 'village', planet: 'sequoia', key: '0', data: done.village, base: v0.v });
    const ack = await a.next(m => (m.t === 'recAck' || m.t === 'recNack') && m.kind === 'village');
    assert.equal(ack.t, 'recAck', 'a delivery on the current version is taken');

    // the slot reopens: a server tick writes the village (a new version)
    const tick = a.next(m => m.t === 'rec' && m.id === 0 && m.kind === 'village' && m.key === '0');
    await srv.skew((npc.NPC_CONFIG.REQUESTS.REOPEN_DELAY_S + 1) * 1000);
    const ticked = await tick;
    assert.ok(ticked.v > ack.v, 'the tick bumped the record version');
    assert.equal(ticked.data.requests.length, npc.NPC_CONFIG.REQUESTS.OPEN, 'and opened a new request in the slot');
    assert.ok(!b.got.some(m => m.t === 'rec' && m.id === 0 && m.kind === 'village'), 'still no server write for the player elsewhere (client writes are relayed as before)');

    // a delivery made on the version before the tick: refused, with the current record
    const stale = npc.deliver(ctx, done.village, done.village.requests[0].id, 1, T);
    a.send({ t: 'rec', kind: 'village', planet: 'sequoia', key: '0', data: stale.village, base: ack.v });
    const nack = await a.next(m => (m.t === 'recAck' || m.t === 'recNack') && m.kind === 'village');
    assert.equal(nack.t, 'recNack', 'the stale delivery is refused');
    assert.equal(nack.v, ticked.v);
    assert.deepEqual(nack.data, ticked.data, 'with the current record to roll back to');

    // B arrives later and is brought up to date at once
    b.at('sequoia');
    const sent = await b.next(m => m.t === 'rec' && m.kind === 'village' && m.key === '0');
    assert.equal(sent.v, ticked.v, 'an arriving player gets the planet\'s current records');
    for (const x of [a, b]) await x.close();
  } finally {
    srv.stop();
  }
});

test('the population survives a restart and a reset clears it', async () => {
  const port = await freePort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'npc-restart-'));
  const env = { ...process.env, PORT: String(port), DATA_DIR: dataDir, ADMIN_OPEN: '1' };
  const base = `http://127.0.0.1:${port}`;
  const boot = async () => {
    const proc = spawn(process.execPath, [path.join(HERE, '..', 'server.js')], { env, stdio: 'ignore' });
    for (let i = 0; i < 100; i++) { if (await fetch(`${base}/health`).then(r => r.ok).catch(() => false)) break; await sleep(100); }
    return proc;
  };
  let proc = await boot();
  try {
    const a = await join(`ws://127.0.0.1:${port}/?world=main`);
    a.at('umbra');
    await a.next(m => m.t === 'rec' && m.kind === 'npcClock' && m.planet === 'umbra');
    const v = latest(a, 'village', 'umbra', '0').data;
    await a.close();
    await sleep(100);
    proc.kill('SIGTERM');
    await new Promise(r => proc.once('exit', r));
    proc = await boot();
    const b = await join(`ws://127.0.0.1:${port}/?world=main`);
    const after = b.welcome.records.find(r => r[0] === 'village' && r[1] === 'umbra' && r[2] === '0');
    assert.deepEqual(after?.[3], v, 'the village is the same after a restart');
    const clock = b.welcome.records.find(r => r[0] === 'npcClock' && r[1] === 'umbra');
    assert.equal(clock[3].awake, false, 'and its clock was stamped asleep when the last player left');
    await fetch(`${base}/admin/api/worlds/main/reset`, { method: 'POST', body: '{}' });
    const c = await join(`ws://127.0.0.1:${port}/?world=main`);
    assert.equal(npcRecords(c.welcome.records).length, 0, 'a world reset clears the population');
    await c.close();
  } finally {
    proc.kill();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
