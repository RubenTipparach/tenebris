// Pure tests for navigation-and-orbits: compass rules, waypoint cap.
// Run: npx tsx scripts/nav-tests.ts
import { bearing, compassHeading, fromLatLon, latLon, northEast } from '../src/nav/compass';
import { addWaypoint, removeWaypoint, sanitizeWaypoints, Waypoint } from '../src/nav/waypointList';
import { HexBlockType, blockFaces } from '../src/shared/blockTypes';
import { positionAt } from '../src/world/Orbits';

let failed = 0;
const check = (name: string, ok: boolean, info = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${info ? ' - ' + info : ''}`); if (!ok) failed++; };
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

// Headings at the equator, longitude 0 (up = +X)
const up = { x: 1, y: 0, z: 0 };
check('facing +Y is north', near(compassHeading(up, { x: 0, y: 1, z: 0 }), 0));
check('facing -Z is east', near(compassHeading(up, { x: 0, y: 0, z: -1 }), 90));
check('facing -Y is south', near(compassHeading(up, { x: 0, y: -1, z: 0 }), 180));
check('facing +Z is west', near(compassHeading(up, { x: 0, y: 0, z: 1 }), 270));
const { north, east } = northEast(up);
check('east is right of north (north x up)', near(east.z, -1) && near(north.y, 1));

// lat/lon round trip, east-positive
for (const [lat, lon] of [[0.3, 1.2], [-1.1, -2.9], [0, 0]]) {
  const ll = latLon(fromLatLon(lat, lon));
  check(`lat/lon round trip ${lat},${lon}`, near(ll.lat, lat) && near(ll.lon, lon));
}
check('a point to the east has longitude > 0', latLon({ x: 1, y: 0, z: -0.1 }).lon > 0);

// Bearing: from the equator to a point due east
const b = bearing(fromLatLon(0, 0), fromLatLon(0, 0.1));
check('bearing due east is 90', near(b.deg, 90, 1e-4), b.deg.toFixed(3));
check('bearing angle', near(b.angle, 0.1, 1e-9));
check('bearing due north is 0', near(bearing(fromLatLon(0, 0), fromLatLon(0.2, 0)).deg, 0, 1e-4));

// The north rule against the orbits: on Earth at a point with the Sun
// just below the horizon to the east, a little later it is above it - the
// Sun rises in the east (on the right facing north)
const sunDir = (t: number) => {
  const e = positionAt('earth', t), s = positionAt('sun', t);
  const d = { x: s.x - e.x, y: s.y - e.y, z: s.z - e.z };
  const l = Math.hypot(d.x, d.y, d.z);
  return { x: d.x / l, y: d.y / l, z: d.z / l };
};
const s0 = sunDir(0), s1 = sunDir(60);
// a surface point with the Sun on its horizon: the subsolar direction
// turned 90 deg about the pole one way (dawn) - and the other way (dusk)
const site = { x: -s0.z, y: 0, z: s0.x };
const dusk = { x: s0.z, y: 0, z: -s0.x };
const ne = northEast(site);
const dot = (a: { x: number; y: number; z: number }, c: { x: number; y: number; z: number }) => a.x * c.x + a.y * c.y + a.z * c.z;
const h0 = dot(s0, site), h1 = dot(s1, site);
check('Sun is on the horizon there at t=0', Math.abs(h0) < 1e-6, h0.toExponential(2));
check('Sun rises there (above the horizon a minute later)', h1 > 0, h1.toExponential(2));
check('...and it rises in the east', dot(s0, ne.east) > 0.99, dot(s0, ne.east).toFixed(3));
check('and on the other side it sets in the west', dot(s1, dusk) < 0 && dot(s0, northEast(dusk).east) < -0.99);

// Waypoints: max 4, the fifth drops the oldest; remove
let list: Waypoint[] = [];
for (let i = 0; i < 5; i++) list = addWaypoint(list, { id: `w${i}`, body: 'earth', tile: i, setAt: i });
check('a fifth waypoint drops the first', list.length === 4 && list[0].id === 'w1' && list[3].id === 'w4');
list = removeWaypoint(list, 'w2');
check('removing one', list.length === 3 && !list.some(w => w.id === 'w2'));
check('sanitize drops junk and caps', sanitizeWaypoints([{ id: 'a', body: 'x', tile: 1, setAt: 1 }, { id: 3 }, null, ...list, { id: 'z', body: 'm', tile: 2, setAt: 9 }]).length === 4);

// Every block type has a top face (its map colour comes from it)
const types = Object.values(HexBlockType).filter(v => typeof v === 'number') as number[];
check(`every block type (${types.length}) has a top face`, types.every(t => !!blockFaces(t).top));

if (failed) { console.log(`${failed} failed`); process.exit(1); }
console.log('all passed');
