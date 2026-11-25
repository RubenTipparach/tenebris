// NPC motion over multiplayer (openspec friendship-npcs, task 3.3): two
// headless clients on a fresh local server-js, both teleported to Sequoia.
// A (the lower id) hosts the NPCs; B mirrors A's live 'npc' frames. Checks:
//  - both see the same people at the same places (planet-local, metres);
//  - they actually move (someone walks during the run);
//  - when A leaves, B takes over hosting and no NPC jumps (no popping):
//    between B's samples no NPC moves further than walking allows.
// Writes <outDir>/npc-mp-B.png: B's view of the village.
//
//   npx vite build && npx vite preview --port 4179 &
//   node scripts/mp-e2e/npc-run.cjs [outDir]
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

// What a client draws: per NPC id, planet-local dir and walk weight
const npcs = (page) => page.evaluate(() => {
  const f = window.__tenebris.npcField;
  return f ? { hosting: f.isHosting, radius: window.__tenebris.player.getCurrentPlanet()?.radius ?? 0, list: f.debugPositions(), t: performance.now() } : null;
});
const metres = (a, b, r) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * r;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mp-npc-'));
  const server = spawn(process.execPath, [path.join(ROOT, 'server-js/server.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir }, stdio: 'ignore',
  });
  const stop = () => { server.kill(); fs.rmSync(dataDir, { recursive: true, force: true }); };
  try {
    await waitFor(() => fetch(`http://127.0.0.1:${PORT}/health`).then(r => r.ok), 15000, 'server');
    const world = await (await fetch(`http://127.0.0.1:${PORT}/worlds`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Npcs', seed: 4242 }),
    })).json();
    const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
    const mk = async (name) => {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 0.5 });
      await ctx.addInitScript(({ name }) => { try { localStorage.setItem('tenebris_mp_name', name); } catch {} }, { name });
      await ctx.addInitScript(HELPERS);
      const page = await ctx.newPage();
      page.on('pageerror', e => log(name, 'pageerror', e.message));
      page.on('console', m => { if (m.type() === 'error') log(name, 'console', m.text().slice(0, 200)); });
      await page.goto(`${CLIENT_URL}?debug&world=${world.id}&server=ws://127.0.0.1:${PORT}/`);
      return { ctx, page };
    };
    const A = await mk('Alice');
    await waitFor(() => A.page.evaluate(() => window.__mp && window.__mp.ready()), 240000, 'A ready');
    const B = await mk('Bob');
    await waitFor(() => B.page.evaluate(() => window.__mp && window.__mp.ready()), 240000, 'B ready');
    for (const c of [A, B]) await c.page.evaluate(() => window.__mp.cleanHud());
    log('both in', world.id);

    for (const c of [A, B]) await c.page.evaluate((b) => window.__tenebris.teleportToPlanet(b), BODY);
    for (const [n, c] of [['A', A], ['B', B]]) {
      await waitFor(async () => { const s = await npcs(c.page); return s && s.list.length > 0; }, 300000, `${n} has NPCs on ${BODY}`);
    }
    await waitFor(async () => (await B.page.evaluate((b) => window.__tenebris.player.getCurrentPlanet()?.getName() === b && window.__mp.state().remotes.some(r => r.planet === b), BODY)), 60000, 'B sees A on the planet');
    const a0 = await npcs(A.page), b0 = await npcs(B.page);
    check('A hosts, B mirrors', a0.hosting && !b0.hosting, { a: a0.hosting, b: b0.hosting });
    check('the same people on both', JSON.stringify(a0.list.map(n => n.id)) === JSON.stringify(b0.list.map(n => n.id)), { a: a0.list.length, b: b0.list.length });

    // Positions agree once B has heard from A (sampled close together; a
    // walker moves ~1 m/s and B eases a step behind)
    await sleep(8000);
    let worst = 0, moving = 0;
    for (let i = 0; i < 6; i++) {
      const [a, b] = await Promise.all([npcs(A.page), npcs(B.page)]);
      for (let k = 0; k < a.list.length; k++) {
        worst = Math.max(worst, metres(a.list[k].dir, b.list[k].dir, a.radius));
        if (a.list[k].moveW > 0.5) moving++;
      }
      await sleep(1500);
    }
    check('B draws every NPC where A has it (within 2 m)', worst < 2, { worstM: +worst.toFixed(2) });
    check('they walk about', moving > 0, { walkingSamples: moving });

    // B's view of the village, for the eye
    await B.page.evaluate(() => {
      const G = window.__tenebris, T = window.__THREE, p = G.player.getCurrentPlanet();
      const n = G.npcField.debugPositions()[0];
      const at = new T.Vector3(...n.pos), up = at.clone().sub(p.center).normalize();
      const side = new T.Vector3(1, 0, 0).cross(up).normalize();
      const stand = at.clone().addScaledVector(side, 7);
      const ground = p.center.clone().add(stand.clone().sub(p.center).normalize().multiplyScalar(p.getSurfaceHeightInDirection(stand.clone().sub(p.center).normalize()) + 0.1));
      const eye = ground.clone().addScaledVector(up, 1.6);
      G.player.placeAt(ground, { forward: at.clone().addScaledVector(up, 1).sub(eye).normalize().negate(), up });
    });
    await sleep(6000);
    await B.page.screenshot({ path: path.join(OUT, 'npc-mp-B.png') });
    log('wrote', path.join(OUT, 'npc-mp-B.png'));

    // A leaves: B takes over. Sample B before, through and after the handoff
    const samples = [await npcs(B.page)];
    await A.ctx.close();
    log('A left');
    const t0 = Date.now();
    while (Date.now() - t0 < 25000) { samples.push(await npcs(B.page)); await sleep(250); }
    const last = samples[samples.length - 1];
    check('B hosts once A has gone', last.hosting, { hosting: last.hosting });
    // No popping: between consecutive samples nobody moves further than a walk (plus slack)
    let worstJump = 0;
    for (let i = 1; i < samples.length; i++) {
      const dt = (samples[i].t - samples[i - 1].t) / 1000;
      for (let k = 0; k < samples[i].list.length; k++) {
        const d = metres(samples[i - 1].list[k].dir, samples[i].list[k].dir, last.radius);
        worstJump = Math.max(worstJump, d - 1.1 * dt);
      }
    }
    check('no NPC pops at the handoff', worstJump < 0.5, { worstExcessM: +worstJump.toFixed(3), samples: samples.length });
    let walkedAfter = 0;
    for (let k = 0; k < last.list.length; k++) if (metres(samples[1].list[k].dir, last.list[k].dir, last.radius) > 0.5) walkedAfter++;
    check('B keeps them walking as the host', walkedAfter > 0, { moved: walkedAfter });

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
