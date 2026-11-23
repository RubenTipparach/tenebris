// Multiplayer end-to-end test: a fresh server-js + 3 headless clients at
// 160x90 driving the game through its real input handlers. See
// docs/MP_TEST_PLAN.md for what each step checks.
//
//   npx vite --port 5173 &            (the JS client, dev server)
//   node scripts/mp-e2e/run.cjs [outDir]
//
// Env: CLIENT_URL (default http://127.0.0.1:5173/tenebris/js/), MP_PORT (8090).
// Writes outDir/report.json, outDir/frames/*.png and outDir/captions.json
// (scripts/mp-e2e/make-video.py turns those into the video).
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const OUT = path.resolve(process.argv[2] || 'mp-e2e-out');
const CLIENT_URL = process.env.CLIENT_URL || 'http://127.0.0.1:5173/tenebris/js/';
const PORT = Number(process.env.MP_PORT || 8090);
// The page lays out at 1080p (so the HUD / menus are the real size) but the
// WebGL backbuffer is only RENDER_W wide: the renderer uses devicePixelRatio,
// so a fractional deviceScaleFactor renders the 3D at 160x90 and the
// browser upscales the canvas. Screenshots use scale:'css' (DOM stays crisp).
const W = 1920, H = 1080;
const RENDER_W = Number(process.env.RENDER_W || 160);
const HELPERS = fs.readFileSync(path.join(__dirname, 'page-helpers.js'), 'utf8');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'frames'), { recursive: true });

const results = [];
const captions = [];
let frameNo = 0;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);

function check(id, name, pass, detail) {
  results.push({ id, name, pass: !!pass, detail });
  log(pass ? 'PASS' : 'FAIL', id, name, detail !== undefined ? JSON.stringify(detail).slice(0, 300) : '');
}

// ---- server ---------------------------------------------------------------
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mp-e2e-data-'));
let server = null;
function startServer() {
  server = spawn(process.execPath, [path.join(__dirname, '../../server-js/server.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', d => fs.appendFileSync(path.join(OUT, 'server.log'), d));
  server.stderr.on('data', d => fs.appendFileSync(path.join(OUT, 'server.log'), d));
  return waitFor(async () => (await fetch(`http://127.0.0.1:${PORT}/health`).then(r => r.ok).catch(() => false)), 15000, 'server up');
}
function stopServer() {
  return new Promise(res => { server.once('exit', res); server.kill('SIGTERM'); });
}

async function waitFor(fn, ms, what) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { const v = await fn(); if (v) return v; } catch { /* page navigating */ }
    await sleep(500);
  }
  throw new Error(`timed out waiting for ${what}`);
}

// ---- clients --------------------------------------------------------------
let browser;
const clients = {};
async function launchClient(name, worldId) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: RENDER_W / W });
  await ctx.addInitScript(({ name }) => { try { localStorage.setItem('tenebris_mp_name', name); } catch {} }, { name });
  await ctx.addInitScript(HELPERS);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  const url = `${CLIENT_URL}?debug&world=${worldId}&server=ws://127.0.0.1:${PORT}/`;
  await page.goto(url);
  const c = { name, ctx, page, errors, url };
  clients[name] = c;
  await waitFor(() => page.evaluate(() => window.__mp && window.__mp.ready()), 180000, `${name} joined`);
  await page.evaluate(() => window.__mp.cleanHud());
  // let terrain around spawn finish meshing
  await sleep(3000);
  return c;
}
const ev = (c, fn, arg) => c.page.evaluate(fn, arg);

// One composite video frame: every live client's view, same caption
async function snap(caption, n = 1, gap = 400) {
  for (let i = 0; i < n; i++) {
    const shots = {};
    for (const name of ['A', 'B', 'C']) {
      const c = clients[name];
      if (!c || c.closed) continue;
      const f = `f${String(frameNo).padStart(4, '0')}_${name}.jpg`;
      try { await c.page.screenshot({ path: path.join(OUT, 'frames', f), scale: 'css', type: 'jpeg', quality: 80 }); shots[name] = f; } catch { /* reloading */ }
    }
    captions.push({ frame: frameNo, caption, shots, checks: results.map(r => [r.id, r.pass]) });
    frameNo++;
    if (gap) await sleep(gap);
  }
}

