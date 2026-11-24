// Submarines and the gas-giant diver (openspec space-exploration, tasks 8.1-8.4).
// Run: npx tsx scripts/submarines.test.ts
//
// - 8.1 a submarine pilots on a quaternion (a full pitch loop keeps its roll,
//   never jumps), floats / sinks / rises on its ballast, drives on its screw;
//   park / board / persist: the record round-trips through the real
//   GameStorage save (a reload brings it back parked, never strapped in), and
//   a headless dive in Earth's sea
// - 8.2 the hull: no damage down to its rating, damage below it, lost at zero
// - 8.3 depth bands: deuterium deep in Thalassa, helium-3 in Aurelia's band,
//   metallic hydrogen deep in Brontes - and none above them
// - 8.4 a headless dive into Aurelia: a diver leaves a skimming rocket's
//   cargo, sinks into the helium band, climbs back and docks, and the
//   helium-3 is in the rocket's cargo
import * as THREE from 'three';

// GameStorage writes to localStorage: an in-memory one, shared by "reloads"
const mem = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => { mem.set(k, String(v)); },
  removeItem: (k: string) => { mem.delete(k); },
  key: (i: number) => [...mem.keys()][i] ?? null,
  get length() { return mem.size; },
  clear: () => mem.clear(),
};

const { ItemType, ITEM_DATA } = await import('../src/player/Inventory');
const { SUBMARINE, DEPTH_BANDS, hullOf, depthBandAt } = await import('../src/config/DivingConfig');
const { ROCKET_CONFIG } = await import('../src/config/RocketConfig');
const { PlayerConfig } = await import('../src/config/PlayerConfig');
const { GAS_GIANTS, bodyEnvironment } = await import('../src/config/SolarSystemConfig');
const { MISSIONS } = await import('../src/config/Missions');
const { PRINTER_RECIPES } = await import('../src/player/Printer3DUI');
const S = await import('../src/vehicles/Submarine');
const { GameStorage } = await import('../src/engine/GameStorage');
const fs = await import('node:fs');

const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const I = ItemType;
const hull = (t: number) => hullOf(t)!;
const DT = 1 / 30;

// A sea for the tests: a planet of radius 100 with its water surface at 100
// and a flat seabed `floor` m below it (Earth's gravity)
const EARTH_G = PlayerConfig.BASE_GRAVITY;
const sea = (body: string, floorDepth: number) => S.seaMedium(body, EARTH_G, () => 100, () => 100 - floorDepth);
const at = (depth: number) => new THREE.Vector3(0, 100 - depth, 0);
const run = (c: ReturnType<typeof S.newCraft>, input: Partial<typeof S.NO_INPUT>, m: ReturnType<typeof sea>, seconds: number) => {
  let last = S.stepCraft(c, { ...S.NO_INPUT, ...input }, m, DT);
  for (let t = DT; t < seconds; t += DT) last = S.stepCraft(c, { ...S.NO_INPUT, ...input }, m, DT);
  return last;
};
const depthOf = (c: { local: THREE.Vector3 }, m: { depthAt: (l: THREE.Vector3) => number }) => m.depthAt(c.local);

// ---- items, icons, recipes, rewards ------------------------------------
const HULLS = [I.SUBMARINE, I.DEEP_SUBMARINE, I.GAS_GIANT_DIVER, I.DEEP_DIVER];
for (const t of HULLS) {
  const tex = ITEM_DATA[t]?.texture;
  ok(!!tex && fs.existsSync(`public${tex}`), `${ITEM_DATA[t]?.name} has its icon (${tex})`);
  ok(PRINTER_RECIPES.some(r => r.output === t), `${ITEM_DATA[t]?.name} is printed`);
  ok(!!hullOf(t), `${ITEM_DATA[t]?.name} is a hull in SUBMARINE.HULLS`);
}
const unlockedBy = (t: number) => MISSIONS.filter(m => m.unlocks.includes(t)).map(m => m.visit ?? m.id);
ok(unlockedBy(I.SUBMARINE).join() === 'ferrum', 'the submarine is Metropole Prime\'s reward (design 2)');
ok(unlockedBy(I.DEEP_SUBMARINE).join() === 'nerith', 'the deep-hull submarine is Nerith\'s');
ok(unlockedBy(I.GAS_GIANT_DIVER).join() === 'thalassa', 'the gas-giant diver is Thalassa\'s');
ok(unlockedBy(I.DEEP_DIVER).join() === 'verdance', 'the deep diver hull is Verdance\'s');
ok(hull(I.SUBMARINE).crushDepthM < hull(I.DEEP_SUBMARINE).crushDepthM && hull(I.GAS_GIANT_DIVER).crushDepthM < hull(I.DEEP_DIVER).crushDepthM,
  'the deep hulls are rated deeper');

