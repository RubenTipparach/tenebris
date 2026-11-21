// Checks the live-orbit model against openspec navigation-and-orbits
// (orbital-motion spec). Exits non-zero on a failure.
//
//   npx tsx scripts/orbit-check.ts

import { SOLAR_SYSTEM } from '../src/config/SolarSystemConfig';
import { ORBIT_CONFIG } from '../src/config/OrbitConfig';
import { allOrbits, framePositionAt, orbitOf, positionAt } from '../src/world/Orbits';

let failed = 0;
function check(what: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${detail ? ` - ${detail}` : ''}`);
  if (!ok) failed++;
}
const dist = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const angleRound = (id: string, t: number) => {
  const o = orbitOf(id)!, p = positionAt(id, t), c = positionAt(o.parent!, t);
  return Math.atan2(p.z - c.z, p.x - c.x);
};
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

// Time zero is the configured layout
const off = SOLAR_SYSTEM.bodies.filter(b => dist(positionAt(b.id, 0), b.position) > 1e-6).map(b => b.id);
check('t = 0 puts every body at its configured position', off.length === 0, off.join(', '));

// The anchors
check('the Moon goes round Earth in 60 min', Math.abs(orbitOf('moon')!.periodS - ORBIT_CONFIG.MOON_PERIOD_MIN * 60) < 1e-6);
check('Earth goes round the Sun in 180 min', Math.abs(orbitOf('earth')!.periodS - ORBIT_CONFIG.EARTH_PERIOD_MIN * 60) < 1e-6);
check('15 min moves the Moon a quarter orbit', Math.abs(wrap(angleRound('moon', 900) - angleRound('moon', 0)) - Math.PI / 2) < 1e-9);
check('15 min moves Earth a twelfth of its orbit', Math.abs(wrap(angleRound('earth', 900) - angleRound('earth', 0)) - Math.PI / 6) < 1e-9);

// Kepler: a planet at twice Earth's distance takes 2^1.5 times as long
const earthA = orbitOf('earth')!.radius;
for (const o of allOrbits().values()) {
  if (o.parent !== 'sun' || o.id === 'earth') continue;
  const want = ORBIT_CONFIG.EARTH_PERIOD_MIN * 60 * Math.pow(o.radius / earthA, 1.5);
  if (Math.abs(o.periodS - want) > 1e-6) check(`Kepler period of ${o.id}`, false);
}
check('every planet round the Sun follows T ∝ a^1.5 from Earth', true, `(2x Earth's distance: ${(ORBIT_CONFIG.EARTH_PERIOD_MIN * Math.pow(2, 1.5)).toFixed(0)} min)`);

// Every orbit closes after one period
const open = [...allOrbits().values()].filter(o => o.parent).filter(o => {
  for (const t of [0, 333, 4321, o.periodS / 3]) {
    const p = positionAt(o.id, t), c = positionAt(o.parent!, t);
    // in the parent's XZ plane at the orbit radius, at the fixed height
    if (Math.abs(Math.hypot(p.x - c.x, p.z - c.z) - o.radius) > 1e-6 || Math.abs(p.y - c.y - o.height) > 1e-6) return true;
  }
  // and back where it started after one period
  return Number.isFinite(o.periodS) && dist(positionAt(o.id, o.periodS), positionAt(o.parent!, o.periodS)) > 0
    && Math.abs(wrap(angleRound(o.id, o.periodS) - angleRound(o.id, 0))) > 1e-6;
}).map(o => o.id);
check('orbits are circles about their parents that close after one period', open.length === 0, open.join(', '));

// The reference frame: the reference body sits at its configured position
for (const ref of ['earth', 'moon', 'sequoia']) {
  const p = framePositionAt(ref, ref, 12345);
  check(`${ref} stays at its configured position as the reference frame`, dist(p, orbitOf(ref)!.configured) < 1e-6);
}
// ...and the others keep their true separation from it
const sep = (a: string, b: string, t: number) => dist(positionAt(a, t), positionAt(b, t));
const fsep = (a: string, b: string, ref: string, t: number) => dist(framePositionAt(a, ref, t), framePositionAt(b, ref, t));
check('the frame keeps distances between bodies', Math.abs(sep('earth', 'cinder', 777) - fsep('earth', 'cinder', 'moon', 777)) < 1e-6);

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks pass');
process.exit(failed ? 1 : 0);
