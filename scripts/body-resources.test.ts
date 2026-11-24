// Body resources (openspec space-exploration, task 6.1): each body resource
// is gathered on its own body only, has an icon, and its block a texture.
//   npx tsx scripts/body-resources.test.ts
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { BODY_RESOURCES } from '../src/config/Missions';
import { ItemType, ITEM_DATA } from '../src/player/Inventory';
import { HexBlockType, blockFaces } from '../src/shared/blockTypes';
import { SOLAR_SYSTEM } from '../src/config/SolarSystemConfig';

const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const pbi = readFileSync(join(ROOT, 'src/player/PlanetBlockInteraction.ts'), 'utf8');
const hexBlock = readFileSync(join(ROOT, 'src/planet/HexBlock.ts'), 'utf8');

// What each block drops, read from the one mapping the game mines with
const drops = new Map<number, number>();
for (const m of pbi.matchAll(/case HexBlockType\.(\w+): return ItemType\.(\w+);/g)) {
  const b = (HexBlockType as unknown as Record<string, number>)[m[1]];
  const i = (ItemType as unknown as Record<string, number>)[m[2]];
  if (b !== undefined && i !== undefined && !drops.has(b)) drops.set(b, i);
}
// Which bodies' deposits yield an item
function bodiesYielding(item: ItemType): string[] {
  return SOLAR_SYSTEM.bodies.filter(b => (b.terrain?.extraOres ?? []).some(d => drops.get(d.type) === item)).map(b => b.id);
}
// Gathered elsewhere (not mined): the Sun's field data on a close pass, deep
// ocean / gas-giant resources by submarine and diver (phases 7 and 8)
const NOT_MINED = new Set<ItemType>([ItemType.CORONAL_DATA, ItemType.DEUTERIUM, ItemType.HELIUM_3, ItemType.METALLIC_HYDROGEN, ItemType.ORE_TITANIUM]);

for (const [body, items] of Object.entries(BODY_RESOURCES)) {
  for (const item of items ?? []) {
    const name = ITEM_DATA[item].name;
    const tex = ITEM_DATA[item].texture;
    ok(!!tex && existsSync(join(ROOT, 'public', tex)), `${name} has an icon (${tex})`);
    if (NOT_MINED.has(item)) continue;
    const where = bodiesYielding(item);
    ok(where.length === 1 && where[0] === body, `${name} is mined on ${body} only (${where.join(', ') || 'nowhere'})`);
    const block = [...drops].find(([, i]) => i === item)?.[0];
    const key = block !== undefined ? blockFaces(block)?.top : undefined;
    const path = key ? hexBlock.match(new RegExp(`\\['${key}', '([^']+)'\\]`))?.[1] : undefined;
    ok(!!path && existsSync(join(ROOT, 'public/textures', `${path}.png`)), `${name}'s block has its own texture (${path})`);
  }
}
// The Moon's titanium is its own too (an existing ore, remapped on the Moon only)
const titanium = SOLAR_SYSTEM.bodies.filter(b => Object.values(b.terrain?.blockRemap ?? {}).includes(HexBlockType.MOON_ORE_TITANIUM)).map(b => b.id);
ok(titanium.length === 1 && titanium[0] === 'moon', `titanium ore is the Moon's only (${titanium.join(', ')})`);