// ---- 8.1 piloting: buoyancy, ballast, screw, quaternion attitude --------
{
  const m = sea('earth', 15);
  const c = S.newCraft(hull(I.SUBMARINE), 'earth', at(3), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0));
  run(c, {}, m, 3);
  ok(Math.abs(depthOf(c, m) - 3) < 0.3, `neutral ballast holds its depth (${depthOf(c, m).toFixed(2)} m)`);
  run(c, { ballast: 1 }, m, 6);
  const sunk = depthOf(c, m);
  ok(sunk > 6, `flooding the tanks sinks it (${sunk.toFixed(1)} m)`);
  ok(sunk <= 15 - SUBMARINE.PHYSICS.floorClearanceM + 1e-6, `it stops on the seabed, not through it (${sunk.toFixed(2)} m of 15)`);
  run(c, { ballast: -1 }, m, 12);
  const up = depthOf(c, m);
  ok(up < SUBMARINE.PHYSICS.hullHeightM / 2 && up > -SUBMARINE.PHYSICS.hullHeightM / 2, `blowing the tanks brings it up to float at the surface (${up.toFixed(2)} m)`);
  const x0 = c.local.x;
  run(c, { throttle: 1 }, m, 4);
  ok(c.local.x - x0 > 5, `full throttle drives it forward (${(c.local.x - x0).toFixed(1)} m in 4 s)`);
}
{
  // A full pitch loop with the craft rolled: back where it started, roll
  // kept, and the nose never jumps between steps (no gimbal flip)
  const m = S.gasMedium('test', 1e9, 0, 1);  // deep, weightless: attitude only
  const c = S.newCraft(hull(I.SUBMARINE), 'test', new THREE.Vector3(0, 1e9 - 50, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0));
  const rollTime = (Math.PI / 6) / SUBMARINE.PHYSICS.rollRate;
  for (let t = 0; t < rollTime - 1e-9; t += Math.min(DT, rollTime - t)) S.stepCraft(c, { ...S.NO_INPUT, roll: 1 }, m, Math.min(DT, rollTime - t));
  const start = c.orientation.clone();
  const loop = (2 * Math.PI) / SUBMARINE.PHYSICS.pitchRate;
  let prev = S.craftForward(c), maxJump = 0;
  const steps = Math.round(loop / DT);
  for (let i = 0; i < steps; i++) {
    S.stepCraft(c, { ...S.NO_INPUT, pitch: 1 }, m, loop / steps);
    const f = S.craftForward(c);
    maxJump = Math.max(maxJump, f.angleTo(prev));
    prev = f;
  }
  ok(c.orientation.angleTo(start) < 1e-3, `a full pitch loop (rolled 30 deg) returns to the start attitude (off by ${c.orientation.angleTo(start).toExponential(1)} rad)`);
  ok(maxJump < SUBMARINE.PHYSICS.pitchRate * (loop / steps) * 1.01, `the nose never jumps through the loop (max ${maxJump.toFixed(4)} rad/step)`);
  const rollNow = S.craftUp(c).angleTo(new THREE.Vector3(0, 1, 0));
  ok(Math.abs(rollNow - Math.PI / 6) < 1e-3, `roll survives the loop (${(rollNow * 180 / Math.PI).toFixed(2)} deg)`);
}

