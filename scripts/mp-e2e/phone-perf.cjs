// Graphics presets on a phone (Options > Graphics): the same spot on an
// emulated Pixel 7 (landscape, device pixel ratio 2.625), each preset in
// turn, measuring what a frame costs - render pixels, draw calls,
// triangles and the frame time. Swiftshader renders on the CPU, so its
// times are slow in absolute terms but scale with the same work a phone GPU
// does (pixels shaded, geometry drawn).
//
//   npx vite build && npx vite preview --port 4179 &
//   node scripts/mp-e2e/phone-perf.cjs [outDir]
const path = require('path');
const fs = require('fs');
let playwright;
try { playwright = require('playwright'); } catch { playwright = require(require.resolve('playwright', { paths: [require('child_process').execSync('npm root -g').toString().trim()] })); }
const { chromium, devices } = playwright;
const OUT = path.resolve(process.argv[2] || '.');
const URL = process.env.URL || 'http://localhost:4179/tenebris/js/?debug&sp';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const results = [];
  // a fresh page per preset: antialiasing is set when the renderer is made
  for (const preset of ['pretty', 'balanced', 'fast']) {
    const ctx = await browser.newContext({ ...devices['Pixel 7 landscape'] });
    await ctx.addInitScript((p) => { try { localStorage.setItem('tenebris_graphics', JSON.stringify({ preset: p, resolution: 100 })); } catch {} }, preset);
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.waitForFunction(() => window.__tenebris?.isReady && window.__tenebris.player?.getCurrentPlanet(), null, { timeout: 300000 });
    await page.evaluate(() => {
      document.getElementById('start-button')?.click();
      const G = window.__tenebris;
      // the same look for every preset: the settings' atmosphere / clouds come from the preset
      const T = window.__THREE, p = G.player.getCurrentPlanet();
      const up = G.player.position.clone().sub(p.center).normalize();
      const side = new T.Vector3(1, 0, 0).cross(up).normalize();
      G.player.placeAt(G.player.position.clone(), { forward: side.clone().addScaledVector(up, 0.15).normalize().negate(), up });
    });
    await sleep(25000); // terrain and clutter settle at this preset
    const m = await page.evaluate(async () => {
      const r = window.__gameRenderer;
      const times = [];
      let last = performance.now();
      await new Promise(done => {
        const tick = () => { const now = performance.now(); times.push(now - last); last = now; times.length < 40 ? requestAnimationFrame(tick) : done(); };
        requestAnimationFrame(tick);
      });
      times.sort((a, b) => a - b);
      const sz = r.getDrawingBufferSize(new window.__THREE.Vector2());
      return { buffer: `${sz.x}x${sz.y}`, pixels: sz.x * sz.y, calls: r.info.render.calls, triangles: r.info.render.triangles, medianMs: +times[times.length >> 1].toFixed(1) };
    });
    await page.screenshot({ path: path.join(OUT, `phone-perf-${preset}.png`) });
    log(preset, JSON.stringify(m));
    results.push({ preset, ...m });
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, 'phone-perf.json'), JSON.stringify(results, null, 1));
  const base = results[0];
  for (const r of results) log(`${r.preset.padEnd(8)} pixels ${(r.pixels / base.pixels * 100).toFixed(0)}%  calls ${r.calls}  triangles ${r.triangles}  frame ${r.medianMs} ms (${(base.medianMs / r.medianMs).toFixed(2)}x)`);
  await browser.close();
})();
