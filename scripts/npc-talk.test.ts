// Talking to NPCs (openspec friendship-npcs, task 4.1): the prompt reads the
// Interact binding's own label, so a remap changes it, and it is plain ASCII.
//   npx tsx scripts/npc-talk.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WALKER_INPUTS } from '../src/config/WalkerInputs';
import { SUBMARINE_INPUTS } from '../src/config/DivingConfig';
import { talkPrompt } from '../src/npc/NpcTalk';

test('the prompt follows the Interact binding', () => {
  assert.equal(talkPrompt('Oru'), '[F] talk to Oru');
  assert.equal(talkPrompt('Oru', 'KeyG'), '[G] talk to Oru');
  assert.equal(talkPrompt('Oru', 'Digit5'), '[5] talk to Oru');
});

test('one on-foot Interact key: the submarine boards on the same one', () => {
  assert.equal(SUBMARINE_INPUTS.INTERACT, WALKER_INPUTS.INTERACT);
});

test('the prompt is ASCII only', () => {
  assert.match(talkPrompt('Kor Dexel'), /^[\x20-\x7e]+$/);
});