// ---- the plan ---------------------------------------------------------------
(async () => {
  const t0 = Date.now();
  await startServer();
  const world = await (await fetch(`http://127.0.0.1:${PORT}/worlds`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'MP e2e', seed: 4242 }),
  })).json();
  log('world', world);
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

  // ---- MP-01 join + presence
  const A = await launchClient('A', world.id);
  const B = await launchClient('B', world.id);
  await sleep(2000);
  let sa = await ev(A, () => window.__mp.state());
  let sb = await ev(B, () => window.__mp.state());
  check('MP-01', 'two clients join the same world and each sees the other',
    sa.connected && sb.connected && sa.players === 2 && sb.players === 2 &&
    sa.remotes.some(r => r.name === 'B') && sb.remotes.some(r => r.name === 'A'),
    { A: { players: sa.players, remotes: sa.remotes.map(r => r.name) }, B: { players: sb.players, remotes: sb.remotes.map(r => r.name) } });

  // Lay out the stage: a build site 4 tiles from A's spawn, players round it
  const stage = await ev(A, () => {
    const m = window.__mp;
    const spawn = m.myTile();
    const build = m.ring(spawn, 4)[0];
    const near = m.ring(build, 1);
    return { spawn, build, beside: near[0], chest: near[3], spots: m.pickSpots(build, 3) };
  });
  log('stage', stage);
  await ev(A, (s) => window.__mp.standAt(s.spots[0], s.build), stage);
  await ev(B, (s) => window.__mp.standAt(s.spots[1], s.build), stage);
  await sleep(2500);
  await snap('MP-01  A and B join the same world', 6);

  // ---- MP-02 pose sync
  sa = await ev(A, () => window.__mp.state());
  sb = await ev(B, () => window.__mp.state());
  const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
  const bSeenByA = sa.remotes.find(r => r.name === 'B');
  const aSeenByB = sb.remotes.find(r => r.name === 'A');
  check('MP-02', "each client draws the other's avatar where that player really is (< 1.5 m)",
    bSeenByA && aSeenByB && dist(bSeenByA.p, sb.pos) < 1.5 && dist(aSeenByB.p, sa.pos) < 1.5,
    { errB: bSeenByA && +dist(bSeenByA.p, sb.pos).toFixed(2), errA: aSeenByB && +dist(aSeenByB.p, sa.pos).toFixed(2) });


  // ---- MP-02b they can see each other: face to face, each avatar on the
  // other's screen and turned toward them
  // B walks up close (2 tiles) so the avatars are big enough to read at 160x90
  await ev(B, (t) => window.__mp.standAt(window.__mp.ring(t, 2)[0], t), await ev(A, () => window.__mp.myTile()));
  await sleep(2000);
  await ev(A, () => window.__mp.facePlayer('B'));
  await ev(B, () => window.__mp.facePlayer('A'));
  await sleep(3000);
  const see = {
    BonA: await ev(A, () => window.__mp.onScreen('B')), AonB: await ev(B, () => window.__mp.onScreen('A')),
    BfacesA: await ev(A, () => window.__mp.facing('B')), AfacesB: await ev(B, () => window.__mp.facing('A')),
  };
  check('MP-02b', "A and B turn to each other: each avatar is on the other's screen and faces them (not its back)",
    see.BonA?.inside && see.AonB?.inside && see.BfacesA > 0.9 && see.AfacesB > 0.9, see);
  await snap('MP-02  A and B walk up and face each other', 6);
  await ev(A, (s) => window.__mp.lookAt(s.build, 2), stage);
  await ev(B, (s) => window.__mp.standAt(s.spots[1], s.build), stage);
  await sleep(2000);

  // ---- MP-03 build replicates
  const built = await ev(A, (s) => [
    ...window.__mp.buildPillar(s.build, window.__mp.ITEM.WOOD, 4),
    ...window.__mp.buildPillar(s.beside, window.__mp.ITEM.STONE, 2),
  ], stage);
  log('A built', built);
  for (let i = 0; i < 4; i++) await snap('MP-03  A builds a plank tower + stone pillar', 2);
  const seenByB = await ev(B, (cells) => cells.map(([t, d]) => window.__mp.block(t, d)), built);
  check('MP-03', "B sees A's construction block-for-block",
    built.every(([, , b], i) => b !== 0 && seenByB[i] === b), { A: built.map(c => c[2]), B: seenByB });

  // ---- MP-04 break replicates
  const top = built[3];
  const broke = await ev(B, (s) => window.__mp.breakTop(s.build), stage);
  await snap('MP-04  B mines the top of A\'s tower', 4);
  const aTop = await ev(A, ([t, d]) => window.__mp.block(t, d), top);
  check('MP-04', "B mines a block of A's tower and A sees it gone",
    broke.was === top[2] && broke.now === 0 && aTop === 0, { broke, aTop });
  check('MP-04b', 'the mined block lands in B\'s inventory',
    (await ev(B, (i) => window.__mp.count(i), 4)) >= 1);

  // ---- MP-05..07 trade through a shared chest
  const IRON = 23, GOLD = 24;
  await ev(A, (s) => window.__mp.placeChest(s.chest), stage);
  await sleep(2000);
  check('MP-05', "A places a chest and it appears in B's world",
    (await ev(A, (s) => window.__mp.chestAt(s.chest), stage)) !== null &&
    (await ev(B, (s) => window.__mp.chestAt(s.chest), stage)) !== null);
  await ev(A, (s) => window.__mp.deposit(s.chest, 23, 16, 0), stage);
  await snap('MP-06  A puts 16 iron ingots in the chest', 4);
  const bView = await ev(B, (s) => window.__mp.chestAt(s.chest), stage);
  check('MP-06', "B sees A's deposit (16 iron) in the chest", JSON.stringify(bView) === JSON.stringify([[IRON, 16]]), bView);
  await ev(B, (s) => window.__mp.withdrawAll(s.chest), stage);
  await ev(B, (s) => window.__mp.deposit(s.chest, 24, 8, 0), stage);
  await snap('MP-07  B takes the iron, pays 8 gold', 4);
  await ev(A, (s) => window.__mp.withdrawAll(s.chest), stage);
  await sleep(1500);
  const trade = {
    A_iron: await ev(A, (i) => window.__mp.count(i), IRON), A_gold: await ev(A, (i) => window.__mp.count(i), GOLD),
    B_iron: await ev(B, (i) => window.__mp.count(i), IRON), B_gold: await ev(B, (i) => window.__mp.count(i), GOLD),
    chestA: await ev(A, (s) => window.__mp.chestAt(s.chest), stage), chestB: await ev(B, (s) => window.__mp.chestAt(s.chest), stage),
  };
  check('MP-07', 'trade completes: A ends with 8 gold, B with 16 iron, chest empty on both, nothing duplicated',
    trade.A_iron === 0 && trade.A_gold === 8 && trade.B_iron === 16 && trade.B_gold === 0 &&
    trade.chestA.length === 0 && trade.chestB.length === 0, trade);
  await snap('MP-07  trade done: A 8 gold, B 16 iron', 3);
  for (const c of [A, B]) await ev(c, () => window.__mp.closeMenus());

  // ---- MP-08 independent missions
  const m0 = { A: await ev(A, () => window.__mp.missions()), B: await ev(B, () => window.__mp.missions()) };
  await ev(A, () => window.__mp.gain(window.__mp.ITEM.LOG, 6));   // 6 logs: Chop a tree
  // 'Make planks' only counts crafts made after it opens
  await waitFor(() => ev(A, () => window.__mp.missions().done.includes('logs')), 30000, "A's logs mission");
  await ev(A, async () => { const I = window.__mp.ITEM; await window.__mp.craft(I.WOOD, 2); await window.__mp.craft(I.STICK, 2); });  // planks, sticks
  await sleep(1500);
  const m1 = { A: await ev(A, () => window.__mp.missions()), B: await ev(B, () => window.__mp.missions()) };
  check('MP-08', "A completes 'Chop a tree' + 'Make planks'; B's mission tree is untouched",
    m1.A.done.includes('logs') && m1.A.done.includes('planks') && JSON.stringify(m1.B.done) === JSON.stringify(m0.B.done),
    { before: m0, after: m1 });
  await ev(B, () => window.__mp.gain(window.__mp.ITEM.LOG, 4));
  await sleep(1500);
  const m2 = { A: await ev(A, () => window.__mp.missions()), B: await ev(B, () => window.__mp.missions()) };
  check('MP-09', "B completes only 'Chop a tree' on its own; A's progress does not change",
    m2.B.done.includes('logs') && !m2.B.done.includes('planks') && JSON.stringify(m2.A.done) === JSON.stringify(m1.A.done),
    m2);
  await snap('MP-08/09  A: logs+planks done | B: logs done (own trees)', 4);
  for (const c of [A, B]) await ev(c, () => window.__mp.closeMenus());

  // ---- MP-10 late joiner gets the world snapshot
  const C = await launchClient('C', world.id);
  await ev(C, (s) => window.__mp.standAt(s.spots[2], s.build), stage);
  await waitFor(() => ev(C, (s) => window.__mp.tileLoaded(s.build), stage), 30000, 'C loads the build site');
  await sleep(3000);
  const cBlocks = await ev(C, (cells) => cells.map(([t, d]) => window.__mp.block(t, d)), built);
  const expected = built.map(([, , b], i) => (i === 3 ? 0 : b));
  const sc = await ev(C, () => window.__mp.state());
  check('MP-10', 'late joiner C receives the build (incl. B\'s mined block) from the server snapshot',
    JSON.stringify(cBlocks) === JSON.stringify(expected), { C: cBlocks, expected });
  check('MP-11', 'C sees the chest (empty after the trade) and both other players',
    JSON.stringify(await ev(C, (s) => window.__mp.chestAt(s.chest), stage)) === '[]' &&
    sc.players === 3 && ['A', 'B'].every(n => sc.remotes.some(r => r.name === n)), { remotes: sc.remotes.map(r => r.name), players: sc.players });
  const mc = await ev(C, () => window.__mp.missions());
  check('MP-12', "C starts with a fresh mission tree (others' progress doesn't leak)", mc.done.length === 0, mc);
  // C builds too, A and B see it
  const cBuilt = await ev(C, (s) => window.__mp.buildPillar(s.spots[0] === s.build ? s.beside : window.__mp.ring(s.build, 2)[2], window.__mp.ITEM.STONE, 3), stage);
  await snap('MP-10..13  C joins late, sees everything, adds a pillar', 4);
  await ev(C, () => window.__mp.facePlayer('A'));
  await ev(A, () => window.__mp.facePlayer('C'));
  await ev(B, () => window.__mp.facePlayer('C'));
  await sleep(3000);
  await snap('MP-11  A and B turn to C, C looks at A', 4);
  for (const n of ['A', 'B', 'C']) await ev(clients[n], (s) => window.__mp.lookAt(s.build, 2), stage);
  const cSeen = {
    A: await ev(A, (cells) => cells.map(([t, d]) => window.__mp.block(t, d)), cBuilt),
    B: await ev(B, (cells) => cells.map(([t, d]) => window.__mp.block(t, d)), cBuilt),
  };
  check('MP-13', "A and B both see C's pillar",
    cBuilt.every(([, , b], i) => b !== 0 && cSeen.A[i] === b && cSeen.B[i] === b), { C: cBuilt.map(c => c[2]), ...cSeen });

  // ---- MP-14 server restart: everything persists, clients reconnect
  await stopServer();
  await sleep(1000);
  await startServer();
  await waitFor(async () => (await Promise.all(['A', 'B', 'C'].map(n => ev(clients[n], () => window.__mp.state().connected)))).every(Boolean), 30000, 'reconnect');
  await sleep(2000);
  const reBlocks = await ev(B, (cells) => cells.map(([t, d]) => window.__mp.block(t, d)), [...built, ...cBuilt]);
  check('MP-14', 'server restart: all three clients reconnect on their own',
    (await ev(A, () => window.__mp.state().players)) === 3);
  // a fresh page load after the restart rebuilds the world from the server's log
  await B.page.reload();
  await waitFor(() => ev(B, () => window.__mp && window.__mp.ready()), 180000, 'B rejoined');
  await ev(B, () => window.__mp.cleanHud());
  await ev(B, (s) => window.__mp.standAt(s.spots[1], s.build), stage);
  await waitFor(() => ev(B, (s) => window.__mp.tileLoaded(s.build), stage), 30000, 'B loads the build site');
  await sleep(3000);
  const reload = await ev(B, (cells) => cells.map(([t, d]) => window.__mp.block(t, d)), [...built, ...cBuilt]);
  const mB = await ev(B, () => window.__mp.missions());
  check('MP-15', 'after the restart, B reloads: every edit is still there and B\'s mission progress is kept',
    JSON.stringify(reload) === JSON.stringify([...expected, ...cBuilt.map(c => c[2])]) && mB.done.includes('logs') && !mB.done.includes('planks'),
    { reload, missions: mB });
  await snap('MP-14/15  server restarted; B reloaded - world + missions intact', 6);

  // ---- MP-16 leave
  await C.ctx.close(); C.closed = true;
  await sleep(2000);
  sa = await ev(A, () => window.__mp.state());
  check('MP-16', "C leaves: A's player list drops to 2 and C's avatar is removed",
    sa.players === 2 && !sa.remotes.some(r => r.name === 'C'), { players: sa.players, remotes: sa.remotes.map(r => r.name) });
  await snap('MP-16  C leaves the world', 3);

  // ---- MP-17 no client errors
  const errs = Object.fromEntries(Object.values(clients).map(c => [c.name, c.errors.filter(e => !/favicon|Failed to load resource/.test(e))]));
  check('MP-17', 'no uncaught page errors in any client', Object.values(errs).every(e => e.length === 0), errs);

  await browser.close();
  await stopServer();
  const pass = results.filter(r => r.pass).length;
  const report = { world, stage, seconds: Math.round((Date.now() - t0) / 1000), pass, total: results.length, results };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(OUT, 'captions.json'), JSON.stringify(captions, null, 1));
  log(`${pass}/${results.length} passed in ${report.seconds}s -> ${OUT}`);
  process.exit(pass === results.length ? 0 : 1);
})().catch(async (e) => {
  console.error('ABORT', e);
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ aborted: String(e), results }, null, 2));
  fs.writeFileSync(path.join(OUT, 'captions.json'), JSON.stringify(captions, null, 1));
  try { await browser?.close(); } catch {}
  try { server?.kill(); } catch {}
  process.exit(2);
});
