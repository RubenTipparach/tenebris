// Space exploration integration run (openspec space-exploration, task 9.3):
// one single-player client takes a rocket along both routes - the Moon, the
// sunward route to the Sun, the outward route to Brontes - and completes
// every visit mission in tree order, until the exploration count reaches all
// bodies. No page error may fire. Screenshots into <outDir>:
// explore-start.png, explore-sunward.png, explore-done.png.
//
//   npx vite build && npx vite preview --port 4179 &
//   node scripts/mp-e2e/exploration-run.cjs [outDir]
//
// What is real and what is shortcut (headless swiftshader runs at about
// 1 fps, so flying 26,000 units between bodies for real would take days):
//  - The debug save: the mission tree is brought to "rocket launched" (every
//    mission outside the exploration tree done) through the tracker's own
//    save path, and the page is RELOADED so the run starts from that save.
//  - Travel between bodies is a teleport of the boarded rocket (position and
//    velocity set), the way the debug teleport carries a ship.
//  - Everything at a body is the rocket's REAL physics step
//    (RocketController.update, the step a frame runs), so the mission events
//    come from the game's own emit points: the landing ('landed'), the
//    parachute landing on a world with air ('chuteLanded', the chute opening
//    by itself), the survey drone launched over an airless body ('surveyed',
//    RocketController.launchDrone - what its key does), the gas-giant skim
//    in and back out ('skimmed') and the Sun pass ('closePass'), both behind
//    fitted heat shields.
//  - The one simulated event: a survey beacon on a body WITH air (a drone
//    only surveys airless bodies, and planting a beacon needs the player
//    walking on that body's streamed terrain). There the run sends
//    'surveyed' into the tracker's event path (MissionTracker.event, the
//    listener the beacon's emitGameEvent reaches). The beacon itself is
//    covered by task 1.3's headless run.
//  - Every RELOAD_EVERY visits (default 8) and at the end the page is
//    reloaded and the count must survive (headless swiftshader also runs
//    out of renderer memory after about twenty bodies' terrain). The JS
//    client does not save a rocket in flight, so after a reload the run
//    boards a fresh starter rocket and teleports on.
const path = require('path');
const fs = require('fs');
let playwright;
try { playwright = require('playwright'); } catch { playwright = require(require.resolve('playwright', { paths: [require('child_process').execSync('npm root -g').toString().trim()] })); }
const { chromium } = playwright;
const OUT = path.resolve(process.argv[2] || '.');
const URL = process.env.URL || 'http://localhost:4179/tenebris/js/?debug&sp';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
// Visits between page reloads (see the loop)
const RELOAD_EVERY = Number(process.env.RELOAD_EVERY || 8);
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);

async function waitFor(page, fn, ms, what, arg) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { if (await page.evaluate(fn, arg)) return; } catch { /* navigating */ }
    await sleep(1000);
  }
  throw new Error('timeout ' + what);
}

const ready = () => { const g = window.__tenebris; return !!(g && g.isReady && g.player && g.player.getCurrentPlanet() && g.missions); };

// Bring the tree to "rocket launched": every open mission that is not a
// visit is done, until only visits (and what hangs off them) are left. The
// tracker's onChange writes the mission save (the one save path).
const debugSave = () => {
  const t = window.__tenebris.missions.getTracker();
  for (let open = t.openMissions().filter(m => !m.visit); open.length; open = t.openMissions().filter(m => !m.visit)) {
    for (const m of open) t.done.add(m.id);
  }
  t.fitAll();
  t.onChange();
  return { done: t.save().done.length, visits: t.visits(), open: t.openMissions().map(m => m.id) };
};

