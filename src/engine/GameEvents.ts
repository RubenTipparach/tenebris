/**
 * Things the player did, for anything that counts them (missions).
 * Emitted where the game already does the thing; listeners must not throw.
 *
 *   crafted     key = ItemType made at a crafting grid or workbench, n = count
 *   placed      key = ItemType placed in the world (a block, machine, torch)
 *   padComplete a launch pad became complete (7 blocks, middle + ring)
 *   assembled   a pad's rocket has an engine, a tank and a command module
 *   launched    a rocket left the ground
 *   landed      key = body id where a rocket touched down safely
 *   smelted     key = ItemType a furnace or electric furnace made, n = count
 *   caught      key = ItemType of the fish landed
 *   caughtOn    key = body id the fish was landed on
 *   reached     a waypoint set 200 m or more away was reached
 *   cooked      key = ItemType a campfire, kiln or oven made
 *   ate         key = ItemType of the dish eaten
 *   pumped      key = ItemType a pump jack filled (crude oil)
 *   refined     key = ItemType a refinery made first (kerosene)
 *   enriched    key = ItemType a centrifuge made
 *   reactorBuilt key = ItemType of the reactor placed off-world
 *   onBattery   a cable network went from running on its generators to
 *               running on battery charge (src/power/PowerGrid.ts)
 *   fueled      key = ItemType burnt to refuel a rocket, n = count
 *   launchedWith key = ItemType of a part in the stack, or an item in the
 *               equipment slots, of a rocket that just launched (one per
 *               type, after 'launched')
 *   sheared     a sheep was shorn (openspec wool-air-and-reentry)
 *   chuteLanded a rocket landed under an open parachute
 *   bottled     a gas collector filled an oxygen tank
 *   suited      n = seconds breathed from tank air while exposed
 *   recharged   a battery was swapped into a landed rocket
 *
 * Items gained are not an event: they are read off the inventory itself
 * (src/player/MissionTracker.ts), since they arrive by many paths.
 */
export type GameEventType = 'crafted' | 'placed' | 'padComplete' | 'assembled' | 'launched' | 'landed'
  | 'smelted' | 'caught' | 'caughtOn' | 'reached' | 'cooked' | 'ate'
  | 'pumped' | 'refined' | 'enriched' | 'reactorBuilt'
  | 'onBattery' | 'fueled' | 'launchedWith'
  | 'sheared' | 'chuteLanded' | 'bottled' | 'suited' | 'recharged'
  | 'surveyed' | 'closePass' | 'skimmed';
export type GameEventKey = number | string | undefined;
type Listener = (type: GameEventType, key: GameEventKey, n: number) => void;

const listeners = new Set<Listener>();

export function emitGameEvent(type: GameEventType, key?: GameEventKey, n = 1): void {
  for (const l of listeners) {
    try { l(type, key, n); } catch (e) { console.error('[GameEvents]', e); }
  }
}

export function onGameEvent(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
