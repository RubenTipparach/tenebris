// Injected into every test client (Playwright addInitScript). Thin helpers
// over window.__tenebris (exposed with ?debug) that drive the game through
// the SAME handlers a mouse click / key press reaches - placeBlock,
// breakBlock, the chest UI's transfer + shift-click, the crafting button -
// so the multiplayer traffic is exactly what a real player produces.
(() => {
  const ITEM = { STONE: 1, WOOD: 4, LOG: 6, STICK: 15, INGOT_IRON: 23, INGOT_GOLD: 24, STORAGE_CHEST: 26 };
  const g = () => window.__tenebris;
  const bi = () => g().blockInteraction;
  const inv = () => bi().getInventory();
  const planet = () => g().player.getCurrentPlanet();
  const T = () => window.__THREE;

  function giveAndSelect(item, qty) {
    const iv = inv();
    // put it in hotbar slot 0 (overwrite) and select it - what the player
    // does by pressing 1 with the stack in their first slot
    iv.setSlot(0, item, qty);
    iv.setSelectedSlot(0);
    bi().updateHotbarUI();
  }

  // Tiles at exactly `ring` steps from `start` (BFS over hex neighbours)
  function ring(start, n) {
    const p = planet();
    let frontier = [start];
    const seen = new Set([start]);
    for (let i = 0; i < n; i++) {
      const next = [];
      for (const t of frontier) for (const nb of p.getTileNeighbors(t)) {
        if (!seen.has(nb)) { seen.add(nb); next.push(nb); }
      }
      frontier = next;
    }
    return frontier;
  }

  // Stand at `pos` looking at world point `target`. placeAt's view.forward
  // takes the walker's -look convention (localForward; the camera looks
  // along -localForward, see PlanetPlayer.getForwardVector), so the aim
  // direction is passed negated.
  function aim(pos, target) {
    const p = planet();
    const up = p.getSurfaceNormal(pos);
    const eye = pos.clone().addScaledVector(up, 1.6);
    const look = target.clone().sub(eye).normalize();
    g().player.placeAt(pos, { forward: look.negate(), up });
  }

  window.__mp = {
    ITEM,
    ready() {
      const G = g();
      return !!(G && G.player && G.player.getCurrentPlanet() && G.multiplayer && G.multiplayer.isConnected());
    },
    state() {
      const G = g();
      const p = G.player.position;
      return {
        id: G.multiplayer?.myId ?? null,
        connected: G.multiplayer?.isConnected() ?? false,
        players: G.multiplayer?.playerCount() ?? 0,
        remotes: (G.multiplayer?.getRemotePlayers() ?? []).map(r => ({ name: r.name, planet: r.planet, p: r.position.toArray().map(v => +v.toFixed(2)) })),
        pos: p.toArray().map(v => +v.toFixed(2)),
        planet: G.player.getCurrentPlanet()?.getName() ?? null,
      };
    },
    myTile() {
      return planet().getTileAtPoint(g().player.position).index;
    },
    ring,
    ground(tile) { return planet().groundDepthOf(tile); },
    block(tile, depth) { return planet().getBlock(tile, depth); },
    column(tile, from, to) { const out = []; for (let d = from; d <= to; d++) out.push(planet().getBlock(tile, d)); return out; },
    tileLoaded(tile) { return planet().isTileLoaded(tile); },

    // Stand on `tile`, looking at `targetTile` (the walker look transport -
    // the same placeAt a teleport uses)
    standAt(tile, targetTile, lift = 0) {
      const p = planet();
      const THREE = T();
      const t = p.getTileByIndex(tile);
      const pos = p.getSurfacePosition(t);
      const up = p.getSurfaceNormal(pos);
      pos.addScaledVector(up, 0.2);
      const target = p.getSurfacePosition(p.getTileByIndex(targetTile)).addScaledVector(up, 1 + lift);
      aim(pos, target);
      return pos.toArray();
    },
    // n standing spots round `build`: high ground (nothing in the way),
    // spread out (greedy farthest-apart)
    pickSpots(build, n, r = 3) {
      const p = planet();
      const cands = ring(build, r).filter(t => p.isTileLoaded(t));
      const g0 = p.groundDepthOf(build);
      const pos = (t) => p.getTileByIndex(t).center;
      cands.sort((a, b) => p.groundDepthOf(b) - p.groundDepthOf(a));
      const high = cands.filter(t => p.groundDepthOf(t) >= g0).concat(cands.filter(t => p.groundDepthOf(t) < g0));
      const out = [high[0]];
      while (out.length < n) {
        let best = null, bd = -1;
        for (const t of high.slice(0, Math.max(n * 4, 12))) {
          if (out.includes(t)) continue;
          const d = Math.min(...out.map(o => pos(o).distanceTo(pos(t))));
          if (d > bd) { bd = d; best = t; }
        }
        out.push(best);
      }
      return out;
    },
    // Turn to face another player's avatar (by name), eyes on their chest
    facePlayer(name) {
      const r = (g().multiplayer?.getRemotePlayers() ?? []).find(x => x.name === name);
      if (!r) return false;
      const pos = g().player.position.clone();
      aim(pos, r.position.clone().addScaledVector(planet().getSurfaceNormal(pos), 1.0));
      return true;
    },
    // How squarely that player's avatar faces me: 1 = looking right at me
    facing(name) {
      const r = (g().multiplayer?.getRemotePlayers() ?? []).find(x => x.name === name);
      const rem = [...g().multiplayer.remotes.values()].find(x => x.name === name);
      if (!r || !rem) return null;
      const THREE = T();
      const toMe = g().player.position.clone().sub(r.position).normalize();
      // the model's face is its +Z (net/Avatar.ts)
      const model = rem.avatar.group.children[0];
      const face = new THREE.Vector3(0, 0, 1).applyQuaternion(model.getWorldQuaternion(new THREE.Quaternion()));
      return +face.dot(toMe).toFixed(3);
    },
    // Is that player's avatar on screen (inside the camera frustum, in front)?
    // Returns its normalised screen position
    onScreen(name) {
      const r = (g().multiplayer?.getRemotePlayers() ?? []).find(x => x.name === name);
      if (!r) return null;
      const cam = g().engine.camera;
      cam.updateMatrixWorld();
      const up = planet().getSurfaceNormal(r.position);
      const v = r.position.clone().addScaledVector(up, 1.0).project(cam);
      const inside = Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1 && v.z > -1 && v.z < 1;
      return { x: +v.x.toFixed(2), y: +v.y.toFixed(2), z: +v.z.toFixed(3), inside };
    },
    // Re-aim without moving (look at a tile from where you stand)
    lookAt(targetTile, lift = 2) {
      const p = planet();
      const pos = g().player.position.clone();
      const up = p.getSurfaceNormal(pos);
      aim(pos, p.getSurfacePosition(p.getTileByIndex(targetTile)).addScaledVector(up, lift));
    },

    // Build: place `count` blocks stacked on `tile` with the real placeBlock
    buildPillar(tile, item, count) {
      const p = planet();
      giveAndSelect(item, 64);
      const base = p.groundDepthOf(tile) + 1;
      const placed = [];
      for (let i = 0; i < count; i++) {
        bi().placeBlock(p, tile, base + i);
        placed.push([tile, base + i, p.getBlock(tile, base + i)]);
      }
      return placed;
    },
    // Mine the top block of a tile with the real breakBlock
    breakTop(tile) {
      const p = planet();
      const d = p.groundDepthOf(tile);
      const b = p.getBlock(tile, d);
      bi().breakBlock(p, tile, d, b);
      return { depth: d, was: b, now: p.getBlock(tile, d) };
    },

    // ---- trading through a shared chest ---------------------------------
    placeChest(tile) {
      const p = planet();
      giveAndSelect(ITEM.STORAGE_CHEST, 1);
      bi().placeBlock(p, tile, p.groundDepthOf(tile) + 1);
    },
    chestAt(tile) {
      const c = bi().storageChestManager.getChestAtTile(tile);
      return c ? c.slots.map(s => [s.itemType, s.quantity]).filter(s => s[0] !== 0) : null;
    },
    // Open the chest and drag a stack from the inventory into chest slot `slot`
    deposit(tile, item, qty, slot) {
      const c = bi().storageChestManager.getChestAtTile(tile);
      if (!c) return false;
      inv().setSlot(5, item, qty);
      const ui = bi().storageUI;
      ui.open(c);
      ui.transferFromInventory(5, slot);
      ui.close();
      return true;
    },
    // Open the chest and shift-click every stack into the inventory
    withdrawAll(tile) {
      const c = bi().storageChestManager.getChestAtTile(tile);
      if (!c) return false;
      const ui = bi().storageUI;
      ui.open(c);
      c.slots.forEach((s, i) => { if (s.itemType !== 0) ui.handleShiftClick(i); });
      ui.close();
      return true;
    },
    // Close the inventory / chest panel (what Esc / E does)
    closeMenus() {
      const cs = bi().getCraftingSystem();
      if (cs.isMenuOpen()) cs.close();
      if (bi().storageUI.isMenuOpen()) bi().storageUI.close();
    },
    count(item) { return inv().getItemCount(item); },

    // ---- missions (each player's own tracker, own save slot) -------------
    missions() {
      const t = g().missions.getTracker();
      const s = t.save();
      return { done: s.done.slice().sort(), now: t.now()?.id ?? null };
    },
    gain(item, qty) { inv().addItem(item, qty); bi().updateHotbarUI(); },
    // Pick a recipe by output and press Craft (CraftingSystem.craftSelectedRecipe)
    async craft(outputItem, times) {
      const mod = await import('/tenebris/js/src/player/CraftingSystem.ts');
      const cs = bi().getCraftingSystem();
      const idx = mod.CRAFTING_RECIPES.findIndex(r => r.output.itemType === outputItem);
      cs.selectRecipe(idx);
      for (let i = 0; i < times; i++) cs.craftSelectedRecipe();
      return idx;
    },

    // Close the pause menu (a real player clicks PLAY; headless can't take
    // pointer lock, so hide it) - the HUD stays as the player sees it
    cleanHud() {
      const s = document.createElement('style');
      s.textContent = '#instructions{display:none!important} #game-container canvas{image-rendering:pixelated}';
      document.head.appendChild(s);
    },
  };
})();
