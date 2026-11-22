import * as THREE from 'three';
import { Planet } from './Planet';
import { HexTile } from './GoldbergPolyhedron';
import { HexBlockType } from '../shared/blockTypes';

/**
 * Surface queries shared by everything that lives on the ground round the
 * player: ground clutter (grass tufts, rocks) and fauna.
 */

/** The top non-air block of a column: its depth (-1 if none) and type. */
export function surfaceTop(planet: Planet, tileIndex: number): { top: number; block: number } {
  for (let d = planet.getMaxDepth() - 1; d >= 0; d--) {
    const b = planet.getBlock(tileIndex, d);
    if (b !== HexBlockType.AIR) return { top: d, block: b };
  }
  return { top: -1, block: HexBlockType.AIR };
}

/**
 * The water in a column whose top block is water: the radius of its surface
 * (top face of the highest water block) and of its seabed (top face of the
 * first solid block under it), and how many blocks deep it is. Null when the
 * column's top isn't water (dry land, ice, or not generated yet).
 */
export function waterColumn(planet: Planet, tileIndex: number): { surface: number; seabed: number; depth: number } | null {
  const { top, block } = surfaceTop(planet, tileIndex);
  if (top < 0 || block !== HexBlockType.WATER) return null;
  let d = top;
  while (d >= 0 && planet.getBlock(tileIndex, d) === HexBlockType.WATER) d--;
  // d is the seabed block (or -1: water to the core, the bottom of the world)
  return { surface: planet.depthToRadius(top), seabed: planet.depthToRadius(d), depth: top - d };
}

/**
 * Visit every tile whose ground point lies within `radius` of `point`, by a
 * breadth-first walk out from the tile under it. `dir` is the tile's unit
 * direction from the planet centre, `ground` the radius of its top surface
 * (0 if the column is empty).
 */
export function forEachSurfaceTile(
  planet: Planet,
  point: THREE.Vector3,
  radius: number,
  visit: (tile: HexTile, dir: THREE.Vector3, top: number, block: number, ground: number) => void,
): void {
  const start = planet.getTileAtPoint(point);
  if (!start) return;
  const seen = new Set<number>([start.index]);
  let frontier = [start.index];
  const tileWorld = new THREE.Vector3();
  while (frontier.length) {
    const next: number[] = [];
    for (const ti of frontier) {
      const tile = planet.getTileByIndex(ti);
      if (!tile) continue;
      const dir = tile.center.clone().normalize();
      const { top, block } = surfaceTop(planet, ti);
      const ground = top >= 0 ? planet.depthToRadius(top) : 0;
      tileWorld.copy(planet.center).addScaledVector(dir, ground);
      if (tileWorld.distanceTo(point) > radius) continue;
      for (const n of tile.neighbors) if (!seen.has(n)) { seen.add(n); next.push(n); }
      visit(tile, dir, top, block, ground);
    }
    frontier = next;
  }
}

/** A well-mixed 32-bit hash of a tile index (stable per tile: placement never shifts). */
export function tileHash(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}
