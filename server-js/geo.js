// Where a player is on their planet, from their pose (openspec
// admin-monitor, design 4). A pose is in the sender's frame, where their
// planet sits at its configured position and turns with them, so
// `p - configured position` is the planet-local direction - the vector the
// game's Map tab projects. These are the game's own formulas
// (src/nav/compass.ts latLon / mapUV); scripts/admin-monitor.test.ts holds
// them equal.

/** Latitude (north +) and longitude (east +), radians, of a direction. +Y is north; east at +X is -Z. */
export function latLon(d) {
  const l = Math.hypot(d.x, d.y, d.z) || 1;
  return { lat: Math.asin(Math.max(-1, Math.min(1, d.y / l))), lon: Math.atan2(-d.z / l, d.x / l) };
}

/** u, v in 0..1 of the equirectangular planet map (longitude -pi..pi left to right, north up). */
export function mapUV(d) {
  const { lat, lon } = latLon(d);
  return { u: (lon + Math.PI) / (2 * Math.PI), v: (Math.PI / 2 - lat) / Math.PI };
}

/**
 * A pose [x, y, z] on a body { radius, position }: latitude / longitude in
 * degrees, altitude over the surface (world units = metres), and map u, v.
 */
export function placeOn(p, body) {
  const d = { x: p[0] - body.position.x, y: p[1] - body.position.y, z: p[2] - body.position.z };
  const { lat, lon } = latLon(d);
  const { u, v } = mapUV(d);
  const deg = 180 / Math.PI;
  return { lat: lat * deg, lon: lon * deg, alt: Math.hypot(d.x, d.y, d.z) - body.radius, u, v };
}