// One visit, flown with the real rocket step. Returns what happened.
const visitBody = (missionId) => {
  const g = window.__tenebris, THREE = window.__THREE, f = g.rocketFlightManager, t = g.missions.getTracker();
  const ITEM = { PARACHUTE: 110, HEAT_SHIELD_MK3: 247, SURVEY_DRONE: 245 };
  const m = t.openMissions().find(x => x.id === missionId);
  if (!m) return { error: `${missionId} is not open` };
  const rc = f.getRocketController();
  if (!rc) return { error: 'not in a rocket' };
  // Kit the rocket for every kind of visit: chutes, shields, drones
  const eq = rc.getEquipment();
  if (!eq || eq.length < 3) return { error: 'the rocket has fewer than 3 equipment slots', eq, parts: rc.parts?.map(p => p.itemType), flying: f.isInFlight() };
  eq[0].itemType = ITEM.PARACHUTE; eq[0].quantity = 4;
  eq[1].itemType = ITEM.HEAT_SHIELD_MK3; eq[1].quantity = 4;
  eq[2].itemType = ITEM.SURVEY_DRONE; eq[2].quantity = 4;
  rc.refreshCargoMass();
  rc.heat = 0;
  rc.currentFuel = rc.totalFuelCapacity;
  const idle = {};
  const body = m.visit;
  const steps = (n, input, until) => {
    for (let i = 0; i < n; i++) {
      rc.update(1 / 30, i === 0 ? input : idle);
      if (until()) return i + 1;
      if (rc.getState() === 'CRASHED') return -1;
    }
    return 0;
  };
  const fly = (pos, vel, up) => {
    // nose up off the body below (engine down), as a pilot sets up a landing
    if (up) rc.orientation.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    rc.position.copy(pos);
    rc.velocity.copy(vel);
    rc.angularVelocity.set(0, 0, 0);
    rc.stateMachine.forceState('IN_FLIGHT');
    rc.hasLaunched = true;
    rc.updateClosestPlanet();
  };
  const out = { id: missionId, body };
  if (body === 'sun') {
    // Inside the close-pass distance, heading out fast
    const sun = new THREE.Vector3(rc.sunPosition.x, rc.sunPosition.y, rc.sunPosition.z);
    // The Sun is no gravity source: its radius is the drawn disc's (the
    // engine scales a radius-60 sphere to the config radius)
    const mesh = g.engine.sunMesh;
    if (!mesh) return { error: 'no Sun mesh' };
    const R = out.sunR = mesh.geometry.parameters.radius * mesh.scale.x;
    const earth = f.planets.find(p => p.id === 'earth');
    const dir = earth.center.clone().sub(sun).normalize();
    fly(sun.clone().addScaledVector(dir, R * 1.3), dir.clone().multiplyScalar(R));
    out.steps = steps(30 * 30, idle, () => t.isDone(missionId));
  } else {
    const p = f.planets.find(x => x.id === body);
    if (!p) return { error: `${body}: no gravity source` };
    if (p.gasGiant) {
      // Just under the cloud tops, climbing out
      const up = new THREE.Vector3(0, 1, 0);
      fly(p.center.clone().addScaledVector(up, p.radius - 5), up.clone().multiplyScalar(p.radius * 0.25));
      out.steps = steps(30 * 60, idle, () => t.isDone(missionId));
    } else {
      // Just above the ground, falling gently: a real touchdown (under a
      // chute where there is air)
      const up = new THREE.Vector3(0.3, 1, 0.2).normalize();
      const ground = p.getSurfaceHeight ? p.getSurfaceHeight(up) : p.radius;
      const air = !!p.hasAtmosphere;
      fly(p.center.clone().addScaledVector(up, ground + (air ? 30 : 1.5)), up.clone().multiplyScalar(air ? -4 : -0.5), up);
      out.landSteps = steps(30 * 120, air ? { parachute: true } : idle, () => rc.getState() === 'LANDED');
      out.state = rc.getState();
      out.chute = air;
      if (rc.getState() !== 'LANDED') {
        out.debug = { alt: rc.getAltitude(), v: rc.velocity.toArray(), closest: rc.closestPlanet?.id, ground, radius: p.radius, dist: rc.position.distanceTo(p.center) };
        return out;
      }
      if (!air) {
        // Lift off a little (inside drone range) and survey from above with a drone (its real path)
        fly(p.center.clone().addScaledVector(up, ground + Math.min(20, p.radius * 0.5)), new THREE.Vector3(), up);
        out.drone = rc.launchDrone();
      } else {
        out.beacon = 'simulated';
        t.event('surveyed', body, 1, () => 0);
      }
    }
  }
  out.done = t.isDone(missionId);
  out.visits = t.visits();
  out.heapMB = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null;
  return out;
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 960, height: 600 }, deviceScaleFactor: 0.5 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => { errors.push(e.message); log('pageerror', e.message); });
  page.on('console', m => { if (m.type() === 'error') log('console.error', m.text().slice(0, 200)); });
  await page.goto(URL);
  await waitFor(page, ready, 300000, 'game ready');
  log('ready');

  // The debug save, then a reload so the run starts from it
  log('debug save', JSON.stringify(await page.evaluate(debugSave)));
  await page.reload();
  await waitFor(page, ready, 300000, 'game ready after reload');
  const loaded = await page.evaluate(() => { const t = window.__tenebris.missions.getTracker(); return { visits: t.visits(), open: t.openMissions().map(m => m.id) }; });
  log('loaded', JSON.stringify(loaded));
  if (!loaded.open.includes('moon')) throw new Error('the debug save did not open the Moon visit');

  // Into a rocket: the one still flying after a reload, else a rocket on a
  // pad (the debug menu's spawn-rocket path), boarded
  const board = async () => {
    if (await page.evaluate(() => { const f = window.__tenebris.rocketFlightManager; return f.isInFlight() && !!f.getRocketController(); })) return 'still aboard';
    // A pad whose stack has a command module (ItemType 47): a flyable rocket
    const flyable = () => window.__tenebris.blockInteraction.getLaunchPadManager().getLaunchPads().some(p => p.rocketParts.some(r => r.itemType === 47));
    const seen = await page.evaluate(async (flyableSrc) => {
      const g = window.__tenebris, bi = g.blockInteraction;
      const pads = bi.getLaunchPadManager().getLaunchPads().map(p => p.rocketParts.map(r => r.itemType));
      const landed = g.rocketFlightManager.getLandedRocketManager().getAllLandedRockets().length;
      // eslint-disable-next-line no-new-func
      if (!new Function(`return (${flyableSrc})()`)()) await bi.placeStarterRocket(g.player.getCurrentPlanet(), g.player.position);
      return { pads, landed };
    }, flyable.toString());
    await waitFor(page, flyable, 120000, 'a flyable rocket on a pad');
    const boarded = await page.evaluate(() => {
      const g = window.__tenebris, f = g.rocketFlightManager;
      const pad = g.blockInteraction.getLaunchPadManager().getLaunchPads().find(p => p.rocketParts.some(r => r.itemType === 47));
      g.player.setEnabled(false);
      return f.enterFlightMode(pad) && !!f.getRocketController();
    });
    if (!boarded) throw new Error('could not board the rocket');
    return `boarded (found pads ${JSON.stringify(seen.pads)}, ${seen.landed} parked rockets)`;
  };
  log('rocket', await board());
  await sleep(2000);
  await page.screenshot({ path: path.join(OUT, 'explore-start.png') });

  // Every visit in tree order: the first open visit mission each time, so a
  // body is only flown to once its parent is visited
  const order = [];
  for (let guard = 0; guard < 100; guard++) {
    const next = await page.evaluate(() => window.__tenebris.missions.getTracker().openMissions().find(m => m.visit)?.id ?? null);
    if (!next) break;
    const r = await page.evaluate(visitBody, next);
    log('visit', JSON.stringify(r));
    if (r.error || !r.done) throw new Error(`visit ${next} failed: ${JSON.stringify(r)}`);
    order.push(r.body);
    if (next === 'visit_sun') { await sleep(1500); await page.screenshot({ path: path.join(OUT, 'explore-sunward.png') }); }
    // Every body streams its full terrain as the rocket arrives; headless
    // swiftshader runs out of renderer memory after about twenty, so reload
    // now and then - which also checks the progress so far is saved
    if (order.length % RELOAD_EVERY === 0) {
      const before = await page.evaluate(() => window.__tenebris.missions.getTracker().visits());
      await page.reload();
      await waitFor(page, ready, 300000, 'game ready after a mid-run reload');
      const back = await page.evaluate(() => window.__tenebris.missions.getTracker().visits());
      log('reload', JSON.stringify({ before, back }), await board());
      if (back.done !== before.done) throw new Error(`visits lost over a reload: ${before.done} -> ${back.done}`);
    }
  }
  const end = await page.evaluate(() => window.__tenebris.missions.getTracker().visits());
  log('order', order.join(' > '));
  log('visits', JSON.stringify(end));
  await sleep(2000);
  await page.screenshot({ path: path.join(OUT, 'explore-done.png') });

  // The count survives a reload (the mission save)
  await page.reload();
  await waitFor(page, ready, 300000, 'game ready after the last reload');
  const after = await page.evaluate(() => window.__tenebris.missions.getTracker().visits());
  log('after reload', JSON.stringify(after));
  log('errors', errors.length);
  await browser.close();
  const pass = end.done === end.total && after.done === after.total && order.length === end.total && errors.length === 0;
  log(pass ? 'PASS every body visited, both routes, no page errors' : 'FAIL');
  if (!pass) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
