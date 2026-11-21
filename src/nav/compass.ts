/**
 * North, east, headings and bearings on a planet - the one place they are
 * worked out (navigation-and-orbits design decision 6). Every compass, map
 * arrow and waypoint bearing goes through these.
 *
 * North is the pole the Sun's daily path turns about such that, facing it,
 * the Sun rises on the right - Earth's rule (Pale Blue Dot compass-bar,
 * decision 1). Every body here goes round its parent with its angle
 * growing from +X towards +Z (src/world/Orbits.ts) - clockwise seen from
 * +Y - so from any body the Sun's direction turns about -Y (the right-hand
 * rule), as Earth's sky turns about its south pole: north is +Y on every
 * body, and the Sun rises in the east (-Z at longitude 0).
 */
export type V3 = { x: number; y: number; z: number };

const dot = (a: V3, b: V3) => a.x * b.x + a.y * b.y + a.z * b.z;
const len = (a: V3) => Math.sqrt(dot(a, a));
const norm = (a: V3): V3 => { const l = len(a) || 1; return { x: a.x / l, y: a.y / l, z: a.z / l }; };
const cross = (a: V3, b: V3): V3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const sub = (a: V3, b: V3): V3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });

/** The north pole's direction (planet-local). The same on every body. */
export const NORTH: V3 = { x: 0, y: 1, z: 0 };

/**
 * North and east tangents at a point on a planet, from `up` (the unit
 * direction from the planet's centre). East = north x up, so facing north,
 * east is on the right.
 */
export function northEast(up: V3): { north: V3; east: V3 } {
  const u = norm(up);
  let north = sub(NORTH, { x: u.x * u.y, y: u.y * u.y, z: u.z * u.y });
  if (len(north) < 1e-6) north = { x: -1, y: 0, z: 0 };  // at a pole every way is south
  north = norm(north);
  return { north, east: norm(cross(north, u)) };
}

/** Heading in degrees clockwise from north, 0..360, of `forward` at `up`. */
export function compassHeading(up: V3, forward: V3): number {
  const { north, east } = northEast(up);
  const deg = (Math.atan2(dot(forward, east), dot(forward, north)) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/** Bearing (degrees from north) and great-circle angle (radians) from one surface direction to another. */
export function bearing(fromUp: V3, toUp: V3): { deg: number; angle: number } {
  const a = norm(fromUp), b = norm(toUp);
  const c = Math.max(-1, Math.min(1, dot(a, b)));
  const tangent = sub(b, { x: a.x * c, y: a.y * c, z: a.z * c });
  return { deg: compassHeading(a, tangent), angle: Math.acos(c) };
}

/** Latitude (north positive) and longitude (east positive), radians, of a direction. */
export function latLon(dir: V3): { lat: number; lon: number } {
  const d = norm(dir);
  // Longitude 0 on +X; east at +X is -Z (see northEast), so east-positive
  return { lat: Math.asin(Math.max(-1, Math.min(1, d.y))), lon: Math.atan2(-d.z, d.x) };
}

/** The unit direction for a latitude / longitude (inverse of latLon). */
export function fromLatLon(lat: number, lon: number): V3 {
  const c = Math.cos(lat);
  return { x: c * Math.cos(lon), y: Math.sin(lat), z: -c * Math.sin(lon) };
}

/** The 8-point compass name of a heading. */
export function headingLabel(deg: number): string {
  const names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return names[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}
