// Shared objects + chat (openspec mp-shared-objects), checked by eye: two
// headless clients on a fresh local server-js in one world. A places a chest
// and puts 16 iron in, with the chest panel left open; B opens the same
// chest and right-clicks the stack (takes half); A's open panel must follow
// without closing. Then A types a chat line with the real keys and B's log
// shows it. Writes <outDir>/mp-chest-B.png, mp-chest-A.png, mp-chat.png.
//
//   npx vite build && npx vite preview --port 4179 &
//   node scripts/mp-e2e/shared-shots.cjs [outDir]
//
// Env: CLIENT_URL (default http://localhost:4179/tenebris/js/), MP_PORT (8093).
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
const PORT = Number(process.env.MP_PORT || 8093);
const HELPERS = fs.readFileSync(path.join(ROOT, 'scripts/mp-e2e/page-helpers.js'), 'utf8');
const IRON = 23;
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

(async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mp-shared-'));
  const server = spawn(process.execPath, [path.join(ROOT, 'server-js/server.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir }, stdio: 'ignore',
  });
  const stop = () => { server.kill(); fs.rmSync(dataDir, { recursive: true, force: true }); };
  try {
    await waitFor(() => fetch(`http://127.0.0.1:${PORT}/health`).then(r => r.ok), 15000, 'server');
    const world = await (await fetch(`http://127.0.0.1:${PORT}/worlds`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Shared', seed: 4242 }),
    })).json();
    const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
    const mk = async (name) => {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 0.25 });
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

    // Both stand by a chest site near A's spawn, looking at it
    const site = await A.evaluate(() => {
      const m = window.__mp;
      const build = m.ring(m.myTile(), 3)[0];
      return { build, chest: m.ring(build, 1)[2], spots: m.pickSpots(build, 2) };
    });
    await A.evaluate((s) => window.__mp.standAt(s.spots[0], s.chest), site);
    await B.evaluate((s) => window.__mp.standAt(s.spots[1], s.chest), site);
    await sleep(2000);

    // A places the chest and puts 16 iron in, panel left open
    await A.evaluate((s) => window.__mp.placeChest(s.chest), site);
    await waitFor(() => B.evaluate((s) => window.__mp.chestAt(s.chest) !== null, site), 20000, 'chest on B');
    await A.evaluate(({ s, IRON }) => {
      const bi = window.__tenebris.blockInteraction;
      const c = bi.storageChestManager.getChestAtTile(s.chest);
      bi.getInventory().setSlot(5, IRON, 16);
      bi.storageUI.open(c);
      bi.storageUI.transferFromInventory(5, 0);
    }, { s: site, IRON });
    await waitFor(async () => JSON.stringify(await B.evaluate((s) => window.__mp.chestAt(s.chest), site)) === JSON.stringify([[IRON, 16]]), 20000, 'deposit on B');
    check('B sees the 16 iron A put in', true);

    // B opens it and right-clicks the stack: takes half (8)
    await B.evaluate(({ s }) => {
      const bi = window.__tenebris.blockInteraction;
      const c = bi.storageChestManager.getChestAtTile(s.chest);
      bi.storageUI.open(c);
      bi.storageUI.handleRightClick(0);
    }, { s: site });
    await waitFor(async () => JSON.stringify(await A.evaluate((s) => window.__mp.chestAt(s.chest), site)) === JSON.stringify([[IRON, 8]]), 20000, 'take on A');
    await sleep(1500);
    const a = await A.evaluate(({ s, IRON }) => {
      const bi = window.__tenebris.blockInteraction;
      const ui = bi.storageUI;
      const cell = document.querySelector('#storage-grid .storage-slot .slot-count');
      return { open: ui.isMenuOpen(), sameChest: ui.getCurrentStorage() === bi.storageChestManager.getChestAtTile(s.chest), shown: cell && cell.textContent, iron: window.__mp.count(IRON) };
    }, { s: site, IRON });
    const b = await B.evaluate(({ IRON }) => ({ iron: window.__mp.count(IRON), open: window.__tenebris.blockInteraction.storageUI.isMenuOpen() }), { IRON });
    check("A's chest panel stayed open on the same chest and shows 8 left", a.open && a.sameChest && a.shown === '8', a);
    check('B took 8 iron, A has none, the chest has 8: 16 in total', b.iron === 8 && a.iron === 0, { a, b });
    await B.screenshot({ path: path.join(OUT, 'mp-chest-B.png'), scale: 'css' });
    await A.screenshot({ path: path.join(OUT, 'mp-chest-A.png'), scale: 'css' });

    // Chat: A presses Enter, types, Enter - the real key path
    for (const p of [A, B]) await p.evaluate(() => { window.__mp.closeMenus(); });
    await sleep(500);
    await A.keyboard.press('Enter');
    await sleep(300);
    const typing = await A.evaluate(() => document.activeElement && document.activeElement.id);
    check('Enter opens the chat box', typing === 'chat-input', typing);
    await A.keyboard.type('hello from Alice - the iron is in the chest');
    await A.keyboard.press('Enter');
    await waitFor(() => B.evaluate(() => [...document.querySelectorAll('#chat-log .chat-line')].some(e => e.textContent.includes('hello from Alice'))), 10000, 'chat on B');
    check("B's log shows A's line", true);
    await B.screenshot({ path: path.join(OUT, 'mp-chat.png'), scale: 'css' });
    await browser.close();
  } finally {
    stop();
  }
  log(failed ? 'SOME CHECKS FAILED' : 'all checks passed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
