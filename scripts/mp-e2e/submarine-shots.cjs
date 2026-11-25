// Submarine headless check (openspec space-exploration, task 8.1): one
// single-player client places a submarine in Earth's sea from the hotbar
// (the same right-click path a player uses), boards it with F, dives with
// the real keys and physics, climbs out (parks it), reloads the page and
// checks the submarine is back where it was parked. Screenshots into <outDir>:
// sub-placed.png, sub-diving.png, sub-parked-after-reload.png.
//
//   npx vite build && npx vite preview --port 4179 &
//   node scripts/mp-e2e/submarine-shots.cjs [outDir]
//
// Env: URL (default http://localhost:4179/tenebris/js/?debug&sp). Headless
// swiftshader runs at about 1 fps, so the dive is driven by holding keys for
// real frames and, to reach depth in reasonable time, by the manager's own
// step() (the same physics step a frame runs).
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

const ready = () => { const g = window.__tenebris; return !!(g && g.isReady && g.player && g.player.getCurrentPlanet() && g.submarines); };
const unlock = () => {
  const g = window.__tenebris;
  g.inputManager.isLocked = () => true;
  const st = document.createElement('style');
  st.textContent = '#instructions{display:none!important}';
  document.head.appendChild(st);
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 960, height: 600 }, deviceScaleFactor: 0.5 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => { errors.push(e.message); log('pageerror', e.message); });
  page.on('console', m => { if (m.type() === 'error') log('console.error', m.text().slice(0, 200)); });
  await page.goto(URL);
  await waitFor(page, ready, 300000, 'game ready');
  await page.evaluate(unlock);
  log('ready');

  // Deep water near the spawn: walk out over the sea in rings of directions
  const site = await page.evaluate(() => {
    const g = window.__tenebris, THREE = window.__THREE, p = g.player.getCurrentPlanet();
    const sea = p.getSeaSurfaceRadius();
    const up0 = g.player.position.clone().sub(p.center).normalize();
    const t1 = new THREE.Vector3(1, 0, 0).cross(up0).normalize(), t2 = up0.clone().cross(t1);
    // the nearest spot with WANT m of water (else the deepest seen)
    const WANT = 8;
    let best = null;
    for (let r = 0.02; r < 3; r += 0.02) {
      for (let a = 0; a < 36; a++) {
        const ang = a / 36 * Math.PI * 2;
        const dir = up0.clone().addScaledVector(t1, Math.cos(ang) * r).addScaledVector(t2, Math.sin(ang) * r).normalize();
        const floor = p.getSurfaceHeightInDirection(dir);
        if (!best || sea - floor > best.depth) best = { dir: dir.toArray(), depth: sea - floor, sea };
        if (sea - floor > WANT) return best;
      }
    }
    return best && best.depth > 4 ? best : null;
  });
  if (!site) throw new Error('no deep water found');
  log('site', JSON.stringify(site));
  // Stand on the water there, give a submarine, look down at the sea ahead
  const place = async () => page.evaluate((s) => {
    const g = window.__tenebris, THREE = window.__THREE, p = g.player.getCurrentPlanet();
    const dir = new THREE.Vector3().fromArray(s.dir);
    const pos = p.center.clone().addScaledVector(dir, s.sea + 1.5);
    const t = new THREE.Vector3(1, 0, 0).cross(dir).normalize();
    const look = t.clone().multiplyScalar(Math.cos(0.9)).addScaledVector(dir, -Math.sin(0.9));
    g.player.placeAt(pos, { forward: look.negate(), up: dir });
  }, site);
  await place();
  await waitFor(page, (s) => {
    const g = window.__tenebris, THREE = window.__THREE, p = g.player.getCurrentPlanet();
    return p.getWaterSurfaceRadius(p.center.clone().addScaledVector(new THREE.Vector3().fromArray(s.dir), s.sea - 2)) > 0;
  }, 120000, 'sea loaded', site);
  await place();
  await sleep(1500);
  const placed = await page.evaluate(() => {
    const g = window.__tenebris, bi = g.blockInteraction, inv = bi.getInventory();
    inv.setSlot(0, 254, 1);   // ItemType.SUBMARINE
    inv.setSelectedSlot(0);
    bi.updateHotbarUI();
    g.player.updateCamera();
    const handled = g.submarines.handleRightClick(true);
    const subs = g.submarines.getAll();
    return { handled, n: subs.length, left: inv.getItemCount(254), key: subs[0]?.key, depth: subs[0] ? g.submarines.mediumFor(subs[0]).depthAt(subs[0].local) : null };
  });
  log('placed', JSON.stringify(placed));
  if (placed.n !== 1) throw new Error('submarine not placed');
  await sleep(2500);
  await page.screenshot({ path: path.join(OUT, 'sub-placed.png') });

  // Board with F (the real key path)
  await page.keyboard.press('KeyF');
  await waitFor(page, () => window.__tenebris.submarines.isPiloting(), 30000, 'boarded');
  log('boarded');
  // Flood (C) and throttle up (W) for a few real frames
  await page.keyboard.down('KeyC');
  await page.keyboard.down('KeyW');
  await sleep(6000);
  await page.keyboard.up('KeyW');
  await page.keyboard.up('KeyC');
  let st = await page.evaluate(() => { const g = window.__tenebris, s = g.submarines, c = s.getPiloted(); return { depth: s.mediumFor(c).depthAt(c.local), ballast: c.ballast, throttle: c.throttle, health: c.health }; });
  log('after keys', JSON.stringify(st));
  // Down to a few metres above the seabed with the manager's own step (the
  // frame's physics), turning on the spot, then hold
  st = await page.evaluate((want) => {
    const g = window.__tenebris, s = g.submarines, c = s.getPiloted();
    for (let i = 0; i < 30 * 30; i++) {
      const d = s.mediumFor(c).depthAt(c.local);
      s.step({ throttle: 0, pitch: 0, yaw: i < 120 ? 0.5 : 0, roll: 0, ballast: d < want ? 1 : d > want + 0.5 ? -1 : 0 }, 1 / 30);
      if (!s.isPiloting()) break;
    }
    return { depth: s.mediumFor(c).depthAt(c.local), health: c.health, piloting: s.isPiloting(), hud: document.getElementById('sub-hud').innerText };
  }, Math.min(6, site.depth - 2.5));
  log('dived', JSON.stringify(st));
  await sleep(3000);
  await page.screenshot({ path: path.join(OUT, 'sub-diving.png') });
  // The same moment from close beside the hull (the chase view can be lost in a kelp bed)
  await page.evaluate(() => {
    const g = window.__tenebris, THREE = window.__THREE, s = g.submarines, c = s.getPiloted();
    const world = s.worldPosition(c), up = world.clone().sub(g.player.getCurrentPlanet().center).normalize();
    const side = new THREE.Vector3(1, 0, 0).applyQuaternion(c.orientation);
    s.updateCamera = () => {
      const cam = g.engine.camera;
      cam.position.copy(world).addScaledVector(side, 4).addScaledVector(up, 0.8);
      cam.up.copy(up);
      cam.lookAt(world);
    };
  });
  await sleep(3000);
  await page.screenshot({ path: path.join(OUT, 'sub-diving-close.png') });
  await page.evaluate(() => { delete window.__tenebris.submarines.updateCamera; });

  // Climb out with F: parked where it is, saved the same frame
  const before = await page.evaluate(() => { const c = window.__tenebris.submarines.getPiloted(); return { key: c.key, local: c.local.toArray(), q: c.orientation.toArray() }; });
  await page.keyboard.press('KeyF');
  await waitFor(page, () => !window.__tenebris.submarines.isPiloting(), 30000, 'parked');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('tenebris_earth')).submarines);
  log('parked; saved record', JSON.stringify(saved));

  // Reload: the submarine comes back where it was parked, nobody inside
  await page.reload();
  await waitFor(page, ready, 300000, 'ready after reload');
  await page.evaluate(unlock);
  await waitFor(page, () => window.__tenebris.submarines.getAll().length > 0, 60000, 'submarine restored');
  const after = await page.evaluate(() => { const s = window.__tenebris.submarines; const c = s.getAll()[0]; return { key: c.key, local: c.local.toArray(), q: c.orientation.toArray(), piloting: s.isPiloting(), n: s.getAll().length }; });
  const rec = saved[0].position;
  const atRec = await page.evaluate(() => { const s = window.__tenebris.submarines; const c = s.getAll()[0]; const p = window.__tenebris.player.getCurrentPlanet().configuredCenter; return c.local.clone().add(p).toArray(); });
  const dist = Math.hypot(atRec[0] - rec.x, atRec[1] - rec.y, atRec[2] - rec.z);
  log('after reload', JSON.stringify({ sameKey: after.key === before.key, moved: +dist.toFixed(4), piloting: after.piloting, n: after.n }));
  // Look at it from the water surface above and to the side
  await page.evaluate(() => {
    const g = window.__tenebris, THREE = window.__THREE, p = g.player.getCurrentPlanet(), s = g.submarines, c = s.getAll()[0];
    const world = s.worldPosition(c);
    const up = world.clone().sub(p.center).normalize();
    const side = new THREE.Vector3(1, 0, 0).cross(up).normalize();
    const eye = world.clone().addScaledVector(up, 2).addScaledVector(side, 6);
    const look = world.clone().sub(eye).normalize();
    g.player.placeAt(eye, { forward: look.negate(), up });
  });
  await sleep(4000);
  await page.screenshot({ path: path.join(OUT, 'sub-parked-after-reload.png') });
  // Is its mesh in the scene where the craft is? Then a look from above the water
  const mesh = await page.evaluate(() => {
    const g = window.__tenebris, s = g.submarines, c = s.getAll()[0], m = s.placed.get(c.key).mesh;
    let root = m; while (root.parent) root = root.parent;
    return { inScene: root === g.engine.scene, visible: m.visible, off: +m.getWorldPosition(new window.__THREE.Vector3()).distanceTo(s.worldPosition(c)).toFixed(3) };
  });
  log('mesh', JSON.stringify(mesh));
  await page.evaluate(() => {
    const g = window.__tenebris, THREE = window.__THREE, p = g.player.getCurrentPlanet(), s = g.submarines, c = s.getAll()[0];
    // bring it up to float, so it shows from above the water
    c.ballast = 0;
    s.board(c.key);
    for (let i = 0; i < 30 * 20; i++) s.step({ throttle: 0, pitch: 0, yaw: 0, roll: 0, ballast: -1 }, 1 / 30);
  });
  await sleep(3000);
  await page.screenshot({ path: path.join(OUT, 'sub-surfaced.png') });
  log('errors', errors.length);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
