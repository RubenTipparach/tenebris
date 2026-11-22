// Day and night: planets turn (openspec day-night, planet-spin).
// Run: npx tsx scripts/day-night.test.ts
import { SOLAR_SYSTEM, CelestialBodyType } from '../src/config/SolarSystemConfig';
import { ORBIT_CONFIG } from '../src/config/OrbitConfig';
import { northEast } from '../src/nav/compass';
import {
  Frame, Vec3, framePositionAt, frameVelocityAt, frameYawAt, nextFrame, orbitOf, positionAt, rotateY, spinOf, spinYawAt,
} from '../src/world/Orbits';

const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
const norm = (a: Vec3): Vec3 => { const l = Math.hypot(a.x, a.y, a.z) || 1; return { x: a.x / l, y: a.y / l, z: a.z / l }; };
const dist = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const angle = (a: Vec3, b: Vec3) => Math.acos(Math.max(-1, Math.min(1, dot(norm(a), norm(b)))));

// ---- the spin table
const earth = spinOf('earth')!;
ok(Math.abs(earth.dayS - 20 * 60) < 1e-9, `Earth's solar day is 20 min (${earth.dayS / 60})`);
const earthYear = orbitOf('earth')!.periodS;
ok(Math.abs(1 / earth.periodS - (1 / earth.dayS - 1 / earthYear)) < 1e-12,
  `Earth's sidereal period from its day and year: ${(earth.periodS / 60).toFixed(2)} min`);
ok(!Number.isFinite(spinOf('sun')!.periodS), 'the Sun does not turn');
const rows: string[] = [];
let allSpin = true;
for (const b of SOLAR_SYSTEM.bodies) {
  if (b.type === CelestialBodyType.STAR) continue;
  const s = spinOf(b.id)!;
  if (!Number.isFinite(s.periodS) || !(s.periodS > 0)) allSpin = false;
  rows.push(`${b.id}: day ${(s.dayS / 60).toFixed(0)} min, sidereal ${(s.periodS / 60).toFixed(1)} min`);
}
ok(allSpin, 'every body but the Sun turns');
console.log('  ' + rows.join('\n  '));

// ---- the spin angle wraps
const P = earth.periodS;
ok(spinYawAt('earth', 0) === 0, 'spin is 0 at t=0');
ok(Math.abs(spinYawAt('earth', P / 2) - Math.PI) < 1e-9, 'half a turn at half the period');
const w = spinYawAt('earth', P);
ok(w < 1e-9 || Math.abs(w - 2 * Math.PI) < 1e-9, 'a full turn wraps to 0');
let inRange = true;
for (const t of [-P / 4, 1e7, 123456.789, 3 * P + 1]) { const y = spinYawAt('earth', t); if (!(y >= 0 && y < 2 * Math.PI)) inRange = false; }
ok(inRange, 'the spin angle stays in [0, 2pi) for any t');
ok(Math.abs(spinYawAt('earth', -P / 4) - 1.5 * Math.PI) < 1e-9, 'negative time wraps forward');

// ---- a point on Earth sees the Sun rise and set once a day
const C = orbitOf('earth')!.configured;
const site = norm({ x: 0.6, y: 0.3, z: -0.74 });        // a fixed spot on Earth (planet-local up)
const elevation = (t: number) => dot(norm(sub(framePositionAt('sun', 'earth', t), C)), site);
const events = (t0: number, t1: number, steps: number) => {
  const out: Array<{ t: number; kind: 'rise' | 'set' }> = [];
  let prev = elevation(t0);
  for (let i = 1; i <= steps; i++) {
    const t = t0 + ((t1 - t0) * i) / steps;
    const e = elevation(t);
    if (prev <= 0 && e > 0) out.push({ t, kind: 'rise' });
    if (prev > 0 && e <= 0) out.push({ t, kind: 'set' });
    prev = e;
  }
  return out;
};
const D = earth.dayS;
const day1 = events(1000, 1000 + D, 4000);
ok(day1.length === 2 && day1.some(e => e.kind === 'rise') && day1.some(e => e.kind === 'set'),
  `one sunrise and one sunset in a day (${day1.map(e => e.kind).join(', ')})`);
const three = events(1000, 1000 + 3 * D, 12000);
ok(three.length === 6, `three days: ${three.length} horizon crossings`);
let maxE = -1, minE = 1;
for (let i = 0; i < 400; i++) { const e = elevation(1000 + (D * i) / 400); maxE = Math.max(maxE, e); minE = Math.min(minE, e); }
ok(maxE > 0.3 && minE < -0.3, `the Sun goes up and then down (elevation ${minE.toFixed(2)}..${maxE.toFixed(2)})`);
ok(Math.abs(elevation(1000) - elevation(1000 + D)) < 1e-3, 'a day later the Sun is back where it was');
// it still rises in the east (the compass rule, north = +Y)
const rise = day1.find(e => e.kind === 'rise')!;
const sunAtRise = norm(sub(framePositionAt('sun', 'earth', rise.t), C));
ok(dot(sunAtRise, northEast(site).east) > 0, 'the Sun rises in the east');
// and the sunrise interval is the day, not the sidereal turn
const rises = three.filter(e => e.kind === 'rise');
ok(Math.abs(rises[1].t - rises[0].t - D) < D / 200, `sunrise to sunrise = the solar day (${((rises[1].t - rises[0].t) / 60).toFixed(2)} min)`);

