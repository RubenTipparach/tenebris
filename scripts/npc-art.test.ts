// Art pieces (openspec friendship-npcs, task 4.4): every inhabited world's
// piece is an item with its own icon (scripts/gen-item-icons.py), named the
// same in NpcConfig and ITEM_DATA, and only that world's elders give it.
//   npx tsx scripts/npc-art.test.ts
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { INHABITED_WORLDS, REQUEST_FAMILIES, artItem } from '../src/config/NpcConfig';
import { ITEM_DATA } from '../src/player/Inventory';
import { artReward } from '../src/shared/npc';

const pub = (p: string) => new URL(`../public${p}`, import.meta.url);

test('every piece is an item with its own 16x16 icon', () => {
  const items = new Set<number>(), icons = new Set<string>();
  for (const w of INHABITED_WORLDS) {
    const d = ITEM_DATA[w.art.item];
    assert.ok(d, `${w.art.id} is an item`);
    assert.equal(d.name, w.art.name, `${w.art.id}: one name in NpcConfig and ITEM_DATA`);
    assert.equal(d.texture, `/textures/icons/art/${w.art.id}.png`);
    assert.ok(existsSync(pub(d.texture!)), `${d.texture} exists`);
    const png = readFileSync(pub(d.texture!));
    assert.equal(png.readUInt32BE(16), 16); assert.equal(png.readUInt32BE(20), 16);
    assert.equal(artItem(w.art.id), w.art.item);
    items.add(w.art.item); icons.add(d.texture!);
  }
  assert.equal(items.size, INHABITED_WORLDS.length, 'one item per world');
  assert.equal(icons.size, INHABITED_WORLDS.length, 'one icon per world');
});

test("a world's elders give its own piece and no other world's", () => {
  for (const w of INHABITED_WORLDS) {
    const given = new Set<number>();
    for (const fam of REQUEST_FAMILIES) {
      const r = artReward(w.body, fam, true);
      if (r) given.add(r.item);
      assert.equal(artReward(w.body, fam, false), null, 'nothing for an unfinished request');
    }
    assert.deepEqual([...given], [w.art.item], `${w.body} gives only ${w.art.id}`);
  }
  assert.equal(artReward('earth', 'supply', true), null, 'nobody lives on Earth to give one');
});

test('collect requests never ask a village for its own piece', async () => {
  const { createVillage, advanceVillage } = await import('../src/shared/npc');
  for (const w of INHABITED_WORLDS) {
    let v = createVillage({ worldSeed: 9, body: w.body, index: 0 }, 6, 0);
    v = advanceVillage({ worldSeed: 9, body: w.body, index: 0 }, v, 0, 3600 * 24 * 30);
    for (const q of v.requests) if (q.art) assert.notEqual(q.art, w.art.id);
  }
});
