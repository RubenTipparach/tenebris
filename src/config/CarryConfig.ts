import { ItemType } from '../player/Inventory';

/**
 * What a player may carry onto a rocket (openspec pad-stash). Boarding at a
 * launch pad leaves every hotbar / bag item that is not exempt in the pad's
 * stash; boarding a parked rocket loads them into its cargo hold (refused
 * when they don't fit). The rules live in src/rocket/CarryRules.ts.
 */
export type CarryCategory =
  | 'tool'   // any item with ITEM_DATA.tool: pickaxes, axes, shovels, the fishing rod
  | 'suit';  // any SurvivalConfig SUITS item (a suit carried, not worn)

export const CARRY = {
  // false: boarding takes the whole inventory along, as before pad-stash
  ENABLED: true,
  // Kinds of item that stay with the player when boarding
  EXEMPT_CATEGORIES: ['tool', 'suit'] as CarryCategory[],
  // Single items that stay with the player when boarding: survival gear
  EXEMPT_ITEMS: [
    ItemType.OXYGEN_TANK,
    ItemType.EMPTY_TANK,
    ItemType.SUIT_HEATER,
    ItemType.SUIT_HEATER_MK2,
  ] as ItemType[],
  // Slots in a launch pad's stash: two full inventories (hotbar + bag)
  STASH_SLOTS: 72,
};
