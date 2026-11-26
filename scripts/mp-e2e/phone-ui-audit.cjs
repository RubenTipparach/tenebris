// Phone UI audit: every panel on a phone, landscape and portrait. For each
// view it takes a screenshot and lists the controls a player could not reach:
// a button, slot, tab or input partly off the screen (and not inside
// something that scrolls), a slot in a panel only reached by scrolling
// sideways, or a tap target smaller than MIN_TAP_PX.
// Writes <outDir>/phone-<orientation>-<view>.png and phone-audit.json.
//
//   npx vite build && npx vite preview --port 4179 &
//   node scripts/mp-e2e/phone-ui-audit.cjs [outDir]
const path = require('path');
const fs = require('fs');
let playwright;
try { playwright = require('playwright'); } catch { playwright = require(require.resolve('playwright', { paths: [require('child_process').execSync('npm root -g').toString().trim()] })); }
const { chromium, devices } = playwright;
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.resolve(process.argv[2] || '.');
const URL = process.env.URL || 'http://localhost:4179/tenebris/js/?debug&sp';
const HELPERS = fs.readFileSync(path.join(ROOT, 'scripts/mp-e2e/page-helpers.js'), 'utf8');
const MIN_TAP_PX = Number(process.env.MIN_TAP_PX || 32);
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);

// In the page: the controls a player cannot use on this screen
function audit(minTap) {
  const vw = innerWidth, vh = innerHeight, out = [];
  const shown = (el) => { for (let p = el; p; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; } return true; };
  const inScroller = (el) => {
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const s = getComputedStyle(p);
      if ((/(auto|scroll)/.test(s.overflowY) && p.scrollHeight > p.clientHeight + 1) || (/(auto|scroll)/.test(s.overflowX) && p.scrollWidth > p.clientWidth + 1)) {
        // reachable only if the scroller itself is on screen
        const r = p.getBoundingClientRect();
        return r.top >= -1 && r.left >= -1 && r.bottom <= vh + 1 && r.right <= vw + 1;
      }
    }
    return false;
  };
  const name = (el) => (el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '')) + (el.textContent ? ` "${el.textContent.trim().slice(0, 24)}"` : '');
  // (mission cards are not here: that tree pans by dragging, so cards off the view are reachable)
  for (const el of document.querySelectorAll('button, .inventory-slot, .storage-slot, input, select, .inv-tab, [role=button], a')) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || !shown(el)) continue;
    const off = r.right > vw + 1 || r.bottom > vh + 1 || r.left < -1 || r.top < -1;
    // scrolling down a panel is fine on a phone; scrolling sideways to reach a slot is not
    const sideways = r.right > vw + 1 || r.left < -1;
    if (sideways && el.closest('.inventory-container, .modal-menu, #inventory-menu')) out.push({ el: name(el), why: 'needs sideways scroll', r: [r.left, r.top, r.right, r.bottom].map(Math.round) });
    else if (off && !inScroller(el)) out.push({ el: name(el), why: 'off screen', r: [r.left, r.top, r.right, r.bottom].map(Math.round) });
    else if (!off && (r.width < minTap || r.height < minTap) && el.tagName !== 'A' && !(el.type === 'range' || el.type === 'checkbox')) out.push({ el: name(el), why: `small ${Math.round(r.width)}x${Math.round(r.height)}` });
  }
  return { vw, vh, problems: out };
}

const VIEWS = [
  ['menu-options', async (p) => { await p.evaluate(() => { document.getElementById('instructions').style.display = ''; }); }],
  ['menu-controls', async (p) => { await p.evaluate(() => { document.getElementById('instructions').style.display = ''; [...document.querySelectorAll('#instructions button, #instructions .tab')].find(b => /controls/i.test(b.textContent))?.click(); }); }],
  ['menu-debug', async (p) => { await p.evaluate(() => { document.getElementById('instructions').style.display = ''; [...document.querySelectorAll('#instructions button, #instructions .tab')].find(b => /debug/i.test(b.textContent))?.click(); }); }],
  ['hud', async () => {}],
  ['inventory', async (p) => { await p.evaluate(() => window.__tenebris.blockInteraction.getCraftingSystem().openPanel('inventory')); }],
  ['map', async (p) => { await p.evaluate(() => window.__tenebris.blockInteraction.getCraftingSystem().openPanel('map')); }],
  ['missions', async (p) => { await p.evaluate(() => window.__tenebris.blockInteraction.getCraftingSystem().openPanel('missions')); }],
  ['chest', async (p) => { await p.evaluate(() => { const m = window.__mp, t = m.ring(m.myTile(), 2)[0]; m.placeChest(t); const bi = window.__tenebris.blockInteraction; bi.storageUI.open(bi.storageChestManager.getChestAtTile(t)); }); }],
  ['npc', async (p) => { await p.evaluate(() => window.__tenebris.npcPanel?.open({ id: 'sequoia:0', name: 'Thaln', role: 'elder', village: 0, species: 'barkling' })); }],
  ['chat', async (p) => { await p.evaluate(() => window.__tenebris.chat?.show()); }],
];

async function close(p) {
  await p.evaluate(() => {
    document.getElementById('instructions').style.display = 'none';
    for (const k of ['npcPanel']) window.__tenebris[k]?.close?.();
    window.__tenebris.blockInteraction.storageUI?.close?.();
    const cs = window.__tenebris.blockInteraction.getCraftingSystem(); if (cs.isOpen) cs.close?.();
    window.__tenebris.chat?.hide?.();
  }).catch(() => {});
  await sleep(800);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const report = {};
  for (const [orient, dev] of [['landscape', devices['Pixel 7 landscape']], ['portrait', devices['Pixel 7']]]) {
    const ctx = await browser.newContext({ ...dev });
    await ctx.addInitScript(HELPERS);
    const page = await ctx.newPage();
    page.on('pageerror', e => log(orient, 'pageerror', e.message));
    await page.goto(URL);
    await page.waitForFunction(() => window.__tenebris?.isReady && window.__tenebris.player?.getCurrentPlanet(), null, { timeout: 300000 });
    // into the game, as the PLAY button does on a phone
    await page.evaluate(() => document.getElementById('start-button')?.click());
    await sleep(4000);
    for (const [view, open] of VIEWS) {
      if (ONLY && !ONLY.includes(view)) continue;
      try {
        await open(page);
        await sleep(2500);
        const a = await page.evaluate(audit, MIN_TAP_PX);
        report[`${orient}-${view}`] = a;
        await page.screenshot({ path: path.join(OUT, `phone-${orient}-${view}.png`) });
        log(orient, view, `${a.vw}x${a.vh}`, a.problems.length ? `${a.problems.length} problem(s)` : 'ok');
        for (const pr of a.problems.slice(0, 8)) log('   ', pr.why, pr.el, pr.r ? JSON.stringify(pr.r) : '');
      } catch (e) {
        log(orient, view, 'ERROR', e.message.split('\n')[0]);
      }
      await close(page);
    }
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, 'phone-audit.json'), JSON.stringify(report, null, 1));
  await browser.close();
})();
