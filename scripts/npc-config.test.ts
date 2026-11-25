// NPC config (openspec friendship-npcs, task 1.1): who lives where, against
// the real solar system - species disjoint across worlds (and from every
// fauna and flora species), nobody on Earth or a lifeless body, every count
// range as the spec says, every item real.
// Run: npx tsx scripts/npc-config.test.ts
import { INHABITED_WORLDS, NPC_CONFIG, InhabitedWorld, assertNpcRostersDisjoint, assertNpcWorldsAlive, isInhabited } from '../src/config/NpcConfig';
import { SOLAR_SYSTEM, CelestialBodyType } from '../src/config/SolarSystemConfig';
import { FAUNA_SPECIES_IDS, FAUNA_LIFELESS } from '../src/config/FaunaConfig';
import { ITEM_DATA, ItemType } from '../src/player/Inventory';

const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const throws = (f: () => void, re: RegExp) => { try { f(); return false; } catch (e) { return re.test(String((e as Error).message)); } };

// ---- the inhabited worlds are exactly the design's ten
const expected = ['ferrum', 'sequoia', 'cinder', 'vesper', 'halcyon', 'tessaly', 'umbra', 'verdance', 'mirewood', 'thalassa'];
const listed = INHABITED_WORLDS.map(w => w.body);
ok(listed.length === expected.length && expected.every(b => listed.includes(b)), `the inhabited worlds are ${expected.join(', ')}`);

// ---- counts
const ferrum = INHABITED_WORLDS.find(w => w.body === 'ferrum')!;
ok(ferrum.population[0] === 15 && ferrum.population[1] === 20, 'Metropole Prime (ferrum) holds 15-20 people');
ok(INHABITED_WORLDS.filter(w => w.body !== 'ferrum').every(w => w.population[0] === 5 && w.population[1] === 10), 'every other inhabited world holds 5-10');
ok(INHABITED_WORLDS.every(w => w.villages >= 1 && w.population[0] >= w.villages && w.villageNames.length >= w.villages), 'every world has a village, each with room for its elder, and names for them all');

// ---- nobody on Earth or a lifeless body (against the real bodies)
const bodies = SOLAR_SYSTEM.bodies.map(b => ({ id: b.id, type: b.type as string, landable: b.landable, alive: !!b.flora || !!b.terrain.city }));
let aliveOk = true;
try { assertNpcWorldsAlive(bodies); } catch (e) { aliveOk = false; console.log('  ', (e as Error).message); }
ok(aliveOk, 'every listed world is a real, landable, living (or city) body');
ok(!isInhabited('earth') && !isInhabited('moon'), 'nobody on Earth or the Moon');
const lifeless = SOLAR_SYSTEM.bodies.filter(b => b.type === CelestialBodyType.ASTEROID || (!b.flora && !b.terrain.city));
ok(lifeless.length > 10 && lifeless.every(b => !isInhabited(b.id)), `no asteroid or lifeless body is inhabited (${lifeless.length} checked)`);
ok(FAUNA_LIFELESS.filter(b => b !== 'ferrum').every(b => !isInhabited(b)), 'the fauna-lifeless worlds have nobody (the city world aside)');
ok(throws(() => assertNpcWorldsAlive(bodies.map(b => b.id === 'cinder' ? { ...b, alive: false } : b)), /lifeless/), 'a listed world that is lifeless throws');

// ---- one species per world, never on two (and not a fauna / trader species)
const species = INHABITED_WORLDS.map(w => w.species.id);
ok(new Set(species).size === species.length, 'no NPC species lives on two worlds');
ok(!species.includes(NPC_CONFIG.TRADERS.SPECIES.id), 'the traders are a species of their own');
ok(species.every(s => !FAUNA_SPECIES_IDS.includes(s)), 'no NPC species is also a fauna species');
let disjointOk = true;
try { assertNpcRostersDisjoint(); } catch { disjointOk = false; }
ok(disjointOk, 'the load-time roster assert passes on the shipped table');
const leak: InhabitedWorld[] = INHABITED_WORLDS.map(w => w.body === 'vesper' ? { ...w, species: INHABITED_WORLDS[1].species } : w);
ok(throws(() => assertNpcRostersDisjoint(leak), /lives on both/), 'a species leaking onto a second world throws');
const artLeak: InhabitedWorld[] = INHABITED_WORLDS.map(w => w.body === 'umbra' ? { ...w, art: INHABITED_WORLDS[0].art } : w);
ok(throws(() => assertNpcRostersDisjoint(artLeak), /art piece/), 'an art piece on two worlds throws');
ok(new Set(INHABITED_WORLDS.map(w => w.art.id)).size === INHABITED_WORLDS.length, 'every world has its own art piece');
const goods = INHABITED_WORLDS.flatMap(w => w.goods);
ok(INHABITED_WORLDS.every(w => w.goods.length > 0) && new Set(goods).size === goods.length, 'every world has goods of its own for traders');

// ---- every item the tables name is a real item
const items: ItemType[] = [
  ...goods, ...NPC_CONFIG.SUPPLY_FOODS.map(f => f.item), ...NPC_CONFIG.TRADERS.WANTS,
  ...NPC_CONFIG.STRUCTURES.flatMap(s => s.stages.map(x => x.item)),
  ...INHABITED_WORLDS.flatMap(w => w.rewards.flatMap(r => r.recipes)),
];
ok(items.every(i => ITEM_DATA[i] !== undefined && i !== ItemType.NONE), `every item named is in ITEM_DATA (${items.length})`);

// ---- traders
ok(NPC_CONFIG.TRADERS.BAND.length >= 2 && NPC_CONFIG.TRADERS.BAND.every(t => t.route.length >= 2 && t.route.every(isInhabited)), 'a small band of traders, each routed through inhabited worlds');
ok(new Set(NPC_CONFIG.TRADERS.BAND.map(t => t.name)).size === NPC_CONFIG.TRADERS.BAND.length, 'trader names are unique');

// ---- tunables are sane
const T = NPC_CONFIG;
ok(T.CATCH_UP_CAP_S > 3600 && T.SERVER_TICK_S > 0 && T.CLOCK_STAMP_S >= T.SERVER_TICK_S, 'catch-up cap, tick and clock stamp');
ok(T.FOOD.START_PER_RESIDENT > T.FOOD.LOW_PER_RESIDENT && T.FOOD.LOW_PER_RESIDENT > 0 && T.FOOD.USE_PER_RESIDENT_PER_HOUR > 0, 'the food store starts above its low mark and is used up');
ok(T.REQUESTS.OPEN >= 3 && T.REQUESTS.REOPEN_DELAY_S > 0, 'a village keeps three or more requests');
ok(T.FRIENDSHIP.LEVELS.every((x, i, a) => x > 0 && (i === 0 || x > a[i - 1])), 'friendship thresholds rise');
ok(INHABITED_WORLDS.every(w => w.rewards.every(r => r.level >= 1 && r.level <= T.FRIENDSHIP.LEVELS.length)), 'every reward names a real level');
ok(T.TRADERS.STAY_S > T.TRADERS.RESTOCK_S && T.TRADERS.OFFERS >= 2, 'a trader restocks during its stay and offers a few barters');
