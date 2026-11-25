// Races over shared NPC state (openspec friendship-npcs, tasks 4.3 and
// 4.5): two headless clients on a fresh local server-js, both on Sequoia.
//  - Delivery: a village request is brought down to its last item, then A
//    and B both click Give at once (real DOM clicks, so the trade ledger is
//    live). One delivery goes in; the other is refused by the server and
//    that player gets their item back.
//  - Barter: a trader's offer is traded down to its last unit, then A and B
//    both click Trade at once. One trade goes through; the other player's
//    payment comes back.
//
//   npx vite build && npx vite preview --port 4179 &
//   node scripts/mp-e2e/npc-race.cjs [outDir]
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
const PORT = Number(process.env.MP_PORT || 8095);
const HELPERS = fs.readFileSync(path.join(ROOT, 'scripts/mp-e2e/page-helpers.js'), 'utf8');
const BODY = 'sequoia';
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

// Open the panel on an NPC of the field by id (what F does once aimed)
const openOn = (page, id) => page.evaluate((id) => {
  const G = window.__tenebris;
  const i = G.npcField.npcs.findIndex(l => l.npc.id === id);
  G.npcPanel.open(G.npcField.npcAt(i));
  return i >= 0;
}, id);
const count = (page, item) => page.evaluate((item) => window.__tenebris.blockInteraction.getInventory().getItemCount(item), item);
// A real DOM click on the panel's button (the trade ledger listens for it),
// dispatched in the page so a panel redraw mid-click cannot lose it
const press = (page, sel) => page.evaluate((sel) => { const b = document.querySelector(sel); if (!b) throw new Error('no ' + sel); b.click(); }, sel);
const give = (page, item, n) => page.evaluate(({ item, n }) => {
  const inv = window.__tenebris.blockInteraction.getInventory();
  inv.setSlot(0, item, n);
  window.__tenebris.blockInteraction.onInventoryChanged();
}, { item, n });

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mp-npc-race-'));
  const server = spawn(process.execPath, [path.join(ROOT, 'server-js/server.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir }, stdio: 'ignore',
  });
  const stop = () => { server.kill(); fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 }); };
  try {
    await waitFor(() => fetch(`http://127.0.0.1:${PORT}/health`).then(r => r.ok), 15000, 'server');
    const world = await (await fetch(`http://127.0.0.1:${PORT}/worlds`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Race', seed: 4242 }),
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
    await waitFor(() => A.evaluate(() => window.__mp && window.__mp.ready()), 240000, 'A ready');
    const B = await mk('Bob');
    await waitFor(() => B.evaluate(() => window.__mp && window.__mp.ready()), 240000, 'B ready');
    for (const p of [A, B]) await p.evaluate(() => { window.__mp.cleanHud(); window.__tenebris.inputManager.isLocked = () => true; });
    for (const p of [A, B]) await p.evaluate((b) => window.__tenebris.teleportToPlanet(b), BODY);
    for (const [n, p] of [['A', A], ['B', B]]) {
      await waitFor(() => p.evaluate(() => (window.__tenebris.npcField?.npcs.length ?? 0) > 0 && !!window.__tenebris.npcClient.village('sequoia', 0)), 300000, `${n} has the village`);
    }
    log('both on', BODY);

    // ---- the delivery race ----
    const req = await A.evaluate(() => window.__tenebris.npcClient.village('sequoia', 0).requests.find(q => q.item !== undefined));
    check('village 0 has a request for items', !!req, req);
    // A brings it down to its last item (through the panel, like a player)
    await give(A, req.item, req.need - 1);
    await openOn(A, 'sequoia:0');
    await press(A, '.npc-deliver:not([disabled])');
    await waitFor(() => B.evaluate((id) => window.__tenebris.npcClient.village('sequoia', 0).requests.find(q => q.id === id)?.got, req.id).then(g => g === req.need - 1), 30000, 'B sees the request at its last item');
    await give(A, req.item, 1);
    await give(B, req.item, 1);
    // B talks to a villager of the same village (people go round the villages: index 2 is village 0's), A to its elder
    await openOn(B, 'sequoia:2');
    await openOn(A, 'sequoia:0');
    await sleep(1500);
    await Promise.all([press(A, '.npc-deliver:not([disabled])'), press(B, '.npc-deliver:not([disabled])')]);
    await sleep(6000);
    const [ia, ib] = [await count(A, req.item), await count(B, req.item)];
    const vA = await A.evaluate(() => window.__tenebris.npcClient.village('sequoia', 0));
    const vB = await B.evaluate(() => window.__tenebris.npcClient.village('sequoia', 0));
    const doneA = !vA.requests.some(q => q.id === req.id), doneB = !vB.requests.some(q => q.id === req.id);
    check('the request is complete on both, once', doneA && doneB, { doneA, doneB });
    check('exactly one player gave the last item, the other has theirs back', ia + ib === 1, { a: ia, b: ib });
    await B.screenshot({ path: path.join(OUT, 'npc-race-delivery-B.png') });

    // ---- the barter race: on whichever world trader 0 is visiting ----
    let trader = await A.evaluate(() => ({ i: 0, t: window.__tenebris.npcClient.trader(0) }));
    if (trader.t && trader.t.at !== BODY) {
      log('trader 0 is on', trader.t.at, '- both go there');
      for (const p of [A, B]) await p.evaluate((b) => window.__tenebris.teleportToPlanet(b), trader.t.at);
      for (const p of [A, B]) await waitFor(() => p.evaluate((b) => window.__tenebris.player.getCurrentPlanet()?.getName() === b && (window.__tenebris.npcField?.npcs.length ?? 0) > 0, trader.t.at), 300000, 'on the trader\'s world');
      // the server wakes that world: the trader record as it is now
      trader = await A.evaluate(() => ({ i: 0, t: window.__tenebris.npcClient.trader(0) }));
    }
    if (!trader.t) trader = null;
    if (!trader) {
      check('a trader exists in this world', false);
    } else {
      const o = trader.t.offers[0];
      const id = `trader:${trader.i}`;
      await waitFor(() => A.evaluate((id) => window.__tenebris.npcField.npcs.some(l => l.npc.id === id), id), 30000, 'the trader camps');
      await waitFor(() => B.evaluate((id) => window.__tenebris.npcField.npcs.some(l => l.npc.id === id), id), 30000, 'the trader camps on B');
      // A trades it down to the last unit
      await openOn(A, id);
      for (let k = 0; k < o.stock - 1; k++) {
        await give(A, o.take.item, o.take.n);
        const btn = await A.evaluate(() => [...document.querySelectorAll('#npc-menu .npc-trade')].map(b => b.textContent + (b.disabled ? ' (off)' : '')));
        await press(A, '#npc-menu .npc-offer .npc-trade');
        await sleep(1500);
        const st = await Promise.all([A, B].map(p => p.evaluate((i) => window.__tenebris.npcClient.trader(i)?.offers[0].stock, trader.i)));
        log('A traded', k + 1, 'buttons', JSON.stringify(btn), 'stock A/B', JSON.stringify(st));
      }
      await waitFor(() => B.evaluate((i) => window.__tenebris.npcClient.trader(i).offers[0].stock, trader.i).then(s => s === 1), 30000, 'B sees one unit left');
      await give(A, o.take.item, o.take.n);
      await give(B, o.take.item, o.take.n);
      const gotBefore = [await count(A, o.give.item), await count(B, o.give.item)];
      await openOn(A, id);
      await openOn(B, id);
      await sleep(1500);
      await Promise.all([press(A, '#npc-menu .npc-offer .npc-trade'), press(B, '#npc-menu .npc-offer .npc-trade')]);
      await sleep(6000);
      const paidA = o.take.n - await count(A, o.take.item), paidB = o.take.n - await count(B, o.take.item);
      const gotA = await count(A, o.give.item) - gotBefore[0], gotB = await count(B, o.give.item) - gotBefore[1];
      const stockA = await A.evaluate((i) => window.__tenebris.npcClient.trader(i).offers[0].stock, trader.i);
      const stockB = await B.evaluate((i) => window.__tenebris.npcClient.trader(i).offers[0].stock, trader.i);
      check('the last unit is gone on both', stockA === 0 && stockB === 0, { stockA, stockB });
      check('one trade went through, the other was undone (paid back, nothing kept)',
        (paidA === o.take.n && gotA === o.give.n && paidB === 0 && gotB === 0) || (paidB === o.take.n && gotB === o.give.n && paidA === 0 && gotA === 0),
        { paidA, gotA, paidB, gotB });
      await A.screenshot({ path: path.join(OUT, 'npc-race-trader-A.png') });
    }
    await browser.close();
  } catch (e) {
    log('ERROR', e.message);
    failed = true;
  } finally {
    stop();
  }
  log(failed ? 'FAILED' : 'ALL PASSED');
  process.exit(failed ? 1 : 0);
})();
