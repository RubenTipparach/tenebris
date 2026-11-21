import { HexBlockType } from '../shared/blockTypes';
import { ItemType } from '../player/Inventory';

/**
 * What an empty bucket scoops up (PlanetBlockInteraction.tryFillBucket, the
 * one fill path). `leaves` is the block left behind, written and saved the
 * same frame; none means an infinite source (water stays).
 */
export interface BucketFill {
  block: HexBlockType;
  fills: ItemType;
  leaves?: HexBlockType;
}

export const BUCKET_FILLS: BucketFill[] = [
  { block: HexBlockType.WATER, fills: ItemType.WATER_BUCKET },
  { block: HexBlockType.OIL_SAND, fills: ItemType.CRUDE_OIL_BUCKET, leaves: HexBlockType.STONE },
  { block: HexBlockType.MAGMA, fills: ItemType.LAVA_BUCKET, leaves: HexBlockType.BASALT },
];

export function bucketFill(block: HexBlockType): BucketFill | undefined {
  return BUCKET_FILLS.find(f => f.block === block);
}
