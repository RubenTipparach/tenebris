// A met trader on the system map (openspec friendship-npcs, task 4.5), by
// eye, in single player: before meeting, no trader marker; the player goes
// to the world trader 0 is visiting, opens its panel (meets it), and the
// system map then marks that world with the trader's name. Writes
// <outDir>/npc-trader-map-before.png and -after.png.
//
//   npx vite build && npx vite preview --port 4179 &
//   node scripts/mp-e2e/npc-trader-map-shot.cjs [outDir]
const path = require('path');
const fs = require('fs');
let playwright;
try { playwright = require('playwright'); } catch { playwright = require(require.resolve('playwright', { paths: [require('child_process').execSync('npm root -g').toString().trim()] })); }
const { chromium } = playwright;
const OUT = path.resolve(process.argv[2] || '.');
const URL = process.env.URL || 'http://localhost:4179/tenebris/js/?debug&sp';
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

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  page.on('pageerror', e => log('pageerror', e.message));
  const mapShot = async (file) => {
    await page.evaluate(() => window.__tenebris.blockInteraction.getCraftingSystem().openPanel('map'));
    await sleep(1500);
    await page.evaluate(() => document.querySelector('.map-system')?.click());
    await sleep(3000);
    await page.screenshot({ path: path.join(OUT, file) });
    await page.keyboard.press('Escape');
    await sleep(1000);
  };
  try {
    await page.goto(URL);
    await waitFor(page, () => { const g = window.__tenebris; return !!(g && g.isReady && g.player?.getCurrentPlanet()); }, 300000, 'ready');
    await page.evaluate(() => {
      const s = document.createElement('style'); s.textContent = '#instructions{display:none!important}'; document.head.appendChild(s);
      window.__tenebris.inputManager.isLocked = () => true;
    });
    // waking any inhabited world starts the trader band
    await page.evaluate(() => window.__tenebris.teleportToPlanet('sequoia'));
    const at = await waitFor(page, () => window.__tenebris.npcClient.trader(0)?.at, 300000, 'traders');
    log('trader 0 is on', at);
    await mapShot('npc-trader-map-before.png');
    if (at !== 'sequoia') await page.evaluate((b) => window.__tenebris.teleportToPlanet(b), at);
    await waitFor(page, () => window.__tenebris.npcField?.npcs.some(l => l.npc.id === 'trader:0'), 300000, 'trader camped');
    await page.evaluate(() => {
      const G = window.__tenebris, f = G.npcField;
      G.npcPanel.open(f.npcAt(f.npcs.findIndex(l => l.npc.id === 'trader:0')));
    });
    await sleep(2000);
    check('opening its panel meets the trader', await page.evaluate(() => window.__tenebris.missions.getTracker().hasMet('trader:0')));
    await page.evaluate(() => window.__tenebris.npcPanel.close());
    await mapShot('npc-trader-map-after.png');
  } catch (e) {
    log('ERROR', e.message); failed = true;
  }
  await browser.close();
  log(failed ? 'FAILED' : 'ALL PASSED');
  process.exit(failed ? 1 : 0);
})();
