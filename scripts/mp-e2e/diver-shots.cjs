// Gas-giant diver headless check (openspec space-exploration, task 8.4): a
// single-player client boards its starter rocket, which is put 10 m below
// Aurelia's cloud tops with a diver in its cargo; U lets the diver out (the
// rocket parks, held in the giant's frame), the diver sinks into the helium
// band, collects helium-3, climbs back and docks with F, and the helium-3 is
// in the rocket's cargo with the pilot back in the rocket. Screenshots into
// <outDir>: diver-released.png, diver-deep.png, diver-docked.png.
//
//   npx vite build && npx vite preview --port 4179 &
//   node scripts/mp-e2e/diver-shots.cjs [outDir]
//
// Headless swiftshader runs at about 1 fps: the keys (U, F) go through the
// real handlers; the descent and climb run the manager's own step() (the
// physics step a frame runs) so the dive takes seconds, not hours.
const path = require('path');
const fs = require('fs');
let playwright;
try { playwright = require('playwright'); } catch { playwright = require(require.resolve('playwright', { paths: [require('child_process').execSync('npm root -g').toString().trim()] })); }
const { chromium } = playwright;
const OUT = path.resolve(process.argv[2] || '.');
const URL = process.env.URL || 'http://localhost:4179/tenebris/js/?debug&sp';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);

async function waitFor(page, fn, ms, what, arg) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { if (await page.evaluate(fn, arg)) return; } catch { /* navigating */ }
    await sleep(1000);
  }
  throw new Error('timeout ' + what);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 960, height: 600 }, deviceScaleFactor: 0.5 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => { errors.push(e.message); log('pageerror', e.message); });
  page.on('console', m => { if (m.type() === 'error') log('console.error', m.text().slice(0, 200)); });
  await page.goto(URL);
  await waitFor(page, () => { const g = window.__tenebris; return !!(g && g.isReady && g.player && g.player.getCurrentPlanet() && g.submarines); }, 300000, 'game ready');
  log('ready');
  // A rocket on a pad (the debug menu's spawn-rocket path) if the world has none yet
  const placed = await page.evaluate(async () => {
    const g = window.__tenebris, bi = g.blockInteraction;
    if (bi.getLaunchPadManager().getLaunchPads().some(p => p.rocketParts.length)) return 'had one';
    return await bi.placeStarterRocket(g.player.getCurrentPlanet(), g.player.position);
  });
  log('rocket', placed);
  await waitFor(page, () => window.__tenebris.blockInteraction.getLaunchPadManager().getLaunchPads().some(p => p.rocketParts.length), 120000, 'rocket on its pad');

  // Board the starter rocket, then put it 10 m below Aurelia's cloud tops
  // (above a rocket's crush depth) with a diver in its cargo, and press U
  const released = await page.evaluate(() => {
    const g = window.__tenebris, f = g.rocketFlightManager;
    const pad = g.blockInteraction.getLaunchPadManager().getLaunchPads().find(p => p.rocketParts.length);
    g.player.setEnabled(false);
    if (!f.enterFlightMode(pad)) return { error: 'board failed' };
    const rc = f.getRocketController();
    const giant = f.planets.find(p => p.id === 'aurelia');
    const up = new window.__THREE.Vector3(0, 1, 0);
    rc.position.copy(giant.center).addScaledVector(up, giant.radius - 10);
    rc.velocity.set(0, 0, 0);
    rc.stateMachine.forceState('IN_FLIGHT');
    rc.hasLaunched = true;
    rc.cargo = Array.from({ length: 6 }, () => ({ itemType: 0, quantity: 0 }));
    rc.cargo[0] = { itemType: 256, quantity: 1 };   // ItemType.GAS_GIANT_DIVER
    rc.updateClosestPlanet();
    window.__diveCargo = rc.cargo;
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyU', key: 'u' }));
    document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyU', key: 'u' }));
    const s = g.submarines, c = s.getPiloted();
    return { flying: f.isInFlight(), piloting: s.isPiloting(), hull: c && c.hull, depth: c && s.mediumFor(c).depthAt(c.local), parked: f.getLandedRocketManager().getAllLandedRockets().length };
  });
  log('released', JSON.stringify(released));
  if (!released.piloting) throw new Error('diver not released');
  await sleep(3000);
  await page.screenshot({ path: path.join(OUT, 'diver-released.png') });

  // Down into the helium band, hold until the hold has helium-3
  const deep = await page.evaluate(() => {
    const s = window.__tenebris.submarines, c = s.getPiloted();
    let t = 0;
    for (; t < 240 && s.isPiloting(); t += 1 / 30) {
      const d = s.mediumFor(c).depthAt(c.local);
      const he = c.hold.reduce((n, x) => n + (x.itemType === 222 ? x.quantity : 0), 0);
      if (he >= 4) break;
      s.step({ throttle: 0, pitch: 0, yaw: 0, roll: 0, ballast: d < 34 ? 1 : d > 40 ? -1 : 0 }, 1 / 30);
    }
    return { t: +t.toFixed(1), depth: s.mediumFor(c).depthAt(c.local), health: c.health, hold: c.hold.filter(x => x.quantity), hud: document.getElementById('sub-hud').innerText };
  });
  log('deep', JSON.stringify(deep));
  await sleep(3000);
  await page.screenshot({ path: path.join(OUT, 'diver-deep.png') });

  // Climb back (blow the tanks) to within docking reach, then F
  const climbed = await page.evaluate(() => {
    const s = window.__tenebris.submarines;
    let t = 0;
    for (; t < 240 && s.rocketDistance() > 8; t += 1 / 30) s.step({ throttle: 0, pitch: 0, yaw: 0, roll: 0, ballast: -1 }, 1 / 30);
    return { t: +t.toFixed(1), dist: s.rocketDistance() };
  });
  log('climbed', JSON.stringify(climbed));
  await page.keyboard.press('KeyF');
  await waitFor(page, () => !window.__tenebris.submarines.isPiloting(), 30000, 'docked');
  const docked = await page.evaluate(() => {
    const g = window.__tenebris, f = g.rocketFlightManager, rc = f.getRocketController();
    const cargo = rc && rc.getCargo();
    return { flying: f.isInFlight(), sameHold: cargo === window.__diveCargo, cargo: (cargo || []).filter(x => x.quantity), state: rc && rc.getState() };
  });
  log('docked', JSON.stringify(docked));
  await sleep(3000);
  await page.screenshot({ path: path.join(OUT, 'diver-docked.png') });
  log('errors', errors.length);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
