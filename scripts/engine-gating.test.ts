// Engine gating (openspec space-exploration, task 5.5): every engine past the
// Moon is unlocked by exactly one visit mission and is built (or fuelled)
// from a body resource that its route has already reached - never from a
// body further along its own route.
//   npx tsx scripts/engine-gating.test.ts
import { MISSIONS, BODY_RESOURCES } from '../src/config/Missions';
import { ItemType, ITEM_DATA } from '../src/player/Inventory';
import { PRINTER_RECIPES } from '../src/player/Printer3DUI';
import { FABRICATOR_RECIPES } from '../src/config/PowerConfig';
import { SMELTING_RECIPES } from '../src/config/SmeltingRecipes';
import { engineNeeds } from '../src/rocket/RocketPerformance';

const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const I = ItemType;
const LADDER = [I.ION_THRUSTER, I.GAS_CORE_ENGINE, I.FISSION_FRAGMENT_DRIVE, I.NUCLEAR_PULSE_DRIVE, I.FUSION_DRIVE, I.FUSION_TORCH];
const byId = new Map(MISSIONS.map(m => [m.id, m]));
const missionBody = (id: string) => byId.get(id)?.visit ?? (id === 'moon' || id === 'sequoia' ? id : undefined);

// Everything an item is made of, all the way down (recipes, smelting), plus what its engine burns
function ingredients(item: ItemType, seen = new Set<ItemType>()): Set<ItemType> {
  if (seen.has(item)) return seen;
  seen.add(item);
  const ins = [
    ...PRINTER_RECIPES.filter(r => r.output === item).flatMap(r => r.inputs.map(i => i.itemType)),
    ...FABRICATOR_RECIPES.filter(r => r.output === item).flatMap(r => r.inputs.map(i => i.itemType)),
    ...SMELTING_RECIPES.filter(r => r.output === item).map(r => r.input),
    ...engineNeeds([item]).consumes.keys(),
  ];
  for (const i of ins) ingredients(i, seen);
  return seen;
}
// Which body a body resource comes from
const resourceBody = new Map<ItemType, string>();
for (const [body, items] of Object.entries(BODY_RESOURCES)) for (const i of items ?? []) resourceBody.set(i, body);
// A mission's ancestors (itself included)
function lineage(id: string): string[] {
  const out: string[] = [];
  for (let m = byId.get(id); m; m = m.parent ? byId.get(m.parent) : undefined) out.push(m.id);
  return out;
}
const visitOfBody = (body: string) => MISSIONS.find(m => missionBody(m.id) === body)?.id;

for (const engine of LADDER) {
  const name = ITEM_DATA[engine].name;
  const unlockers = MISSIONS.filter(m => m.unlocks?.includes(engine));
  ok(unlockers.length === 1 && missionBody(unlockers[0].id) !== undefined, `${name} is unlocked by exactly one visit mission (${unlockers.map(m => m.id).join(', ')})`);
  if (unlockers.length !== 1) continue;
  const at = unlockers[0];
  const before = new Set(lineage(at.id));
  const bodies = [...ingredients(engine)].map(i => resourceBody.get(i)).filter((b): b is string => !!b);
  const reached = bodies.filter(b => { const v = visitOfBody(b); return v !== undefined && before.has(v); });
  ok(reached.length > 0, `${name} uses a resource from ${missionBody(at.id)} or earlier on its route (${[...new Set(bodies)].join(', ')})`);
  // none from a body whose visit comes after this one on the same route
  const later = bodies.filter(b => { const v = visitOfBody(b); return v !== undefined && v !== at.id && lineage(v).includes(at.id); });
  ok(later.length === 0, `${name} needs nothing from further along its route${later.length ? ` (${later.join(', ')})` : ''}`);
}
// The torch is where both routes meet: coronal data from the Sun and helium-3 from the outer planets
const torch = [...ingredients(I.FUSION_TORCH)].map(i => resourceBody.get(i));
ok(torch.includes('sun') && torch.includes('aurelia'), 'the fusion torch needs both routes (the Sun and Aurelia)');
