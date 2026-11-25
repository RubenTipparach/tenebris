// The NPC rules module (openspec friendship-npcs, design 2): one rule set
// for populations, villages, requests, traders and the time catch-up, run
// by the client directly and by the multiplayer server as the generated
// bundle server-js/npc-core.js (scripts/gen-npc-core.ts - this file is its
// entry, so everything the server uses is exported here).
// Pure: no three.js, no DOM.
export * from './rng';
export * from './population';
export * from './village';
export * from './traders';
export * from './planet';
export * from './session';
export * from './friendship';
export { catchUpSeconds, worldTimeSubsystems } from '../worldTime';
export type { WorldTimeSubsystem } from '../worldTime';
export { NPC_CONFIG, INHABITED_WORLDS, inhabitedWorld, isInhabited } from '../../config/NpcConfig';
