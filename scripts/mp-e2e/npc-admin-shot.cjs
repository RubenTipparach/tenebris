// The admin portal's People tab (openspec friendship-npcs, task 2.4), checked
// by eye: a fresh local server-js, a fake client lands on Sequoia and on
// Metropole Prime (so both have villages, requests and traders), and the
// portal page is screenshotted headless. Writes <outDir>/npc-admin.png.
//
//   node scripts/mp-e2e/npc-admin-shot.cjs [outDir]
//
// Env: MP_PORT (default 8094).
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn, execSync } = require('child_process');
let playwright;
try { playwright = require('playwright'); } catch { playwright = require(require.resolve('playwright', { paths: [execSync('npm root -g').toString().trim()] })); }
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.resolve(process.argv[2] || '.');
const PORT = Number(process.env.MP_PORT || 8094);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'npc-admin-'));
  const server = spawn(process.execPath, [path.join(ROOT, 'server-js/server.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, ADMIN_OPEN: '1', NPC_TEST_CLOCK: '1' }, stdio: 'ignore',
  });
  const base = `http://127.0.0.1:${PORT}`;
  try {
    for (let i = 0; i < 100; i++) { if (await fetch(`${base}/health`).then(r => r.ok).catch(() => false)) break; await sleep(100); }
    const { WebSocket } = require(path.join(ROOT, 'server-js/node_modules/ws'));
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}/?world=main`);
    await new Promise(r => ws.once('open', r));
    const pose = (planet) => ws.send(JSON.stringify({ t: 'pose', planet, p: [0, 0, 0], q: [0, 0, 0, 1] }));
    ws.send(JSON.stringify({ t: 'hello', name: 'Ada', look: {} }));
    pose('ferrum');
    await sleep(200);
    pose('sequoia');
    await sleep(200);
    // some time passes on Sequoia: food used, the trader there closer to leaving
    await fetch(`${base}/admin/api/npc-clock`, { method: 'POST', body: JSON.stringify({ addMs: 5 * 3600_000 }) });
    const browser = await playwright.chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    await page.goto(`${base}/admin#people`);
    await page.waitForSelector('#npc-planets .village', { timeout: 10000 });
    await sleep(1500);
    fs.mkdirSync(OUT, { recursive: true });
    const file = path.join(OUT, 'npc-admin.png');
    await page.screenshot({ path: file, fullPage: true });
    console.log(`wrote ${file}`);
    await browser.close();
    ws.close();
  } finally {
    server.kill();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
})().catch((e) => { console.error(e); process.exit(1); });
