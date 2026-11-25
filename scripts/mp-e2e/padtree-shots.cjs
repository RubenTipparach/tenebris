// Launch pad + tree lighting headless check: a single-player client lays the
// starter pad, stands the player on a pad hex (logging the feet radius
// against the pad top), walks onto the pad from the ground beside it, and
// photographs the pad from the side; then it finds a tree with open ground
// beside it and photographs it at noon, at dusk and at night.
//
//   npx vite build && npx vite preview --port 4181 --strictPort &
//   node scripts/mp-e2e/padtree-shots.cjs <outDir> [tag]
//
// Writes <outDir>/<tag>-pad-side.png, -pad-stand.png, -tree-day.png,
// -tree-dusk.png, -tree-sunset.png, -tree-twilight.png, -tree-night.png and <tag>-log.json.
const path = require('path');
const fs = require('fs');
let playwright;
try { playwright = require('playwright'); } catch { playwright = require(require.resolve('playwright', { paths: [require('child_process').execSync('npm root -g').toString().trim()] })); }
const { chromium } = playwright;
const OUT = path.resolve(process.argv[2] || '.');
const TAG = process.argv[3] || 'shot';
const URL = process.env.URL || 'http://localhost:4181/tenebris/js/?debug&sp';
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

// In-page helpers (window.__pt)
function helpers() {
  const g = () => window.__tenebris;
  const T = () => window.__THREE;
  const planet = () => g().player.getCurrentPlanet();
  function aim(pos, target) {
    const p = planet();
    const up = p.getSurfaceNormal(pos);
    const eye = pos.clone().addScaledVector(up, 1.6);
    const look = target.clone().sub(eye).normalize();
    g().player.placeAt(pos, { forward: look.negate(), up });
  }
  function ring(start, n) {
    const p = planet();
    let frontier = [start];
    const seen = new Set([start]);
    for (let i = 0; i < n; i++) {
      const next = [];
      for (const t of frontier) for (const nb of p.getTileNeighbors(t)) if (!seen.has(nb)) { seen.add(nb); next.push(nb); }
      frontier = next;
    }
    return frontier;
  }
  // The sun's height (sine) over `pos` at game time t
  function sunHeightAt(pos, t) {
    const o = window.__orbits, THREE = T();
    const fr = o.frame();
    const p = { x: 0, y: 0, z: 0 };
    o.framePositionAt('sun', fr, t, p);
    const sun = new THREE.Vector3(p.x, p.y, p.z);
    const id = g().player.getCurrentPlanet().getName().toLowerCase();
    o.framePositionAt(id, fr, t, p);
    const c = new THREE.Vector3(p.x, p.y, p.z);
    const up = pos.clone().sub(planet().center).normalize();
    return up.dot(sun.sub(c).normalize());
  }
  function sunDirAt(t) {
    const o = window.__orbits, THREE = T();
    const fr = o.frame();
    const p = { x: 0, y: 0, z: 0 };
    o.framePositionAt('sun', fr, t, p);
    const sun = new THREE.Vector3(p.x, p.y, p.z);
    o.framePositionAt(g().player.getCurrentPlanet().getName().toLowerCase(), fr, t, p);
    return sun.sub(new THREE.Vector3(p.x, p.y, p.z)).normalize();
  }
  window.__pt = {
    aim, ring, sunHeightAt, sunDirAt,
    // A game time when the sun stands at height `e` over pos (rising side when rising)
    timeForSun(pos, e, rising) {
      const t0 = window.__orbits.gameTimeS();
      let best = t0, bestErr = Infinity;
      for (let dt = 0; dt < 200000; dt += 20) {
        const t = t0 + dt;
        const h = sunHeightAt(pos, t);
        const dh = sunHeightAt(pos, t + 20) - h;
        if (rising !== undefined && (dh > 0) !== rising) continue;
        const err = Math.abs(h - e);
        if (err < bestErr) { bestErr = err; best = t; }
        if (err < 0.01) break;
      }
      return best;
    },
  };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 960, height: 600 }, deviceScaleFactor: 0.5 });
  await ctx.addInitScript(helpers);
  const page = await ctx.newPage();
  const result = {};
  page.on('pageerror', e => log('pageerror', e.message));
  await page.goto(URL);
  await page.addStyleTag({ content: '#instructions{display:none!important}' });
  await waitFor(page, () => { const g = window.__tenebris; return !!(g && g.isReady && g.player && g.player.getCurrentPlanet()); }, 300000, 'game ready');
  await page.evaluate(() => { window.__tenebris.inputManager.isLocked = () => true; });
  log('ready');

  // ---- the launch pad ------------------------------------------------------
  const placed = await page.evaluate(async () => {
    const g = window.__tenebris, bi = g.blockInteraction;
    if (bi.getLaunchPadManager().getLaunchPads().length) return 'had one';
    return await bi.placeStarterRocket(g.player.getCurrentPlanet(), g.player.position);
  });
  log('pad', placed);
  await waitFor(page, () => window.__tenebris.blockInteraction.getLaunchPadManager().getLaunchPads().some(p => p.rocketParts.length), 120000, 'rocket on its pad');
  const padInfo = await page.evaluate(() => {
    const g = window.__tenebris, p = g.player.getCurrentPlanet();
    const pad = g.blockInteraction.getLaunchPadManager().getLaunchPads()[0];
    // a ring hex that is not the tower's
    const stand = pad.surroundingTileIndices.find(i => i !== pad.towerTileIndex);
    // the ground block under it
    const ground = p.groundDepthOf(stand);
    const outside = window.__pt.ring(pad.rocketTileIndex, 2).find(i => !pad.hexes.has(i) && p.groundDepthOf(i) === ground);
    window.__padTest = { stand, outside };
    return {
      padTop: +pad.outerRadius.toFixed(3),
      groundTop: +p.depthToRadius(ground).toFixed(3),
      stand, outside, rocketTile: pad.rocketTileIndex,
    };
  });
  log('pad info', JSON.stringify(padInfo));
  result.pad = padInfo;

  // Daylight for the pad shots, then look at the pad's edge from the ground
  // three hexes out from its middle, on the side away from the tower
  await page.evaluate(() => {
    const g = window.__tenebris, p = g.player.getCurrentPlanet();
    const pad = g.blockInteraction.getLaunchPadManager().getLaunchPads()[0];
    window.__orbits.setLocalGameTime(window.__pt.timeForSun(pad.position, 0.5));
    const tower = p.getTileByIndex(pad.towerTileIndex).center;
    const ground = p.groundDepthOf(window.__padTest.stand);
    const open = (i) => p.getTileNeighbors(i).every(n => p.groundDepthOf(n) <= ground);
    const cands = window.__pt.ring(pad.rocketTileIndex, 3).filter(i => !pad.hexes.has(i) && p.groundDepthOf(i) === ground);
    const score = (i) => p.getTileByIndex(i).center.distanceTo(tower) + (open(i) ? 100 : 0);
    cands.sort((a, b) => score(b) - score(a));
    const from = cands[0];
    // the pad hex nearest that spot
    let edge = -1, bd = Infinity;
    for (const i of pad.hexes.keys()) {
      const d = p.getTileByIndex(i).center.distanceTo(p.getTileByIndex(from).center);
      if (d < bd) { bd = d; edge = i; }
    }
    const pos = p.getSurfacePosition(p.getTileByIndex(from));
    const up = p.getSurfaceNormal(pos);
    const target = p.getSurfacePosition(p.getTileByIndex(edge)).addScaledVector(up, -0.3);
    window.__pt.aim(pos, target);
    window.__padTest.side = { from, edge };
  });
  await sleep(4000);
  // A free camera (one frame of the game's scene rendered from it, straight
  // off the canvas) low beside the slab's side, out over the edge hex's most
  // open neighbour (lowest ground off the pad)
  const shots = await page.evaluate(() => {
    const g = window.__tenebris, p = g.player.getCurrentPlanet();
    const pad = g.blockInteraction.getLaunchPadManager().getLaunchPads()[0];
    const edgeTile = p.getTileByIndex(window.__padTest.side.edge);
    const ground = p.depthToRadius(p.groundDepthOf(edgeTile.index));
    const dir = edgeTile.center.clone().normalize();
    const edge = p.center.clone().addScaledVector(dir, ground);
    const lowness = (i) => p.groundDepthOf(i) * 10 + Math.max(...p.getTileNeighbors(i).map(n => p.groundDepthOf(n)));
    const open = p.getTileNeighbors(edgeTile.index).filter(i => !pad.hexes.has(i)).sort((a, b) => lowness(a) - lowness(b))[0];
    const away = p.center.clone().addScaledVector(p.getTileByIndex(open).center.clone().normalize(), ground);
    const out = away.sub(edge);
    out.addScaledVector(dir, -out.dot(dir)).normalize();
    const snap = (back, rise, lookRise) => {
      const cam = g.engine.camera.clone();
      cam.position.copy(edge).addScaledVector(out, back).addScaledVector(dir, rise);
      cam.up.copy(dir);
      cam.lookAt(edge.clone().addScaledVector(dir, lookRise));
      cam.updateMatrixWorld();
      g.engine.renderer.render(g.engine.scene, cam);
      return g.engine.renderer.domElement.toDataURL('image/png');
    };
    return { side: snap(2.2, 0.8, 0.1) };
  });
  fs.writeFileSync(path.join(OUT, `${TAG}-pad-side.png`), Buffer.from(shots.side.split(',')[1], 'base64'));

  // Stand on the pad hex nearest the outside: drop the player a little
  // above it and let physics settle, looking out over the pad's edge
  await page.evaluate(() => {
    const g = window.__tenebris, p = g.player.getCurrentPlanet();
    const t = p.getTileByIndex(window.__padTest.side.edge);
    const pos = p.getSurfacePosition(t);
    const up = p.getSurfaceNormal(pos);
    pos.addScaledVector(up, 0.6);
    const out = p.getSurfacePosition(p.getTileByIndex(window.__padTest.side.from)).addScaledVector(up, -0.5);
    window.__pt.aim(pos, out);
  });
  await sleep(8000);
  result.standing = await page.evaluate(() => {
    const g = window.__tenebris, p = g.player.getCurrentPlanet();
    const pad = g.blockInteraction.getLaunchPadManager().getLaunchPads()[0];
    const ground = p.depthToRadius(p.groundDepthOf(window.__padTest.side.edge));
    return { feet: +g.player.position.distanceTo(p.center).toFixed(3), padTop: +pad.outerRadius.toFixed(3), groundTop: +ground.toFixed(3), grounded: g.player.isGrounded };
  });
  log('standing on pad', JSON.stringify(result.standing));
  await page.screenshot({ path: path.join(OUT, `${TAG}-pad-stand.png`) });

  // Walk onto the pad from the ground beside it (W held toward the pad hex)
  await page.evaluate(() => {
    const g = window.__tenebris, p = g.player.getCurrentPlanet();
    const pos = p.getSurfacePosition(p.getTileByIndex(window.__padTest.outside));
    const target = p.getSurfacePosition(p.getTileByIndex(window.__padTest.stand));
    const up = p.getSurfaceNormal(pos);
    pos.addScaledVector(up, 0.05);
    window.__pt.aim(pos, target.addScaledVector(up, 1.6));
  });
  await sleep(3000);
  const walk = [];
  await page.keyboard.down('KeyW');
  for (let i = 0; i < 12; i++) {
    await sleep(1000);
    walk.push(await page.evaluate(() => {
      const g = window.__tenebris, p = g.player.getCurrentPlanet();
      const tile = p.getTileAtPoint(g.player.position).index;
      const pad = g.blockInteraction.getLaunchPadManager().getLaunchPads()[0];
      return { tile, onPad: pad.hexes.has(tile), feet: +g.player.position.distanceTo(p.center).toFixed(3) };
    }));
  }
  await page.keyboard.up('KeyW');
  result.walk = walk;
  log('walk', JSON.stringify(walk));

  // ---- a tree at noon, dusk and night --------------------------------------
  // The nearest broadleaf (oak / birch: a round crown) to the player, seen
  // from its sun side at dusk - the side that used to glow - from open ground
  // three hexes away; the same spot for every time of day
  const tree = await page.evaluate(() => {
    const g = window.__tenebris, p = g.player.getCurrentPlanet(), THREE = window.__THREE;
    const off = p.center.clone().sub(p.configuredCenter);
    const me = g.player.position;
    let best = null, bd = Infinity, species = null;
    for (const t of g.treeManager.getTrees()) {
      if (t.userData.species === 'pine') continue;
      const w = t.position.clone().add(off);
      const d = w.distanceTo(me);
      if (d < bd) { bd = d; best = w; species = t.userData.species; }
    }
    if (!best) return null;
    const tile = p.getTileAtPoint(best).index;
    const tDusk = window.__pt.timeForSun(best, 0.02, false);
    const sun = window.__pt.sunDirAt(tDusk);
    const gt = p.groundDepthOf(tile);
    const open = (i) => p.groundDepthOf(i) <= gt && p.getTileNeighbors(i).every(n => p.groundDepthOf(n) <= gt);
    const cands = window.__pt.ring(tile, 3);
    const score = (i) => p.getTileByIndex(i).center.clone().add(p.center).sub(best).normalize().dot(sun) + (open(i) ? 1 : 0);
    cands.sort((x, y) => score(y) - score(x));
    const from = cands[0];
    const pos = p.getSurfacePosition(p.getTileByIndex(from));
    window.__treeShot = { pos: pos.toArray(), tree: best.toArray() };
    return { dist: +bd.toFixed(2), species, tile, from, open: open(from) };
  });
  log('tree', JSON.stringify(tree));
  result.tree = tree;
  const phases = [['day', 0.5, undefined], ['dusk', 0.06, false], ['sunset', 0.0, false], ['twilight', -0.04, false], ['night', -0.5, undefined]];
  for (const [name, e, rising] of phases) {
    const info = await page.evaluate(([e, rising]) => {
      const THREE = window.__THREE, s = window.__treeShot;
      const pos = new THREE.Vector3(...s.pos), tree = new THREE.Vector3(...s.tree);
      const t = window.__pt.timeForSun(tree, e, rising);
      window.__orbits.setLocalGameTime(t);
      const up = window.__tenebris.player.getCurrentPlanet().getSurfaceNormal(tree);
      window.__pt.aim(pos, tree.clone().addScaledVector(up, 2.0));
      // > 0: the sun is behind the tree (we see its shaded side)
      const backlit = +window.__pt.sunDirAt(t).dot(tree.clone().sub(pos).normalize()).toFixed(3);
      return { t, sun: +window.__pt.sunHeightAt(tree, t).toFixed(3), backlit };
    }, [e, rising]);
    await sleep(6000);
    // re-aim (the walker may have settled a little)
    await page.evaluate(() => {
      const THREE = window.__THREE, s = window.__treeShot;
      const tree = new THREE.Vector3(...s.tree);
      const up = window.__tenebris.player.getCurrentPlanet().getSurfaceNormal(tree);
      window.__pt.aim(window.__tenebris.player.position.clone(), tree.clone().addScaledVector(up, 2.0));
    });
    await sleep(3000);
    await page.screenshot({ path: path.join(OUT, `${TAG}-tree-${name}.png`) });
    log('tree', name, JSON.stringify(info));
    result['tree_' + name] = info;
  }
  fs.writeFileSync(path.join(OUT, `${TAG}-log.json`), JSON.stringify(result, null, 2));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
