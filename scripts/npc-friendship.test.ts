// Friendship and meeting (openspec friendship-npcs, task 5.1): saved with
// the player's mission progress, per player, and credited only for
// deliveries the server keeps - a refused (refunded) delivery credits nothing.
//   npx tsx scripts/npc-friendship.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MissionTracker, MissionSave } from '../src/player/MissionTracker';
import { ackRecord, attachTransport, nackRecord, netSync } from '../src/net/NetSync';

const reload = (t: MissionTracker) => new MissionTracker(JSON.parse(JSON.stringify(t.save())) as MissionSave);

test('meeting is remembered across a reload, and only the first time counts as first', () => {
  const t = new MissionTracker(null);
  assert.deepEqual(t.meet('sequoia:0', 'sequoia'), { first: true, firstOnWorld: true, firstEver: true });
  assert.deepEqual(t.meet('sequoia:2', 'sequoia'), { first: true, firstOnWorld: false, firstEver: false });
  const r = reload(t);
  assert.ok(r.hasMet('sequoia:0') && r.metOn('sequoia'));
  assert.equal(r.meet('sequoia:0', 'sequoia').first, false);
  assert.equal(r.metOn('vesper'), false);
});

test('a trader is met without a world', () => {
  const t = new MissionTracker(null);
  t.meet('trader:1', null);
  assert.ok(t.hasMet('trader:1'));
  assert.equal(t.metOn('sequoia'), false);
});

test('friendship is per player (each save its own) and survives a reload', () => {
  const a = new MissionTracker(null), b = new MissionTracker(null);
  a.creditFriendship('sequoia', 0, 4);
  a.creditFriendship('sequoia', 0, 2.5);
  assert.equal(a.friendshipOf('sequoia', 0), 6.5);
  assert.equal(b.friendshipOf('sequoia', 0), 0);
  assert.equal(reload(a).friendshipOf('sequoia', 0), 6.5);
  assert.equal(a.friendshipOf('sequoia', 1), 0, 'per village');
});

test('an old save loads with nobody met and no friendship', () => {
  const old = new MissionTracker(null).save() as Partial<MissionSave>;
  delete old.met; delete old.metWorlds; delete old.friendship;
  const t = new MissionTracker(old as MissionSave);
  assert.equal(t.hasMet('sequoia:0'), false);
  assert.equal(t.friendshipOf('sequoia', 0), 0);
});

test('credit waits for the server: kept -> credited, refused -> nothing', () => {
  const sent: unknown[] = [];
  const transport = { sendRecord: (...a: unknown[]) => sent.push(a), sendChat() {}, sendLive() {}, uploadMap: async () => false } as any;
  attachTransport(transport, 2, Date.now(), 0, 'test', {});
  const t = new MissionTracker(null);
  const credit = (pts: number) => (ok: boolean) => { if (ok) t.creditFriendship('sequoia', 0, pts); };
  netSync.record('village', 'sequoia', '0', { got: 1 }, credit(3));
  assert.equal(t.friendshipOf('sequoia', 0), 0, 'nothing before the server answers');
  ackRecord('village', 'sequoia', '0', 1);
  assert.equal(t.friendshipOf('sequoia', 0), 3, 'credited once kept');
  netSync.record('village', 'sequoia', '0', { got: 2 }, credit(5));
  nackRecord('village', 'sequoia', '0', 2, { got: 1 });
  assert.equal(t.friendshipOf('sequoia', 0), 3, 'a refused delivery credits nothing');
  attachTransport(null);
  // offline nothing can refuse it: credited at once
  netSync.record('village', 'sequoia', '0', { got: 3 }, credit(2));
  assert.equal(t.friendshipOf('sequoia', 0), 5);
});