// ---- 8.1 park / board / persist ------------------------------------------
{
  const centre = new THREE.Vector3(0, 0, 0);
  const c = S.newCraft(hull(I.SUBMARINE), 'earth', at(4), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1));
  c.hold[0] = { itemType: I.STONE, quantity: 3 };
  c.health = 77;
  const store = new GameStorage();
  // placed: saved at once, parked
  store.saveSubmarine('earth', S.craftToRecord(c, centre, false, 1000));
  // boarded: the record says it is piloted, fresh
  const riding = S.craftToRecord(c, centre, true, 5000);
  store.saveSubmarine('earth', riding);
  ok(S.pilotedByOther(riding, 6000), 'a fresh piloting record keeps another player off it');
  ok(!S.pilotedByOther(riding, 5000 + SUBMARINE.RIDE_STALE_S * 1000 + 1), 'a stale one (the pilot left) does not');
  // piloted somewhere and parked there: written the same frame
  c.local.copy(at(6)).add(new THREE.Vector3(2, 0, 0));
  c.orientation.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.7));
  store.saveSubmarine('earth', S.craftToRecord(c, centre, false, 9000));
  // reload: a new storage reads the same localStorage
  const reloaded = new GameStorage();
  reloaded.load();
  const recs = reloaded.getSubmarines();
  ok(recs.length === 1 && recs[0].key === c.key && recs[0].planetId === 'earth', 'a reload finds exactly the one submarine, on Earth');
  const back = S.craftFromRecord(recs[0], 'earth', centre)!;
  ok(!!back && back.local.distanceTo(c.local) < 1e-9 && back.orientation.angleTo(c.orientation) < 1e-6, 'it comes back at its parked pose');
  ok(back.health === 77 && back.hold[0].itemType === I.STONE && back.hold[0].quantity === 3, 'with its health and hold');
  ok(!recs[0].riding && !S.pilotedByOther(recs[0], 9001), 'parked, not piloted: a reload never straps the player back in');
  ok(reloaded.listRecords('submarine').some(r => r.key === c.key), 'it is a placed-object record (the multiplayer sync path)');
  // removed (lost): gone from the save
  reloaded.removeSubmarine('earth', c.key);
  const again = new GameStorage();
  again.load();
  ok(again.getSubmarines().length === 0, 'a lost submarine is gone from the save');
  // a record in the planet's configured frame: the planet may have moved since
  const moved = new THREE.Vector3(500, 0, 0);
  const shifted = S.craftFromRecord(S.craftToRecord(c, moved, false, 0), 'earth', moved)!;
  ok(shifted.local.distanceTo(c.local) < 1e-9, 'it is saved relative to its planet (rides the planet round its orbit)');
}
{
  // The headless dive in Earth's sea: placed at 2 m, piloted down to about 6 m and
  // along, then back up - within the basic hull's rating all the way
  const m = sea('earth', 16);
  const c = S.newCraft(hull(I.SUBMARINE), 'earth', at(2), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0));
  let deepest = 0, crushed = false;
  for (let t = 0; t < 40; t += DT) {
    const d = depthOf(c, m);
    const input = { ...S.NO_INPUT, throttle: 0.6, ballast: t < 20 ? (d < 6 ? 1 : d > 6.5 ? -1 : 0) : -1 };
    const r = S.stepCraft(c, input, m, DT);
    deepest = Math.max(deepest, r.depth);
    crushed ||= r.crushing;
  }
  ok(deepest > 5.5 && deepest < hull(I.SUBMARINE).crushDepthM, `a dive in Earth's sea reaches ${deepest.toFixed(1)} m (rated ${hull(I.SUBMARINE).crushDepthM} m)`);
  ok(!crushed && c.health === hull(I.SUBMARINE).maxHealth, 'inside its rating the hull takes no damage');
  ok(depthOf(c, m) < SUBMARINE.PHYSICS.hullHeightM / 2, `and surfaces again (${depthOf(c, m).toFixed(2)} m)`);
}

