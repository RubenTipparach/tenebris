// Injected into each bot client after scripts/mp-e2e/page-helpers.js.
// A bot plays the game toward its missions through the player's own
// inputs: it turns its head with mouse movement (the same deltas a mouse
// feeds InputManager), walks with W, jumps with Space, holds the left
// button to chop and mine, right-clicks to place and open machines, and
// uses the crafting / furnace panels through their own handlers. Nothing
// is given to it: every log, stone and ore it holds it dug itself.
//
// window.__bot.start(role) runs the loop; __bot.status() reports to the
// runner (scripts/mp-bots/run.cjs). Roles pick which branches to follow
// after the shared trunk: 'miner' (mining and smelting) or 'builder'
// (light, storage, clay and bricks).
(() => {
  const BASE = '/tenebris/js/src';
  const g = () => window.__tenebris;
  const T = () => window.__THREE;
  const bi = () => g().blockInteraction;
  const inv = () => bi().getInventory();
  const planet = () => g().player.getCurrentPlanet();
  const player = () => g().player;
  const im = () => g().inputManager;
  // Every wait notes where it was called from (Chrome keeps the await chain),
  // and unwinds a loop the hang watchdog has replaced
  let loopGen = 0;
  function waitPoint(gen) {
    if (gen !== undefined && gen !== loopGen) throw new Error('loop replaced');
    st.where = (new Error().stack || '').split('\n').slice(3, 9).map(l => l.trim().replace(/^at /, '').replace(/ \(.*$/, '')).join(' < ');
  }
  const sleep = (ms) => { waitPoint(st.curGen); return new Promise(r => setTimeout(r, ms)); };

  let I = null;          // ItemType
  let B = null;          // HexBlockType
  let RECIPES = null;    // CRAFTING_RECIPES
  let SMELTS = null;     // furnace SMELTING_RECIPES
  let ESMELTS = null;    // electric furnace ELECTRIC_SMELTING_RECIPES
  let COOKS = null;      // campfire / kiln / oven recipes, with their station kind
  let BENCH = null;      // electronics workbench recipes
  let SENS = 0.002;      // PlayerConfig.MOUSE_SENSITIVITY
  let pitchSign = 1;     // measured: which way +mouseY turns the head

  const st = {
    role: null, running: false, task: 'idle', goal: '', log: [], stuck: 0,
    home: null, furnaceTile: null, started: Date.now(), errors: 0,
  };
  const say = (msg) => {
    const line = `${new Date().toISOString().slice(11, 19)} ${msg}`;
    st.log.push(line);
    if (st.log.length > 200) st.log.shift();
    console.log(`[bot] ${msg}`);
  };

  async function loadModules() {
    const inventory = await import(`${BASE}/player/Inventory.ts`);
    const blocks = await import(`${BASE}/shared/blockTypes.ts`);
    const crafting = await import(`${BASE}/player/CraftingSystem.ts`);
    const cfg = await import(`${BASE}/config/PlayerConfig.ts`);
    const smeltMod = await import(`${BASE}/config/SmeltingRecipes.ts`);
    SMELTS = smeltMod.SMELTING_RECIPES;
    ESMELTS = smeltMod.ELECTRIC_SMELTING_RECIPES;
    const benchMod = await import(`${BASE}/player/ElectronicsWorkbenchUI.ts`);
    BENCH = benchMod.ELECTRONICS_RECIPES;
    const cookMod = await import(`${BASE}/config/CookingConfig.ts`);
    COOKS = Object.entries(cookMod.COOKERS).flatMap(([kind, c]) => c.recipes.map(r => ({ kind, ...r })));
    I = inventory.ItemType;
    B = blocks.HexBlockType;
    RECIPES = crafting.CRAFTING_RECIPES;
    SENS = cfg.PlayerConfig.MOUSE_SENSITIVITY;
  }

  // ---- raw inputs -------------------------------------------------------
  // Headless Chrome can't take pointer lock, so the bot holds the game in
  // its "playing" state the way a locked pointer does.
  function holdLock() {
    const m = im();
    if (!m.isPointerLocked) {
      m.isPointerLocked = true;
      const ins = document.getElementById('instructions');
      if (ins) ins.style.display = 'none';
    }
  }
  const key = (code, down) => document.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code, bubbles: true }));
  const mouse = (button, down) => document.dispatchEvent(new MouseEvent(down ? 'mousedown' : 'mouseup', { button, bubbles: true }));
  function releaseAll() {
    for (const k of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft']) key(k, false);
    mouse(0, false); mouse(2, false);
  }
  // Mouse movement, in pixels, as the mouse would report it
  function moveMouse(dx, dy) {
    const m = im();
    m.mouseMovement.x += dx;
    m.mouseMovement.y += dy;
  }
  async function tap(code, ms = 120) { key(code, true); await sleep(ms); key(code, false); }
  async function click(button, ms = 90) { mouse(button, true); await sleep(ms); mouse(button, false); }

  // ---- looking ------------------------------------------------------------
  function upAt(p) { return planet().getSurfaceNormal(p); }
  function lookDir() { return player().getForwardVector().clone().normalize(); }
  function eye() { return player().getRaycastOrigin().clone(); }
  // yaw (about up) and pitch errors from the current look to `dir`
  function lookError(dir) {
    const up = upAt(player().position);
    const f = lookDir();
    const fh = f.clone().addScaledVector(up, -f.dot(up));
    const dh = dir.clone().addScaledVector(up, -dir.dot(up));
    let yaw = 0;
    if (fh.lengthSq() > 1e-6 && dh.lengthSq() > 1e-6) {
      fh.normalize(); dh.normalize();
      yaw = Math.atan2(fh.clone().cross(dh).dot(up), fh.dot(dh));
    }
    const pitchNow = Math.asin(Math.max(-1, Math.min(1, f.dot(up))));
    const pitchWant = Math.asin(Math.max(-1, Math.min(1, dir.clone().normalize().dot(up))));
    return { yaw, pitch: pitchWant - pitchNow };
  }
  // One frame's worth of head turn toward `dir` (a quick hand, not a snap)
  function steer(dir, maxRad = 0.12) {
    const e = lookError(dir);
    const clamp = (v) => Math.max(-maxRad, Math.min(maxRad, v));
    // yawDelta = -mouseX * SENS (PlanetPlayer), positive yaw = turn toward +cross
    moveMouse(-clamp(e.yaw) / SENS, pitchSign * clamp(e.pitch) / SENS);
    return e;
  }
  async function lookAtPoint(p, tol = 0.03, maxMs = 2500) {
    const t0 = performance.now();
    while (performance.now() - t0 < maxMs) {
      holdLock();
      const dir = p.clone().sub(eye()).normalize();
      const e = steer(dir);
      if (Math.abs(e.yaw) < tol && Math.abs(e.pitch) < tol) return true;
      await nextFrame();
    }
    return false;
  }
  // rAF, but never longer than a second (a throttled tab must not hang the bot)
  const nextFrame = () => { waitPoint(st.curGen); return new Promise(r => { const t = setTimeout(r, 1000); requestAnimationFrame(() => { clearTimeout(t); r(); }); }); };

  async function calibrate() {
    // Which way does +mouseY move the pitch? Measure it once.
    holdLock();
    await sleep(300);
    const up = upAt(player().position);
    const p0 = Math.asin(lookDir().dot(up));
    moveMouse(0, 60);
    await nextFrame(); await nextFrame(); await nextFrame();
    const p1 = Math.asin(lookDir().dot(up));
    moveMouse(0, -60);
    await nextFrame(); await nextFrame();
    pitchSign = (p1 - p0) > 0 ? 1 : -1;
    say(`calibrated: +mouseY turns pitch ${pitchSign > 0 ? 'up' : 'down'}`);
  }

  // ---- geometry -------------------------------------------------------------
  const P = () => planet();
  function tileOf(pos) { return P().getTileAtPoint(pos)?.index ?? null; }
  function myTile() { return tileOf(player().position); }
  // World point at the centre of block (tile, depth)
  function blockCenter(tile, depth) {
    const p = P();
    const t = p.getTileByIndex(tile);
    const r = p.depthToRadius(depth) - p.getBlockHeight() / 2;
    return t.center.clone().normalize().multiplyScalar(r).add(p.center);
  }
  // World point on the top face of block (tile, depth)
  function blockTop(tile, depth) {
    const p = P();
    const t = p.getTileByIndex(tile);
    return t.center.clone().normalize().multiplyScalar(p.depthToRadius(depth)).add(p.center);
  }
  function feetDepth() { return P().getDepthAtPoint(player().position); }
  // The surface round here: the standing depth on the ground of the tiles
  // around this one (the bot's own column may be a shaft)
  function surfaceDepth() {
    const p = P();
    const gs = tilesWithin(myTile(), 2).filter(t => p.isTileLoaded(t)).map(t => p.groundDepthOf(t)).sort((a, b) => a - b);
    return gs.length ? gs[Math.floor(gs.length / 2)] + 1 : feetDepth();
  }
  function hdist(a, b) {
    const up = upAt(a);
    const d = b.clone().sub(a);
    return d.addScaledVector(up, -d.dot(up)).length();
  }
  function rayHit() {
    return P().raycast(eye(), lookDir(), 8);
  }
  function neighbors(tile) { return P().getTileNeighbors(tile); }
  function tilesWithin(start, n) {
    const out = [start]; const seen = new Set(out); let fr = [start];
    for (let i = 0; i < n; i++) {
      const nx = [];
      for (const t of fr) for (const nb of neighbors(t)) if (!seen.has(nb)) { seen.add(nb); nx.push(nb); out.push(nb); }
      fr = nx;
    }
    return out;
  }

  // ---- inventory --------------------------------------------------------------
  const count = (item) => inv().getItemCount(item);
  function selectItem(item) {
    const iv = inv();
    let idx = -1;
    for (let i = 0; i < 9; i++) { const s = iv.getSlot(i); if (s && s.itemType === item && s.quantity > 0) { idx = i; break; } }
    if (idx < 0) {
      // in the bag: drag it onto the last hotbar slot
      const all = iv.getAllSlots();
      const from = all.findIndex((s, i) => i >= 9 && s.itemType === item && s.quantity > 0);
      if (from < 0) return false;
      iv.swapSlots(from, 8);
      idx = 8;
    }
    iv.setSelectedSlot(idx);
    bi().updateHotbarUI();
    return true;
  }
  function selectEmptyHand() {
    // a slot with nothing (or a non-placeable) so left-click mines by hand / tool
    const iv = inv();
    for (let i = 0; i < 9; i++) { const s = iv.getSlot(i); if (!s || s.itemType === 0 || s.quantity === 0) { iv.setSelectedSlot(i); bi().updateHotbarUI(); return; } }
    iv.setSelectedSlot(0); bi().updateHotbarUI();
  }

  // ---- skills -------------------------------------------------------------------
  // Walk to within `arrive` metres (horizontal) of world point `target`.
  async function walkTo(target, arrive = 1.6, maxMs = 45000) {
    st.task = 'walking';
    const t0 = performance.now();
    let lastPos = player().position.clone(), lastCheck = t0, stalls = 0, digs = 0;
    selectEmptyHand();
    try {
      while (performance.now() - t0 < maxMs) {
        holdLock();
        const pos = player().position;
        const d = hdist(pos, target);
        if (d < arrive) { key('KeyW', false); return true; }
        const up = upAt(pos);
        const flat = target.clone().sub(pos); flat.addScaledVector(up, -flat.dot(up)).normalize();
        // eyes a little down the road
        const dir = flat.clone().addScaledVector(up, -0.25).normalize();
        const e = steer(dir, 0.15);
        key('KeyW', Math.abs(e.yaw) < 0.6);
        if (player().getIsInWater()) key('Space', true); else if (stalls === 0) key('Space', false);
        const now = performance.now();
        if (now - lastCheck > 700) {
          const moved = hdist(lastPos, pos);
          if (moved < 0.35) {
            stalls++;
            if (stalls <= 3) { await tap('Space', 250); }
            else {
              // a wall: dig through it at head and foot height; if that
              // didn't free it last time (a machine, not a block), step aside
              key('KeyW', false);
              digs++;
              if (digs % 2 === 0) {
                const side = Math.random() < 0.5 ? 'KeyA' : 'KeyD';
                key(side, true); key('Space', true); await sleep(900); key('Space', false); await sleep(300); key(side, false);
              } else {
                await clearAhead(flat);
              }
              stalls = 1;
            }
          } else stalls = 0;
          lastPos = pos.clone(); lastCheck = now;
        }
        await nextFrame();
      }
      return false;
    } finally { key('KeyW', false); key('Space', false); }
  }

  // Mine the blocks straight ahead at foot and head height
  async function clearAhead(flat) {
    const pos = player().position;
    const up = upAt(pos);
    for (const h of [1.5, 0.5]) {
      const p = pos.clone().addScaledVector(flat, 0.9).addScaledVector(up, h);
      const tile = tileOf(p);
      if (tile === null) continue;
      const depth = P().getDepthAtPoint(p);
      const b = P().getBlock(tile, depth);
      if (b !== B.AIR && b !== B.WATER) await mineBlock(tile, depth, 8000);
    }
  }

  // Hold the left button on block (tile, depth) until it breaks.
  async function mineBlock(tile, depth, maxMs = 20000) {
    const p = P();
    const before = p.getBlock(tile, depth);
    if (before === B.AIR || before === B.WATER) return true;
    selectEmptyHand();
    const target = blockCenter(tile, depth);
    await lookAtPoint(target, 0.05, 1500);
    const t0 = performance.now();
    mouse(0, true);
    try {
      while (performance.now() - t0 < maxMs) {
        holdLock();
        steer(target.clone().sub(eye()).normalize(), 0.08);
        const now = p.getBlock(tile, depth);
        if (now === B.AIR || now === B.WATER) return true;
        const hit = rayHit();
        if (hit && (hit.tileIndex !== tile || hit.depth !== depth)) {
          // something in the way: mine through it first
          const hb = p.getBlock(hit.tileIndex, hit.depth);
          if (hb !== B.AIR && hb !== B.WATER && hit.depth > 0) {
            mouse(0, false);
            const ok = await mineBlock(hit.tileIndex, hit.depth, Math.min(8000, maxMs - (performance.now() - t0)));
            if (!ok) return false;
            await lookAtPoint(target, 0.05, 800);
            mouse(0, true);
          }
        }
        if (!hit) {
          // out of reach
          return false;
        }
        await nextFrame();
      }
      return false;
    } finally { mouse(0, false); }
  }

  // Nearest standing tree trunk mesh
  function nearestTrunk(maxDist = 120) {
    const tm = g().treeManager ?? bi().treeManager;
    if (!tm) return null;
    const pos = player().position;
    let best = null, bd = maxDist;
    const tmp = new (T().Vector3)();
    for (const m of tm.getTreeMeshes()) {
      if (m.userData.treeType !== 'trunk' || !m.visible) continue;
      m.getWorldPosition(tmp);
      const d = tmp.distanceTo(pos);
      if (d < bd) { bd = d; best = { mesh: m, pos: tmp.clone() }; }
    }
    return best;
  }

  async function chopTree() {
    const tree = nearestTrunk();
    if (!tree) { say('no tree in sight - wandering'); await wander(); return false; }
    st.task = 'walking to a tree';
    await walkTo(tree.pos, 2.2, 40000);
    st.task = 'chopping';
    const logs0 = count(I.LOG);
    const up = upAt(player().position);
    // the trunk at chest height
    const base = tree.pos.clone();
    const aim = base.clone().addScaledVector(upAt(base), 1.2);
    selectEmptyHand();
    await lookAtPoint(aim, 0.04, 2000);
    const t0 = performance.now();
    mouse(0, true);
    try {
      while (performance.now() - t0 < 25000) {
        holdLock();
        steer(aim.clone().sub(eye()).normalize(), 0.06);
        if (count(I.LOG) > logs0 || !tree.mesh.parent) break;
        await nextFrame();
      }
    } finally { mouse(0, false); }
    const got = count(I.LOG) - logs0;
    say(got > 0 ? `felled a tree: +${got} logs` : 'could not fell that tree');
    return got > 0;
  }

  async function wander() {
    const pos = player().position;
    const up = upAt(pos);
    const T3 = T();
    const r = new T3.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
    r.addScaledVector(up, -r.dot(up)).normalize();
    await walkTo(pos.clone().addScaledVector(r, 25), 2, 15000);
  }

  // Dig straight down under your feet until `pred()` or `minDepth`.
  async function digDown(pred, maxBlocks = 40) {
    st.task = 'digging down';
    for (let i = 0; i < maxBlocks; i++) {
      if (pred()) return true;
      const tile = myTile();
      const d = P().groundDepthOf(tile);
      if (d <= 2) return false;
      const b = P().getBlock(tile, d);
      if (b === B.WATER) return false;
      await mineBlock(tile, d, 15000);
      await sleep(400); // fall into the hole
      await mineNearbyOres(2);
    }
    return pred();
  }

  // Ore blocks within `radius` tiles that touch air (visible from a tunnel)
  const ORES = () => [B.ORE_COAL, B.ORE_IRON, B.ORE_COPPER, B.ORE_GOLD, B.ORE_ALUMINUM, B.ORE_LITHIUM, B.ORE_COBALT];
  function oreAround(radius, wanted) {
    const p = P();
    const pos = player().position;
    const fd = feetDepth();
    const out = [];
    for (const t of tilesWithin(myTile(), radius)) {
      if (!p.isTileLoaded(t)) continue;
      for (let d = Math.max(1, fd - 6); d <= fd + 4; d++) {
        const b = p.getBlock(t, d);
        if (wanted.includes(b) && !(st.badDig || []).includes(`${t}:${d}`)) out.push({ tile: t, depth: d, block: b, dist: blockCenter(t, d).distanceTo(pos) });
      }
    }
    return out.sort((a, b) => a.dist - b.dist);
  }

  // Mine any ore the bot can reach from where it stands
  async function mineNearbyOres(radius = 2) {
    const want = ORES();
    for (const o of oreAround(radius, want)) {
      if (o.dist > 5) continue;
      await mineBlock(o.tile, o.depth, 15000);
    }
  }

  // Tunnel toward the nearest wanted ore and mine it
  async function tunnelToOre(wanted, radius = 6) {
    const list = oreAround(radius, wanted).filter(o => !(st.badDig || []).includes(`${o.tile}:${o.depth}`));
    if (!list.length) return false;
    const o = list[0];
    st.task = `tunnelling to ore ${o.block}`;
    const giveUp = () => { st.badDig = (st.badDig || []).concat([`${o.tile}:${o.depth}`]); say(`could not reach ore at tile ${o.tile} depth ${o.depth} - skipping it`); return false; };
    for (let step = 0; step < 16; step++) {
      const c = blockCenter(o.tile, o.depth);
      if (P().getBlock(o.tile, o.depth) !== o.block) return true;   // already gone
      if (c.distanceTo(eye()) < 4.5) {
        const ok = await mineBlock(o.tile, o.depth, 20000);
        if (ok) say(`mined ore ${o.block} at depth ${o.depth}`);
        return ok || giveUp();
      }
      const fd = feetDepth();
      if (o.depth < fd - 1) {
        // the ore lies deeper: dig the block under your feet and drop
        const tile = myTile();
        if (fd - 1 <= 1) return giveUp();
        if (!(await mineBlock(tile, fd - 1, 12000))) return giveUp();
        await sleep(400);
        continue;
      }
      // level with it: dig the two blocks in front (foot + head) and step forward
      const pos = player().position;
      const up = upAt(pos);
      const flat = c.clone().sub(pos); flat.addScaledVector(up, -flat.dot(up)).normalize();
      await lookAtPoint(pos.clone().addScaledVector(flat, 3).addScaledVector(up, 1.0), 0.06, 1200);
      await clearAhead(flat);
      key('KeyW', true); await sleep(450); key('KeyW', false);
      await sleep(150);
    }
    return giveUp();
  }

  // Climb out of a shaft: jump and place a block under your feet, again and again
  async function pillarUpTo(depthWanted, maxBlocks = 40) {
    st.task = 'climbing out';
    for (let i = 0; i < maxBlocks; i++) {
      if (feetDepth() > depthWanted) return true;
      const filler = [I.DIRT, I.STONE, I.SAND, I.WOOD].find(it => count(it) > 0);
      if (filler === undefined) { say('nothing to build a pillar with'); return false; }
      // headroom: clear the two blocks over your head before jumping
      {
        const tile = myTile(), d = feetDepth();
        for (const k of [d + 2, d + 3]) {
          const b = P().getBlock(tile, k);
          if (b !== B.AIR && b !== B.WATER) await mineBlock(tile, k, 8000);
        }
      }
      selectItem(filler);
      const pos = player().position.clone();
      const up = upAt(pos);
      // look straight down
      await lookAtPoint(pos.clone().addScaledVector(up, -3), 0.05, 1200);
      const d0 = feetDepth();
      key('Space', true);
      await sleep(180);
      for (let k = 0; k < 6; k++) { await click(2, 40); await sleep(30); }
      key('Space', false);
      await sleep(350);
      if (feetDepth() <= d0) {
        // the shaft may be wider than one tile: mine the ceiling and retry
        const tile = myTile();
        const above = P().getBlock(tile, d0 + 2);
        if (above !== B.AIR) await mineBlock(tile, d0 + 2, 8000);
      }
    }
    return feetDepth() > depthWanted;
  }

  // Close any open panel (what Esc does): the furnace panel opens inside the
  // inventory screen, and closing one leaves the other up
  function closeMenus() {
    const b = bi();
    try { if (b.furnaceUI.isMenuOpen()) b.furnaceUI.close(); } catch {}
    try { if (b.electricFurnaceUI.isMenuOpen()) b.electricFurnaceUI.close(); } catch {}
    try { if (b.electronicsWorkbenchUI.isMenuOpen()) b.electronicsWorkbenchUI.close(); } catch {}
    try { if (b.storageUI.isMenuOpen()) b.storageUI.close(); } catch {}
    try { if (b.machineUI && b.machineUI.isOpen()) b.machineUI.close(); } catch {}
    try { const cs = b.getCraftingSystem(); if (cs.isMenuOpen()) cs.close(); } catch {}
    holdLock();
  }

  // ---- crafting --------------------------------------------------------------
  async function craft(output, times = 1) {
    const cs = bi().getCraftingSystem();
    const idx = RECIPES.findIndex(r => r.output.itemType === output);
    if (idx < 0) { say(`no recipe for ${output}`); return 0; }
    st.task = `crafting ${RECIPES[idx].name}`;
    releaseAll();
    cs.open();
    await sleep(400);
    cs.selectRecipe(idx);
    await sleep(300);
    let made = 0;
    for (let i = 0; i < times; i++) {
      const before = count(output);
      cs.craftSelectedRecipe();
      await sleep(250);
      if (count(output) > before || RECIPES[idx].output.itemType !== output) made++;
      else break;
    }
    await sleep(300);
    closeMenus();
    say(`crafted ${RECIPES[idx].name} x${made}`);
    return made;
  }
  const canCraft = (output) => {
    const r = RECIPES.find(r => r.output.itemType === output);
    return r && r.inputs.every(i => inv().hasItem(i.itemType, i.quantity));
  };

  // Place `item` on top of the ground of a neighbouring tile
  async function placeNearby(item, check) {
    closeMenus();
    if (!selectItem(item)) return false;
    await toSurface();
    st.task = `placing ${item}`;
    const here = myTile();
    const p = P();
    const myDepth = feetDepth();
    const cands = tilesWithin(here, 2).filter(t => t !== here && p.isTileLoaded(t))
      .map(t => ({ t, g: p.groundDepthOf(t) }))
      .filter(c => !stationAt(c.t) && Math.abs(c.g + 1 - myDepth) <= 2 && p.getBlock(c.t, c.g + 1) === B.AIR && p.getBlock(c.t, c.g + 2) === B.AIR && p.getBlock(c.t, c.g) !== B.WATER)
      .sort((a, b) => blockTop(a.t, a.g).distanceTo(player().position) - blockTop(b.t, b.g).distanceTo(player().position));
    if (!cands.length) {
      // down a shaft: carve a pocket in the wall and set it on the floor there
      const n = neighbors(here).find(t => p.isTileLoaded(t) && p.getBlock(t, myDepth - 1) !== B.AIR && p.getBlock(t, myDepth - 1) !== B.WATER);
      if (n !== undefined) {
        await mineBlock(n, myDepth + 1, 10000);
        await mineBlock(n, myDepth, 10000);
        cands.push({ t: n, g: myDepth - 1 });
      }
    }
    for (const c of cands.slice(0, 10)) {
      selectItem(item);
      const before = count(item);
      await lookAtPoint(blockTop(c.t, c.g), 0.04, 1500);
      const h = rayHit();
      if (!h || h.tileIndex !== c.t) continue;          // something else in the line of sight
      await click(2, 80);
      await sleep(700);
      closeMenus();                                      // clicked a machine instead of the ground
      if (count(item) < before) { say(`placed item ${item} on tile ${c.t}`); return c.t; }
    }
    say(`could not place item ${item} (${cands.length} spots tried, depth ${myDepth}, surface ${surfaceDepth()})`);
    await wander();
    return false;
  }

  // Climb out to the surface if down a hole
  async function toSurface() {
    const s = surfaceDepth();
    if (feetDepth() < s - 1) { say('climbing out to the surface'); await pillarUpTo(s - 1, 60); }
  }

  // Anything placed on tile t (a machine, a cable or pipe node, a chest...): not free to build on
  function stationAt(t) {
    const b = bi();
    if ((st.badPlace || []).includes(t)) return true;
    return !!(b.furnaceManager.getFurnaceAtTile(t) || b.cookerManager.getAtTile(t) || b.storageChestManager.getChestAtTile(t)
      || b.electricFurnaceManager.getElectricFurnaceAtTile(t) || b.steamEngineManager.getSteamEngineAtTile(t)
      || b.hydroGeneratorManager.getHydroGeneratorAtTile(t) || b.electronicsWorkbenchManager.getElectronicsWorkbenchAtTile(t)
      || b.cableNodeManager.getPlacedCables().some(c => c.tileIndex === t)
      || b.copperPipeManager.getPlacedPipes().some(c => c.tileIndex === t)
      || b.machineManager.getAll().some(m => m.tileIndex === t));
  }

  // Get within reach of world point `target`: out of any hole, over to it,
  // and up to its level if it stands higher
  // Dig straight along the line of sight to `target`, stepping forward: gets
  // through walls and down or up a slope that walking can't climb
  async function tunnelTo(target, arrive, steps = 24) {
    st.task = 'digging toward the target';
    for (let i = 0; i < steps; i++) {
      if (hdist(player().position, target) < arrive && Math.abs(target.clone().sub(player().position).dot(upAt(target))) < 2.2) return true;
      await lookAtPoint(target, 0.05, 1200);
      const h = rayHit();
      if (h && h.point.distanceTo(eye()) < target.distanceTo(eye()) - 0.5 && h.depth > 1) {
        const b = P().getBlock(h.tileIndex, h.depth);
        if (b !== B.AIR && b !== B.WATER) { await mineBlock(h.tileIndex, h.depth, 8000); continue; }
      }
      // nothing in the line: step (and hop) forward
      const pos = player().position;
      const up = upAt(pos);
      const flat = target.clone().sub(pos); flat.addScaledVector(up, -flat.dot(up)).normalize();
      await lookAtPoint(pos.clone().addScaledVector(flat, 3).addScaledVector(up, 1.0), 0.08, 800);
      key('KeyW', true); key('Space', true); await sleep(400); key('Space', false); await sleep(250); key('KeyW', false);
      await sleep(150);
    }
    return hdist(player().position, target) < arrive;
  }

  async function approach(target, arrive = 2.2) {
    await toSurface();
    if (!(await walkTo(target, arrive, 40000))) {
      say('cannot walk there - digging toward it');
      await tunnelTo(target, arrive);
    }
    const pos = player().position;
    const up = upAt(pos);
    const above = target.clone().sub(pos).dot(up);
    if (above > 2.2) {
      say(`target is ${above.toFixed(1)} m up - building up to it`);
      await pillarUpTo(P().getDepthAtPoint(target) - 1, 20);
      await walkTo(target, arrive, 15000);
    }
  }

  // Aim at a machine and mine any block between the eye and it (a pillar
  // block left in the way, a wall), so the right-click reaches the machine
  async function aimAtMachine(target) {
    for (let k = 0; k < 4; k++) {
      await lookAtPoint(target, 0.03, 2000);
      const h = rayHit();
      const far = target.distanceTo(eye());
      if (!h || h.point.distanceTo(eye()) >= far - 0.35) return;
      const b = P().getBlock(h.tileIndex, h.depth);
      if (b === B.AIR || b === B.WATER || h.depth <= 0) return;
      say(`a block is in the way of the machine - mining it`);
      await mineBlock(h.tileIndex, h.depth, 8000);
    }
  }

  // ---- furnace --------------------------------------------------------------
  function myFurnace() {
    const fm = bi().furnaceManager;
    const pos = player().position;
    let best = null, bd = 1e9;
    for (const f of fm.getPlacedFurnaces()) {
      if ((st.ignoreFurnaces || []).includes(f.tileIndex)) continue;
      const d = f.position.distanceTo(pos);
      if (st.furnaceTile !== null && f.tileIndex === st.furnaceTile) return f;
      if (d < bd) { bd = d; best = f; }
    }
    return bd < 12 ? best : null;
  }
  async function openFurnace(f) {
    await approach(f.position, 2.2);
    const aim = f.position.clone().addScaledVector(upAt(f.position), 0.3);
    selectEmptyHand();
    await aimAtMachine(aim);
    selectEmptyHand();
    await click(2, 80);
    await sleep(500);
    return bi().furnaceUI.isMenuOpen();
  }
  async function smelt(ore, n) {
    let f = myFurnace();
    if (!f) {
      if (count(I.FURNACE) === 0 && canCraft(I.FURNACE)) await craft(I.FURNACE, 1);
      const t = await placeNearby(I.FURNACE);
      if (t === false) return false;
      st.furnaceTile = t;
      f = myFurnace();
      if (!f) return false;
    }
    st.task = 'smelting';
    if (!(await openFurnace(f))) {
      closeMenus();
      st.furnaceFails = (st.furnaceFails || 0) + 1;
      say('could not open the furnace');
      if (st.furnaceFails >= 2) {
        st.furnaceFails = 0;
        st.ignoreFurnaces = (st.ignoreFurnaces || []).concat([f.tileIndex]);
        st.furnaceTile = null;
        say('building a new furnace here');
      }
      await sleep(1000);
      return false;
    }
    st.furnaceFails = 0;
    const ui = bi().furnaceUI;
    const all = inv().getAllSlots();
    // fuel: enough coal for n smelts
    const needFuel = Math.max(0, Math.ceil((n - f.fuelAmount) / 8));
    if (needFuel > 0) {
      if (count(I.COAL) < needFuel) { closeMenus(); say('not enough coal'); return false; }
      selectItem(I.COAL);
      for (let k = 0; k < needFuel; k++) ui.handleFuelSlotClick();
    }
    const slot = inv().getAllSlots().findIndex(s => s.itemType === ore && s.quantity > 0);
    if (slot >= 0) ui.handleDropFromInventory(slot, 'furnace-input');
    say(`furnace loaded: ${f.inputCount} to smelt, fuel ${f.fuelAmount}`);
    // wait at the furnace while it works (10 s an item)
    const t0 = performance.now();
    while ((f.inputCount > 0) && performance.now() - t0 < (n + 2) * 11000) await sleep(1000);
    ui.handleOutputSlotClick();
    await sleep(300);
    closeMenus();
    say(`collected from the furnace`);
    return true;
  }

  // ---- water ---------------------------------------------------------------
  function nearestWaterTile(radius = 14) {
    const p = P();
    const pos = player().position;
    let best = null, bd = 1e9;
    for (const t of tilesWithin(myTile(), radius)) {
      if (!p.isTileLoaded(t) || (st.badWater || []).includes(t)) continue;
      const top = p.topBlockOf(t);
      if (top !== B.WATER) continue;
      // a pond, not a puddle in a hole: water on two sides at least
      if (neighbors(t).filter(n => p.topBlockOf(n) === B.WATER).length < 2) continue;
      const tt = p.getTileByIndex(t);
      const d = tt.center.clone().add(p.center).distanceTo(pos);
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  }
  async function fillBucket() {
    const w = nearestWaterTile(30);
    if (w === null) { say('no water nearby - exploring'); await wander(); await wander(); return false; }
    const p = P();
    let d = p.getMaxDepth() - 1;
    while (d > 0 && p.getBlock(w, d) !== B.WATER) d--;
    const water = blockCenter(w, d);
    st.task = 'walking to water';
    await approach(water, 1.8);
    closeMenus();
    for (const lift of [0, 0.3, -0.3]) {
      selectItem(I.BUCKET);
      const aim = water.clone().addScaledVector(upAt(water), lift);
      await lookAtPoint(aim, 0.04, 1500);
      await click(2, 80);
      await sleep(500);
      if (count(I.WATER_BUCKET) > 0) { say('filled a water bucket'); return true; }
    }
    say(`could not fill the bucket at tile ${w} (water ${water.distanceTo(eye()).toFixed(1)} m away)`);
    st.badWater = (st.badWater || []).concat([w]);
    try { localStorage.setItem('bot_badWater', JSON.stringify(st.badWater)); } catch {}
    return false;
  }

  // ---- cooking stations (campfire, kiln, oven) ---------------------------------
  const STATION_ITEM = () => ({ campfire: I.CAMPFIRE, kiln: I.KILN, oven: I.OVEN });
  function fishItems() {
    return Object.keys(I).filter(k => isNaN(+k) && k.startsWith('FISH_') && k !== 'FISH_STEW').map(k => I[k]);
  }
  function invSlotOf(item) {
    return inv().getAllSlots().findIndex(s => s.itemType === item && s.quantity > 0);
  }
  // Put `inputs` (item ids, or 'fish') in a station of `kind` and take the dish out
  async function cookAt(kind, inputs, output) {
    const cm = bi().cookerManager;
    const pos = player().position;
    let c = cm.getPlaced().filter(x => x.kind === kind).sort((a, b) => a.position.distanceTo(pos) - b.position.distanceTo(pos))[0];
    if (!c || c.position.distanceTo(pos) > 80) {
      const it = STATION_ITEM()[kind];
      if (count(it) === 0) { if (!canCraft(it)) { say(`need a ${kind}`); return false; } await craft(it, 1); }
      const t = await placeNearby(it);
      if (t === false) return false;
      c = cm.getAtTile(t);
      if (!c) return false;
    }
    st.task = `cooking at the ${kind}`;
    await approach(c.position, 2.2);
    selectEmptyHand();
    await aimAtMachine(c.position.clone().addScaledVector(upAt(c.position), 0.3)); selectEmptyHand();
    await click(2, 80);
    await sleep(500);
    const ui = bi().storageUI;
    if (!ui.isMenuOpen()) { say(`could not open the ${kind}`); closeMenus(); return false; }
    let slot = 0;
    for (const want of inputs) {
      const item = want === 'fish' ? fishItems().find(f => count(f) > 0) : want;
      const from = item === undefined ? -1 : invSlotOf(item);
      if (from < 0) { say(`missing an ingredient for the ${kind}`); closeMenus(); return false; }
      ui.transferFromInventory(from, slot++);
      await sleep(200);
    }
    const before = count(output);
    const t0 = performance.now();
    while (performance.now() - t0 < 40000 && !c.slots.some(s => s.itemType === output && s.quantity > 0)) await sleep(500);
    c.slots.forEach((s, i) => { if (s.itemType !== 0 && s.quantity > 0) ui.handleShiftClick(i); });
    await sleep(300);
    closeMenus();
    const got = count(output) - before;
    say(got > 0 ? `cooked ${got} at the ${kind}` : `nothing came out of the ${kind}`);
    return got > 0;
  }

  // ---- fishing --------------------------------------------------------------
  // Phases (src/player/Fishing.ts): Ready 0, Charging 1, Flying 2, Floating 3,
  // Nibble 4, Bite 5 (the float goes under), Hooked 6
  async function goFishing(casts = 6) {
    const f = g().fishing;
    const w = nearestWaterTile(20);
    if (w === null) { say('no water nearby - exploring for a pond'); await wander(); await wander(); return false; }
    const p = P();
    const surf = p.getSurfacePosition(p.getTileByIndex(w));
    await walkTo(surf, 5, 40000);
    closeMenus();
    const iv = inv();
    if (!iv.isRodOut()) { bi().toggleRod(); }
    if (!iv.isRodOut()) { say('no rod to fish with'); return false; }
    st.task = 'fishing';
    let caught = 0;
    for (let c = 0; c < casts; c++) {
      // out over the water, a little above the horizon
      const pos = player().position;
      const up = upAt(pos);
      const flat = surf.clone().sub(pos); flat.addScaledVector(up, -flat.dot(up)).normalize();
      await lookAtPoint(pos.clone().addScaledVector(flat, 10).addScaledVector(up, 2.5), 0.05, 1500);
      const fish0 = tracker().save();
      mouse(0, true); await sleep(900); mouse(0, false);    // charge and throw
      const t0 = performance.now();
      let landed = false;
      while (performance.now() - t0 < 60000) {
        holdLock();
        const ph = f.phase;
        if (ph === 0 && performance.now() - t0 > 3000) break;   // wound in / dry / got away / landed
        if (ph === 5) { await click(0, 60); }                    // strike
        if (ph === 6) mouse(0, f.tension < 0.55);                // reel, ease off near the snap
        await nextFrame();
      }
      mouse(0, false);
      void fish0; void landed;
      caught++;
      await sleep(600);
    }
    if (iv.isRodOut()) bi().toggleRod();
    return true;
  }

  // ---- missions ----------------------------------------------------------------
  function tracker() { return g().missions.getTracker(); }
  function openIds() { return tracker().openMissions().map(m => m.id); }
  function doneIds() { return tracker().save().done; }

  // What the bot does for a mission. Returns when it made progress or gave up.
  const PLAYBOOK = {
    logs: async () => { await chopTree(); },
    planks: async () => {
      if (count(I.LOG) < 2) { await chopTree(); return; }
      await craft(I.WOOD, 2);
      await craft(I.STICK, 2);
    },
    stone: async () => {
      st.home ??= myTile();
      const surface = surfaceDepth();
      await digDown(() => count(I.STONE) >= 12);
      await pillarUpTo(surface - 1);
      if (count(I.STONE) >= 5 && count(I.STICK) >= 2 && tracker().recipeOpen(I.ROCK_PICKAXE)) await craft(I.ROCK_PICKAXE, 1);
    },
    furnace: async () => {
      if (count(I.STONE) < 8) { await digForStone(8); return; }
      if (count(I.FURNACE) === 0) await craft(I.FURNACE, 1);
      const t = await placeNearby(I.FURNACE);
      if (t !== false) st.furnaceTile = t;
    },
    iron: async () => {
      if (count(I.ROCK_PICKAXE) === 0 && canCraft(I.ROCK_PICKAXE) && tracker().recipeOpen(I.ROCK_PICKAXE)) await craft(I.ROCK_PICKAXE, 1);
      await goMining([B.ORE_IRON, B.ORE_COAL], () => count(I.ORE_IRON) >= 6 && count(I.ORE_COAL) >= 1);
      if (count(I.ORE_COAL) > 0 && count(I.COAL) < 16) await craft(I.COAL, 1);
    },
    ingots: async () => {
      if (count(I.ORE_IRON) < 3) { await goMining([B.ORE_IRON], () => count(I.ORE_IRON) >= 6); return; }
      if (count(I.COAL) < 1) { await getCoal(); return; }
      await smelt(I.ORE_IRON, count(I.ORE_IRON));
    },
    bucket: async () => {
      if (count(I.BUCKET) === 0 && count(I.WATER_BUCKET) === 0) {
        if (count(I.INGOT_IRON) < 3) {
          if (count(I.ORE_IRON) < 3) { await goMining([B.ORE_IRON], () => count(I.ORE_IRON) >= 3); return; }
          if (count(I.COAL) < 1) { await getCoal(); return; }
          await smelt(I.ORE_IRON, count(I.ORE_IRON)); return;
        }
        await craft(I.BUCKET, 1);
      }
      if (count(I.BUCKET) > 0) await fillBucket();
    },
    copper: async () => {
      if (count(I.ORE_COPPER) < 3) { await goMining([B.ORE_COPPER, B.ORE_COAL], () => count(I.ORE_COPPER) >= 3); return; }
      if (count(I.COAL) < 1) { await getCoal(); return; }
      await smelt(I.ORE_COPPER, count(I.ORE_COPPER));
    },
    lightmetals: async () => {
      if (count(I.ORE_ALUMINUM) < 3 && count(I.INGOT_ALUMINUM) < 3) { await goMining([B.ORE_ALUMINUM, B.ORE_GOLD, B.ORE_COAL], () => count(I.ORE_ALUMINUM) >= 3 && count(I.ORE_GOLD) >= 1); return; }
      if (count(I.COAL) < 1) { await getCoal(); return; }
      if (count(I.ORE_ALUMINUM) > 0) await smelt(I.ORE_ALUMINUM, count(I.ORE_ALUMINUM));
      if (count(I.ORE_GOLD) > 0) await smelt(I.ORE_GOLD, count(I.ORE_GOLD));
    },
    torches: async () => {
      if (count(I.TORCH) < 4) {
        if (count(I.COAL) < 1) { await getCoal(); return; }
        if (count(I.STICK) < 1) { await chopTree(); return; }
        await craft(I.TORCH, 1);
        return;
      }
      for (let i = 0; i < 4; i++) {
        await placeNearby(I.TORCH);
        await wander();
      }
    },
    chest: async () => {
      if (count(I.STORAGE_CHEST) === 0) {
        if (count(I.WOOD) < 8) { if (count(I.LOG) < 2) { await chopTree(); return; } await craft(I.WOOD, 2); return; }
        await craft(I.STORAGE_CHEST, 1);
      }
      await placeNearby(I.STORAGE_CHEST);
    },
    rod: async () => {
      if (count(I.STICK) < 3) { if (count(I.WOOD) < 2) await craft(I.WOOD, 1); await craft(I.STICK, 1); }
      await craft(I.FISHING_ROD, 1);
    },
    fish: async () => { await goFishing(6); },
    kiln: async () => {
      if (count(I.KILN) === 0) {
        if (count(I.BRICK) < 8) { await makeBricks(8); return; }
        await craft(I.KILN, 1);
      }
      await placeNearby(I.KILN);
    },
    pot: async () => {
      if (count(I.CLAY) < 1) { await findAndDig([B.CLAY], () => count(I.CLAY) >= 4); return; }
      await cookAt('kiln', [I.CLAY], I.CLAY_POT);
    },
    oven: async () => {
      if (count(I.OVEN) === 0) {
        if (count(I.BRICK) < 8) { await makeBricks(8); return; }
        if (count(I.INGOT_IRON) < 1) {
          if (count(I.ORE_IRON) < 1) { await goMining([B.ORE_IRON], () => count(I.ORE_IRON) >= 2); return; }
          await smelt(I.ORE_IRON, count(I.ORE_IRON)); return;
        }
        await craft(I.OVEN, 1);
      }
      await placeNearby(I.OVEN);
    },
    stew: async () => {
      if (!fishItems().some(f => count(f) > 0)) { await goFishing(3); return; }
      if (count(I.CLAY_POT) < 1) {
        if (count(I.CLAY) < 1) { await findAndDig([B.CLAY], () => count(I.CLAY) >= 2); return; }
        await cookAt('kiln', [I.CLAY], I.CLAY_POT); return;
      }
      if (count(I.WATER_BUCKET) < 1) {
        if (count(I.BUCKET) < 1) {
          if (count(I.INGOT_IRON) < 3) { if (count(I.ORE_IRON) < 3) { await goMining([B.ORE_IRON], () => count(I.ORE_IRON) >= 3); return; } await smelt(I.ORE_IRON, count(I.ORE_IRON)); return; }
          await craft(I.BUCKET, 1);
        }
        await fillBucket(); return;
      }
      await cookAt('oven', ['fish', I.WATER_BUCKET, I.CLAY_POT], I.FISH_STEW);
    },
    eat: async () => {
      if (count(I.FISH_STEW) < 1) {
        // a stew left in an oven?
        const left = bi().cookerManager.getPlaced().find(c => c.slots.some(x => x.itemType === I.FISH_STEW && x.quantity > 0));
        if (left) { await cookAt(left.kind, [], I.FISH_STEW); return; }
        await PLAYBOOK.stew(); return;
      }
      closeMenus();
      selectItem(I.FISH_STEW);
      // eyes on the sky so no machine takes the click
      const pos = player().position;
      await lookAtPoint(pos.clone().addScaledVector(upAt(pos), 20), 0.1, 1500);
      await click(2, 80);
      await sleep(500);
      say('ate a fish stew');
    },
    cement: async () => {
      if (count(I.CLAY) < 2) { await findAndDig([B.CLAY], () => count(I.CLAY) >= 3); return; }
      if (count(I.STONE) < 2) { await digForStone(4); return; }
      await cookAt('kiln', [I.CLAY, I.STONE], I.CEMENT);
    },
    // These missions count what THIS player places: build its own, even if
    // someone else's power plant is already running nearby
    hydro: async () => {
      if (!(await obtain(I.HYDRO_GENERATOR, 1))) return;
      const w = nearestWaterTile(30);
      if (w === null) { say('no pond for a hydro generator - exploring'); await wander(); return; }
      if (!(await placeOnTile(I.HYDRO_GENERATOR, w, P().groundDepthOf(w)))) st.badWater = (st.badWater || []).concat([w]);
    },
    efurnace: async () => {
      if (!(await obtain(I.ELECTRIC_FURNACE, 1))) return;
      const pos = player().position;
      const cable = bi().cableNodeManager.getPlacedCables()
        .sort((a, c) => a.position.distanceTo(pos) - c.position.distanceTo(pos))
        .find(c => neighbors(c.tileIndex).some(isDryTile));
      if (!cable) {
        if (!(await obtain(I.CABLE, 1))) return;
        await placeNearby(I.CABLE);
        return;
      }
      const t = neighbors(cable.tileIndex).find(isDryTile);
      await placeOnTile(I.ELECTRIC_FURNACE, t);
    },
    cookfish: async () => {
      if (!fishItems().some(f => count(f) > 0)) { await goFishing(3); return; }
      await cookAt('campfire', ['fish'], I.COOKED_FISH);
    },
    fishkinds: async () => { await goFishing(8); },
    clay: async () => { await findAndDig([B.CLAY], () => count(I.CLAY) >= 8); },
    bricks: async () => {
      if (count(I.CLAY) < 4) { await findAndDig([B.CLAY], () => count(I.CLAY) >= 8); return; }
      if (count(I.COAL) < 1) { await getCoal(); return; }
      await smelt(I.CLAY, Math.min(count(I.CLAY), 6));
    },
    campfire: async () => {
      if (count(I.CAMPFIRE) === 0) {
        if (!canCraft(I.CAMPFIRE)) { if (count(I.STONE) < 6) await digForStone(8); if (count(I.STICK) < 4) await chopTree(); return; }
        await craft(I.CAMPFIRE, 1);
      }
      await placeNearby(I.CAMPFIRE);
    },
    brickwall: async () => {
      const blocks = count(I.BRICK_BLOCK);
      const bricksNeeded = Math.max(0, (8 - blocks) * 4 - count(I.BRICK));
      if (bricksNeeded > 0) {
        if (count(I.CLAY) < Math.min(bricksNeeded, 16)) { await findAndDig([B.CLAY], () => count(I.CLAY) >= Math.min(bricksNeeded, 16)); return; }
        if (count(I.COAL) < 2) { await getCoal(); return; }
        await smelt(I.CLAY, Math.min(count(I.CLAY), 16));
        return;
      }
      if (blocks < 8) await craft(I.BRICK_BLOCK, 8 - blocks);
      // a wall: blocks side by side, then a second course on top
      for (let i = 0; i < 8 && count(I.BRICK_BLOCK) > 0; i++) await placeNearby(I.BRICK_BLOCK);
    },
    clayblock: async () => {
      if (count(I.CLAY) < 4) { await findAndDig([B.CLAY], () => count(I.CLAY) >= 4); return; }
      for (let i = 0; i < 4; i++) await placeNearby(I.CLAY);
    },
  };

  // Fire clay in the furnace until there are `n` bricks
  async function makeBricks(n) {
    const need = n - count(I.BRICK);
    if (need <= 0) return;
    if (count(I.CLAY) < need) { await findAndDig([B.CLAY], () => count(I.CLAY) >= need); return; }
    if (count(I.COAL) < 2) { await getCoal(); return; }
    await smelt(I.CLAY, need);
  }
  async function digForStone(n) {
    const surface = surfaceDepth();
    await digDown(() => count(I.STONE) >= n);
    await pillarUpTo(surface - 1);
  }
  async function getCoal() {
    if (count(I.ORE_COAL) === 0) await goMining([B.ORE_COAL], () => count(I.ORE_COAL) >= 2);
    if (count(I.ORE_COAL) > 0 && count(I.COAL) < 16) await craft(I.COAL, 1);
  }
  // Dig a shaft down to ore level, tunnel to the wanted ores, climb back out
  async function goMining(wanted, done) {
    const surface = surfaceDepth();
    st.task = 'going mining';
    const seaLevel = P().getSeaLevelDepth ? P().getSeaLevelDepth() : surface - 10;
    for (let round = 0; round < 8 && !done(); round++) {
      if (oreAround(6, wanted).length === 0) {
        // deeper, a few blocks at a time
        const target = feetDepth() - 4;
        await digDown(() => feetDepth() <= target || oreAround(6, wanted).length > 0, 6);
        if (feetDepth() <= 3) break;
        continue;
      }
      await tunnelToOre(wanted, 6);
      await mineNearbyOres(2);
    }
    if (feetDepth() < surface - 1) await pillarUpTo(surface - 1, 60);
    void seaLevel;
    if (!done()) {
      // nothing of it round here: new ground, well away, before the next try
      const names = wanted.map(b => Object.keys(B).find(k => B[k] === b)).join('/');
      say(`no ${names} here - heading for new ground`);
      const pos = player().position;
      const up = upAt(pos);
      const r = new (T().Vector3)(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
      r.addScaledVector(up, -r.dot(up)).normalize();
      await walkTo(pos.clone().addScaledVector(r, 80), 4, 60000);
    }
    return done();
  }
  // Find a surface block of type `kinds` within range, walk there, dig it
  async function findAndDig(kinds, done) {
    const p = P();
    for (let round = 0; round < 6 && !done(); round++) {
      let target = null, bd = 1e9;
      for (const t of tilesWithin(myTile(), 16)) {
        if (!p.isTileLoaded(t)) continue;
        const gd = p.groundDepthOf(t);
        for (let d = gd; d >= Math.max(1, gd - 3); d--) {
          if (kinds.includes(p.getBlock(t, d)) && !(st.badDig || []).includes(`${t}:${d}`)) {
            const c = blockCenter(t, d); const dd = c.distanceTo(player().position);
            if (dd < bd) { bd = dd; target = { t, d, c }; }
            break;
          }
        }
      }
      if (!target) { say('none of that nearby - exploring'); await wander(); await wander(); continue; }
      await approach(target.c, 2.5);
      if (!(await mineBlock(target.t, target.d, 15000))) {
        say(`could not dig the block at tile ${target.t} depth ${target.d} - skipping it`);
        st.badDig = (st.badDig || []).concat([`${target.t}:${target.d}`]);
      }
    }
  }



  // ---- power: a hydro generator in a pond, a cable, an electric furnace ------------
  // Place `item` on tile `tile`, aiming at block (tile, depth) (default: its ground)
  async function placeOnTile(item, tile, depth) {
    const p = P();
    const d = depth ?? p.groundDepthOf(tile);
    const target = depth != null ? blockCenter(tile, d) : blockTop(tile, d);
    await approach(target, 2.6);
    closeMenus();
    if (!selectItem(item)) return false;
    const before = count(item);
    await lookAtPoint(target, 0.03, 1500);
    await click(2, 80);
    await sleep(900);
    closeMenus();
    const ok = count(item) < before;
    say(ok ? `placed item ${item} on tile ${tile}` : `could not place item ${item} on tile ${tile} - won't try that tile again`);
    if (!ok) st.badPlace = (st.badPlace || []).concat([tile]);
    return ok;
  }
  const isWaterTile = (t) => P().topBlockOf(t) === B.WATER;
  const isDryTile = (t) => { const p = P(); return p.isTileLoaded(t) && !isWaterTile(t) && !stationAt(t) && p.getBlock(t, p.groundDepthOf(t) + 1) === B.AIR && p.getBlock(t, p.groundDepthOf(t) + 2) === B.AIR; };

  function poweredEFurnace() {
    const pos = player().position;
    return bi().electricFurnaceManager.getPlacedElectricFurnaces()
      .filter(f => f.isPowered && f.position.distanceTo(pos) < 120)
      .sort((a, b) => a.position.distanceTo(pos) - b.position.distanceTo(pos))[0] || null;
  }

  // Build (or finish) a small power plant by a pond; returns a powered electric furnace or null
  async function buildPowerPlant() {
    const done = poweredEFurnace();
    if (done) return done;
    const b = bi(), p = P();
    st.task = 'building a power plant';
    // 1. an active hydro generator (ours, or a new one in the nearest pond)
    let hydro = b.hydroGeneratorManager.getPlacedHydroGenerators().filter(h => h.isActive)
      .sort((a, c) => a.position.distanceTo(player().position) - c.position.distanceTo(player().position))[0];
    if (!hydro || hydro.position.distanceTo(player().position) > 120) {
      if (!(await obtain(I.HYDRO_GENERATOR, 1))) return null;
      const w = nearestWaterTile(30);
      if (w === null) { say('no pond for a hydro generator - exploring'); await wander(); return null; }
      // aim at the pond floor: the hydro generator stands on it, under the water
      if (!(await placeOnTile(I.HYDRO_GENERATOR, w, p.groundDepthOf(w)))) { st.badWater = (st.badWater || []).concat([w]); return null; }
      hydro = b.hydroGeneratorManager.getHydroGeneratorAtTile(w);
      if (!hydro || !hydro.isActive) { say('the hydro generator is not in water'); return null; }
    }
    // 2. a cable on dry ground beside it
    const ht = hydro.tileIndex;
    const cableTiles = b.cableNodeManager.getPlacedCables().map(c => c.tileIndex);
    let ct = neighbors(ht).find(t => cableTiles.includes(t));
    if (ct === undefined) {
      ct = neighbors(ht).find(isDryTile);
      if (ct === undefined) { say('no dry ground beside the hydro generator'); st.badWater = (st.badWater || []).concat([ht]); return null; }
      if (!(await obtain(I.CABLE, 1))) return null;
      if (!(await placeOnTile(I.CABLE, ct))) return null;
    }
    // 3. the electric furnace beside the cable
    let ef = neighbors(ct).map(t => b.electricFurnaceManager.getElectricFurnaceAtTile(t)).find(Boolean);
    if (!ef) {
      const et = neighbors(ct).find(t => t !== ht && isDryTile(t));
      if (et === undefined) { say('no room for the electric furnace'); return null; }
      if (!(await obtain(I.ELECTRIC_FURNACE, 1))) return null;
      if (!(await placeOnTile(I.ELECTRIC_FURNACE, et))) return null;
      ef = b.electricFurnaceManager.getElectricFurnaceAtTile(et);
    }
    await sleep(3000);   // the grid solves every so often
    if (ef && ef.isPowered) say('power plant running: hydro -> cable -> electric furnace');
    else say('electric furnace placed but not powered yet');
    return ef && ef.isPowered ? ef : null;
  }

  // Smelt `n` of `output` in a powered electric furnace
  async function electricSmelt(output, n) {
    const r = ESMELTS.find(x => x.output === output);
    if (!r) return false;
    const runs = Math.ceil(n / r.outputQuantity);
    const needIn = runs * (r.inputQuantity || 1);
    if (count(r.input) < needIn) { await obtain(r.input, needIn); return false; }
    if (r.with && count(r.with.itemType) < runs * r.with.quantity) { await obtain(r.with.itemType, runs * r.with.quantity); return false; }
    const ef = await buildPowerPlant();
    if (!ef) return false;
    st.task = 'electric smelting';
    await approach(ef.position, 2.2);
    closeMenus(); selectEmptyHand();
    await aimAtMachine(ef.position.clone().addScaledVector(upAt(ef.position), 0.3)); selectEmptyHand();
    await click(2, 80);
    await sleep(500);
    const ui = bi().electricFurnaceUI;
    if (!ui.isMenuOpen()) { say('could not open the electric furnace'); closeMenus(); return false; }
    const slotOf = (it) => inv().getAllSlots().findIndex(x => x.itemType === it && x.quantity > 0);
    if (r.with) { const a = slotOf(r.with.itemType); if (a >= 0) ui.handleDropFromInventory(a, 'electric-furnace-additive'); }
    const s0 = slotOf(r.input); if (s0 >= 0) ui.handleDropFromInventory(s0, 'electric-furnace-input');
    say(`electric furnace loaded: ${ef.inputCount} ${itemName(r.input)}`);
    const t0 = performance.now();
    while (performance.now() - t0 < 120000 && (ef.inputCount >= (r.inputQuantity || 1))) await sleep(1000);
    ui.handleSlotClick('electric-furnace-output');
    await sleep(300);
    // leftovers back
    try { ui.handleShiftClick('electric-furnace-input'); ui.handleShiftClick('electric-furnace-additive'); } catch {}
    closeMenus();
    say(`took ${count(output)} ${itemName(output)} from the electric furnace`);
    return count(output) >= n;
  }


  // ---- the electronics workbench (needs power) --------------------------------------
  function nearestWorkbench() {
    const pos = player().position;
    // a powered one: an unpowered bench can't make anything
    return bi().electronicsWorkbenchManager.getPlacedElectronicsWorkbenches()
      .filter(w => bi().nodePowered(w.tileIndex))
      .sort((a, b) => a.position.distanceTo(pos) - b.position.distanceTo(pos))[0] || null;
  }
  // Craft `times` of recipe `idx` at a powered workbench
  async function benchCraft(idx, times) {
    let wb = nearestWorkbench();
    if (!wb || wb.position.distanceTo(player().position) > 150) {
      // build one by the power plant
      const ef = await buildPowerPlant();
      if (!ef) return false;
      if (!(await obtain(I.ELECTRONICS_WORKBENCH, 1))) return false;
      const cable = bi().cableNodeManager.getPlacedCables().find(c => c.position.distanceTo(ef.position) < 4);
      const t = cable && neighbors(cable.tileIndex).find(isDryTile);
      if (t === undefined || !(await placeOnTile(I.ELECTRONICS_WORKBENCH, t))) return false;
      wb = nearestWorkbench();
      if (!wb) return false;
    }
    st.task = 'at the workbench';
    await approach(wb.position, 2.2);
    closeMenus(); selectEmptyHand();
    await aimAtMachine(wb.position.clone().addScaledVector(upAt(wb.position), 0.3)); selectEmptyHand();
    await click(2, 80);
    await sleep(600);
    const ui = bi().electronicsWorkbenchUI;
    if (!ui.isMenuOpen()) { say('could not open the workbench'); closeMenus(); st.badPlace = (st.badPlace || []).concat([wb.tileIndex]); return false; }
    if (!ui.isPowered) { say('the workbench has no power'); closeMenus(); return false; }
    ui.selectedRecipeIndex = idx;
    try { ui.updateUI(); } catch {}
    const out = BENCH[idx].output.itemType;
    const before = count(out);
    for (let k = 0; k < times; k++) { ui.handleCraftButtonClick(); await sleep(250); }
    closeMenus();
    const made = count(out) - before;
    say(made > 0 ? `made ${made} ${itemName(out)} at the workbench` : `the workbench made nothing (${BENCH[idx].name})`);
    return made > 0;
  }


  // ---- keeping room in the inventory ------------------------------------------------
  // A full inventory drops everything mined on the floor (well, nowhere): when
  // fewer than MIN_FREE slots are left, put the spare stacks in a chest - the
  // second and later stacks of anything, and snow - keeping the first stack
  const MIN_FREE = 4;
  const freeSlots = () => inv().getAllSlots().filter(x => !x.itemType || !x.quantity).length;
  async function ensureSpace() {
    if (freeSlots() >= MIN_FREE) return;
    const all = inv().getAllSlots();
    const seen = new Set();
    const spare = [];
    all.forEach((x, i) => {
      if (!x.itemType || !x.quantity) return;
      if (seen.has(x.itemType) || x.itemType === I.SNOW) spare.push(i);
      seen.add(x.itemType);
    });
    if (!spare.length) { say('inventory full and nothing spare to store'); return; }
    say(`inventory full - storing ${spare.length} spare stack(s) in a chest`);
    const sm = bi().storageChestManager;
    const pos = player().position;
    // only this bot's own chests - never another player's
    let mine = [];
    try { mine = JSON.parse(localStorage.getItem('bot_myChests') || '[]'); } catch {}
    let chest = sm.getPlacedChests()
      .filter(c => mine.includes(c.tileIndex) && c.position.distanceTo(pos) < 40 && c.slots.some(x => !x.itemType || !x.quantity))
      .sort((a, b) => a.position.distanceTo(pos) - b.position.distanceTo(pos))[0];
    if (!chest) {
      // a crafted chest needs a free slot to land in: build with the smallest
      // stack of a placeable block until one slot is empty
      for (let k = 0; k < 3 && freeSlots() === 0 && count(I.STORAGE_CHEST) === 0; k++) {
        const small = inv().getAllSlots()
          .filter(x => x.itemType && x.quantity && x.quantity <= 8 && B[itemName(x.itemType)] !== undefined)
          .sort((a, b) => a.quantity - b.quantity)[0];
        if (!small) break;
        const it = small.itemType, q = small.quantity;
        say(`making room: building with ${q} ${itemName(it)}`);
        for (let j = 0; j < q && count(it) > 0; j++) await placeNearby(it);
      }
      if (count(I.STORAGE_CHEST) === 0 && !(await obtain(I.STORAGE_CHEST, 1))) return;
      const t = await placeNearby(I.STORAGE_CHEST);
      if (t === false) return;
      chest = sm.getChestAtTile(t);
      if (!chest) return;
      mine.push(t);
      try { localStorage.setItem('bot_myChests', JSON.stringify(mine)); } catch {}
    }
    await approach(chest.position, 2.2);
    selectEmptyHand();
    await aimAtMachine(chest.position.clone().addScaledVector(upAt(chest.position), 0.3));
    selectEmptyHand();
    await click(2, 80);
    await sleep(500);
    const ui = bi().storageUI;
    if (!ui.isMenuOpen()) { say('could not open the chest'); closeMenus(); return; }
    let moved = 0;
    for (const i of spare) {
      const slot = chest.slots.findIndex(x => !x.itemType || !x.quantity);
      if (slot < 0) break;
      ui.transferFromInventory(i, slot);
      moved++;
      await sleep(80);
    }
    closeMenus();
    say(`stored ${moved} stack(s); ${freeSlots()} slots free`);
  }

  // ---- a general planner: get any item the way a player would -------------------
  // Craft it (getting the ingredients first), smelt it from its ore, or dig
  // its block out of the ground. Returns true once `n` are held; false when
  // this pass made progress but isn't done yet, so the mission loop comes back.
  const itemName = (it) => Object.keys(I).find(k => I[k] === it);
  async function obtain(item, n, depth = 0) {
    if (count(item) >= n) return true;
    if (depth > 6) return false;
    const name = itemName(item);
    if (item === I.LOG) { await chopTree(); return count(item) >= n; }
    if (item === I.WATER_BUCKET) {
      if (!(await obtain(I.BUCKET, 1, depth + 1))) return false;
      await fillBucket(); return count(item) >= n;
    }
    // crafted
    const recs = RECIPES.filter(r => r.output.itemType === item && tracker().recipeOpen(item));
    for (const r of recs) {
      const times = Math.ceil((n - count(item)) / r.output.quantity);
      const need = {};
      for (const inp of r.inputs) need[inp.itemType] = (need[inp.itemType] || 0) + inp.quantity * times;
      for (const [k, q] of Object.entries(need)) {
        if (count(+k) < q) { await obtain(+k, q, depth + 1); if (count(+k) < q) return false; }
      }
      await craft(item, Math.max(1, times));
      return count(item) >= n;
    }
    // made at the electronics workbench
    const bidx = BENCH ? BENCH.findIndex(r => r.output.itemType === item && tracker().recipeOpen(item)) : -1;
    if (bidx >= 0) {
      const r = BENCH[bidx];
      const times = Math.ceil((n - count(item)) / r.output.quantity);
      const need = {};
      for (const inp of r.inputs) need[inp.itemType] = (need[inp.itemType] || 0) + inp.quantity * times;
      for (const [k, q] of Object.entries(need)) {
        if (count(+k) < q) { await obtain(+k, q, depth + 1); if (count(+k) < q) return false; }
      }
      await benchCraft(bidx, times);
      return count(item) >= n;
    }
    // smelted
    const sm = SMELTS && SMELTS.find(r => r.output === item);
    if (sm) {
      const runs = Math.ceil((n - count(item)) / sm.outputQuantity);
      if (count(sm.input) < runs) { await obtain(sm.input, runs, depth + 1); if (count(sm.input) < runs) return false; }
      if (count(I.COAL) < Math.ceil(runs / 8) + 1) { await getCoal(); if (count(I.COAL) < 1) return false; }
      await smelt(sm.input, runs);
      return count(item) >= n;
    }
    // electric furnace
    if (ESMELTS && ESMELTS.some(r => r.output === item)) { await electricSmelt(item, n); return count(item) >= n; }
    // a cooking station (campfire, kiln, oven): one dish per cook
    const ck = COOKS && COOKS.find(r => r.output === item && tracker().recipeOpen(item));
    if (ck) {
      for (const inp of ck.inputs) {
        if (inp === 'fish') { if (!fishItems().some(f => count(f) > 0)) { await goFishing(3); return false; } continue; }
        if (count(inp) < 1 && !(await obtain(inp, 1, depth + 1))) return false;
      }
      await cookAt(ck.kind, ck.inputs, item);
      return count(item) >= n;
    }
    // dug out of the ground
    const block = name !== undefined ? B[name] : undefined;
    if (block !== undefined) {
      if (name.startsWith('ORE_')) await goMining(count(I.COAL) < 16 && block !== B.ORE_COAL ? [block, B.ORE_COAL] : [block], () => count(item) >= n);
      else if (block === B.STONE) await digForStone(n);
      else await findAndDig([block], () => count(item) >= n);
      return count(item) >= n;
    }
    if (!(st.unknown || []).includes(item)) say(`does not know how to get ${name}`);
    st.unknown = (st.unknown || []).concat([item]);
    return false;
  }

  // Play any mission whose objectives are holding, making, smelting or placing things
  async function generic(m) {
    const unknown0 = (st.unknown || []).length;
    await genericStep(m);
    if ((st.unknown || []).length > unknown0) {
      say(`${m.title} needs something it cannot get - skipping it`);
      st.cannot = (st.cannot || []).concat([m.id]);
    }
  }
  async function genericStep(m) {
    const prog = tracker().progress(m);
    for (let i = 0; i < m.objectives.length; i++) {
      const o = m.objectives[i];
      const left = o.count - (prog[i] || 0);
      if (left <= 0) continue;
      if ((st.unknown || []).includes(o.item)) { st.cannot = (st.cannot || []).concat([m.id]); return; }
      if (o.kind === 'gained') { await obtain(o.item, count(o.item) + left); return; }
      if (o.kind === 'crafted') {
        const r = RECIPES.find(r => r.output.itemType === o.item) || (BENCH || []).find(r => r.output.itemType === o.item);
        const q = r ? r.output.quantity : 1;
        await obtain(o.item, count(o.item) + Math.ceil(left / q) * q);
        return;
      }
      if (o.kind === 'smelted') {
        const sm = SMELTS.find(r => r.output === o.item);
        if (!sm) {
          if (ESMELTS.some(r => r.output === o.item)) { await electricSmelt(o.item, left); return; }
          st.cannot = (st.cannot || []).concat([m.id]); return;
        }
        if (count(sm.input) < left) { await obtain(sm.input, left); return; }
        if (count(I.COAL) < 2) { await getCoal(); return; }
        await smelt(sm.input, left); return;
      }
      if (o.kind === 'placed') {
        if (!(await obtain(o.item, Math.min(left, 4)))) return;
        for (let k = 0; k < left && count(o.item) > 0; k++) await placeNearby(o.item);
        return;
      }
      say(`cannot play objective '${o.kind}' yet`);
      st.cannot = (st.cannot || []).concat([m.id]);
      return;
    }
  }
  const PLAYABLE = ['gained', 'crafted', 'smelted', 'placed'];

  // Missions each role plays, in order of preference, after the trunk
  const ROLE_ORDER = {
    miner: ['logs', 'planks', 'stone', 'furnace', 'iron', 'ingots', 'bucket', 'copper', 'lightmetals', 'torches', 'chest', 'rod'],
    builder: ['logs', 'planks', 'stone', 'furnace', 'torches', 'chest', 'rod', 'fish', 'fishkinds', 'clay', 'bricks', 'campfire', 'clayblock', 'brickwall', 'cookfish', 'kiln', 'pot', 'oven', 'stew', 'eat', 'cement', 'iron', 'ingots', 'bucket', 'copper', 'lightmetals'],
  };

  // A mission with no progress for STALL_MS is set aside for REST_MS
  const STALL_MS = 10 * 60 * 1000, REST_MS = 20 * 60 * 1000;
  const resting = (id) => (st.rest && st.rest[id] || 0) > Date.now();
  function progressKey() { return doneIds().length + ':' + JSON.stringify(tracker().openMissions().map(m => tracker().progress(m))); }
  function pickMission() {
    const open = new Set(openIds().filter(id => !resting(id)));
    for (const id of ROLE_ORDER[st.role] ?? ROLE_ORDER.miner) if (open.has(id) && PLAYBOOK[id]) return id;
    // its own branches are done: help itself to the other's
    for (const order of Object.values(ROLE_ORDER)) for (const id of order) if (open.has(id) && PLAYBOOK[id]) return id;
    // then anything the general planner can play
    for (const m of tracker().openMissions()) {
      if ((st.cannot || []).includes(m.id) || resting(m.id)) continue;
      if (m.objectives.every(o => PLAYABLE.includes(o.kind))) return m.id;
    }
    return null;
  }

  async function loop() {
    const gen = ++loopGen;
    st.curGen = gen;
    while (st.running && gen === loopGen) {
      st.iterAt = Date.now();
      try {
        closeMenus();
        await ensureSpace();
        const id = pickMission();
        if (!id) { st.goal = 'nothing left it knows how to do'; say(st.goal); await wander(); await sleep(2000); continue; }
        const m = tracker().openMissions().find(x => x.id === id);
        if (st.goal !== id) { say(`mission: ${m.title} (${m.objectives.map(o => o.label).join(', ')})`); st.since = Date.now(); st.pkey = progressKey(); }
        st.goal = id;
        const pk = progressKey();
        if (pk !== st.pkey) { st.pkey = pk; st.since = Date.now(); }
        if (Date.now() - (st.since || Date.now()) > STALL_MS) {
          say(`stuck on ${m.title} for 10 min - setting it aside for 20 min`);
          st.rest = st.rest || {}; st.rest[id] = Date.now() + REST_MS;
          st.goal = ''; continue;
        }
        if (PLAYBOOK[id]) await PLAYBOOK[id](); else await generic(m);
      } catch (e) {
        st.errors++;
        say(`error: ${e && e.message}`);
        releaseAll();
        await sleep(1500);
      }
      await sleep(200);
    }
  }

  window.__bot = {
    async start(role) {
      if (st.running) return;
      await loadModules();
      st.role = role;
      try { st.badWater = JSON.parse(localStorage.getItem('bot_badWater') || '[]'); } catch {}
      st.running = true;
      holdLock();
      await calibrate();
      say(`${role} bot starting at tile ${myTile()}`);
      loop();
      // Hang watchdog: a loop pass that runs past HANG_MS is abandoned and a
      // fresh loop starts (the old one unwinds at its next wait)
      const HANG_MS = 12 * 60 * 1000;
      setInterval(() => {
        if (!st.running || Date.now() - (st.iterAt || Date.now()) < HANG_MS) return;
        say(`hung for 12 min at: ${st.where || '?'} - restarting the loop`);
        releaseAll();
        st.iterAt = Date.now();
        loop();
      }, 30000);
    },
    stop() { st.running = false; releaseAll(); },
    status() {
      const t = tracker();
      const s = t.save();
      const hot = inv().getAllSlots().filter(x => x.itemType && x.quantity).map(x => [x.itemType, x.quantity]);
      return {
        role: st.role, task: st.task, goal: st.goal, done: s.done, now: t.now()?.id ?? null,
        pos: player().position.toArray().map(v => +v.toFixed(1)), tile: myTile(), depth: feetDepth(),
        items: hot, errors: st.errors, log: st.log.slice(-12), where: st.where,
        mem: { heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null, geo: g().engine.renderer.info.memory.geometries, tex: g().engine.renderer.info.memory.textures },
      };
    },
    // exposed for poking at a running bot from the runner's REPL
    x: { P, I: () => I, B: () => B, rayHit, eye, lookDir, nearestWaterTile, blockCenter, blockTop, upAt, bi, count, lookAtPoint, click, sleep, closeMenus, selectItem, walkTo, st },
    skills: { cookAt, chopTree, walkTo, mineBlock, digDown, craft, placeNearby, smelt, goMining, pillarUpTo, fillBucket },
  };
})();
