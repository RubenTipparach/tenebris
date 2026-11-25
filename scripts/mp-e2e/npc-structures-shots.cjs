// Village structures and talking (openspec friendship-npcs, tasks 3.4, 4.1
// and 4.2), checked by eye in
// single player: on Sequoia, a village's first structure before a build
// request completes (the staked plot), after (its first stage up), then the
// page is RELOADED and it must still stand. Writes <outDir>/npc-village-
// before.png, -after.png, -reload.png and -hall.png (the hall finished).
// Then the player aims at the other village's elder: the prompt names it
// with the Interact key, F (a real key press) opens its panel with the
// village's three requests, and the elder stops and faces the player.
// Writes npc-talk-prompt.png, npc-panel.png and npc-facing.png.
//
//   npx vite build && npx vite preview --port 4179 &
//   node scripts/mp-e2e/npc-structures-shots.cjs [outDir]
const path = require('path');
const fs = require('fs');
let playwright;
try { playwright = require('playwright'); } catch { playwright = require(require.resolve('playwright', { paths: [require('child_process').execSync('npm root -g').toString().trim()] })); }
const { chromium } = playwright;
const OUT = path.resolve(process.argv[2] || '.');
const URL = process.env.URL || 'http://localhost:4179/tenebris/js/?debug&sp';
const BODY = 'sequoia';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
let failed = false;
const check = (name, pass, detail) => { log(pass ? 'PASS' : 'FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); if (!pass) failed = true; };

async function waitFor(page, fn, ms, what, arg) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { const v = await page.evaluate(fn, arg); if (v) return v; } catch { /* navigating */ }
    await sleep(1000);
  }
  throw new Error('timeout ' + what);
}

const ready = () => { const g = window.__tenebris; return !!(g && g.isReady && g.player && g.player.getCurrentPlanet()); };
const villages = () => window.__tenebris.npcField?.debugVillages() ?? [];

