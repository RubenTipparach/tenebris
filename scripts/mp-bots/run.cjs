// Bots that play Tenebris multiplayer: each one is a real game client in
// its own headless Chrome, joined to a server world, with a bot
// (scripts/mp-bots/bot-brain.js) playing its own way through the missions.
//
//   npx vite --port 5179 --strictPort --host 127.0.0.1 &     (the JS client)
//   node scripts/mp-bots/run.cjs [outDir]
//
// Env:
//   CLIENT_URL  the client (default http://127.0.0.1:5179/tenebris/js/)
//   WORLD       server world id (default 'main', the live world players join with ?mp)
//   SERVER      ws url of the server (default: the client's own default, wss://tenebris.fly.dev/)
//   BOTS        name:role pairs (default "Claude-Miner:miner,Claude-Builder:builder")
//   MINUTES     how long to play (default 60; 0 = until stopped)
//   HEADED=1    show the browser windows
//   PROFILE_DIR where each bot's browser profile lives, so its save slot,
//               inventory and missions carry over between runs
//               (default ~/.tenebris-bots)
//
// Writes outDir/status.json every 10 s and outDir/<bot>-NNN.jpg every minute.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

const OUT = path.resolve(process.argv[2] || 'mp-bots-out');
const CLIENT_URL = process.env.CLIENT_URL || 'http://127.0.0.1:5179/tenebris/js/';
const WORLD = process.env.WORLD || 'main';
const SERVER = process.env.SERVER || '';
const MINUTES = Number(process.env.MINUTES ?? 60);
const PROFILE_DIR = process.env.PROFILE_DIR || path.join(os.homedir(), '.tenebris-bots');
const BOTS = (process.env.BOTS || 'Claude-Miner:miner,Claude-Builder:builder')
  .split(',').map(s => { const [name, role] = s.split(':'); return { name, role: role || 'miner' }; });
const HELPERS = fs.readFileSync(path.join(__dirname, '../mp-e2e/page-helpers.js'), 'utf8');
const BRAIN = fs.readFileSync(path.join(__dirname, 'bot-brain.js'), 'utf8');
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);

async function waitFor(fn, ms, what) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { const v = await fn(); if (v) return v; } catch { /* navigating */ }
    await sleep(1000);
  }
  throw new Error(`timed out waiting for ${what}`);
}

async function launchBot(bot) {
  const dir = path.join(PROFILE_DIR, bot.name);
  fs.mkdirSync(dir, { recursive: true });
  const ctx = await chromium.launchPersistentContext(dir, {
    channel: 'chrome',
    headless: !process.env.HEADED,
    viewport: { width: 960, height: 540 },
    args: ['--ignore-gpu-blocklist', '--enable-gpu', '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
  });
  await ctx.addInitScript(({ name }) => { try { localStorage.setItem('tenebris_mp_name', name); } catch {} }, { name: bot.name });
  await ctx.addInitScript(HELPERS);
  await ctx.addInitScript(BRAIN);
  const page = ctx.pages()[0] || await ctx.newPage();
  page.on('pageerror', e => log(bot.name, 'PAGEERR', e.message.slice(0, 200)));
  page.on('console', m => { const t = m.text(); if (t.startsWith('[bot]') || /\[MP\]/.test(t)) log(bot.name, t.slice(0, 220)); });
  const q = `?debug&world=${encodeURIComponent(WORLD)}${SERVER ? `&server=${encodeURIComponent(SERVER)}` : ''}`;
  await page.goto(CLIENT_URL + q);
  await waitFor(() => page.evaluate(() => window.__mp && window.__mp.ready()), 240000, `${bot.name} joined`);
  await sleep(4000); // terrain round the spawn
  await page.evaluate((role) => window.__bot.start(role), bot.role);
  log(bot.name, `joined ${WORLD} as a ${bot.role}`);
  return { ...bot, ctx, page };
}

(async () => {
  const t0 = Date.now();
  const bots = [];
  for (const b of BOTS) {
    bots.push(await launchBot(b));
    await sleep(3000);
  }
  let shot = 0;
  let lastShot = 0;
  const stopAt = MINUTES > 0 ? t0 + MINUTES * 60000 : Infinity;
  let stopping = false;
  const stop = async () => {
    if (stopping) return; stopping = true;
    log('stopping');
    for (const b of bots) { try { await b.page.evaluate(() => window.__bot.stop()); } catch {} }
    for (const b of bots) { try { await b.ctx.close(); } catch {} }
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  while (Date.now() < stopAt) {
    const status = { at: new Date().toISOString(), minutes: +((Date.now() - t0) / 60000).toFixed(1), bots: {} };
    for (const b of bots) {
      try { status.bots[b.name] = await b.page.evaluate(() => window.__bot.status()); }
      catch (e) { status.bots[b.name] = { error: String(e).slice(0, 200) }; }
      // The page reloaded (the dev server picked up a source change, or the
      // server dropped it): once the game is back in the world, start the bot again
      if (!status.bots[b.name].role) {
        const ready = await b.page.evaluate(() => !!(window.__mp && window.__mp.ready() && window.__bot)).catch(() => false);
        if (ready && !b.restarting) {
          b.restarting = true;
          log(b.name, 'page reloaded - starting the bot again');
          await sleep(4000);
          await b.page.evaluate((role) => window.__bot.start(role), b.role).catch(e => log(b.name, 'restart failed', String(e).slice(0, 120)));
          b.restarting = false;
        }
      }
    }
    fs.writeFileSync(path.join(OUT, 'status.json'), JSON.stringify(status, null, 1));
    // Debugging a live bot: drop OUT/cmd-<bot>.js (a function body) and the
    // result lands in OUT/cmd-<bot>.out.json
    for (const b of bots) {
      const cmd = path.join(OUT, `cmd-${b.name}.js`);
      if (!fs.existsSync(cmd)) continue;
      const body = fs.readFileSync(cmd, 'utf8');
      fs.rmSync(cmd);
      let out;
      try { out = await b.page.evaluate(`(async () => { ${body} })()`); } catch (e) { out = { error: String(e) }; }
      fs.writeFileSync(path.join(OUT, `cmd-${b.name}.out.json`), JSON.stringify(out, null, 1));
    }
    if (Date.now() - lastShot > 60000) {
      lastShot = Date.now();
      for (const b of bots) {
        try { await b.page.screenshot({ path: path.join(OUT, `${b.name}-${String(shot).padStart(3, '0')}.jpg`), type: 'jpeg', quality: 70 }); } catch {}
      }
      shot++;
      log(Object.entries(status.bots).map(([n, s]) => `${n}: ${s.goal} [${(s.done || []).length} done] ${s.task}`).join(' | '));
    }
    await sleep(3000);
  }
  await stop();
})().catch(e => { console.error('ABORT', e); process.exit(2); });
