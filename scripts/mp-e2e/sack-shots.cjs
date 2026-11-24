// The overflow sack, two headless clients on a fresh local server-js: A's
// inventory is full, A mines two blocks - each drops at A's feet, the second
// merging into the first sack (one sack, 2 dirt-or-whatever). B sees the
// sack. B walks up to it with room and picks it up; the sack is gone on both
// clients and B holds what A dropped. Writes <outDir>/sack-A.png (A looking
// at the sack) and sack-B.png.
//
//   npx vite build && npx vite preview --port 4179 &
//   node scripts/mp-e2e/sack-shots.cjs [outDir]
//
// Env: CLIENT_URL (default http://localhost:4179/tenebris/js/), MP_PORT (8094).
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
let playwright;
try { playwright = require('playwright'); } catch { playwright = require(require.resolve('playwright', { paths: [require('child_process').execSync('npm root -g').toString().trim()] })); }
const { chromium } = playwright;
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.resolve(process.argv[2] || '.');
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:4179/tenebris/js/';
const PORT = Number(process.env.MP_PORT || 8094);
const HELPERS = fs.readFileSync(path.join(ROOT, 'scripts/mp-e2e/page-helpers.js'), 'utf8');
const STONE = 1;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
let failed = false;
const check = (name, pass, detail) => { log(pass ? 'PASS' : 'FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); if (!pass) failed = true; };

async function waitFor(fn, ms, what) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { const v = await fn(); if (v) return v; } catch { /* navigating */ }
    await sleep(500);
  }
  throw new Error('timeout ' + what);
}

// Every sack this client has: [{ tile, items: [[type, qty]] }]
const sacks = (p) => p.evaluate(() => window.__tenebris.blockInteraction.garbagePileManager.getPlacedPiles()
  .map(s => ({ tile: s.tileIndex, items: s.slots.filter(x => x.itemType !== 0).map(x => [x.itemType, x.quantity]) })));

(async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mp-sack-'));
  const server = spawn(process.execPath, [path.join(ROOT, 'server-js/server.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir }, stdio: 'ignore',
  });
  const stop = () => { server.kill(); fs.rmSync(dataDir, { recursive: true, force: true }); };
  try {
    await waitFor(() => fetch(`http://127.0.0.1:${PORT}/health`).then(r => r.ok), 15000, 'server');
    const world = await (await fetch(`http://127.0.0.1:${PORT}/worlds`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Sacks', seed: 4242 }),
    })).json();
    const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
    const mk = async (name) => {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 0.5 });
      await ctx.addInitScript(({ name }) => { try { localStorage.setItem('tenebris_mp_name', name); } catch {} }, { name });
      await ctx.addInitScript(HELPERS);
      const page = await ctx.newPage();
      page.on('pageerror', e => log(name, 'pageerror', e.message));
      await page.goto(`${CLIENT_URL}?debug&world=${world.id}&server=ws://127.0.0.1:${PORT}/`);
      return page;
    };
    const A = await mk('Alice');
    const B = await mk('Bob');
    await waitFor(() => A.evaluate(() => window.__mp && window.__mp.ready()), 240000, 'A ready');
    await waitFor(() => B.evaluate(() => window.__mp && window.__mp.ready()), 240000, 'B ready');
    for (const p of [A, B]) await p.evaluate(() => window.__mp.cleanHud());
    await sleep(3000);
    log('both in', world.id);

    // A stands on one tile; B stands well away (out of pickup reach)
    const site = await A.evaluate(() => {
      const m = window.__mp;
      const build = m.ring(m.myTile(), 3)[0];
      const spots = m.pickSpots(build, 2, 4);
      return { stand: spots[0], far: spots[1], dig: m.ring(spots[0], 2).slice(0, 2) };
    });
    await A.evaluate((s) => window.__mp.standAt(s.stand, s.dig[0]), site);
    await B.evaluate((s) => window.__mp.standAt(s.far, s.stand), site);
    await sleep(2000);

    // A: a full inventory (all 36 slots stone), then mines two blocks
    const mined = await A.evaluate(({ s, STONE }) => {
      const bi = window.__tenebris.blockInteraction;
      const inv = bi.getInventory();
      for (let i = 0; i < 36; i++) inv.setSlot(i, STONE, 64);
      bi.updateHotbarUI();
      return s.dig.map(t => window.__mp.breakTop(t));
    }, { s: site, STONE });
    log('A mined', mined);
    await sleep(1000);
    const aSacks = await sacks(A);
    const total = (list) => list.reduce((n, s) => n + s.items.reduce((m, it) => m + it[1], 0), 0);
    check('A: one sack at their feet, holding both mined blocks', aSacks.length === 1 && aSacks[0].tile === site.stand && total(aSacks) === 2, aSacks);
    await waitFor(async () => total(await sacks(B)) === 2, 20000, 'sack on B');
    check('B sees the same sack', true, await sacks(B));

    // A looks at the sack for the screenshot
    await A.evaluate((s) => { const m = window.__mp; m.standAt(m.ring(s.stand, 2)[3], s.stand, -1.2); }, site);
    await sleep(2500);
    await A.screenshot({ path: path.join(OUT, 'sack-A.png'), scale: 'css' });

    // B (room in the bag) walks up to it: picks it up
    const items = aSacks[0].items;
    const before = await B.evaluate((items) => items.map(([t]) => window.__mp.count(t)), items);
    await B.evaluate((s) => window.__mp.standAt(s.stand, s.dig[0]), site);
    await waitFor(async () => (await sacks(B)).length === 0, 20000, 'B picked up');
    const after = await B.evaluate((items) => items.map(([t]) => window.__mp.count(t)), items);
    check('B walked up and picked up everything in it', items.every(([, q], i) => after[i] - before[i] === q), { items, before, after });
    await waitFor(async () => (await sacks(A)).length === 0, 20000, 'sack gone on A');
    check('the sack is gone for A too', true);
    await B.screenshot({ path: path.join(OUT, 'sack-B.png'), scale: 'css' });
    await browser.close();
  } finally {
    stop();
  }
  log(failed ? 'SOME CHECKS FAILED' : 'all checks passed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
