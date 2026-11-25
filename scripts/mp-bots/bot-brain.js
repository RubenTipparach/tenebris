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
    // holding its breath off-world: any task unwinds when it is time to get back to the cabin
    if (st.abortIf && !st.inAbort && st.abortIf()) { st.inAbort = true; throw new Error('out of breath - back to the rocket'); }
    st.where = (new Error().stack || '').split('\n').slice(3, 9).map(l => l.trim().replace(/^at /, '').replace(/ \(.*$/, '')).join(' < ');
  }
  const sleep = (ms) => { waitPoint(st.curGen); return new Promise(r => setTimeout(r, ms)); };

  let I = null;          // ItemType
  let ITEM_DATA = null;  // per-item data (rocket part heights)
  let STACK_OK = () => true;  // the pad's stack rules (stackProblems)
  let B = null;          // HexBlockType
  let RECIPES = null;    // CRAFTING_RECIPES
  let SMELTS = null;     // furnace SMELTING_RECIPES
  let ESMELTS = null;    // electric furnace ELECTRIC_SMELTING_RECIPES
  let COOKS = null;      // campfire / kiln / oven recipes, with their station kind
  let BENCH = null;      // electronics workbench recipes
  let PRINTS = null;     // 3D printer recipes
  let SENS = 0.002;      // PlayerConfig.MOUSE_SENSITIVITY
  let pitchSign = 1;     // measured: which way +mouseY turns the head

  const st = {
    role: null, running: false, task: 'idle', goal: '', log: [], stuck: 0,
    home: null, furnaceTile: null, started: Date.now(), errors: 0,
  };
  // Bots play on a shared world: they don't dig to get somewhere, only for
  // what they gather (ore, stone, clay) and out of their own pits
  const GENTLE = {
    WALK_SIDESTEPS: 4,      // side-steps when stuck walking, then give up
    AROUND_M: 6,            // a detour this far to the side when a walk fails
    MACHINE_SIDESTEPS: 3,   // moves to see a machine past something in the way
    MACHINE_OPEN_TRIES: 3,  // failed opens before a machine is given up for another
    KEEP_BLOCKS: 16,        // building blocks kept when leaving dug-up rock behind (to climb out of a pit)
    ORE_SCAN_TILES: 16,     // how far round it looks up ore in the world data...
    ORE_SCAN_DEPTH: 24,     // ...and how deep, before digging toward one
  };
  const say = (msg) => {
    const line = `${new Date().toISOString().slice(11, 19)} ${msg}`;
    st.log.push(line);
    if (st.log.length > 200) st.log.shift();
    console.log(`[bot] ${msg}`);
    // real work toward the mission (gathering, making) keeps the stall
    // watchdog off it - a long supply chain isn't a stuck mission
    if (/^(mined|crafted|collected|printed|made|took|placed|filled|cooked|felled|pad block laid)/.test(msg)) st.since = Date.now();
  };

  async function loadModules() {
    const inventory = await import(`${BASE}/player/Inventory.ts`);
    const blocks = await import(`${BASE}/shared/blockTypes.ts`);
    const crafting = await import(`${BASE}/player/CraftingSystem.ts`);
    const cfg = await import(`${BASE}/config/PlayerConfig.ts`);
    const smeltMod = await import(`${BASE}/config/SmeltingRecipes.ts`);
    SMELTS = smeltMod.SMELTING_RECIPES;
    ESMELTS = smeltMod.ELECTRIC_SMELTING_RECIPES;
    const printMod = await import(`${BASE}/player/Printer3DUI.ts`);
    PRINTS = printMod.PRINTER_RECIPES;
    const benchMod = await import(`${BASE}/player/ElectronicsWorkbenchUI.ts`);
    BENCH = benchMod.ELECTRONICS_RECIPES;
    const cookMod = await import(`${BASE}/config/CookingConfig.ts`);
    COOKS = Object.entries(cookMod.COOKERS).flatMap(([kind, c]) => c.recipes.map(r => ({ kind, ...r })));
    BODY_RES = (await import(`${BASE}/config/Missions.ts`)).BODY_RESOURCES || {};
    const perfMod = await import(`${BASE}/rocket/RocketPerformance.ts`);
    STACK_OK = (parts) => perfMod.stackProblems(parts).length === 0;
    I = inventory.ItemType;
    ITEM_DATA = inventory.ITEM_DATA;
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
              // a wall: step aside and hop (bots don't dig through the world
              // to get somewhere - it's other players' world too); give up
              // after a few tries
              key('KeyW', false);
              digs++;
              if (digs > GENTLE.WALK_SIDESTEPS) return false;
              const side = digs % 2 ? 'KeyA' : 'KeyD';
              key(side, true); key('Space', true); await sleep(900); key('Space', false); await sleep(300); key(side, false);
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
    }
    return pred();
  }

  // Ore blocks within `radius` tiles that touch air (visible from a tunnel)
  const ORES = () => [B.ORE_COAL, B.ORE_IRON, B.ORE_COPPER, B.ORE_GOLD, B.ORE_ALUMINUM, B.ORE_LITHIUM, B.ORE_COBALT];
  function oreAround(radius, wanted, below = 6) {
    const p = P();
    const pos = player().position;
    const fd = feetDepth();
    const out = [];
    for (const t of tilesWithin(myTile(), radius)) {
      if (!p.isTileLoaded(t)) continue;
      for (let d = Math.max(1, fd - below); d <= fd + 4; d++) {
        const b = p.getBlock(t, d);
        if (wanted.includes(b) && !(st.badDig || []).includes(`${t}:${d}`)) out.push({ tile: t, depth: d, block: b, dist: blockCenter(t, d).distanceTo(pos) });
      }
    }
    return out.sort((a, b) => a.dist - b.dist);
  }

  // Mine any ore the bot can reach from where it stands
  async function mineNearbyOres(radius = 2, wanted = null) {
    // only ore it is after (it used to take every ore by its tunnel)
    const want = wanted || [];
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
      // a detour round the side, then give up (no tunnelling through the world)
      const pos = player().position, up = upAt(pos);
      const flat = target.clone().sub(pos); flat.addScaledVector(up, -flat.dot(up));
      const side = new (T().Vector3)().crossVectors(up, flat).normalize().multiplyScalar(GENTLE.AROUND_M * (Math.random() < 0.5 ? 1 : -1));
      say('cannot walk there - trying a way round');
      await walkTo(pos.clone().add(side).addScaledVector(flat, 0.5), 1.6, 15000);
      if (!(await walkTo(target, arrive, 25000))) { say('could not get there - leaving it'); return false; }
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
    // standing on top of it (or inside it) the line of sight misses it: step back
    for (let k = 0; k < 3 && hdist(player().position, target) < 1.4; k++) {
      const pos = player().position;
      const up = upAt(pos);
      const away = pos.clone().sub(target); away.addScaledVector(up, -away.dot(up));
      if (away.lengthSq() < 1e-4) away.set(1, 0, 0).addScaledVector(up, -up.x);
      away.normalize();
      await lookAtPoint(pos.clone().addScaledVector(away, -3).addScaledVector(up, 0.5), 0.1, 800);
      key('KeyS', true); key('Space', true); await sleep(450); key('Space', false); await sleep(200); key('KeyS', false);
      await sleep(250);
    }
    for (let k = 0; k < 4; k++) {
      await lookAtPoint(target, 0.03, 2000);
      const h = rayHit();
      const far = target.distanceTo(eye());
      if (!h || h.point.distanceTo(eye()) >= far - 0.35) return;
      const b = P().getBlock(h.tileIndex, h.depth);
      if (b === B.AIR || b === B.WATER || h.depth <= 0) return;
      if (k >= GENTLE.MACHINE_SIDESTEPS) return;
      // something in the way: step round it for a clear look (never mine it)
      const pos = player().position, up = upAt(pos);
      const to = target.clone().sub(pos); to.addScaledVector(up, -to.dot(up));
      const side = new (T().Vector3)().crossVectors(up, to).normalize().multiplyScalar(k % 2 ? -2 : 2);
      await walkTo(pos.clone().add(side), 0.8, 4000);
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
    // no fuel in it: coal from the inventory (made from coal ore if need be)
    if (f.fuelAmount <= 0 && f.inputCount > 0) {
      if (count(I.COAL) < 1 && count(I.ORE_COAL) > 0) { closeMenus(); await craft(I.COAL, 1); if (!(await openFurnace(f))) return false; }
      if (count(I.COAL) > 0) { selectItem(I.COAL); for (let k = 0; k < Math.min(count(I.COAL), Math.ceil(f.inputCount / 8)); k++) ui.handleFuelSlotClick(); }
    }
    say(`furnace loaded: ${f.inputCount} to smelt, fuel ${f.fuelAmount}`);
    if (f.fuelAmount <= 0) { say('no fuel for the furnace'); closeMenus(); return false; }
    // wait at the furnace while it works (10 s an item); give up if it stalls
    const t0 = performance.now();
    let lastIn = f.inputCount, lastMove = performance.now();
    while ((f.inputCount > 0) && performance.now() - t0 < (n + 2) * 11000) {
      await sleep(1000);
      if (f.inputCount !== lastIn || f.smeltingProgress > 0.01) { lastIn = f.inputCount; lastMove = performance.now(); }
      if (performance.now() - lastMove > 30000 || f.fuelAmount <= 0) break;
    }
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
      const had = count(I.WATER_BUCKET);
      await click(2, 80);
      await sleep(500);
      if (count(I.WATER_BUCKET) > had) { say('filled a water bucket'); return true; }
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
  // Shear sheep for wool: shears in hand, walk up to a sheep, right-click it.
  // A shorn sheep regrows its fleece (RANCHING.REGROW_S), so each is tried once a while.
  const SHORN_RETRY_MS = 5 * 60 * 1000;
  async function shearSheep(n) {
    if (count(I.SHEARS) < 1) { if (!(await obtain(I.SHEARS, 1))) return; }
    const fauna = bi().fauna;
    if (!fauna) return;
    st.shorn = st.shorn || {};
    const pos = player().position;
    const sheep = fauna.debugCreatures().filter(c => /sheep/i.test(c.id) && (st.shorn[c.uid] || 0) < Date.now())
      .sort((a, b) => a.pos.distanceTo(pos) - b.pos.distanceTo(pos))[0];
    if (!sheep) { say('no sheep to shear near by - exploring'); await wander(); return; }
    st.task = `shearing a sheep (${sheep.pos.distanceTo(pos).toFixed(0)} m away)`;
    const where = () => (fauna.debugCreatures().find(c => c.uid === sheep.uid) || {}).pos;
    const t0 = performance.now();
    while (performance.now() - t0 < 40000) {
      const p = where();
      if (!p) break;
      if (p.distanceTo(player().position) > 2.5) { await walkTo(p, 2.2, 6000); continue; }
      closeMenus(); selectItem(I.SHEARS);
      await lookAtPoint(p.clone().addScaledVector(upAt(p), 0.6), 0.05, 1200);
      const had = count(I.WOOL);
      await click(2, 80);
      await sleep(400);
      if (count(I.WOOL) > had) { say(`collected ${count(I.WOOL) - had} wool from a sheep`); st.shorn[sheep.uid] = Date.now() + SHORN_RETRY_MS; return; }
      if (performance.now() - t0 > 15000) break;
    }
    st.shorn[sheep.uid] = Date.now() + SHORN_RETRY_MS;
  }
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
  // ---- flying -------------------------------------------------------------
  // The bot pilots a rocket through the pilot's own keys: W/S pitch and Q/E
  // roll turn the thrust axis (A/D cancel spin about it), X/Z move the
  // throttle, Space toggles thrust. Nothing is set on the rocket directly.
  //
  // Guidance, from the game's flight physics (RocketController):
  //  - linear damping bleeds LAMBDA of the speed every second, so a coast
  //    from speed v covers v / LAMBDA before it stops. The bot burns up to
  //    the speed whose coast just reaches the approach height (v = LAMBDA *
  //    distance), then rides it - damping does the braking for free.
  //  - the command is the acceleration that takes the velocity to that
  //    profile: a = KV (vWant - v) + LAMBDA v - gravity, pointed by the
  //    thrust axis, its size set by the throttle.
  const FLY = {
    LAMBDA: -Math.log(0.995) * 60,   // ROCKET_CONFIG.PHYSICS.linearDamping per second
    KV: 1.2,                         // velocity error gain (1/s)
    TURN_GAIN: 2.0, MAX_TURN: 0.8,   // wanted turn rate per radian off (1/s), its cap (rad/s)
    DEADBAND: 0.02,                  // rad/s: turn-rate error the keys ignore
    CLIMB_ALT: 25,                   // m above the departure body before heading off
    APPROACH_ALT: 10,                // m: the coast aims to stop here; below it, a powered descent
    TOUCHDOWN: 1.2,                  // m/s final descent (impact limit is 5, safe landing 2)
    MAX_SPEED: 80,                   // m/s cap in open space
    AIR_SPEED: 32,                   // m/s cap inside an atmosphere shell (REENTRY.safeSpeed is 40)
    UPRIGHT_ALT: 6,                  // m: below this the thrust axis is held near the local up
    OFF_AXIS_CUT: 0.35,              // rad: throttle drops to zero this far off the wanted axis
    TIMEOUT_MS: 10 * 60 * 1000,
    CHUTE_ALT: 40,                   // m: under this (PARACHUTE.deployAltitude is 50) a chute landing cuts the engines
    SITE_ARRIVE_M: 6,                // m from the point above the site where the descent starts
    SITE_GAIN: 0.4, SITE_MAX_DRIFT: 3, // sideways correction toward the site during the descent (1/s, m/s)
  };
  const fm = () => g().rocketFlightManager;
  const rc = () => (fm() && fm().getRocketController ? fm().getRocketController() : null);
  const held = {};
  function hold(code, on) { if (!!held[code] !== on) { key(code, on); held[code] = on; } }
  function releaseFlight() { for (const k of ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyQ', 'KeyE', 'KeyX', 'KeyZ', 'Space', 'KeyN', 'KeyP']) hold(k, false); }
  const bodyById = (id) => (rc().planets || []).find(p => p.id === id);
  const surfR = (b, dir) => (b.getSurfaceHeight ? b.getSurfaceHeight(dir) : b.radius);
  // One frame of turning the thrust axis (rocket local up) toward `dir`; returns the angle off
  function pointThrust(dir) {
    const r = rc();
    const up = r.getLocalUp(), right = r.getLocalRight(), fwd = r.getLocalForward();
    const c = Math.max(-1, Math.min(1, up.dot(dir)));
    const ang = Math.acos(c);
    const axis = new (T().Vector3)().crossVectors(up, dir);
    if (axis.lengthSq() < 1e-10) axis.copy(c < 0 ? right : up.clone().multiplyScalar(0));
    if (axis.lengthSq() > 0) axis.normalize().multiplyScalar(Math.min(FLY.MAX_TURN, ang * FLY.TURN_GAIN));
    const w = r.angularVelocity;
    const ex = axis.dot(right) - w.dot(right);   // pitch up spins +right
    const ez = axis.dot(fwd) - w.dot(fwd);       // roll right spins +forward
    const ey = -w.dot(up);                       // yaw left spins +up: hold the spin at zero
    hold('KeyS', ex > FLY.DEADBAND); hold('KeyW', ex < -FLY.DEADBAND);
    hold('KeyE', ez > FLY.DEADBAND); hold('KeyQ', ez < -FLY.DEADBAND);
    hold('KeyA', ey > FLY.DEADBAND * 2); hold('KeyD', ey < -FLY.DEADBAND * 2);
    return ang;
  }
  function throttleTo(t) {
    const now = rc().getThrottle();
    hold('KeyX', now < t - 0.03); hold('KeyZ', now > t + 0.03);
  }
  // Thrust on/off is an edge on Space: press for a frame, release the next
  function thrustSwitch(on) {
    const r = rc();
    if (held.Space) { hold('Space', false); return; }
    if (r.isThrustOn() !== on) hold('Space', true);
  }

  // Fly the boarded rocket to body `id` and land on it. Returns 'landed',
  // 'crashed', 'fuel' (ran dry), 'gone' or 'timeout'.
  // `siteDir`: where on the body to land, as a unit direction from its centre
  // (bodies don't spin); without one, the nearest ground straight below
  async function flyTo(id, siteDir = null, useChute = false) {
    const V = T().Vector3;
    const t0 = performance.now();
    let last = performance.now(), lastCentre = null;
    const tv = new V();                  // the target body's velocity (it orbits)
    let phase = 'climb', fromId = rc() && rc().closestPlanet ? rc().closestPlanet.id : null;
    let logAt = 0;
    say(`flying from ${fromId} to ${id}`);
    try {
      while (true) {
        await nextFrame();
        const r = rc();
        if (!r) return 'gone';
        const s = r.getState();
        if (s === 'CRASHED') return 'crashed';
        if (s === 'LANDED' && phase !== 'climb') return 'landed';
        if (performance.now() - t0 > FLY.TIMEOUT_MS) return 'timeout';
        const now = performance.now(), dt = Math.max(1e-3, (now - last) / 1000); last = now;
        const b = bodyById(id);
        if (!b) return 'gone';
        if (lastCentre) tv.lerp(b.center.clone().sub(lastCentre).divideScalar(dt), 0.1);
        lastCentre = b.center.clone();
        const pos = r.getPosition(), v = r.getVelocity();
        const grav = r.getGravityInfo().totalAcceleration.clone();
        const maxA = (r.totalThrust || 1) / r.getCurrentMass();
        const rel = pos.clone().sub(b.center), dist = rel.length(), up = rel.clone().divideScalar(dist);
        const alt = dist - surfR(b, up);
        let vWant;
        if (phase === 'climb') {
          const home = r.closestPlanet;
          const hUp = pos.clone().sub(home.center).normalize();
          vWant = hUp.clone().multiplyScalar(FLY.MAX_SPEED);
          if (r.getAltitude() > FLY.CLIMB_ALT || home.id === id && r.getAltitude() > FLY.APPROACH_ALT) phase = 'go';
        } else {
          // toward the body (or the point above the landing site); around the
          // departure body if it is in the way
          let toT = up.clone().negate(), togo = Math.max(0, alt - FLY.APPROACH_ALT);
          let side = null;   // sideways miss from the landing site, in the local horizontal
          if (siteDir) {
            const sR = surfR(b, siteDir);
            const above = b.center.clone().addScaledVector(siteDir, sR + FLY.APPROACH_ALT);
            const toAbove = above.clone().sub(pos);
            side = toAbove.clone().addScaledVector(up, -toAbove.dot(up));
            if (phase !== 'land') { togo = toAbove.length(); toT = toAbove.normalize(); }
          }
          const home = r.closestPlanet;
          if (home && home.id !== id) {
            const hRel = pos.clone().sub(home.center), hUp = hRel.clone().normalize();
            const k = toT.dot(hUp);
            if (k < 0.3 && hRel.length() < home.radius * 2.5) toT.addScaledVector(hUp, 0.3 - k).normalize();
          }
          // the coast profile: the speed that damping alone turns into the distance left
          let speed = Math.min(FLY.MAX_SPEED, FLY.LAMBDA * togo + FLY.TOUCHDOWN);
          const inAir = (rc().planets || []).some(p => p.hasAtmosphere && pos.distanceTo(p.center) < p.radius * 1.8);
          if (inAir) speed = Math.min(speed, FLY.AIR_SPEED);
          if (phase !== 'land' && (siteDir ? togo < FLY.SITE_ARRIVE_M : alt < FLY.APPROACH_ALT * 2)) phase = 'land';
          if (phase === 'land') {
            // a powered descent, straight down, drifting over the site
            const down = Math.max(FLY.TOUCHDOWN, alt * 0.3);
            vWant = up.clone().multiplyScalar(-down);
            if (side) vWant.add(side.multiplyScalar(FLY.SITE_GAIN).clampLength(0, FLY.SITE_MAX_DRIFT));
            vWant.add(tv);
          } else {
            vWant = toT.multiplyScalar(speed).add(tv);
          }
        }
        // a chute landing (a body with air, a parachute fitted): engines off
        // under its deploy height, the canopy opens and settles it down
        if (useChute && b.hasAtmosphere && (phase === 'land' || phase === 'chute') && alt < FLY.CHUTE_ALT) {
          if (phase !== 'chute') { phase = 'chute'; say(`chute landing on ${id}`); }
          throttleTo(0);
          thrustSwitch(false);
          if (!r.isChuteOpen()) hold('KeyP', !held.KeyP); else hold('KeyP', false);
          pointThrust(up);
          continue;
        }
        // the acceleration that reaches vWant, against gravity and the damping
        const a = vWant.clone().sub(v).multiplyScalar(FLY.KV).addScaledVector(v, FLY.LAMBDA).sub(grav);
        if (phase === 'land' && alt < FLY.UPRIGHT_ALT) {
          // stay upright for touchdown: lean at most a little off the local up
          const lat = a.clone().addScaledVector(up, -a.dot(up));
          const vert = Math.max(a.dot(up), 0.1 * maxA);
          if (lat.length() > 0.3 * vert) lat.setLength(0.3 * vert);
          a.copy(up).multiplyScalar(vert).add(lat);
        }
        const along = a.length();
        const dir = along > 1e-6 ? a.clone().divideScalar(along) : up.clone();
        const off = pointThrust(dir);
        let thr = Math.min(1, along / maxA);
        if (off > FLY.OFF_AXIS_CUT) thr = 0;
        else thr *= Math.cos(off);
        // the active stage ran dry with more above it: drop it (N)
        const si = r.getStageInfo();
        if (si.count > 1 && si.activeFuel <= 0.01) {
          if (!held.KeyN) { hold('KeyN', true); say(`stage ${si.count} spent - staging`); } else hold('KeyN', false);
        } else if (held.KeyN) hold('KeyN', false);
        if (r.getFuelUnits() <= 0) return 'fuel';
        thrustSwitch(true);
        throttleTo(thr);
        if (now - logAt > 3000) {
          logAt = now;
          st.task = `${phase} ${id}: alt ${alt.toFixed(0)} m, ${v.clone().sub(tv).length().toFixed(0)} m/s, fuel ${r.getFuelPercent().toFixed(0)}%`;
          st.flight = { phase, alt: +alt.toFixed(1), speed: +v.clone().sub(tv).length().toFixed(1), fuel: +r.getFuelPercent().toFixed(1), off: +off.toFixed(2), thr: +r.getThrottle().toFixed(2), state: s };
        }
      }
    } finally {
      releaseFlight();
      const r = rc();
      if (r && r.isThrustOn()) { key('Space', true); await new Promise(q => setTimeout(q, 80)); key('Space', false); }
    }
  }

  // ---- rockets on the ground ----------------------------------------------
  // Fuel items and the units each gives (ROCKET_CONFIG.FUEL_SOURCES)
  let FUEL_SOURCES = null;
  async function fuelTable() {
    if (!FUEL_SOURCES) FUEL_SOURCES = (await import(`${BASE}/config/RocketConfig.ts`)).ROCKET_CONFIG.FUEL_SOURCES;
    return FUEL_SOURCES;
  }
  async function fuelUnitsHeld() {
    return (await fuelTable()).reduce((n, s) => n + count(s.itemType) * s.units, 0);
  }
  // Gather fuel items worth `units`: rocket fuel if it can be made here, else water buckets
  // buckets kept going round for fuel (refuelling hands each one back empty)
  const FUEL_BUCKETS = 8;
  async function gatherFuel(units) {
    if (await fuelUnitsHeld() >= units) return true;
    const noIce = [I.ROCKET_FUEL, I.ICE].some(x => (st.unknown || []).includes(x));
    if (!noIce) {
      st.task = 'making rocket fuel';
      await obtain(I.ROCKET_FUEL, count(I.ROCKET_FUEL) + 1);
      return await fuelUnitsHeld() >= units;
    }
    const want = Math.ceil((units - (await fuelUnitsHeld())) / 15);
    // four buckets go round: refuelling hands the empty bucket back
    const buckets = Math.min(FUEL_BUCKETS, want);
    if (count(I.BUCKET) + count(I.WATER_BUCKET) < buckets) { await obtain(I.BUCKET, buckets - count(I.WATER_BUCKET)); return false; }
    if (count(I.BUCKET) === 0) return true;
    st.task = 'filling buckets with water for fuel';
    await fillBucket();
    return await fuelUnitsHeld() >= units;
  }
  function padCentre(pad) { return blockTop(pad.centerTileIndex, P().groundDepthOf(pad.centerTileIndex)); }
  // Open the pad's panel: right-click the top of a ring hex (the centre one
  // has the rocket standing on it and the tower hex the tower)
  async function openPad(pad) {
    const ui = bi().launchPadUI;
    if (ui.isMenuOpen() && ui.getCurrentLaunchPad() === pad) return ui;
    const ring = [...pad.placedTiles].filter(t => t !== pad.rocketTileIndex && t !== pad.towerTileIndex);
    const pos = player().position;
    const tops = ring.map(t => blockTop(t, P().groundDepthOf(t))).sort((a, b) => a.distanceTo(pos) - b.distanceTo(pos));
    if (!tops.length) { say('the launch pad has no free ring hex to open it by'); return null; }
    await approach(tops[0], 2.5);
    // aim points: the ring hexes' tops, then the rocket's own hull (a click
    // on the rocket or the tower opens its pad too)
    const c = padCentre(pad), up = upAt(c);
    const aims = tops.slice(0, 4).map(t => t.clone().addScaledVector(upAt(t), -0.05))
      .concat([1.5, 3].map(h => c.clone().addScaledVector(up, h)));
    for (const aim of aims) {
      closeMenus(); selectEmptyHand();
      await lookAtPoint(aim, 0.03, 2500);
      await click(2, 80);
      await sleep(600);
      if (ui.isMenuOpen() && ui.getCurrentLaunchPad() === pad) return ui;
      if (ui.isMenuOpen()) ui.close();
    }
    say('could not open the launch pad'); closeMenus();
    return null;
  }
  // The pad's fuel units and capacity
  async function padFuel(pad) {
    const { computeRocketStats } = await import(`${BASE}/rocket/RocketPerformance.ts`);
    const cap = computeRocketStats(pad.rocketParts.map(p => p.itemType)).fuelCapacity;
    return { have: pad.fuel ?? cap, cap };
  }
  // Load items into the cargo hold of the pad's rocket (through the cargo panel)
  async function loadCargo(pad, items) {
    const ui = await openPad(pad);
    if (!ui) return false;
    ui.cargoBtn.click();
    await sleep(500);
    return await moveIntoStorage(pad.cargo, items);
  }
  // Choose the rocket to fly: our own pad's first, else any finished pad with a rocket nearby
  function rocketPad() {
    const lp = bi().launchPadManager;
    let mySites = [];
    try { mySites = JSON.parse(localStorage.getItem('bot_padSites') || '[]'); } catch {}
    // a rocket standing on the pad that may fly (its stack passes the rules)
    const away = new Set(fm().getLandedRocketManager().getAllLandedRockets().map(r => r.pad).filter(Boolean));
    const pads = lp.getLaunchPads().filter(p => p.isComplete && p.rocketParts.length > 0 && !padUnderwater(p) && !away.has(p) && STACK_OK(p.rocketParts.map(q => q.itemType)));
    const pos = player().position;
    const d = (p) => padCentre(p).distanceTo(pos);
    const mine = pads.filter(p => [...p.hexes.keys()].some(t => mySites.includes(t)));
    return (mine.length ? mine : pads).sort((a, b) => d(a) - d(b))[0] || null;
  }
  // Fuel the pad's rocket full, from what the bot carries
  async function fuelPad(pad) {
    let { have, cap } = await padFuel(pad);
    if (have >= cap - 0.5) return true;
    if (!(await gatherFuel(Math.min(cap - have, FUEL_BUCKETS * 15)))) return false;
    const ui = await openPad(pad);
    if (!ui) return false;
    ui.refuelBtn.click();
    await sleep(500);
    closeMenus();
    const after = (await padFuel(pad)).have;
    say(`fuelled the rocket: ${have.toFixed(0)} -> ${after.toFixed(0)} of ${cap}`);
    return after >= cap - 0.5;
  }
  async function boardPad(pad) {
    const ui = await openPad(pad);
    if (!ui) return false;
    ui.boardRocketBtn.click();
    await sleep(2500);
    if (!fm().isInFlight()) { say('could not board the rocket'); closeMenus(); return false; }
    return true;
  }
  async function climbOut() {
    await sleep(800);
    if (fm().isInFlight()) { key('KeyV', true); await sleep(150); key('KeyV', false); }
    await sleep(1500);
    holdLock();
  }
  async function cargoFuelUnits(cargo) {
    const t = await fuelTable();
    return (cargo || []).reduce((n, s) => n + (s && s.itemType ? (t.find(f => f.itemType === s.itemType)?.units || 0) * s.quantity : 0), 0);
  }
  // The parked rocket nearest the bot on this body
  function nearestLanded() {
    const list = fm().getLandedRocketManager().getAllLandedRockets();
    const pos = player().position;
    return list.slice().sort((a, b) => a.position.distanceTo(pos) - b.position.distanceTo(pos))[0] || null;
  }
  // Open a parked rocket's panel: from the surface beside it (a rocket can't
  // be clicked through rock), looking at its hull at a few heights
  async function openLanded(rocket) {
    const ui = fm().landedRocketUI;
    if (feetDepth() < surfaceDepth() - 1) await toSurface();
    await approach(rocket.position, 4);
    for (const h of [1.5, 0.8, 2.5, 3.5]) {
      closeMenus(); selectEmptyHand();
      const at = rocket.position.clone().addScaledVector(upAt(rocket.position), h);
      await lookAtPoint(at, 0.03, 1500);
      await click(2, 80);
      await sleep(500);
      if (ui.isUIOpen() && ui.getCurrentRocket() === rocket) return ui;
      if (ui.isUIOpen()) try { ui.close(); } catch {}
    }
    say(`could not open the parked rocket (${rocket.position.distanceTo(player().position).toFixed(1)} m away, depth ${feetDepth()} / surface ${surfaceDepth()})`);
    closeMenus();
    await sleep(1000);
    return null;
  }
  // The rocket to fly from here, as fuel / cargo / load / board steps
  const CRAFT_NEAR_M = 150;
  function homeCraft() {
    // an upgraded (staged) rocket standing on our pad comes first
    // the staged rocket with the most fuel aboard (don't fill a second one)
    const away = new Set(fm().getLandedRocketManager().getAllLandedRockets().map(r => r.pad).filter(Boolean));
    const up = bi().launchPadManager.getLaunchPads()
      .filter(p => p.isComplete && !away.has(p) && !padUnderwater(p) && isUpgraded(p.rocketParts.map(q => q.itemType)))
      .sort((a, b) => (b.fuel ?? 0) - (a.fuel ?? 0))[0];
    if (up) {
      return { pad: up, cargo: () => up.cargo, fuel: () => fuelPad(up), load: (items) => loadCargo(up, items), board: () => boardPad(up) };
    }
    const lr = nearestLanded();
    if (lr && lr.position.distanceTo(player().position) < CRAFT_NEAR_M) {
      return {
        cargo: () => lr.cargo,
        fuel: async () => {
          if (lr.fuelPercent >= 99.5) return true;
          if (!(await gatherFuel(25))) return false;
          const ui = await openLanded(lr);
          if (!ui) return false;
          const before = lr.fuelPercent;
          ui.container.querySelector('.refuel-btn').click();
          await sleep(400);
          say(`fuelled the parked rocket: ${before.toFixed(0)}% -> ${lr.fuelPercent.toFixed(0)}%`);
          ui.close();
          return lr.fuelPercent >= 99.5;
        },
        load: async (items) => {
          const ui = await openLanded(lr);
          if (!ui) return false;
          ui.container.querySelector('.cargo-btn').click();
          await sleep(500);
          return await moveIntoStorage(lr.cargo, items);
        },
        board: async () => {
          const ui = await openLanded(lr);
          if (!ui) return false;
          ui.boardButton.click();
          await sleep(2500);
          if (!fm().isInFlight()) { say('could not board the parked rocket'); return false; }
          return true;
        },
      };
    }
    const pad = rocketPad();
    if (!pad) return null;
    return { pad, cargo: () => pad.cargo, fuel: () => fuelPad(pad), load: (items) => loadCargo(pad, items), board: () => boardPad(pad) };
  }
  // Move every stack of `items` from the inventory into the open storage panel showing `slots`
  async function moveIntoStorage(slots, items) {
    const sui = bi().storageUI;
    if (!sui.isMenuOpen()) { say('could not open the cargo hold'); closeMenus(); return false; }
    let moved = 0;
    for (const item of items) {
      for (const [i, s] of inv().getAllSlots().entries()) {
        if (s.itemType !== item || !s.quantity) continue;
        const slot = slots.findIndex(x => !x.itemType || !x.quantity);
        if (slot < 0) break;
        sui.transferFromInventory(i, slot);
        moved++;
        await sleep(80);
      }
    }
    closeMenus();
    say(`loaded ${moved} stack(s) into the cargo hold`);
    return true;
  }
  // Only the cargo hold flies: boarding a parked rocket puts what the bot
  // carries into its hold, or is refused if it doesn't fit. Leave the blocks
  // dug up here behind (built into the ground) before boarding.
  async function dumpJunk(rocket, maxMs) {
    const keep = alwaysKeep();
    const t0 = performance.now();
    // one stack of building blocks stays: it is how the bot climbs out of a
    // pit (pillarUpTo) - without it, it died in its own hole on the Moon
    const placeable = inv().getAllSlots().filter(x => x.itemType && x.quantity && !keep.has(x.itemType) && B[itemName(x.itemType)] !== undefined);
    const pillarType = placeable.sort((a, b) => b.quantity - a.quantity)[0]?.itemType;
    const junk = () => inv().getAllSlots().filter(x => x.itemType && x.quantity && !keep.has(x.itemType) && B[itemName(x.itemType)] !== undefined
      && !(x.itemType === pillarType && count(pillarType) <= GENTLE.KEEP_BLOCKS));
    if (!junk().length) return;
    st.task = 'leaving the dug-up rock behind';
    let placed = 0;
    while (junk().length && performance.now() - t0 < maxMs) {
      const it = junk()[0].itemType, before = count(it);
      await placeNearby(it);
      if (count(it) >= before) break;   // nowhere to put it
      placed++;
    }
    if (placed) say(`left ${placed} dug-up blocks behind before boarding`);
  }
  // Back home: take what boarding left in the pad's stash
  async function takeStashBack() {
    let tile = st.stashPad;
    if (tile == null) { try { tile = +localStorage.getItem('bot_stashPad'); } catch {} }
    if (!tile) return false;
    const pad = bi().launchPadManager.getLaunchPads().find(p => p.centerTileIndex === tile);
    if (!pad || !(pad.stash || []).some(x => x.itemType && x.quantity)) { st.stashPad = null; try { localStorage.removeItem('bot_stashPad'); } catch {} return false; }
    const ui = await openPad(pad);
    if (!ui) return false;
    const was = (pad.stash || []).filter(x => x.itemType && x.quantity).length;
    ui.takeStashBtn.click();
    await sleep(400);
    closeMenus();
    const left = (pad.stash || []).filter(x => x.itemType && x.quantity).length;
    if (left === was) { st.stashPad = null; return false; }   // nothing fits: leave it for now
    say(`took my things back from the pad's stash${left ? ` (${left} stacks did not fit)` : ''}`);
    if (!left) { st.stashPad = null; try { localStorage.removeItem('bot_stashPad'); } catch {} }
    return true;
  }
  // Breath: with no suit on an airless world the bot has AIR.BREATH_S; it
  // heads back to the cabin while it still has time to walk there
  const BREATH_RESERVE_S = 40, WALK_M_PER_S = 2, CLIMB_S_PER_BLOCK = 3;
  function breathLow() {
    const air = g().air;
    if (!air || fm().isInFlight()) return false;
    const s = air.getState();
    if (s.worn && s.tankS > BREATH_RESERVE_S) return false;
    const r = nearestLanded();
    // the walk back, and the climb out of any pit it is mining in
    const walk = (r ? r.position.distanceTo(player().position) / WALK_M_PER_S : 0) + Math.max(0, surfaceDepth() - feetDepth()) * CLIMB_S_PER_BLOCK;
    return s.breathS < BREATH_RESERVE_S + walk;
  }
  async function restInCabin() {
    const rocket = nearestLanded();
    if (!rocket) return;
    st.task = 'back to the rocket for air';
    await dumpJunk(rocket, 20000);
    const ui = await openLanded(rocket);
    if (!ui) return;
    ui.boardButton.click();
    await sleep(2000);
    if (!fm().isInFlight()) { say('could not get into the rocket for air'); return; }
    const t0 = performance.now();
    while (performance.now() - t0 < 60000 && g().air.getState().breathS < 85) await sleep(1000);
    say(`caught its breath in the cabin (${g().air.getState().breathS.toFixed(0)} s)`);
    await climbOut();
  }
  // Out of fuel in flight: chute out where there is air, and ride it down
  async function rideDown() {
    say('out of fuel - riding it down');
    st.task = 'out of fuel, falling';
    if (rc() && rc().getAtmosphereDensity() > 0 && !rc().isChuteOpen()) { key('KeyP', true); await sleep(150); key('KeyP', false); }
    const t0 = performance.now();
    while (performance.now() - t0 < 5 * 60 * 1000 && fm().isInFlight() && rc() && !['LANDED', 'CRASHED'].includes(rc().getState())) await sleep(1000);
    const s = rc() ? rc().getState() : 'gone';
    say(`came down without fuel: ${s}`);
    if (s === 'LANDED') { st.flyingTo = null; await climbOut(); }
    else await sleep(5000);
  }
  // A launch window: the target must be on the near side of the body we
  // leave from (going round it burns the tank - a basic rocket ran dry so)
  const WINDOW_MIN_DOT = 0.2, WINDOW_WAIT_MS = 20 * 60 * 1000;
  // Only a strong pull makes the way round costly: off a light body (the
  // Moon) the rocket climbs out and goes round for little fuel
  const WINDOW_MIN_GRAVITY = 0.5;
  function launchWindowOpen(target) {
    const lrm = fm().getLandedRocketManager();
    const from = (lrm.planets || []).find(p => p.id === bodyId());
    if (from && from.gravityStrength < WINDOW_MIN_GRAVITY) return true;
    const here = P().center;
    const tc = getTargetCentre(target);
    if (!tc) return true;
    const at = fm().isInFlight() && rc() ? rc().getPosition() : player().position;
    const up = at.clone().sub(here).normalize();
    return tc.clone().sub(at).normalize().dot(up) >= WINDOW_MIN_DOT;
  }
  function getTargetCentre(id) {
    const lrm = fm().getLandedRocketManager();
    const b = (lrm.planets || []).find(p => p.id === id);
    return b ? b.center : null;
  }
  // Where to land at home: beside the nearest launch pad (dry, flat, and
  // where the stash and the next rocket are), else where it took off from
  const HOME_SITE_OFFSET_M = 12, HOME_PAD_SEARCH_M = 400;
  function rememberHomeSite() {
    const c = P().center;
    const pads = bi().launchPadManager.getLaunchPads().filter(p => p.isComplete);
    const pos = player().position;
    const near = pads.map(p => padCentre(p)).filter(q => q.distanceTo(pos) < HOME_PAD_SEARCH_M).sort((a, b) => a.distanceTo(pos) - b.distanceTo(pos))[0];
    let spot = pos.clone();
    if (near) {
      const up = near.clone().sub(c).normalize();
      const side = new (T().Vector3)(1, 0, 0).cross(up).normalize();
      spot = near.clone().addScaledVector(side, HOME_SITE_OFFSET_M);
    }
    st.homeSite = spot.sub(c).normalize().toArray();
    try { localStorage.setItem('bot_homeSite', JSON.stringify(st.homeSite)); } catch {}
  }
  function homeSite() {
    if (!st.homeSite) try { st.homeSite = JSON.parse(localStorage.getItem('bot_homeSite') || 'null'); } catch {}
    return st.homeSite ? new (T().Vector3)().fromArray(st.homeSite) : null;
  }
  // Fuel units a trip home from `from` needs, with a margin (measured flights)
  const RETURN_FUEL = { moon: 60 };
  // A visit: fly to `target`, land, plant a survey beacon, gather what's
  // there, fly home and land
  async function visitBody(target, home = 'earth') {
    const here = bodyId();
    const m = tracker().openMissions().find(x => x.visit === target);
    const prog = m ? tracker().progress(m) : [];
    const beaconLeft = m ? m.objectives.some((o, i) => o.kind === 'surveyed' && (prog[i] || 0) < o.count) : false;
    const needChute = m ? m.objectives.some((o, i) => o.kind === 'chuteLanded' && (prog[i] || 0) < o.count) : false;
    if (fm().isInFlight()) {
      // aboard (a restart mid-flight): finish the leg we were on
      const to = st.flyingTo || (here === target ? home : target);
      if (rc() && rc().getFuelUnits() <= 0) { await rideDown(); return; }
      const res = await flyTo(to, to === home ? homeSite() : null);
      say(`flight to ${to}: ${res}`);
      if (res === 'landed') { st.flyingTo = null; await climbOut(); }
      return;
    }
    if (here !== target) {
      // at home: beacon, fuel, the fuel home in the cargo hold
      if (beaconLeft && count(I.SURVEY_BEACON) < 1) { st.task = 'making a survey beacon'; await obtain(I.SURVEY_BEACON, 1); return; }
      // the craft: a rocket parked on this world near by (one that came back
      // lands beside its pad, not on it), else a rocket standing on a pad
      const craft = homeCraft();
      if (!craft) {
        // none fit to fly. A trip for a resource can't wait for the better
        // rocket that resource builds: put a basic one on an empty pad
        if (st.expedition && padHere() && padHere().rocketParts.length === 0) {
          say('no rocket to fly - building a basic one for the trip');
          const r = await upgradeRocket([I.ROCKET_ENGINE, I.MEDIUM_FUEL_TANK, I.COMMAND_MODULE]);
          if (r !== false) return;
        }
        // none fit to fly (the pad rebuild runs from the loop): rest this trip, don't spin
        say('no rocket to fly - building one first');
        st.rest = st.rest || {}; st.rest[m ? m.id : target] = Date.now() + 5 * 60 * 1000;
        delete st.rest.upgrade;
        await sleep(2000);
        return;
      }
      if (!(await craft.fuel())) return;
      const need = RETURN_FUEL[target] || 100;
      const inHold = await cargoFuelUnits(craft.cargo());
      if (inHold < need) {
        if (!(await gatherFuel(need - inHold))) return;
        await craft.load((await fuelTable()).map(f => f.itemType));
        return;
      }
      say(`rocket fuelled, ${inHold.toFixed(0)} units of fuel in the hold - boarding`);
      if (!launchWindowOpen(target)) { st.task = `waiting for ${target} to come round`; say(`${target} is behind this world - waiting for a launch window`); await sleep(30000); return; }
      rememberHomeSite();
      if (beaconLeft && count(I.SURVEY_BEACON) > 0 && !(craft.cargo() || []).some(x => x.itemType === I.SURVEY_BEACON)) {
        await craft.load([I.SURVEY_BEACON]);
        return;
      }
      if (needChute && craft.pad && !(craft.pad.equipment || []).some(x => x.itemType === I.PARACHUTE && x.quantity)) {
        if (count(I.PARACHUTE) < 1) { st.task = 'getting a parachute'; await obtain(I.PARACHUTE, 1); return; }
        const ui = await openPad(craft.pad);
        if (!ui) return;
        const slot = inv().getAllSlots().findIndex(x => x.itemType === I.PARACHUTE && x.quantity);
        if (slot >= 0 && ui.fitFromInventory(slot)) say('fitted a parachute to the rocket');
        closeMenus();
        return;
      }
      if (craft.pad) { st.stashPad = craft.pad.centerTileIndex; try { localStorage.setItem('bot_stashPad', String(st.stashPad)); } catch {} }
      if (!(await craft.board())) return;
      st.flyingTo = target;
      const res = await flyTo(target, null, needChute);
      say(`flight to ${target}: ${res}${rc() ? `, fuel left ${rc().getFuelPercent().toFixed(0)}%` : ''}`);
      if (res === 'landed') { st.flyingTo = null; await climbOut(); }
      return;
    }
    // on the target body
    if (beaconLeft && count(I.SURVEY_BEACON) === 0) {
      // it flew in the cargo hold (only the hold flies)
      const lr = nearestLanded();
      if (lr && (lr.cargo || []).some(x => x.itemType === I.SURVEY_BEACON && x.quantity)) {
        const ui = await openLanded(lr);
        if (ui) {
          ui.container.querySelector('.cargo-btn').click();
          await sleep(500);
          const sui = bi().storageUI;
          if (sui.isMenuOpen()) for (let i = 0; i < lr.cargo.length; i++) if (lr.cargo[i].itemType === I.SURVEY_BEACON) { sui.handleShiftClick(i); await sleep(80); }
          closeMenus();
        }
      }
    }
    if (beaconLeft && count(I.SURVEY_BEACON) > 0) {
      await placeNearby(I.SURVEY_BEACON);
      return;
    }
    // what it came for (the bot holds its breath: AIR.BREATH_S, and rests in the cabin)
    const ex = st.expedition;
    if (ex && ex.body === target && count(ex.item) < ex.n) {
      if (breathLow()) { await restInCabin(); return; }
      st.task = `mining ${itemName(ex.item)} on ${target}`;
      st.abortIf = breathLow;
      try { await obtain(ex.item, ex.n); } finally { st.abortIf = null; st.inAbort = false; }
      return;
    }
    if (ex && ex.body === target) { say(`got the ${itemName(ex.item)} it came for (${count(ex.item)})`); st.expedition = null; }
    const rocket = nearestLanded();
    if (!rocket) { say(`no rocket here on ${target} - stranded`); await wander(); return; }
    await dumpJunk(rocket, 120000);
    const ui = await openLanded(rocket);
    if (!ui) return;
    ui.container.querySelector('.refuel-btn').click();
    await sleep(400);
    say(`parked rocket fuel ${rocket.fuelPercent.toFixed(0)}% - boarding for home`);
    ui.boardButton.click();
    await sleep(2500);
    if (!fm().isInFlight()) { say('could not board the parked rocket'); return; }
    // wait for the window in the cabin, where there is air
    if (!launchWindowOpen(home)) say(`${home} is behind this world - waiting in the cabin for a launch window`);
    const w0 = performance.now();
    while (!launchWindowOpen(home) && performance.now() - w0 < WINDOW_WAIT_MS) { st.task = `waiting for ${home} to come round`; await sleep(5000); }
    st.flyingTo = home;
    const res = await flyTo(home, homeSite());
    say(`flight to ${home}: ${res}${rc() ? `, fuel left ${rc().getFuelPercent().toFixed(0)}%` : ''}`);
    if (res === 'landed') { st.flyingTo = null; await climbOut(); }
  }
  const bodyId = () => { const p = planet(); return p ? bi().getPlanetId(p) : null; };

  // ---- upgrading the rocket ------------------------------------------------
  // Stacks to build, best first (bottom to top). Only the lowest stage fires,
  // so the booster alone must lift the whole stack: two basic engines under
  // the vacuum stage (liftoff TWR 1.28, ~2965 m/s; one engine gives 0.8).
  const UPGRADE_STACKS = () => [
    // one engine per stage, at its bottom: a Rocket Engine booster under a
    // vacuum stage - when the frame mass lets it lift off (it didn't, 0.97)
    [I.ROCKET_ENGINE, I.MEDIUM_FUEL_TANK, I.STAGE_SEPARATOR, I.VACUUM_ENGINE, I.MEDIUM_FUEL_TANK, I.COMMAND_MODULE],
    // the vacuum engine alone on a medium tank: TWR 1.24 off Earth, ~1100 m/s (twice the basic rocket)
    [I.VACUUM_ENGINE, I.MEDIUM_FUEL_TANK, I.COMMAND_MODULE],
  ];
  // a better rocket than the basic one: a valid stack with a vacuum engine
  const isUpgraded = (types) => types.includes(I.VACUUM_ENGINE) && STACK_OK(types);
  const MIN_LIFT_TWR = 1.05;
  async function liftTWR(stack) {
    const perf = await import(`${BASE}/rocket/RocketPerformance.ts`);
    const cfg = (await import(`${BASE}/config/RocketConfig.ts`)).ROCKET_CONFIG;
    const all = perf.computeRocketStats(stack);
    const wet = all.dryMass + all.fuelCapacity * cfg.FUEL_KG_PER_UNIT;
    const g0 = (await import(`${BASE}/config/PlayerConfig.ts`)).PlayerConfig.BASE_GRAVITY;
    return perf.stagedStats(stack).stages[0].thrust / (wet * g0);
  }
  // A pad of ours whose rocket stands on it (not flown off and parked elsewhere)
  function padHere() {
    const away = new Set(fm().getLandedRocketManager().getAllLandedRockets().map(r => r.pad).filter(Boolean));
    let mySites = [];
    try { mySites = JSON.parse(localStorage.getItem('bot_padSites') || '[]'); } catch {}
    const pos = player().position;
    const pads = bi().launchPadManager.getLaunchPads()
      // a rocket standing on it, or an empty pad with a tower to build one on
      .filter(p => p.isComplete && !away.has(p) && (p.rocketParts.length > 0 || p.segmentCount > 0) && !padUnderwater(p))
      .sort((a, b) => padCentre(a).distanceTo(pos) - padCentre(b).distanceTo(pos));
    // ours first, else the nearest (a player built one for the bots)
    return pads.find(p => [...p.hexes.keys()].some(t => mySites.includes(t))) || pads[0] || null;
  }
  // A pad on the sea floor (built there, or flooded): no one walks up to it
  function padUnderwater(pad) {
    const p = P();
    return [...pad.placedTiles].some(t => p.getBlock(t, p.groundDepthOf(t) + 1) === B.WATER || p.getBlock(t, p.groundDepthOf(t) + 2) === B.WATER);
  }
  async function upgradeRocket(only = null) {
    const pad = padHere();
    if (!pad) { say('no pad of mine with its rocket on it to upgrade'); return false; }
    let target = null;
    for (const st2 of (only ? [only] : UPGRADE_STACKS())) if (await liftTWR(st2) >= MIN_LIFT_TWR) { target = st2; break; }
    if (!target) { say('no upgrade stack lifts off here'); return false; }
    const have = pad.rocketParts.map(p => p.itemType);
    let keep = 0;
    while (keep < have.length && keep < target.length && have[keep] === target[keep]) keep++;
    if (keep === target.length && have.length === target.length) return true;
    // the parts still to add, beyond what stays on the pad
    const need = {};
    for (const t of target.slice(keep)) need[t] = (need[t] || 0) + 1;
    for (const t of have.slice(keep)) need[t] = (need[t] || 0) - 1;   // coming off, back to the bag
    for (const [t, n] of Object.entries(need)) {
      if (n > 0 && count(+t) < n) { st.task = `getting ${itemName(+t)} for the upgrade`; say(`getting ${n} ${itemName(+t)} for the upgrade (have ${count(+t)})`); if (!(await obtain(+t, n))) return 'working'; }
    }
    const height = target.reduce((h, t) => h + (ITEM_DATA[t]?.rocketPart?.heightUnits || 1), 0);
    if (pad.segmentCount < height && count(I.LAUNCH_PAD_SEGMENT) < height - pad.segmentCount) {
      if (!(await obtain(I.LAUNCH_PAD_SEGMENT, height - pad.segmentCount))) return 'working';
    }
    let ui = await openPad(pad);
    if (!ui) return false;
    st.task = 'upgrading the rocket';
    while (pad.segmentCount < height && count(I.LAUNCH_PAD_SEGMENT) > 0) {
      const h = pad.segmentCount;
      ui.handleSegmentSlotClick(h);
      await sleep(300);
      if (pad.segmentCount === h) break;
    }
    // a part with cargo in its hold won't come off: empty the hold first
    if ((pad.cargo || []).some(x => x.itemType && x.quantity)) {
      ui.cargoBtn.click();
      await sleep(500);
      const sui = bi().storageUI;
      if (sui.isMenuOpen()) {
        for (let i = 0; i < pad.cargo.length; i++) if (pad.cargo[i].itemType && pad.cargo[i].quantity) { sui.handleShiftClick(i); await sleep(80); }
        say('emptied the cargo hold for the refit');
      }
      closeMenus();
      ui = await openPad(pad);
      if (!ui) return false;
    }
    // take off the parts above what stays (the top one each click)
    // through the pad editor's own stack operations (what dragging parts does)
    while (pad.rocketParts.length > keep) {
      if (!(await ui.applyStackOp({ kind: 'remove', index: pad.rocketParts.length - 1 }))) { say('the pad would not give up its top part'); closeMenus(); return false; }
      await sleep(200);
    }
    for (const t of target.slice(keep)) {
      if (count(t) < 1 || !(await ui.applyStackOp({ kind: 'addTop', itemType: t }))) { say(`the pad would not take the ${itemName(t)}`); closeMenus(); return false; }
      await sleep(200);
    }
    closeMenus();
    say(`upgraded the rocket: ${target.map(itemName).join(' / ')} (liftoff TWR ${(await liftTWR(target)).toFixed(2)})`);
    return true;
  }

  const PLAYBOOK = {
    upgrade: async () => {
      const r = await upgradeRocket();
      if (r === true) st.upgraded = true;
      else if (r === false) { st.rest = st.rest || {}; st.rest.upgrade = Date.now() + 5 * 60 * 1000; }
    },
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
    // A launch pad: a pad block on a centre tile and one on each of its six
    // neighbours, on free, dry, level-ish ground
    pad: async () => {
      const p = P();
      await toSurface();
      const lp = bi().launchPadManager;
      const padTiles = new Set(lp.getLaunchPads().flatMap(pad => [...pad.hexes.keys()]));
      let site = st.padSite;
      try { if (site == null) site = JSON.parse(localStorage.getItem('bot_padSite') || 'null'); } catch {}
      // a pad of ours left unfinished: finish it before starting another
      let mySites = [];
      try { mySites = JSON.parse(localStorage.getItem('bot_padSites') || '[]'); } catch {}
      if (site == null) {
        site = mySites.find(c => { const pad = lp.getLaunchPads().find(x => x.hexes.has(c)); return pad && !pad.isComplete; }) ?? null;
      }
      if (site === undefined || site === null) {
        const free = (t) => p.isTileLoaded(t) && isDryTile(t);
        // well clear of every other pad (touching one would join it, and pads
        // at different levels can't join)
        const nearPad = (c) => tilesWithin(c, 3).some(t => padTiles.has(t));
        site = tilesWithin(myTile(), 8).find(c => {
          if (!free(c) || nearPad(c)) return false;
          const g = p.groundDepthOf(c);
          const nb = neighbors(c);
          // exactly level: a pad block must sit level with the rest of its pad
          return nb.length === 6 && nb.every(t => free(t) && p.groundDepthOf(t) === g);
        });
        if (site === undefined) { say('no flat ground for a launch pad here - moving on'); await wander(); return; }
        st.padSite = site;
        try { localStorage.setItem('bot_padSite', JSON.stringify(site)); localStorage.setItem('bot_padSites', JSON.stringify([...mySites, site])); } catch {}
        say(`laying a launch pad round tile ${site}`);
      }
      const has = (t) => lp.getLaunchPads().some(pad => pad.hexes.has(t));
      // only as many pad blocks as this site still lacks
      const missing = [site, ...neighbors(site)].filter(t => !has(t)).length;
      if (count(I.LAUNCH_PAD_BLOCK) < missing) { await obtain(I.LAUNCH_PAD_BLOCK, missing); return; }
      // still level? (the ground may have been dug since) - else give the site up now
      const sg = p.groundDepthOf(site);
      // (the game takes a pad block within PAD_MAX_STEP = 1 of the pad's level)
      const unlevel = neighbors(site).find(t => !has(t) && Math.abs(p.groundDepthOf(t) - sg) > 1);
      if (unlevel !== undefined) {
        say(`the ground round tile ${site} is no longer level - choosing another site`);
        st.padSite = null;
        try { localStorage.removeItem('bot_padSite'); localStorage.setItem('bot_padSites', JSON.stringify(mySites.filter(x => x !== site))); } catch {}
        st.badPlace = (st.badPlace || []).concat([site]);
        return;
      }
      for (const t of [site, ...neighbors(site)]) {
        if (has(t)) continue;
        if (count(I.LAUNCH_PAD_BLOCK) < 1) return;
        // stand just outside the ring on this tile's side, so the line of
        // sight to its ground never grazes a pad block already laid
        let ok = false;
        for (let tries = 0; tries < 3 && !ok; tries++) {
          const tg = p.groundDepthOf(t);
          const centre = blockTop(site, p.groundDepthOf(site));
          const target = blockTop(t, tg);
          const up = upAt(target);
          let stand;
          if (tries < 2) {
            // outside the ring on this tile's side
            const out = t === site ? target.clone().sub(player().position).negate() : target.clone().sub(centre);
            out.addScaledVector(up, -out.dot(up)).normalize();
            stand = target.clone().addScaledVector(out, t === site ? 4.5 : 2.6 + tries);
          } else {
            // from the middle of the pad, looking down onto the tile's top
            stand = centre.clone();
          }
          await walkTo(stand, 0.8, 20000);
          closeMenus();
          if (!selectItem(I.LAUNCH_PAD_BLOCK)) return;
          await lookAtPoint(target, 0.03, 1500);
          // the block goes on the face the aim hits: only click when that's
          // this tile's top (from below, the aim hits its side and the block
          // lands on the neighbouring tile)
          const h = rayHit();
          if (!h || h.tileIndex !== t || h.depth !== tg || h.prevTileIndex !== t) continue;
          await click(2, 80);
          await sleep(900);
          closeMenus();   // a click on a pad opens its panel
          ok = has(t);
        }
        if (ok) { say(`pad block laid on tile ${t}`); continue; }
        // try that block again on the next pass; give the site up only after a few rounds
        st.padFails = st.padFails || {};
        st.padFails[t] = (st.padFails[t] || 0) + 1;
        if (st.padFails[t] < 4) { say(`pad block on tile ${t} would not go down - trying again`); await wander(); return; }
        say(`could not lay the pad at tile ${site} - choosing another site`);
        st.padSite = null;
        try { localStorage.removeItem('bot_padSite'); localStorage.setItem('bot_padSites', JSON.stringify(mySites.filter(x => x !== site))); } catch {}
        return;
      }
    },
    // Build the rocket on our own finished launch pad: tower segments as tall
    // as the stack, then engine, fuel tank and command module, bottom up -
    // through the pad panel (what dragging a part onto the tower does)
    assemble: async () => {
      const parts = [I.ROCKET_ENGINE, I.MEDIUM_FUEL_TANK, I.COMMAND_MODULE];
      for (const it of parts) if (count(it) < 1 && !(await obtain(it, 1))) return;
      const lp = bi().launchPadManager;
      let mySites = [];
      try { mySites = JSON.parse(localStorage.getItem('bot_padSites') || '[]'); } catch {}
      const pos = player().position;
      const pad = lp.getLaunchPads()
        .filter(p => p.isComplete && p.rocketParts.length === 0 && [...p.hexes.keys()].some(t => mySites.includes(t)))
        .sort((a, b) => a.mesh.getWorldPosition(new (T().Vector3)()).distanceTo(pos) - b.mesh.getWorldPosition(new (T().Vector3)()).distanceTo(pos))[0];
      if (!pad) { say('no finished launch pad of my own to build on'); st.unknown = (st.unknown || []).concat([I.LAUNCH_PAD_BLOCK]); return; }
      const P0 = P();
      const centre = blockTop(pad.centerTileIndex, P0.groundDepthOf(pad.centerTileIndex));
      const need = parts.length;   // each part is one height unit
      if (pad.segmentCount < need && count(I.LAUNCH_PAD_SEGMENT) < need - pad.segmentCount) {
        if (!(await obtain(I.LAUNCH_PAD_SEGMENT, need - pad.segmentCount))) return;
      }
      st.task = 'building the rocket';
      await approach(centre, 3);
      closeMenus(); selectEmptyHand();
      await aimAtMachine(centre.clone().addScaledVector(upAt(centre), 0.2)); selectEmptyHand();
      await click(2, 80);
      await sleep(600);
      const ui = bi().launchPadUI;
      if (!ui.isMenuOpen()) { say('could not open the launch pad'); closeMenus(); return; }
      while (pad.segmentCount < need && count(I.LAUNCH_PAD_SEGMENT) > 0) {
        const h = pad.segmentCount;
        ui.handleSegmentSlotClick(h);
        await sleep(300);
        if (pad.segmentCount === h) break;
      }
      for (const it of parts) {
        if (pad.rocketParts.some(r => r.itemType === it) || count(it) < 1) continue;
        if (await ui.applyStackOp({ kind: 'addTop', itemType: it })) say(`added ${itemName(it)} to the rocket`);
        else say(`the pad would not take the ${itemName(it)}`);
        await sleep(400);
      }
      closeMenus();
    },
    // Launch: board our rocket from its pad panel, thrust on (Space), throttle
    // up (hold X) until it lifts off; then a short hop - thrust off, parachute
    // (P), wait for the ground, climb out (V)
    moon: async () => { await visitBody('moon'); },
    sequoia: async () => { await visitBody('sequoia'); },
    shear: async () => { await shearSheep(4); },
    moonmetal: async () => { await generic(tracker().openMissions().find(x => x.id === 'moonmetal')); },
    launch: async () => {
      const lp = bi().launchPadManager;
      let mySites = [];
      try { mySites = JSON.parse(localStorage.getItem('bot_padSites') || '[]'); } catch {}
      const pad = lp.getLaunchPads().find(p => p.rocketParts.length > 0 && [...p.hexes.keys()].some(t => mySites.includes(t)));
      if (!pad) { say('no rocket of my own on a pad'); st.cannot = (st.cannot || []).concat(['launch']); return; }
      const centre = blockTop(pad.centerTileIndex, P().groundDepthOf(pad.centerTileIndex));
      st.task = 'boarding the rocket';
      await approach(centre, 3);
      closeMenus(); selectEmptyHand();
      await aimAtMachine(centre.clone().addScaledVector(upAt(centre), 0.2)); selectEmptyHand();
      await click(2, 80);
      await sleep(600);
      const ui = bi().launchPadUI;
      if (!ui.isMenuOpen()) { say('could not open the launch pad'); closeMenus(); return; }
      ui.handleBoardRocket();
      await sleep(2500);
      const fm = g().rocketFlightManager;
      if (!fm || !fm.isInFlight()) { say('could not board the rocket'); closeMenus(); return; }
      say('aboard - thrust on, throttle up');
      const rc = () => fm.getRocketController();
      await tap('Space', 120);                       // thrust on
      key('KeyX', true);                              // throttle up
      const t0 = performance.now();
      while (performance.now() - t0 < 12000 && rc() && rc().getState() !== 'LAUNCHING' && rc().getState() !== 'IN_FLIGHT') await sleep(200);
      await sleep(2000);                              // a short climb
      key('KeyX', false);
      say(`rocket state: ${rc() ? rc().getState() : 'gone'}`);
      await tap('Space', 120);                       // thrust off
      await sleep(400);
      await tap('KeyP', 120);                        // parachute
      const t1 = performance.now();
      while (performance.now() - t1 < 120000 && rc() && !['LANDED', 'BOARDED_GROUNDED', 'CRASHED', 'DOCKED'].includes(rc().getState())) await sleep(500);
      say(`came down: ${rc() ? rc().getState() : 'gone'}`);
      await sleep(1000);
      if (fm.isInFlight()) await tap('KeyV', 150);  // climb out
      await sleep(1500);
    },
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
    // stone showing at the surface first; a pit only if there is none
    if (await findAndDig([B.STONE], () => count(I.STONE) >= n) && count(I.STONE) >= n) return;
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
        // no digging on spec: the bot reads where ore is (the loaded world),
        // walks over the nearest it knows of and only then digs down to it
        const known = oreAround(GENTLE.ORE_SCAN_TILES, wanted, GENTLE.ORE_SCAN_DEPTH);
        if (!known.length) break;
        const o = known[0];
        if (hdist(player().position, blockCenter(o.tile, o.depth)) > 3) { await approach(blockTop(o.tile, P().groundDepthOf(o.tile)), 1.5); continue; }
        if (!(await tunnelToOreBlock(o.tile, o.depth))) st.badDig = (st.badDig || []).concat([`${o.tile}:${o.depth}`]);
        continue;
      }
      await tunnelToOre(wanted, 6);
      await mineNearbyOres(2, wanted);
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
    let found = false;
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
      found = true;
      await approach(target.c, 2.5);
      if (!(await mineBlock(target.t, target.d, 15000))) {
        say(`could not dig the block at tile ${target.t} depth ${target.d} - skipping it`);
        st.badDig = (st.badDig || []).concat([`${target.t}:${target.d}`]);
      }
    }
    return found;
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
      .filter(f => f.isPowered && f.position.distanceTo(pos) < 120 && !badMachine(f.tileIndex))
      .sort((a, b) => a.position.distanceTo(pos) - b.position.distanceTo(pos))[0] || null;
  }

  // Machines the bot could not open (walled in): passed over for another
  function badMachine(tile) {
    if (!st.badMachines) { try { st.badMachines = JSON.parse(localStorage.getItem('bot_badMachines') || '[]'); } catch { st.badMachines = []; } }
    return st.badMachines.includes(tile);
  }
  function markBadMachine(tile) {
    badMachine(tile);
    st.badMachines.push(tile);
    try { localStorage.setItem('bot_badMachines', JSON.stringify(st.badMachines)); } catch {}
    say(`giving up on the machine at tile ${tile} - setting up another`);
  }
  // Build (or finish) a small power plant by a pond; returns a powered electric furnace or null
  async function buildPowerPlant() {
    const done = poweredEFurnace();
    if (done) return done;
    const b = bi(), p = P();
    st.task = 'building a power plant';
    // 1. an active hydro generator (ours, or a new one in the nearest pond)
    let hydro = b.hydroGeneratorManager.getPlacedHydroGenerators().filter(h => h.isActive && !badMachine(h.tileIndex))
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
      if (ct === undefined) { say('no dry ground beside the hydro generator'); st.badWater = (st.badWater || []).concat([ht]); markBadMachine(ht); return null; }
      if (!(await obtain(I.CABLE, 1))) return null;
      if (!(await placeOnTile(I.CABLE, ct))) return null;
    }
    // 3. the electric furnace beside the cable
    let ef = neighbors(ct).map(t => b.electricFurnaceManager.getElectricFurnaceAtTile(t)).find(f => f && !badMachine(f.tileIndex));
    if (!ef) {
      const et = neighbors(ct).find(t => t !== ht && isDryTile(t) && !stationAt(t));
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
    if (!ui.isMenuOpen()) {
      // walled in or out of sight: after a few tries, use (or build) another one
      st.openFails = st.openFails || {};
      const k = ef.tileIndex, n = (st.openFails[k] || 0) + 1;
      st.openFails[k] = n;
      say(`could not open the electric furnace (${n}x)`);
      if (n >= GENTLE.MACHINE_OPEN_TRIES) markBadMachine(k);
      closeMenus(); return false;
    }
    const slotOf = (it) => inv().getAllSlots().findIndex(x => x.itemType === it && x.quantity > 0);
    if (r.with) { const a = slotOf(r.with.itemType); if (a >= 0) ui.handleDropFromInventory(a, 'electric-furnace-additive'); }
    const s0 = slotOf(r.input); if (s0 >= 0) ui.handleDropFromInventory(s0, 'electric-furnace-input');
    say(`electric furnace loaded: ${ef.inputCount} ${itemName(r.input)}`);
    const t0 = performance.now();
    // until it has finished: nothing left in the input and nothing smelting
    // (the input count drops when a smelt starts, not when it ends)
    while (performance.now() - t0 < 180000 && (ef.inputCount >= (r.inputQuantity || 1) || ef.smeltingItem != null)) await sleep(1000);
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
      .filter(w => bi().nodePowered(w.tileIndex) && !badMachine(w.tileIndex))
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
    if (!ui.isMenuOpen()) {
      st.openFails = st.openFails || {};
      const n = (st.openFails[wb.tileIndex] || 0) + 1;
      st.openFails[wb.tileIndex] = n;
      say(`could not open the workbench (${n}x)`);
      st.badPlace = (st.badPlace || []).concat([wb.tileIndex]);
      if (n >= GENTLE.MACHINE_OPEN_TRIES) markBadMachine(wb.tileIndex);
      closeMenus(); return false;
    }
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
  // Everything the open missions could use: their items and, down through the
  // crafting / workbench / smelting / cooking recipes, what those are made of;
  // plus the basics a bot always works with
  function neededItems() {
    const need = new Set([I.LOG, I.STICK, I.WOOD, I.COAL, I.ORE_COAL, I.DIRT, I.STONE, I.BUCKET, I.WATER_BUCKET, I.STORAGE_CHEST, I.FURNACE]);
    const inputsOf = (it) => {
      const out = [];
      for (const r of RECIPES.filter(r => r.output.itemType === it)) out.push(...r.inputs.map(i => i.itemType));
      for (const r of (BENCH || []).filter(r => r.output.itemType === it)) out.push(...r.inputs.map(i => i.itemType));
      for (const r of (SMELTS || []).filter(r => r.output === it)) out.push(r.input);
      for (const r of (ESMELTS || []).filter(r => r.output === it)) { out.push(r.input); if (r.with) out.push(r.with.itemType); }
      for (const r of (COOKS || []).filter(r => r.output === it)) out.push(...r.inputs.filter(x => x !== 'fish'));
      return out;
    };
    const queue = tracker().openMissions().flatMap(m => m.objectives.map(o => o.item)).filter(x => x !== undefined);
    while (queue.length) {
      const it = queue.pop();
      if (need.has(it)) continue;
      need.add(it);
      queue.push(...inputsOf(it));
    }
    return need;
  }
  const freeSlots = () => inv().getAllSlots().filter(x => !x.itemType || !x.quantity).length;
  // Never stored away: rocket parts, the fuel and the gear for a flight, and
  // what a trip off-world is fetching (stored once, they were printed again)
  function alwaysKeep() {
    const keep = new Set([I.ROCKET_FUEL, I.WATER_BUCKET, I.BUCKET, I.SURVEY_BEACON, I.LAUNCH_PAD_SEGMENT, I.PARACHUTE, I.INGOT_TITANIUM, I.ORE_TITANIUM]);
    for (const k of Object.keys(ITEM_DATA || {})) if (ITEM_DATA[k] && ITEM_DATA[k].rocketPart) keep.add(+k);
    if (st.expedition) keep.add(st.expedition.item);
    return keep;
  }
  // Take `item` back out of this bot's own chests, up to `n` held
  async function fromMyChests(item, n) {
    let mine = [];
    try { mine = JSON.parse(localStorage.getItem('bot_myChests') || '[]'); } catch {}
    const pos = player().position;
    const chest = bi().storageChestManager.getPlacedChests()
      .filter(c => mine.includes(c.tileIndex) && c.position.distanceTo(pos) < 120 && c.slots.some(x => x.itemType === item && x.quantity > 0))
      .sort((a, b) => a.position.distanceTo(pos) - b.position.distanceTo(pos))[0];
    if (!chest) return false;
    st.task = `fetching ${itemName(item)} from my chest`;
    await approach(chest.position, 2.2);
    selectEmptyHand();
    await aimAtMachine(chest.position.clone().addScaledVector(upAt(chest.position), 0.3));
    selectEmptyHand();
    await click(2, 80);
    await sleep(500);
    const ui = bi().storageUI;
    if (!ui.isMenuOpen() || (ui.getCurrentStorage && ui.getCurrentStorage() !== chest)) { closeMenus(); return false; }
    const before = count(item);
    for (let i = 0; i < chest.slots.length && count(item) < n; i++) {
      if (chest.slots[i].itemType === item && chest.slots[i].quantity > 0) { ui.handleShiftClick(i); await sleep(80); }
    }
    closeMenus();
    if (count(item) > before) { say(`took ${count(item) - before} ${itemName(item)} back from my chest`); return true; }
    return false;
  }
  async function ensureSpace() {
    if (freeSlots() >= MIN_FREE) return;
    const all = inv().getAllSlots();
    const seen = new Set();
    const spare = [];
    const keep = alwaysKeep();
    all.forEach((x, i) => {
      if (!x.itemType || !x.quantity || keep.has(x.itemType)) return;
      if (seen.has(x.itemType) || x.itemType === I.SNOW) spare.push(i);
      seen.add(x.itemType);
    });
    if (!spare.length) {
      // no second stacks: store whatever no open mission needs
      const need = neededItems();
      all.forEach((x, i) => { if (x.itemType && x.quantity && !need.has(x.itemType) && !keep.has(x.itemType)) spare.push(i); });
    }
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
    // the click may have opened something else nearby (a cooker, another chest)
    if (ui.getCurrentStorage && ui.getCurrentStorage() !== chest) { say('opened the wrong storage - trying again later'); closeMenus(); return; }
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



  // Oil sand lies deep: find a visible block of it, get next to it, scoop it with the bucket
  async function scoopOilSand() {
    const p = P();
    let target = null, bd = 1e9;
    const fd = feetDepth();
    for (const t of tilesWithin(myTile(), 8)) {
      if (!p.isTileLoaded(t)) continue;
      for (let d = Math.max(1, fd - 14); d <= fd + 2; d++) {
        if (p.getBlock(t, d) === B.OIL_SAND && !(st.badDig || []).includes(`${t}:${d}`)) {
          const c = blockCenter(t, d); const dd = c.distanceTo(player().position);
          if (dd < bd) { bd = dd; target = { t, d, c }; }
        }
      }
    }
    if (!target) {
      say('no oil sand in sight - digging down for some');
      await digDown(() => tilesWithin(myTile(), 3).some(t => { for (let d = feetDepth() - 3; d <= feetDepth() + 1; d++) if (p.getBlock(t, d) === B.OIL_SAND) return true; return false; }), 20);
      return false;
    }
    // tunnel to it, then scoop from beside it
    await tunnelToOreBlock(target.t, target.d);
    selectItem(I.BUCKET);
    await lookAtPoint(target.c, 0.03, 1500);
    const h = rayHit();
    if (h && (h.tileIndex !== target.t || h.depth !== target.d)) { await mineBlock(h.tileIndex, h.depth, 8000); selectItem(I.BUCKET); await lookAtPoint(target.c, 0.03, 1200); }
    await click(2, 80);
    await sleep(500);
    if (count(I.CRUDE_OIL_BUCKET) > 0) { say('filled a bucket with crude oil'); return true; }
    st.badDig = (st.badDig || []).concat([`${target.t}:${target.d}`]);
    return false;
  }
  // Like tunnelToOre, for one known block
  async function tunnelToOreBlock(tile, depth) {
    for (let step = 0; step < 16; step++) {
      const c = blockCenter(tile, depth);
      if (c.distanceTo(eye()) < 4) return true;
      const fd = feetDepth();
      if (depth < fd - 1) { const mt = myTile(); if (fd - 1 <= 1) return false; if (!(await mineBlock(mt, fd - 1, 12000))) return false; await sleep(400); continue; }
      const pos = player().position; const up = upAt(pos);
      const flat = c.clone().sub(pos); flat.addScaledVector(up, -flat.dot(up)).normalize();
      await lookAtPoint(pos.clone().addScaledVector(flat, 3).addScaledVector(up, 1.0), 0.06, 1200);
      await clearAhead(flat);
      key('KeyW', true); await sleep(450); key('KeyW', false); await sleep(150);
    }
    return false;
  }

  // ---- the 3D printer (needs power) -------------------------------------------------
  // Queue `jobs` prints of recipe `r` at a powered printer and collect them
  // Place `item` (a machine) on dry ground beside a cable of a network that has
  // a generator on it, so it is powered. Returns the tile or false.
  async function placeOnPower(item) {
    const b = bi();
    const pos = player().position;
    const live = b.cableNodeManager.getNetworks().filter(n =>
      n.nodes.some(x => x.kind === 'hydroGenerator') ||
      n.connectedSteamEngines.some(t => b.steamEngineManager.getSteamEngineAtTile(t)?.isRunning));
    const cables = b.cableNodeManager.getPlacedCables()
      .filter(c => live.some(n => n.cables.includes(c.id)))
      .sort((a, c) => a.position.distanceTo(pos) - c.position.distanceTo(pos));
    for (const c of cables.slice(0, 6)) {
      const t = neighbors(c.tileIndex).find(isDryTile);
      if (t !== undefined && (await placeOnTile(item, t))) return t;
    }
    return false;
  }

  async function printCraft(r, jobs) {
    const pm = bi().printer3DManager;
    const pos = player().position;
    let pr = pm.getAllPrinters().filter(x => x.isPowered && !(st.badPrinters || []).includes(x.tileIndex))
      .sort((a, b) => a.position.distanceTo(pos) - b.position.distanceTo(pos))[0];
    if (!pr) {
      // none powered: make one and set it on a powered cable network
      say('no powered 3D printer - setting one up on power');
      if (!(await obtain(I.PRINTER_3D, 1))) return false;
      const t = await placeOnPower(I.PRINTER_3D);
      if (t === false) { say('no powered cable to set the printer by'); return false; }
      await sleep(3000);   // the grid solves every so often
      pr = pm.getAllPrinters().find(x => x.tileIndex === t && x.isPowered);
      if (!pr) { say('the new printer has no power yet'); return false; }
    }
    st.task = 'at the 3D printer';
    await approach(pr.position, 2.2);
    closeMenus(); selectEmptyHand();
    await aimAtMachine(pr.position.clone().addScaledVector(upAt(pr.position), 0.3)); selectEmptyHand();
    await click(2, 80);
    await sleep(600);
    const ui = bi().printer3DUI;
    if (!ui.isMenuOpen()) {
      closeMenus();
      st.printerFails = st.printerFails || {};
      st.printerFails[pr.tileIndex] = (st.printerFails[pr.tileIndex] || 0) + 1;
      if (st.printerFails[pr.tileIndex] >= 3) {
        say(`can't get at the 3D printer on tile ${pr.tileIndex} - using another`);
        st.badPrinters = (st.badPrinters || []).concat([pr.tileIndex]);
      } else say('could not open the 3D printer');
      await sleep(1500);
      return false;
    }
    const before = count(r.output);
    // jobs for it already queued or printing (a printer that isn't run here
    // yet - multiplayer host) are still coming: don't pay for them twice
    const pending = pr.printQueue.filter(q => q.itemType === r.output).length + (pr.currentJob && pr.currentJob.itemType === r.output ? 1 : 0);
    for (let k = 0; k < jobs - pending; k++) ui.queueRecipe(r);
    if (pending) say(`${pending} ${r.name} job(s) already waiting at the printer`);
    say(`printing ${jobs} x ${r.name}`);
    // wait for the queue to run (printTime each), collecting as it goes
    const t0 = performance.now();
    while (performance.now() - t0 < (r.printTime * jobs + 30) * 1000) {
      pr.outputInventory.forEach((o, i) => { if (o.itemType !== null && o.quantity > 0) ui.collectFromSlot(i); });
      if (!pr.currentJob && pr.printQueue.length === 0) break;
      await sleep(1000);
    }
    pr.outputInventory.forEach((o, i) => { if (o.itemType !== null && o.quantity > 0) ui.collectFromSlot(i); });
    closeMenus();
    const made = count(r.output) - before;
    say(made > 0 ? `printed ${made} ${itemName(r.output)}` : `the printer made nothing (${r.name})`);
    return made > 0;
  }

  // ---- a general planner: get any item the way a player would -------------------
  // Craft it (getting the ingredients first), smelt it from its ore, or dig
  // its block out of the ground. Returns true once `n` are held; false when
  // this pass made progress but isn't done yet, so the mission loop comes back.
  const itemName = (it) => Object.keys(I).find(k => I[k] === it);
  // The other body an item is gathered on, if it is only found off this world
  let BODY_RES = null;
  // A trip off-world brings back at least this many (later recipes want more than the first mission)
  const EXPEDITION_MIN = 12;
  function elsewhere(item) {
    if (!BODY_RES) return null;
    const here = bodyId();
    for (const [body, items] of Object.entries(BODY_RES)) if (body !== here && items.includes(item)) return body;
    return null;
  }
  async function obtain(item, n, depth = 0) {
    if (count(item) >= n) return true;
    if (depth > 6) return false;
    // stored away earlier? take it back before making it again
    if (alwaysKeep().has(item) || depth === 0) { if (await fromMyChests(item, n) && count(item) >= n) return true; }
    const name = itemName(item);
    if (item === I.LOG) { await chopTree(); return count(item) >= n; }
    if (item === I.CRUDE_OIL_BUCKET) {
      if (!(await obtain(I.BUCKET, 1, depth + 1))) return false;
      await scoopOilSand(); return count(item) >= n;
    }
    if (item === I.WOOL) { await shearSheep(n); return count(item) >= n; }
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
    // printed on the 3D printer
    const pr = PRINTS ? PRINTS.find(r => r.output === item && tracker().recipeOpen(item)) : null;
    if (pr) {
      const jobs = Math.ceil((n - count(item)) / pr.outputQuantity);
      const need = {};
      for (const inp of (pr.inputs || [pr.input])) need[inp.itemType] = (need[inp.itemType] || 0) + inp.quantity * jobs;
      for (const [k, q] of Object.entries(need)) {
        if (count(+k) < q) { await obtain(+k, q, depth + 1); if (count(+k) < q) return false; }
      }
      await printCraft(pr, jobs);
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
    // only on another world (BODY_RESOURCES): plan a trip there
    const there = elsewhere(item);
    if (there) {
      if (!st.expedition || st.expedition.body !== there) say(`${name} is only found on ${there} - planning a trip there`);
      st.expedition = { body: there, item, n: Math.max(n, EXPEDITION_MIN, st.expedition && st.expedition.item === item ? st.expedition.n : 0) };
      return false;
    }
    // dug out of the ground: the block of that name, or a world's own kind of it (MOON_ORE_IRON)
    const blocks = name !== undefined ? Object.keys(B).filter(k => isNaN(+k) && (k === name || k.endsWith('_' + name))).map(k => B[k]) : [];
    const block = blocks[0];
    if (block !== undefined) {
      if (name.startsWith('ORE_')) await goMining(count(I.COAL) < 16 && block !== B.ORE_COAL && bodyId() === 'earth' ? [...blocks, B.ORE_COAL] : blocks, () => count(item) >= n);
      else if (block === B.STONE) await digForStone(n);
      else if (!(await findAndDig([block], () => count(item) >= n)) && count(item) < n) {
        // searched six patches and saw none: not on this world (sulfur, moon rock...)
        say(`found no ${name} anywhere near - it may only be on another world`);
        st.unknown = (st.unknown || []).concat([item]);
      }
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
      if ((st.unknown || []).includes(o.item) && !elsewhere(o.item)) { st.cannot = (st.cannot || []).concat([m.id]); return; }
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
    miner: ['pad', 'assemble', 'launch', 'moon', 'moonmetal', 'shear', 'sequoia', 'logs', 'planks', 'stone', 'furnace', 'iron', 'ingots', 'bucket', 'copper', 'lightmetals', 'torches', 'chest', 'rod'],
    builder: ['pad', 'assemble', 'launch', 'logs', 'planks', 'stone', 'furnace', 'torches', 'chest', 'rod', 'fish', 'fishkinds', 'clay', 'bricks', 'campfire', 'clayblock', 'brickwall', 'cookfish', 'kiln', 'pot', 'oven', 'stew', 'eat', 'cement', 'iron', 'ingots', 'bucket', 'copper', 'lightmetals'],
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
        // in flight, or away from home with nothing left to do there: carry on / fly home
        if (fm() && fm().isInFlight()) { await visitBody(st.flyingTo || 'earth'); continue; }
        const away = bodyId();
        // a new world: what wasn't to be found on the last one may be here
        if (away && st.lastBody && away !== st.lastBody) {
          // each world keeps its own list of what isn't to be found there
          st.unknownBy = st.unknownBy || {};
          st.unknownBy[st.lastBody] = [...new Set(st.unknown || [])];
          st.unknown = (st.unknownBy[away] || []).slice();
          st.cannot = [];
        }
        if (away) st.lastBody = away;
        if (away && away !== 'earth' && !tracker().openMissions().some(m => m.visit === away && PLAYBOOK[m.id])) { await visitBody(away); continue; }
        if (st.expedition && away && away !== st.expedition.body) {
          if (count(st.expedition.item) >= st.expedition.n) st.expedition = null;
          else { await visitBody(st.expedition.body); continue; }
        }
        if (st.expedition && away === st.expedition.body) { await visitBody(away); continue; }
        if (away === 'earth' && !st.expedition && await takeStashBack()) continue;
        if (away === 'earth' || !away) await ensureSpace();
        // after the vacuum engine: rebuild our rocket as a two-stage one, once
        if (doneIds().includes('vacuum') && !resting('upgrade') && (bodyId() === 'earth')) {
          // once: when no rocket of ours has stages yet
          const staged = bi().launchPadManager.getLaunchPads().some(p => isUpgraded(p.rocketParts.map(q => q.itemType)));
          const pad = padHere();
          if (!staged && pad) { st.goal = 'upgrade'; await PLAYBOOK.upgrade(); continue; }
        }
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
      // what it found is not on this world survives a restart (it re-searched for ice every run)
      try { st.unknownBy = JSON.parse(localStorage.getItem('bot_unknownBy') || '{}'); } catch { st.unknownBy = {}; }
      st.lastBody = bodyId();
      // a trip off-world under way survives a restart (it flew home empty-handed once)
      try { st.expedition = JSON.parse(localStorage.getItem('bot_expedition') || 'null'); } catch {}
      st.unknown = (st.unknownBy[st.lastBody] || []).filter(x => !elsewhere(x));
      setInterval(() => {
        try {
          if (st.lastBody) st.unknownBy[st.lastBody] = [...new Set(st.unknown || [])];
          localStorage.setItem('bot_unknownBy', JSON.stringify(st.unknownBy));
          localStorage.setItem('bot_expedition', JSON.stringify(st.expedition || null));
        } catch {}
      }, 30000);
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
        items: hot, errors: st.errors, log: st.log.slice(-12), where: st.where, flight: st.flight, body: bodyId(),
        mem: { heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null, geo: g().engine.renderer.info.memory.geometries, tex: g().engine.renderer.info.memory.textures },
      };
    },
    // exposed for poking at a running bot from the runner's REPL
    x: { P, I: () => I, B: () => B, rayHit, eye, lookDir, nearestWaterTile, blockCenter, blockTop, upAt, bi, count, lookAtPoint, click, sleep, closeMenus, selectItem, walkTo, st, upgradeRocket, liftTWR, padHere, openPad, padCentre, approach, flyTo, fuelPad, rocketPad, boardPad, climbOut, loadCargo, gatherFuel, bodyId, rc, padFuel },
    skills: { cookAt, chopTree, walkTo, mineBlock, digDown, craft, placeNearby, smelt, goMining, pillarUpTo, fillBucket },
  };
})();
