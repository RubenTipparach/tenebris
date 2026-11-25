// Single-player NPC time (openspec friendship-npcs, task 3.1): the client
// runs the same session as the server over its own saved records, so a
// save reloaded after a day applies the same capped catch-up the server
// would.
//   npx tsx scripts/npc-local.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NpcWorld, NPC_CONFIG, NPC_RECORDS, catchUpPlanet, createPlanetNpc, NpcClock, VillageState } from '../src/shared/npc';
import { LocalNpcStore, NpcRecordMap } from '../src/npc/LocalNpcStore';

const SEED = 4242, BODY = 'sequoia', H = 3600 * 1000;
const t0 = Date.UTC(2026, 10, 25, 12);

// A "save": the record map as localStorage would hold it (JSON round trip)
function session(saved: NpcRecordMap) {
  let disk = JSON.stringify(saved);
  const store = new LocalNpcStore(JSON.parse(disk), (r) => { disk = JSON.stringify(r); });
  const world = new NpcWorld(SEED, { get: (k, p, key) => store.get(k, p, key), write: (k, p, key, d) => store.write(k, p, key, d) });
  return { store, world, disk: () => JSON.parse(disk) as NpcRecordMap };
}

test('first visit creates the villages, saved at once', () => {
  const s = session({});
  s.world.wake(BODY, t0);
  const villages = s.store.list(NPC_RECORDS.VILLAGE, BODY);
  assert.equal(villages.length, createPlanetNpc(SEED, BODY)!.villages.length);
  assert.ok(Object.keys(s.disk()).some(a => a.startsWith(`${NPC_RECORDS.VILLAGE}|${BODY}|`)), 'written to the save the same moment');
});

test('a save reloaded after a day applies the capped catch-up the server would', () => {
  // play an hour, leave
  const a = session({});
  a.world.wake(BODY, t0);
  a.world.tick(BODY, t0 + H / 2);
  a.world.sleep(BODY, t0 + H);
  const saved = a.disk();
  const clock = a.store.get(NPC_RECORDS.CLOCK, BODY, NPC_RECORDS.CLOCK_KEY) as NpcClock;
  assert.equal(clock.awake, false);

  // reload a day later and land again
  const b = session(saved);
  const applied = b.world.wake(BODY, t0 + H + 24 * H);
  assert.equal(Math.round(applied), 24 * 3600, 'the whole day, under the cap');

  // what the server's catch-up gives from the same records
  const villages = [0, 1].map(i => saved[`${NPC_RECORDS.VILLAGE}|${BODY}|${i}`] as VillageState);
  const traders = [0, 1, 2].map(i => saved[`${NPC_RECORDS.TRADER}|${NPC_RECORDS.TRADER_PLANET}|${i}`] as never);
  const expected = catchUpPlanet(SEED, BODY, { T: clock.T, villages }, traders, clock.at, t0 + H + 24 * H, () => clock.T);
  for (let i = 0; i < 2; i++) assert.deepEqual(b.store.get(NPC_RECORDS.VILLAGE, BODY, String(i)), expected.planet.villages[i]);
});

test('an absence longer than the cap advances by the cap', () => {
  const a = session({});
  a.world.wake(BODY, t0);
  a.world.sleep(BODY, t0 + H);
  const b = session(a.disk());
  const applied = b.world.wake(BODY, t0 + H + 90 * 24 * H);
  assert.equal(applied, NPC_CONFIG.CATCH_UP_CAP_S);
});

test('a tab closed without a clean sleep catches up from its last stamp', () => {
  const a = session({});
  a.world.wake(BODY, t0);
  a.world.tick(BODY, t0 + 2 * NPC_CONFIG.CLOCK_STAMP_S * 1000);   // restamped while awake
  const stamp = (a.store.get(NPC_RECORDS.CLOCK, BODY, NPC_RECORDS.CLOCK_KEY) as NpcClock).at;
  const b = session(a.disk());
  const applied = b.world.wake(BODY, stamp + 5 * H);
  assert.equal(Math.round(applied), 5 * 3600);
});

test('nobody lives on Earth: waking it writes nothing', () => {
  const s = session({});
  s.world.wake('earth', t0);
  assert.deepEqual(s.disk(), {});
});
