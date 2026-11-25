// Friendship with a village (openspec friendship-npcs, design 9): a score
// per player per village, read as a level against NPC_CONFIG.FRIENDSHIP.LEVELS.
//
// Pure: no three.js, no DOM.
import { NPC_CONFIG } from '../../config/NpcConfig';

export interface FriendshipLevel {
  level: number;        // 0 .. LEVELS.length
  into: number;         // score past this level's threshold
  span: number;         // score from this level to the next (0 at the top)
}

export function friendshipLevel(score: number): FriendshipLevel {
  const L = NPC_CONFIG.FRIENDSHIP.LEVELS;
  let level = 0;
  while (level < L.length && score >= L[level]) level++;
  const from = level === 0 ? 0 : L[level - 1];
  const to = level < L.length ? L[level] : from;
  return { level, into: score - from, span: to - from };
}
