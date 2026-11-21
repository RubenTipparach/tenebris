import { ItemType } from '../player/Inventory';

/**
 * The mission chain (openspec navigation-and-orbits, missions): from the
 * first logs to landing on the Moon, in the order each step unlocks the
 * next. Each objective counts one kind of thing the player does:
 *
 *   gained      hold `count` more of `item` than when the mission opened
 *   crafted     make `item` at a crafting grid or workbench
 *   placed      place `item` in the world
 *   padComplete finish a 7-block launch pad
 *   assembled   put an engine, a tank and a command module on a pad
 *   launched    take off in a rocket
 *   landed      land a rocket on `body`
 *
 * Text is shown in game: plain ASCII, short.
 */
export type ObjectiveKind = 'gained' | 'crafted' | 'placed' | 'padComplete' | 'assembled' | 'launched' | 'landed';

export interface MissionObjective {
  kind: ObjectiveKind;
  item?: ItemType;
  body?: string;
  count: number;
  label: string;
}

export interface Mission {
  id: string;
  title: string;
  help: string;
  objectives: MissionObjective[];
}

export const MISSIONS: Mission[] = [
  {
    id: 'logs', title: 'Chop a tree', help: 'Hit a tree trunk until it falls.',
    objectives: [{ kind: 'gained', item: ItemType.LOG, count: 4, label: 'Logs' }],
  },
  {
    id: 'planks', title: 'Make planks', help: 'Press E and craft Wood Planks from a log.',
    objectives: [{ kind: 'crafted', item: ItemType.WOOD, count: 4, label: 'Planks' }],
  },
  {
    id: 'stone', title: 'Dig stone', help: 'Dig down through the dirt.',
    objectives: [{ kind: 'gained', item: ItemType.STONE, count: 8, label: 'Stone' }],
  },
  {
    id: 'furnace', title: 'Build a furnace', help: 'Craft a Furnace and place it.',
    objectives: [
      { kind: 'crafted', item: ItemType.FURNACE, count: 1, label: 'Furnace made' },
      { kind: 'placed', item: ItemType.FURNACE, count: 1, label: 'Furnace placed' },
    ],
  },
  {
    id: 'iron', title: 'Find iron', help: 'Iron ore sits deeper in the rock.',
    objectives: [
      { kind: 'gained', item: ItemType.ORE_IRON, count: 3, label: 'Iron ore' },
      { kind: 'gained', item: ItemType.ORE_COAL, count: 2, label: 'Coal ore' },
    ],
  },
  {
    id: 'ingots', title: 'Smelt iron', help: 'Put iron ore and coal in the furnace.',
    objectives: [{ kind: 'gained', item: ItemType.INGOT_IRON, count: 3, label: 'Iron ingots' }],
  },
  {
    id: 'workbench', title: 'Electronics workbench', help: 'Craft one and place it.',
    objectives: [{ kind: 'placed', item: ItemType.ELECTRONICS_WORKBENCH, count: 1, label: 'Workbench placed' }],
  },
  {
    id: 'printer', title: 'Build a 3D printer', help: 'Make it at the electronics workbench.',
    objectives: [{ kind: 'placed', item: ItemType.PRINTER_3D, count: 1, label: '3D printer placed' }],
  },
  {
    id: 'padblocks', title: 'Print pad blocks', help: 'Print Launch Pad Blocks on the 3D printer.',
    objectives: [{ kind: 'gained', item: ItemType.LAUNCH_PAD_BLOCK, count: 7, label: 'Launch Pad Blocks' }],
  },
  {
    id: 'pad', title: 'Lay a launch pad', help: 'Place 7 blocks: one in the middle, 6 around it.',
    objectives: [{ kind: 'padComplete', count: 1, label: 'Launch pad' }],
  },
  {
    id: 'parts', title: 'Print rocket parts', help: 'Print them on the 3D printer.',
    objectives: [
      { kind: 'gained', item: ItemType.LAUNCH_PAD_SEGMENT, count: 3, label: 'Tower segments' },
      { kind: 'gained', item: ItemType.ROCKET_ENGINE, count: 1, label: 'Rocket Engine' },
      { kind: 'gained', item: ItemType.MEDIUM_FUEL_TANK, count: 1, label: 'Fuel Tank' },
      { kind: 'gained', item: ItemType.COMMAND_MODULE, count: 1, label: 'Command Module' },
    ],
  },
  {
    id: 'assemble', title: 'Build the rocket', help: 'Open the pad: add the tower, then the parts.',
    objectives: [{ kind: 'assembled', count: 1, label: 'Rocket built' }],
  },
  {
    id: 'launch', title: 'Launch', help: 'Board the rocket and throttle up.',
    objectives: [{ kind: 'launched', count: 1, label: 'Lift off' }],
  },
  {
    id: 'moon', title: 'Land on the Moon', help: 'Fly to the Moon and land on your engine.',
    objectives: [{ kind: 'landed', body: 'moon', count: 1, label: 'Landed on the Moon' }],
  },
];

// How often (s) held items are read for "gained" objectives
export const MISSION_SAMPLE_S = 0.5;
