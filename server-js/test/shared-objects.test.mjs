// Shared objects + chat against a real server.js (openspec mp-shared-objects):
// two clients moving items in one chest end with the right totals (record
// writes are compare-and-set on a version), a stale write is refused with the
// current record, and chat is relayed, capped, rate-limited and replayed to
// a joiner. Run: node --test server-js/test/shared-objects.test.mjs
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
const SERVER_SRC = fs.readFileSync(path.join(HERE, '..', 'server.js'), 'utf8');
const constant = (name) => Number(new RegExp(`const ${name} = (\\d+);`).exec(SERVER_SRC)[1]);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const IRON = 23;

const freePort = () => new Promise((resolve) => {
  const s = net.createServer().listen(0, () => { const { port } = s.address(); s.close(() => resolve(port)); });
});

async function startServer() {
  const port = await freePort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shared-objects-'));
  const proc = spawn(process.execPath, [path.join(HERE, '..', 'server.js')], {
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir }, stdio: 'ignore',
  });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    if (await fetch(`${base}/health`).then(r => r.ok).catch(() => false)) break;
    await sleep(100);
  }
  return { ws: `ws://127.0.0.1:${port}/?world=main`, stop: () => { proc.kill(); fs.rmSync(dataDir, { recursive: true, force: true }); } };
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
          next: (match) => {
            const seen = got.find(x => match(x) && !x.__taken);
            if (seen) { seen.__taken = true; return Promise.resolve(seen); }
            return new Promise((res, rej) => {
              const w = { match, resolve: (x) => { x.__taken = true; res(x); } };
              waiters.push(w);
              setTimeout(() => rej(new Error('timed out')), 3000);
            });
          },
        });
      }
    });
    ws.on('error', reject);
  });
}

const chest = (iron) => ({ tileIndex: 7, position: { x: 0, y: 1, z: 0 }, rotation: 0, slots: [{ itemType: iron ? IRON : 0, quantity: iron }] });
const at = { kind: 'chest', planet: 'earth', key: '7' };
const answer = (c) => c.next(m => (m.t === 'recAck' || m.t === 'recNack') && m.key === '7');

test('two clients moving items in one chest: no duplicate, right totals, stale write refused', async () => {
  const srv = await startServer();
  try {
    const a = await join(srv.ws);
    const b = await join(srv.ws);
    // A places the chest and puts 10 iron in
    a.send({ t: 'rec', ...at, data: chest(10), base: 0 });
    const placed = await answer(a);
    assert.equal(placed.t, 'recAck');
    const seenByB = await b.next(m => m.t === 'rec' && m.key === '7');
    assert.equal(seenByB.v, placed.v);
    assert.equal(seenByB.data.slots[0].quantity, 10);

    // Both take all 10 at once, each on the version it saw
    let aHas = 0, bHas = 0;
    a.send({ t: 'rec', ...at, data: chest(0), base: placed.v }); aHas += 10;
    b.send({ t: 'rec', ...at, data: chest(0), base: placed.v }); bHas += 10;
    const ra = await answer(a), rb = await answer(b);
    const answers = [ra.t, rb.t].sort();
    assert.deepEqual(answers, ['recAck', 'recNack'], 'exactly one take wins');
    // the loser undoes its take, the server's copy says why
    const loser = ra.t === 'recNack' ? ra : rb;
    if (loser === ra) aHas -= 10; else bHas -= 10;
    assert.equal(loser.data.slots[0].quantity, 0);
    assert.equal(aHas + bHas, 10, 'the 10 iron exist exactly once');

    // The winner puts 4 back on the acked version; the loser, still on the
    // old version, tries to put 3 in: stale, refused with the current record
    const winner = ra.t === 'recAck' ? a : b;
    const loserC = winner === a ? b : a;
    const won = ra.t === 'recAck' ? ra : rb;
    winner.send({ t: 'rec', ...at, data: chest(4), base: won.v });
    const put = await answer(winner);
    assert.equal(put.t, 'recAck');
    loserC.send({ t: 'rec', ...at, data: chest(3), base: placed.v });
    const stale = await answer(loserC);
    assert.equal(stale.t, 'recNack', 'a write on an old version is refused');
    assert.equal(stale.v, put.v);
    assert.equal(stale.data.slots[0].quantity, 4, 'with the current record to roll back to');

    // A third player joining sees the chest's final state and version
    const c = await join(srv.ws);
    const rec = c.welcome.records.find(r => r[0] === 'chest' && r[2] === '7');
    assert.equal(rec[3].slots[0].quantity, 4);
    assert.equal(rec[4], put.v);
    for (const x of [a, b, c]) x.ws.close();
  } finally {
    srv.stop();
  }
});

test('chat: relayed with name and time, cleaned, capped, rate-limited, replayed to a joiner', async () => {
  const srv = await startServer();
  try {
    const a = await join(srv.ws);
    const b = await join(srv.ws);
    a.send({ t: 'hello', name: 'Ada', look: {} });
    await sleep(100);
    a.send({ t: 'chat', text: '  hello\u0007 there—  ' });
    const onB = await b.next(m => m.t === 'chat');
    const onA = await a.next(m => m.t === 'chat');
    assert.equal(onB.text, 'hello there');
    assert.equal(onB.name, 'Ada');
    assert.equal(onB.id, a.welcome.id);
    assert.ok(Math.abs(onB.at - Date.now()) < 5000);
    assert.equal(onA.text, 'hello there', 'the sender gets its own line back');

    a.send({ t: 'chat', text: 'x'.repeat(1000) });
    const long = await b.next(m => m.t === 'chat');
    assert.equal(long.text.length, constant('CHAT_MAX_CHARS'));

    // rate limit: a burst beyond the window's allowance is dropped
    const max = constant('CHAT_MAX_PER_WINDOW');
    for (let i = 0; i < max + 3; i++) a.send({ t: 'chat', text: `burst ${i}` });
    await sleep(400);
    const bursts = b.got.filter(m => m.t === 'chat' && m.text.startsWith('burst'));
    assert.equal(bursts.length, max - 2, 'only what is left of the window gets through (2 lines already sent)');

    const c = await join(srv.ws);
    const history = c.welcome.chat.map(l => l.text);
    assert.equal(history[0], 'hello there');
    assert.ok(history.length <= constant('CHAT_HISTORY'));
    assert.equal(history[history.length - 1], `burst ${max - 3}`);
    for (const x of [a, b, c]) x.ws.close();
  } finally {
    srv.stop();
  }
});