// Stand back from structure `index` of village `v` and look at it
async function frame(page, v, index) {
  await page.evaluate(({ v, index }) => {
    const G = window.__tenebris, T = window.__THREE, p = G.player.getCurrentPlanet();
    const s = G.npcField.debugStructureSite(v, index);
    const at = new T.Vector3(...s.pos), up = new T.Vector3(...s.up), face = new T.Vector3(...s.face);
    const side = new T.Vector3().crossVectors(up, face).normalize();
    const back = at.clone().addScaledVector(face, 13).addScaledVector(side, 6);
    const dir = back.clone().sub(p.center).normalize();
    const ground = p.center.clone().addScaledVector(dir, p.getSurfaceHeightInDirection(dir) + 0.1);
    const eye = ground.clone().addScaledVector(dir, 1.6);
    G.player.placeAt(ground, { forward: at.clone().addScaledVector(up, 2).sub(eye).normalize().negate(), up: dir });
  }, { v, index });
  await sleep(8000);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', e => log('pageerror', e.message));
  const arrive = async () => {
    await waitFor(page, ready, 300000, 'game ready');
    // the start menu off (the shared harness's cleanHud) and the game taking the keys
    await page.evaluate(() => {
      const s = document.createElement('style');
      s.textContent = '#instructions{display:none!important}';
      document.head.appendChild(s);
      window.__tenebris.inputManager.isLocked = () => true;
    });
    await page.evaluate((b) => window.__tenebris.teleportToPlanet(b), BODY);
    await waitFor(page, () => { const v = window.__tenebris.npcField?.debugVillages() ?? []; return v.length > 0 && v.every(x => x.key); }, 300000, 'villages placed');
  };
  try {
    await page.goto(URL);
    await arrive();
    const before = await page.evaluate(villages);
    log('villages', JSON.stringify(before));
    // the village with an open build request (the one a delivery would raise)
    const v = await page.evaluate(() => window.__tenebris.npcClient.debugOpenBuild());
    check('a build request is open', v >= 0, { village: v });
    await frame(page, v, 0);
    await page.screenshot({ path: path.join(OUT, 'npc-village-before.png') });
    check('it completes', (await page.evaluate(() => window.__tenebris.npcClient.debugCompleteBuild())) === v);
    await sleep(3000);
    const after = await page.evaluate(villages);
    check('the record moved the structure on', before[v].key !== after[v].key, { before: before[v].key, after: after[v].key });
    await page.screenshot({ path: path.join(OUT, 'npc-village-after.png') });

    // Reload: the save brings the same structure back
    await page.reload();
    await arrive();
    await frame(page, v, 0);
    const reload = await page.evaluate(villages);
    check('it stands after a reload', reload[v].key === after[v].key, { reload: reload[v].key });
    await page.screenshot({ path: path.join(OUT, 'npc-village-reload.png') });

    // The hall finished and the granary started, for the eye (a debug stage
    // set: the next build requests only open after the reopen delay)
    await page.evaluate((v) => window.__tenebris.npcClient.debugSetStructure(v, 1, 1), v);
    await frame(page, v, 0);
    log('hall', JSON.stringify(await page.evaluate(villages)));
    await page.screenshot({ path: path.join(OUT, 'npc-village-hall.png') });

    // ---- talking to the other village's elder (4.1, 4.2) ----
    const w = v === 0 ? 1 : 0;
    const elderId = `${BODY}:${w}`;   // the first `villages` people are the elders, in village order
    await page.evaluate(() => { window.__tenebris.inputManager.isLocked = () => true; });
    const stand = async () => page.evaluate((id) => {
      const G = window.__tenebris, T = window.__THREE, p = G.player.getCurrentPlanet();
      const n = G.npcField.debugPositions().find(x => x.id === id);
      const at = new T.Vector3(...n.pos), up = at.clone().sub(p.center).normalize();
      const side = new T.Vector3(...n.face).normalize();
      const spot = at.clone().addScaledVector(side, 2.8);
      const dir = spot.clone().sub(p.center).normalize();
      const ground = p.center.clone().addScaledVector(dir, p.getSurfaceHeightInDirection(dir) + 0.05);
      const eye = ground.clone().addScaledVector(dir, 1.6);
      G.player.placeAt(ground, { forward: at.clone().addScaledVector(up, 1.4).sub(eye).normalize().negate(), up: dir });
    }, elderId);
    // the elder wanders: stand in front of it and re-aim until the prompt shows
    let prompt = '';
    for (let i = 0; i < 12 && !prompt; i++) {
      await stand();
      await sleep(2500);
      prompt = await page.evaluate(() => { const h = document.getElementById('npc-hint'); return h && h.style.display !== 'none' ? h.textContent : ''; });
    }
    check('aiming at the elder shows the talk prompt with the Interact key', /^\[F\] talk to [A-Za-z ]+$/.test(prompt), prompt);
    await page.screenshot({ path: path.join(OUT, 'npc-talk-prompt.png') });
    await page.keyboard.press('KeyF');
    await sleep(4000);
    const panel = await page.evaluate((id) => {
      const el = document.getElementById('npc-menu');
      return { open: !!el && el.style.display === 'flex', rows: el ? el.querySelectorAll('.npc-request').length : 0,
        title: el?.querySelector('.modal-menu-title')?.textContent ?? '', slots: el ? el.querySelectorAll('.inventory-slot').length : 0 };
    }, elderId);
    check('F opens the elder\'s panel', panel.open, panel);
    check('the panel shows the village\'s three requests as icon slots', panel.rows === 3, panel.rows);
    check('and the hotbar + bag', panel.slots >= 36, panel.slots);
    await page.screenshot({ path: path.join(OUT, 'npc-panel.png') });
    await page.evaluate(() => { document.getElementById('npc-menu').style.visibility = 'hidden'; });
    await sleep(5000);
    const facing = await page.evaluate((id) => {
      const G = window.__tenebris, T = window.__THREE, p = G.player.getCurrentPlanet();
      const n = G.npcField.debugPositions().find(x => x.id === id);
      const at = new T.Vector3(...n.pos), up = at.clone().sub(p.center).normalize();
      const to = G.player.position.clone().sub(at); to.addScaledVector(up, -to.dot(up)).normalize();
      return { dot: +new T.Vector3(...n.face).dot(to).toFixed(3), talkW: +n.talkW.toFixed(2), moveW: +n.moveW.toFixed(2) };
    }, elderId);
    check('the elder stops and faces the player, talking', facing.dot > 0.9 && facing.talkW > 0.8 && facing.moveW < 0.1, facing);
    await page.screenshot({ path: path.join(OUT, 'npc-facing.png') });
  } catch (e) {
    log('ERROR', e.message);
    failed = true;
  }
  await browser.close();
  log(failed ? 'FAILED' : 'ALL PASSED');
  process.exit(failed ? 1 : 0);
})();
