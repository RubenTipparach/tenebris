import { ItemType } from '../player/Inventory';

/**
 * The power grid and the machines on it (openspec industry-and-nuclear,
 * design decisions 3-5). Watts produced / drawn, battery tiers, and each
 * new machine's timings. Every number a designer might turn lives here.
 */

/** What a node on a cable network is, for the grid solver. */
export type PowerNodeKind =
  | 'steamEngine' | 'hydroGenerator' | 'reactor'
  | 'electricFurnace' | 'computer' | 'printer3D'
  | 'pumpJack' | 'refinery' | 'centrifuge' | 'nuclearFabricator'
  | 'gasCollector'
  | 'battery';

export const POWER_CONFIG = {
  // How often the grid is solved (s); energy is integrated over the step
  SOLVE_EVERY_S: 0.25,

  // Generators: watts while running
  SUPPLY_W: {
    steamEngine: 2000,
    hydroGenerator: 1000,
    reactor: 50000,
  } as Partial<Record<PowerNodeKind, number>>,

  // Machines: watts while working
  DEMAND_W: {
    electricFurnace: 1000,
    computer: 200,
    printer3D: 800,
    pumpJack: 500,
    refinery: 1500,
    centrifuge: 2000,
    nuclearFabricator: 20000,
    gasCollector: 400,
  } as Partial<Record<PowerNodeKind, number>>,

  // Batteries: capacity (Wh) and the most they can take in / give out (W),
  // denser each tier (power-grid spec: each holds more than the one before)
  BATTERIES: {
    [ItemType.BATTERY_LEAD_ACID]: { capacityWh: 10000, maxRateW: 2000 },
    [ItemType.BATTERY_LITHIUM]: { capacityWh: 40000, maxRateW: 8000 },
    [ItemType.BATTERY_SOLID_STATE]: { capacityWh: 150000, maxRateW: 30000 },
  } as Record<number, { capacityWh: number; maxRateW: number }>,
} as const;

/** The pump jack, the refinery, the centrifuge, the reactor, the fabricator. */
export const MACHINE_CONFIG = {
  // Pump jack: one unit of crude every PUMP_UNIT_S while powered, a tank of
  // TANK_UNITS; each unit pumped turns one oil sand cell below to stone
  PUMP_UNIT_S: 12,
  PUMP_TANK_UNITS: 8,
  // Refinery: one crude oil bucket in -> outputs, every REFINE_S
  REFINE_S: 10,
  REFINE_OUT: [
    { itemType: ItemType.KEROSENE, quantity: 2 },
    { itemType: ItemType.PLASTIC, quantity: 1 },
  ],
  // Centrifuge: ENRICH_IN uranium ore -> 1 enriched uranium, every ENRICH_S
  ENRICH_IN: 4,
  ENRICH_S: 20,
  // Reactor: up to ROD_SLOTS fuel rods, each lasting ROD_LIFE_S of running
  REACTOR_ROD_SLOTS: 4,
  REACTOR_ROD_LIFE_S: 30 * 60,
  // Gas collector (openspec wool-air-and-reentry, design 4): one empty tank
  // in -> one oxygen tank out every fillS while powered, where the air is breathable
  gasCollector: { fillS: 15 },
  // A busy machine's record (progress, battery charge, rod life) is saved this often (s)
  SAVE_EVERY_S: 5,
  // Slots each machine shows: inputs, outputs
  SLOTS: {
    pumpJack: { inputs: 1, outputs: 1 },
    refinery: { inputs: 1, outputs: 3 },
    centrifuge: { inputs: 1, outputs: 1 },
    reactor: { inputs: 4, outputs: 0 },
    nuclearFabricator: { inputs: 0, outputs: 1 },
    gasCollector: { inputs: 1, outputs: 1 },
    battery: { inputs: 0, outputs: 0 },
  } as Record<string, { inputs: number; outputs: number }>,
} as const;

/**
 * The nuclear fabricator's recipes (design decision 5). Ingredients come
 * from the player's hotbar + bag when a job starts; the job then runs while
 * the fabricator's network has reactor power.
 */
export interface FabricatorRecipe {
  output: ItemType;
  inputs: { itemType: ItemType; quantity: number }[];
  timeS: number;
}

export const FABRICATOR_RECIPES: FabricatorRecipe[] = [
  {
    output: ItemType.BATTERY_PACK,
    inputs: [
      { itemType: ItemType.BATTERY_LITHIUM, quantity: 1 },
      { itemType: ItemType.PLASTIC, quantity: 4 },
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 4 },
    ],
    timeS: 30,
  },
  {
    output: ItemType.NUCLEAR_THERMAL_ENGINE,
    inputs: [
      { itemType: ItemType.FUEL_ROD, quantity: 2 },
      { itemType: ItemType.INGOT_TITANIUM, quantity: 12 },
      { itemType: ItemType.VACUUM_ENGINE, quantity: 1 },
      { itemType: ItemType.CPU_CHIP, quantity: 1 },
    ],
    timeS: 60,
  },
  {
    output: ItemType.REACTOR_CORE,
    inputs: [
      { itemType: ItemType.FUEL_ROD, quantity: 4 },
      { itemType: ItemType.INGOT_TITANIUM, quantity: 16 },
      { itemType: ItemType.BATTERY_SOLID_STATE, quantity: 1 },
      { itemType: ItemType.MOTHERBOARD, quantity: 1 },
    ],
    timeS: 90,
  },
  {
    output: ItemType.ION_DRIVE,
    inputs: [
      { itemType: ItemType.INGOT_TITANIUM, quantity: 8 },
      { itemType: ItemType.PLASTIC, quantity: 8 },
      { itemType: ItemType.INGOT_COPPER, quantity: 12 },
      { itemType: ItemType.CPU_CHIP, quantity: 2 },
      { itemType: ItemType.POWER_SUPPLY, quantity: 2 },
    ],
    timeS: 90,
  },
];

/** The machines this file configures, by the item that places them. */
export const MACHINE_KIND_OF: Partial<Record<ItemType, PowerNodeKind>> = {
  [ItemType.PUMP_JACK]: 'pumpJack',
  [ItemType.REFINERY]: 'refinery',
  [ItemType.CENTRIFUGE]: 'centrifuge',
  [ItemType.REACTOR]: 'reactor',
  [ItemType.NUCLEAR_FABRICATOR]: 'nuclearFabricator',
  [ItemType.GAS_COLLECTOR]: 'gasCollector',
  [ItemType.BATTERY_LEAD_ACID]: 'battery',
  [ItemType.BATTERY_LITHIUM]: 'battery',
  [ItemType.BATTERY_SOLID_STATE]: 'battery',
};
