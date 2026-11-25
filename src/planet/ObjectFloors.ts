/**
 * Placed objects a walker stands on (a launch pad's slab): per tile, the
 * radius of the object's top. The walker's ONE floor search
 * (PlanetPlayer: findWalkableFloorAtRadius and its siblings) reads every
 * floor's top through Planet.floorTopRadius, which lifts a floor block's top
 * to the object sitting on it - so standing on a pad tile puts your feet on
 * the pad, and its edge is a step like any other rise.
 *
 * Searched for before adding: there was no per-tile collider or object
 * floor anywhere; the player only ever stood on block tops.
 */

/** Anything that keeps the per-tile object tops (the Planet) */
export interface ObjectFloorHost {
  setObjectTop(tileIndex: number, top: number | null): void;
}

/**
 * The top a walker stands on at a floor block whose own top is `blockTop`:
 * an object's top counts only when it sits in the air block just above
 * (above the block's top, under the next block's top), so a pad on the
 * ground never lifts a cave floor under it or a ledge over it.
 */
export function objectFloorTop(blockTop: number, blockHeight: number, objectTop: number | undefined): number {
  if (objectTop === undefined) return blockTop;
  return objectTop > blockTop && objectTop < blockTop + blockHeight ? objectTop : blockTop;
}
