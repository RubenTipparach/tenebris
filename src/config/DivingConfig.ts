import { ItemType } from '../player/Inventory';

/**
 * Deep resources (openspec space-exploration, submarines / ocean-world):
 * what a craft collects by sitting in a body's deep band - Thalassa's heavy
 * water below its deep shelf, and (with the gas-giant diver) the giants'
 * helium-3 and metallic hydrogen. One table: the submarine, the diver and
 * the tests all read it.
 *
 * Depth is metres below the body's surface: below the sea surface for an
 * ocean, below the cloud tops for a gas giant.
 */
export interface DepthBand {
  item: ItemType;
  /** The band starts this deep (m) and runs to the bottom */
  minDepthM: number;
  /** Items collected per second sitting in it */
  perS: number;
}

export const DEPTH_BANDS: Partial<Record<string, DepthBand[]>> = {
  // Thalassa: heavy water in the deepest sixth of its sea (14 m of water and more)
  thalassa: [{ item: ItemType.DEUTERIUM, minDepthM: 14, perS: 0.2 }],
};

/** The band a craft `depthM` below a body's surface collects from, or null (too shallow, or nothing there) */
export function depthBandAt(bodyId: string, depthM: number): DepthBand | null {
  let best: DepthBand | null = null;
  for (const b of DEPTH_BANDS[bodyId] ?? []) if (depthM >= b.minDepthM && (!best || b.minDepthM > best.minDepthM)) best = b;
  return best;
}
