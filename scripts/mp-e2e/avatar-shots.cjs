// Other players' avatars (openspec avatar-anims), checked by eye: two
// headless clients on a local server-js; B stands in front of A, looks up,
// looks down and mines; A screenshots B's avatar into <outDir>:
// avatar-pitch-up.png, avatar-pitch-down.png, avatar-mining*.png.
//
//   PORT=8091 DATA_DIR=$(mktemp -d) node server-js/server.js &
//   npx vite build && npx vite preview --port 4179 &
//   node scripts/mp-e2e/avatar-shots.cjs [outDir]
//
// Env: URL (default http://localhost:4179/tenebris/js/?debug&mp&server=ws://localhost:8091/).
// Headless swiftshader runs at ~1 fps, so a block breaks in a frame or two:
// the mining shots are taken whenever A sees B's mine loop on.
const path = require('path');
const fs = require('fs');
let playwright;
try { playwright = require('playwright'); } catch { playwright = require(require.resolve('playwright', { paths: [require('child_process').execSync('npm root -g').toString().trim()] })); }
const { chromium } = playwright;
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.resolve(process.argv[2] || '.');
const URL = process.env.URL || 'http://localhost:4179/tenebris/js/?debug&mp&server=ws://localhost:8091/';
const HELPERS = fs.readFileSync(path.join(ROOT, 'scripts/mp-e2e/page-helpers.js'), 'utf8');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);