// ---- 8.2 hull crush depth ---------------------------------------------------
{
  const h = hull(I.SUBMARINE);
  const c = S.newCraft(h, 'thalassa', at(1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0));
  ok(!S.hullStep(c, h, h.crushDepthM, 1).crushing && c.health === h.maxHealth, 'at its rated depth: no damage');
  const r1 = S.hullStep(c, h, h.crushDepthM + 2, 1);
  ok(r1.crushing && Math.abs(c.health - (h.maxHealth - 2 * h.damagePerMPerS)) < 1e-9, `2 m below its rating: ${2 * h.damagePerMPerS} health a second`);
  const before = c.health;
  S.hullStep(c, h, h.crushDepthM - 1, 5);
  ok(c.health === before, 'climbing back above it stops the damage');
  // Too deep in Thalassa's ocean: health falls until it is lost
  const m = sea('thalassa', 24);
  const sub = S.newCraft(h, 'thalassa', at(h.crushDepthM + 6), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0));
  let lost = false, t = 0;
  for (; t < 120 && !lost; t += DT) lost = S.stepCraft(sub, { ...S.NO_INPUT, ballast: 1 }, m, DT).lost;
  ok(lost && sub.health === 0, `a basic submarine held below its rating in Thalassa's ocean is lost (after ${t.toFixed(1)} s)`);
}

// ---- 8.3 depth bands ------------------------------------------------------
{
  const deep = hull(I.DEEP_SUBMARINE);
  const band = DEPTH_BANDS.thalassa![0];
  const m = sea('thalassa', 24);
  const c = S.newCraft(deep, 'thalassa', at(band.minDepthM + 3), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0));
  run(c, {}, m, 20);
  const got = c.hold.filter(s => s.itemType === I.DEUTERIUM).reduce((n, s) => n + s.quantity, 0);
  ok(got > 0 && got >= Math.floor(band.perS * 20) - 1, `a deep-hull sub in Thalassa's deep band collects deuterium (${got} in 20 s)`);
  ok(c.health === deep.maxHealth, 'the deep hull is rated for the deuterium band');
  const shallow = S.newCraft(deep, 'thalassa', at(band.minDepthM - 3), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0));
  run(shallow, {}, m, 20);
  ok(shallow.hold.every(s => s.quantity === 0), 'above the band: nothing');
  ok(hull(I.SUBMARINE).crushDepthM < band.minDepthM, 'the basic hull is not rated for it (Nerith\'s deep hull is needed)');
}
const giant = (id: string) => GAS_GIANTS.find(g => g.id === id)!;
const giantMedium = (id: string) => S.gasMedium(id, giant(id).radius,
  PlayerConfig.BASE_GRAVITY * ROCKET_CONFIG.GAS_GIANT_FLIGHT.gravityStrength, bodyEnvironment(id).atmosphereDensity);
const holdOf = (c: { hold: { itemType: number; quantity: number }[] }, t: number) => c.hold.filter(s => s.itemType === t).reduce((n, s) => n + s.quantity, 0);
{
  for (const id of ['aurelia', 'brontes']) {
    const band = DEPTH_BANDS[id]!.find(b => b.item === I.HELIUM_3)!;
    ok(!!band, `${id} has a helium-3 band`);
    const rocketCrush = ROCKET_CONFIG.GAS_GIANT_FLIGHT.crushDepth * giant(id).radius;
    ok(band.minDepthM > rocketCrush, `${id}'s helium band (${band.minDepthM} m) is below where a rocket is crushed (${rocketCrush.toFixed(1)} m): only a diver reaches it`);
  }
  const m = giantMedium('aurelia');
  const R = giant('aurelia').radius;
  const c = S.newCraft(hull(I.GAS_GIANT_DIVER), 'aurelia', new THREE.Vector3(0, R - 40, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0));
  run(c, {}, m, 12);
  ok(holdOf(c, I.HELIUM_3) >= 2, `a diver held in Aurelia's helium band collects helium-3 (${holdOf(c, I.HELIUM_3)} in 12 s)`);
  ok(depthBandAt('aurelia', 20) === null, 'above it: nothing');
  const mh = DEPTH_BANDS.brontes!.find(b => b.item === I.METALLIC_HYDROGEN)!;
  ok(hull(I.GAS_GIANT_DIVER).crushDepthM < mh.minDepthM && hull(I.DEEP_DIVER).crushDepthM > mh.minDepthM, 'metallic hydrogen is below the diver\'s rating and within the deep diver\'s');
  const RB = giant('brontes').radius;
  const dd = S.newCraft(hull(I.DEEP_DIVER), 'brontes', new THREE.Vector3(0, RB - mh.minDepthM - 10, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0));
  run(dd, {}, giantMedium('brontes'), 30);
  ok(holdOf(dd, I.METALLIC_HYDROGEN) >= 2 && dd.health === hull(I.DEEP_DIVER).maxHealth, `the deep diver brings up metallic hydrogen from Brontes (${holdOf(dd, I.METALLIC_HYDROGEN)} in 30 s)`);
}

