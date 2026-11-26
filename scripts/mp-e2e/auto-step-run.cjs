// Auto step in the real game (Options > Auto step): the player stands on a
// tile facing a neighbour one block higher and holds W. With auto step on
// they walk up onto it without a jump, and the eye does not snap the rise
// with the body (sampled every frame); off, they stay below. Writes <outDir>/auto-step.json.
//
//   npx vite build && npx vite preview --port 4179 &
//   node scripts/mp-e2e/auto-step-run.cjs [outDir]
const path = require('path');
const fs = require('fs');
let playwright;
try { playwright = require('playwright'); } catch { playwright = require(require.resolve('playwright', { paths: [require('child_process').execSync('npm root -g').toString().trim()] })); }
const { chromium } = playwright;
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.resolve(process.argv[2] || '.');
const URL = process.env.URL || 'http://localhost:4179/tenebris/js/?debug&sp';
const HELPERS = fs.readFileSync(path.join(ROOT, 'scripts/mp-e2e/page-helpers.js'), 'utf8');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
let failed = false;
const check = (name, pass, detail) => { log(pass ? 'PASS' : 'FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); if (!pass) failed = true; };

async function run(browser, autoStep) {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  await ctx.addInitScript((on) => { try { localStorage.setItem('tenebris_auto_step', on ? '1' : '0'); } catch {} }, autoStep);
  await ctx.addInitScript(HELPERS);
  const page = await ctx.newPage();
  page.on('pageerror', e => log('pageerror', e.message));
  await page.goto(URL);
  await page.waitForFunction(() => window.__tenebris?.isReady && window.__tenebris.player?.getCurrentPlanet(), null, { timeout: 300000 });
  await page.evaluate(() => {
    const s = document.createElement('style'); s.textContent = '#instructions{display:none!important}'; document.head.appendChild(s);
    window.__tenebris.inputManager.isLocked = () => true;
  });
  await sleep(8000);
  // a dry tile with a neighbour exactly one block higher, and head room over it
  const spot = await page.evaluate(() => {
    const m = window.__mp, p = window.__tenebris.player.getCurrentPlanet();
    const start = m.myTile();
    for (let r = 1; r < 12; r++) {
      for (const t of m.ring(start, r)) {
        const g = p.groundDepthOf(t);
        if (g < 0) continue;
        for (const n of p.getTileNeighbors(t)) {
          const gn = p.groundDepthOf(n);
          const open = (tile, d) => p.getBlock(tile, d) === 0;
          if (gn === g + 1 && open(t, g + 1) && open(t, g + 2) && open(t, g + 3) && open(n, gn + 1) && open(n, gn + 2) && open(n, gn + 3)) return { from: t, to: n, g };
        }
      }
    }
    return null;
  });
  if (!spot) { await ctx.close(); return { error: 'no one-block step near the spawn' }; }
  await page.evaluate((s) => window.__mp.standAt(s.from, s.to, 0), spot);
  await sleep(3000);
  const r0 = await page.evaluate(() => { const G = window.__tenebris, p = G.player.getCurrentPlanet(); return G.player.position.distanceTo(p.center); });
  // hold W, sampling the body and the eye every animation frame
  await page.keyboard.down('KeyW');
  const samples = await page.evaluate(async () => {
    const G = window.__tenebris, p = G.player.getCurrentPlanet(), out = [];
    const t0 = performance.now();
    await new Promise(done => {
      const tick = () => {
        out.push({ body: G.player.position.distanceTo(p.center), eye: G.engine.camera.position.distanceTo(p.center), t: performance.now() - t0 });
        performance.now() - t0 < 15000 ? requestAnimationFrame(tick) : done();
      };
      requestAnimationFrame(tick);
    });
    return out;
  });
  await page.keyboard.up('KeyW');
  await ctx.close();
  const r1 = samples[samples.length - 1].body;
  // the eye's biggest single-frame rise against the body's
  let bodyJump = 0, eyeJump = 0;
  for (let i = 1; i < samples.length; i++) {
    bodyJump = Math.max(bodyJump, samples[i].body - samples[i - 1].body);
    eyeJump = Math.max(eyeJump, samples[i].eye - samples[i - 1].eye);
  }
  return { spot, r0: +r0.toFixed(3), r1: +r1.toFixed(3), climbed: +(r1 - r0).toFixed(3), frames: samples.length, bodyJump: +bodyJump.toFixed(3), eyeJump: +eyeJump.toFixed(3), samples: samples.map(s => [+s.t.toFixed(0), +s.body.toFixed(3), +s.eye.toFixed(3)]) };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const on = await run(browser, true);
  const off = await run(browser, false);
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'auto-step.json'), JSON.stringify({ on, off }, null, 1));
  log('on', JSON.stringify({ ...on, samples: undefined }));
  log('off', JSON.stringify({ ...off, samples: undefined }));
  check('auto step on: walks up the block without a jump', on.climbed > 0.8, on.climbed);
  check('auto step off: the block stops the walker', off.climbed < 0.3, off.climbed);
  // (headless runs at ~1 fps and the engine caps a frame at 0.1 s, so most of
  // the 0.06 s ease is spent inside one frame here; at 60 fps it spreads over
  // about ten - scripts/auto-step.test.ts. What this run can show: the eye
  // did not snap the whole rise in the frame the body stepped)
  check('the eye eases the step: it does not snap the whole rise with the body', on.bodyJump > 0.8 && on.eyeJump < on.bodyJump - 0.1, { bodyJump: on.bodyJump, eyeJump: on.eyeJump });
  log(failed ? 'FAILED' : 'ALL PASSED');
  process.exit(failed ? 1 : 0);
})();
