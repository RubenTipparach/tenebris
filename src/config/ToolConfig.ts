/**
 * Tools (openspec tools-and-toolbox): every number for tool tiers, wear and
 * the toolbox. Imports nothing from the player code, so Inventory.ts (which
 * tags each tool item with its kind and tier) can read it without a cycle.
 *
 * Design after tenebris-rs `core::mining`: a tier buys speed and
 * durability, never access - bare hands still dig everything at the
 * block's own mining time.
 */

/** What a tool does. The toolbox holds one of each, in TOOLBOX_KINDS order. */
export type ToolKind = 'pickaxe' | 'axe' | 'shovel' | 'rod';

export type ToolTier = 'rock' | 'copper' | 'iron' | 'steel' | 'titanium' | 'wood';

export interface ToolTierStats {
  name: string;          // shown in the tool's name: "Iron Pickaxe"
  uses: number;          // blocks a fresh tool breaks before it breaks itself
  mineTimeMult: number;  // a block's mining time is multiplied by this
}

export const TOOL_TIERS: Record<Exclude<ToolTier, 'wood'>, ToolTierStats> = {
  rock: { name: 'Rock', uses: 200, mineTimeMult: 0.6 },
  copper: { name: 'Copper', uses: 300, mineTimeMult: 0.45 },
  iron: { name: 'Iron', uses: 500, mineTimeMult: 0.35 },
  steel: { name: 'Steel', uses: 800, mineTimeMult: 0.25 },
  titanium: { name: 'Titanium', uses: 1200, mineTimeMult: 0.18 },
};

/** The fishing rod (the 'wood' tier): casts before the line gives out. */
export const ROD_USES = 150;

export const TOOLBOX = {
  // Toolbox slot order (the inventory addresses them after the 36 hotbar + bag slots)
  KINDS: ['pickaxe', 'axe', 'shovel', 'rod'] as ToolKind[],
  // Labels on the empty toolbox slots (in-game text: ASCII)
  LABELS: { pickaxe: 'Pick', axe: 'Axe', shovel: 'Shovel', rod: 'Rod' } as Record<ToolKind, string>,
  // Key that takes the toolbox rod out / puts it away
  ROD_KEY: '0',
  // Durability bar: green above HIGH, yellow above LOW, else red (fraction left)
  BAR_HIGH: 0.5,
  BAR_LOW: 0.2,
  BAR_COLOURS: { high: '#00e436', mid: '#ffec27', low: '#ff004d' },
  // How long the "tool broke" / "equipped" toasts stay (ms)
  TOAST_MS: 2500,
};