// ---- 8.4 a headless dive into Aurelia ----------------------------------------
{
  const R = giant('aurelia').radius;
  const m = giantMedium('aurelia');
  // A rocket skimming 10 m below the cloud tops, a diver and room in its cargo
  const cargo = Array.from({ length: 6 }, () => ({ itemType: I.NONE, quantity: 0 }));
  cargo[0] = { itemType: I.GAS_GIANT_DIVER, quantity: 1 };
  cargo[1] = { itemType: I.ROCKET_FUEL, quantity: 5 };
  const rocketLocal = new THREE.Vector3(0, R - 10, 0);
  const dh = S.diverInCargo(cargo);
  ok(dh?.item === I.GAS_GIANT_DIVER, 'the rocket\'s cargo holds a diver to let out');
  const up = rocketLocal.clone().normalize();
  const diver = S.newCraft(dh!, 'aurelia', rocketLocal.clone().addScaledVector(up, -SUBMARINE.DIVER.releaseDropM), up, new THREE.Vector3(1, 0, 0));
  ok(!S.withinDock(diver.local.clone().addScaledVector(up, -50), rocketLocal), 'far below, it cannot dock');
  // Down to the helium band (flood), hold there a while, then blow the tanks
  const band = DEPTH_BANDS.aurelia![0];
  let deepest = 0, t = 0, docked = false, phase = 'down';
  for (; t < 300; t += DT) {
    const d = m.depthAt(diver.local);
    deepest = Math.max(deepest, d);
    if (phase === 'down' && d >= band.minDepthM + 4) phase = 'hold';
    if (phase === 'hold' && holdOf(diver, I.HELIUM_3) >= 5) phase = 'up';
    const ballast = phase === 'down' ? 1 : phase === 'hold' ? (d < band.minDepthM + 2 ? 1 : d > band.minDepthM + 8 ? -1 : 0) : -1;
    const r = S.stepCraft(diver, { ...S.NO_INPUT, ballast }, m, DT);
    if (r.lost) break;
    if (phase === 'up' && S.withinDock(diver.local, rocketLocal)) { docked = true; break; }
  }
  ok(deepest >= band.minDepthM && deepest < hull(I.GAS_GIANT_DIVER).crushDepthM, `the diver went down to ${deepest.toFixed(1)} m, into the helium band and within its rating`);
  ok(docked, `it climbed back to its rocket (${t.toFixed(0)} s)`);
  const res = S.dockDiver(cargo, diver);
  const he3 = holdOf({ hold: cargo }, I.HELIUM_3);
  ok(res.ok && he3 >= 5, `docked: ${he3} helium-3 in the rocket's cargo`);
  ok(holdOf({ hold: cargo }, I.GAS_GIANT_DIVER) === 1 && holdOf({ hold: cargo }, I.ROCKET_FUEL) === 5, 'the diver is back in the cargo, nothing else touched');
  ok(diver.hold.every(s => s.quantity === 0), 'its hold is emptied into the cargo');
  // A full cargo refuses the dock (nothing lost)
  const full = Array.from({ length: 1 }, () => ({ itemType: I.STONE, quantity: ITEM_DATA[I.STONE].stackSize }));
  const d2 = S.newCraft(dh!, 'aurelia', rocketLocal.clone(), up, new THREE.Vector3(1, 0, 0));
  d2.hold[0] = { itemType: I.HELIUM_3, quantity: 3 };
  ok(!S.dockDiver(full, d2).ok && d2.hold[0].quantity === 3, 'no room in the cargo: the dock is refused, the diver keeps its haul');
  // Lost in the deep: the diver hull leaves the cargo for good
  ok(S.loseDiver(cargo, I.GAS_GIANT_DIVER) && holdOf({ hold: cargo }, I.GAS_GIANT_DIVER) === 0, 'a diver crushed in the deep is gone from the cargo');
}