async function waitFor(page, fn, ms, what) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { if (await page.evaluate(fn)) return; } catch { /* navigating */ }
    await sleep(1000);
  }
  throw new Error('timeout ' + what);
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const mk = async (name) => {
    const ctx = await browser.newContext({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 0.35 });
    await ctx.addInitScript(({ name }) => { try { localStorage.setItem('tenebris_mp_name', name); } catch {} }, { name });
    await ctx.addInitScript(HELPERS);
    const page = await ctx.newPage();
    page.on('pageerror', e => log(name, 'pageerror', e.message));
    page.on('console', m => { if (m.type() === 'error') log(name, 'console.error', m.text().slice(0, 200)); });
    await page.goto(URL);
    return page;
  };
  const A = await mk('Alice');
  const B = await mk('Bob');
  await waitFor(A, () => window.__mp && window.__mp.ready(), 240000, 'A ready');
  await waitFor(B, () => window.__mp && window.__mp.ready(), 240000, 'B ready');
  log('both ready');
  // Treat the page as pointer-locked so the real input path runs (mouse
  // buttons reach PlanetBlockInteraction.update)
  for (const p of [A, B]) await p.evaluate(() => {
    window.__tenebris.inputManager.isLocked = () => true;
    const st = document.createElement('style');
    st.textContent = '#instructions,#crosshair{display:none!important}';
    document.head.appendChild(st);
  });

  // Positions: in daylight (the tile under the sun), B three rings from A
  const site = await A.evaluate(() => {
    const g = window.__tenebris, p = g.player.getCurrentPlanet();
    const dir = g.sunPosition.clone().sub(p.center).normalize();
    const t0 = p.getTileAtPoint(p.center.clone().addScaledVector(dir, p.radius)).index;
    // the highest ground near the sub-solar point (dry land, in daylight)
    let t = t0, best = -1;
    for (let r = 0; r <= 6; r++) for (const c of window.__mp.ring(t0, r)) {
      const d = p.groundDepthOf(c);
      if (d > best) { best = d; t = c; }
    }
    // B two rings away on ground as level as possible with A
    const ring2 = window.__mp.ring(t, 2);
    ring2.sort((a, b) => Math.abs(p.groundDepthOf(a) - best) - Math.abs(p.groundDepthOf(b) - best));
    const bTile = ring2[0];
    return { t, bTile };
  });
  log('site', JSON.stringify(site));
  const tA = site.t;
  const setup = async () => {
    await A.evaluate((s) => window.__mp.standAt(s.t, s.bTile), site);
    await B.evaluate((s) => window.__mp.standAt(s.bTile, s.t), site);
    await sleep(1500);
    await A.evaluate(() => window.__mp.facePlayer('Bob'));
  };
  await setup();
  await waitFor(A, (s) => window.__mp.tileLoaded(s), 60000, 'A site loaded').catch(() => {});
  for (let i = 0; i < 10; i++) {
    const os = await A.evaluate(() => ({ s: window.__mp.onScreen('Bob'), st: window.__mp.state() }));
    log('onScreen', JSON.stringify(os));
    if (os.s?.inside) break;
    await setup();
    await sleep(2000);
  }

  // B looks at A's chest, then pitches by `deg` (positive = up)
  const pitchB = (deg) => B.evaluate((deg) => {
    const g = window.__tenebris, THREE = window.__THREE;
    const p = g.player.getCurrentPlanet();
    const r = g.multiplayer.getRemotePlayers().find(x => x.name === 'Alice');
    const pos = g.player.position.clone();
    const up = p.getSurfaceNormal(pos);
    const h = r.position.clone().sub(pos).projectOnPlane(up).normalize();
    const rad = deg * Math.PI / 180;
    const look = h.multiplyScalar(Math.cos(rad)).addScaledVector(up, Math.sin(rad));
    g.player.placeAt(pos, { forward: look.negate(), up });
  }, deg);

  const zoom = () => A.evaluate(() => {
    window.__mp.facePlayer('Bob');
    const cam = window.__tenebris.engine.camera;
    cam.fov = 40; cam.updateProjectionMatrix();
  });
  const shot = async (file, settle = 2500) => {
    await zoom();
    await sleep(settle);
    await A.screenshot({ path: path.join(OUT, file), scale: 'css' });
    const info = await A.evaluate(() => {
      const rem = [...window.__tenebris.multiplayer.remotes.values()].find(x => x.name === 'Bob');
      const av = rem.avatar;
      return { head: +av.parts.head.rotation.x.toFixed(3), armR: +av.parts.armR.rotation.x.toFixed(3), action: rem.action, w: +av.actionWeight.toFixed(2) };
    });
    const bd = await B.evaluate(() => { const bi = window.__tenebris.blockInteraction; return { a: bi.getActionFrame(), prog: +bi.miningProgress.toFixed(2), t: performance.now() | 0 }; });
    log(file, JSON.stringify(info), 'B:', JSON.stringify(bd));
  };

  await pitchB(60);
  await shot('avatar-pitch-up.png');
  await pitchB(-80);
  await shot('avatar-pitch-down.png');

  // Mining: B looks down at the ground just in front and holds the left button
  const pillar = await B.evaluate((s) => {
    const g = window.__tenebris, p = g.player.getCurrentPlanet();
    const me = s.bTile;
    const pos = (t) => p.getTileByIndex(t).center.clone();
    const toA = pos(s.t).sub(pos(me)).normalize();
    // the neighbour most side-on to A, so A sees the swing from the side
    let best = null, bd = 2;
    for (const nb of p.getTileNeighbors(me)) {
      const d = Math.abs(pos(nb).sub(pos(me)).normalize().dot(toA));
      if (d < bd) { bd = d; best = nb; }
    }
    window.__mp.buildPillar(best, window.__mp.ITEM.STONE, 6);
    const bi = g.blockInteraction, inv = bi.getInventory();
    inv.setSlot(0, 120, 1); // ROCK_PICKAXE
    inv.setSelectedSlot(0);
    bi.updateHotbarUI();
    window.__mp.lookAt(best, 1.0);
    return best;
  }, site);
  log('pillar', pillar);
  await sleep(1500);
  await A.evaluate(() => window.__mp.facePlayer('Bob'));
  await B.evaluate(() => document.dispatchEvent(new MouseEvent('mousedown', { button: 0 })));
  let n = 0;
  for (let i = 0; i < 60 && n < 3; i++) {
    const st = await A.evaluate(() => {
      const rem = [...window.__tenebris.multiplayer.remotes.values()].find(x => x.name === 'Bob');
      return { loop: rem.action.loop, w: rem.avatar.actionWeight, armR: rem.avatar.parts.armR.rotation.x };
    });
    if (st.loop === 1 && st.w > 0.5) {
      await zoom();
      await A.screenshot({ path: path.join(OUT, n === 0 ? 'avatar-mining.png' : `avatar-mining-${n}.png`), scale: 'css' });
      log('mining shot', n, JSON.stringify(st));
      n++;
      continue;
    }
    const bs = await B.evaluate(() => { const g = window.__tenebris, bi = g.blockInteraction; const o = g.player.getRaycastOrigin(), d = g.player.getForwardVector(); const h = g.player.getCurrentPlanet().raycast(o, d, 8); return { a: bi.getActionFrame().loop, prog: +bi.miningProgress.toFixed(2), hit: h && [h.tileIndex, h.depth, h.blockType], left: g.inputManager.mouseButtons.left, menu: bi.getCraftingSystem().isMenuOpen() }; });
    log('waiting', JSON.stringify(st), 'B', JSON.stringify(bs));
    if (bs.a === 0) { if (i % 2) await B.evaluate((t) => window.__mp.lookAt(t, 0.5 + (Math.random() * 1.5)), pillar); else await pitchB(-40 - (i % 3) * 10); await B.evaluate(() => document.dispatchEvent(new MouseEvent('mousedown', { button: 0 }))); }
  }
  await B.evaluate(() => document.dispatchEvent(new MouseEvent('mouseup', { button: 0 })));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
