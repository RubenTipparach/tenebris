/**
 * Swimming rules (openspec ocean-life), pure so scripts/ocean-life.test.ts
 * can check them without a planet or WebGL.
 *
 * Radii are distances from the planet centre. A water column runs from its
 * seabed (the top face of the highest solid block under the water) up to its
 * surface (the top face of the highest water block).
 */

/**
 * Where a swimmer may be, given where it wants to be: inside the column with
 * `bed` clearance above the seabed and `top` below the surface. A column too
 * shallow for both margins puts it at the middle of the water, which is
 * still strictly inside (never in the seabed, never in the air).
 */
export function swimRadius(want: number, seabed: number, surface: number, bed: number, top: number): number {
  const lo = seabed + bed;
  const hi = surface - top;
  if (lo > hi) return (seabed + surface) / 2;
  return Math.min(hi, Math.max(lo, want));
}

/** The radius a fraction t of the way up a column (0 = seabed, 1 = surface). */
export function columnRadius(seabed: number, surface: number, t: number): number {
  return seabed + (surface - seabed) * t;
}

/**
 * Can a swimmer at radius r move into a column? Only if it would clear that
 * column's seabed (it rises first otherwise) - the surface side just clamps
 * down, since water above is open.
 */
export function clearsSeabed(r: number, seabed: number, surface: number, bed: number): boolean {
  return r >= Math.min(seabed + bed, (seabed + surface) / 2);
}