// ---- the Moon rises and sets in Earth's sky too
const moonEl = (t: number) => dot(norm(sub(framePositionAt('moon', 'earth', t), C)), site);
let moonCross = 0, pm = moonEl(0);
for (let i = 1; i <= 8000; i++) { const e = moonEl((4 * D * i) / 8000); if ((pm > 0) !== (e > 0)) moonCross++; pm = e; }
ok(moonCross >= 6, `the Moon rises and sets over four days (${moonCross} crossings)`);
ok(Math.abs(dist(framePositionAt('moon', 'earth', 777), C) - dist(positionAt('moon', 777), positionAt('earth', 777))) < 1e-9,
  'the turn keeps the Moon at its distance');

// ---- the stars turn with the Sun: take the sky's turn out (GameEngine.setSkyYaw)
// and the Sun is where the orbits alone put it - so against the stars it only
// drifts by the year, as it should
let starsOk = true;
for (const t of [0, 200, 1337, 5000, 20000]) {
  const s = sub(framePositionAt('sun', 'earth', t), C);
  rotateY(s, frameYawAt('earth', t));        // into the starfield's own axes
  const inertial = sub(positionAt('sun', t), positionAt('earth', t));
  if (angle(s, inertial) > 1e-6) starsOk = false;
}
ok(starsOk, 'the Sun against the stars is the orbits alone (the stars wheel with the Sun)');

// ---- frame changes keep things continuous
// held frame: at the moment of holding nothing moves
const t0 = 4321;
const live: Frame = { body: 'earth' };
const held = nextFrame(live, 1000, 300, t0);
ok(held.yaw !== undefined, 'leaving the spin reach holds the frame');
let same = true;
for (const id of ['sun', 'moon', 'sequoia', 'umbra']) {
  if (dist(framePositionAt(id, live, t0), framePositionAt(id, held, t0)) > 1e-9) same = false;
}
ok(same, 'holding the frame moves nothing at that moment');
ok(nextFrame(live, 310, 300, t0) === live, 'inside the hysteresis band the frame keeps turning');
ok(nextFrame(held, 310, 300, t0) === held, 'inside the hysteresis band a held frame stays held');
ok(nextFrame(held, 290, 300, t0).yaw === undefined, 'coming back inside the reach, the frame turns again');
// a held frame does not turn: a minute later the Sun has moved only by the orbits
const a = sub(framePositionAt('sun', held, t0 + 60), C), b = sub(framePositionAt('sun', held, t0), C);
const orbitOnly = angle(sub(positionAt('sun', t0 + 60), positionAt('earth', t0 + 60)), sub(positionAt('sun', t0), positionAt('earth', t0)));
ok(Math.abs(angle(a, b) - orbitOnly) < 1e-9, 'in a held frame the sky stops wheeling');
// changing reference body (mainPlanet.setReferenceBody): translate by the
// body's offset, take off its velocity in the old frame. A rocket riding
// along with the Moon in Earth's turning frame arrives at rest beside it.
const tm = 2500;
const moonC = orbitOf('moon')!.configured;
const moonInEarth = framePositionAt('moon', live, tm);
const rocket = { x: moonInEarth.x + 60, y: moonInEarth.y + 5, z: moonInEarth.z - 30 };
const offset = sub(moonC, moonInEarth);
const moved = { x: rocket.x + offset.x, y: rocket.y + offset.y, z: rocket.z + offset.z };
ok(dist(moved, moonC) === dist(rocket, moonInEarth), 'the rocket keeps its place beside the Moon across the change');
const vMoon = frameVelocityAt('moon', live, tm);
const h = ORBIT_CONFIG.VELOCITY_DT_S;
// the Moon's velocity in Earth's turning frame is its orbit minus Earth's wheel
const expected = sub(framePositionAt('moon', live, tm + h), framePositionAt('moon', live, tm - h));
ok(dist(vMoon, { x: expected.x / (2 * h), y: expected.y / (2 * h), z: expected.z / (2 * h) }) < 1e-9, 'body velocity in a turning frame');
// ... which includes Earth's wheel: in a held frame it is the orbits alone, and slower
const vHeld = frameVelocityAt('moon', { body: 'earth', yaw: frameYawAt('earth', tm) }, tm);
ok(Math.hypot(vMoon.x, vMoon.z) > Math.hypot(vHeld.x, vHeld.z), 'the Moon moves faster across a turning sky than a held one');
// in the Moon's own frame the Moon sits still and the Sun turns with the Moon's day
ok(dist(framePositionAt('moon', 'moon', 9999), moonC) < 1e-9, 'the reference body never moves');

// ---- sunlight updates often enough (mainPlanet's SUN_DIRECTION_EPSILON gate)
let fastest = 0, who = '';
for (const b of SOLAR_SYSTEM.bodies) {
  const s = spinOf(b.id)!;
  if (!Number.isFinite(s.dayS)) continue;
  const rate = (2 * Math.PI) / s.dayS;
  if (rate > fastest) { fastest = rate; who = b.id; }
}
const perFrame = (2 * Math.PI) / earth.dayS / 60;
const framesPerUpdate = Math.ceil(ORBIT_CONFIG.SUN_DIRECTION_EPSILON / perFrame);
ok(framesPerUpdate <= 2, `Earth's sunlight updates every ${framesPerUpdate} frame(s) at 60 fps (${(perFrame * 180 / Math.PI).toFixed(4)} deg/frame)`);
ok(fastest / 60 < 0.01, `fastest day (${who}) moves the Sun ${(fastest / 60 * 180 / Math.PI).toFixed(3)} deg a frame`);
