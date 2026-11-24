// Admin monitor tests (openspec admin-monitor): the portal's game data can't
// drift from the config, the server's map projection is the game's, and the
// client's status frame survives the server's checks.
// Run: npx tsx scripts/admin-monitor.test.ts
import { readFileSync } from 'node:fs';
import { adminDataJson, ADMIN_DATA_PATH, buildAdminData } from './gen-admin-data';
import { latLon, mapUV } from '../src/nav/compass';
import { encodeStatus } from '../src/net/AdminReport';
import { ADMIN_REPORT_CONFIG } from '../src/config/AdminReportConfig';
import { MISSIONS } from '../src/config/Missions';
import { ITEM_DATA, ItemType } from '../src/player/Inventory';
import { SOLAR_SYSTEM, GAS_GIANTS } from '../src/config/SolarSystemConfig';
// @ts-ignore - plain JS modules of the server
import * as geo from '../server-js/geo.js';
// @ts-ignore
import { cleanStatus, STATUS_CHANNEL } from '../server-js/status.js';

const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) <= eps;

// ---- the shipped game data is the config's (one source)
const shipped = readFileSync(ADMIN_DATA_PATH, 'utf8');
ok(shipped === adminDataJson(), 'server-js/game-data.json matches the config (else: npx tsx scripts/gen-admin-data.ts)');
const data = buildAdminData();
ok(Object.keys(data.items).length === Object.keys(ITEM_DATA).length - 1, 'every item but NONE is listed');
ok(data.items[ItemType.ROCK_PICKAXE]?.maxUses !== undefined, 'a tool carries its use budget');
ok(data.missions.length === MISSIONS.length && data.missions.every((m, i) => m.id === MISSIONS[i].id), 'every mission, in the tree order');
ok(data.bodies.length === SOLAR_SYSTEM.bodies.length + GAS_GIANTS.length, 'every body and gas giant');
ok(data.bodies.every(b => b.id === 'sun' || data.bodies.some(p => p.id === b.parent)), 'every body orbits a listed body');
ok(data.bodies.filter(b => b.landable).length > 0 && data.bodies.every(b => /^#[0-9a-f]{6}$/i.test(b.colour)), 'every body has a colour');

// ---- the server's projection is the game's (compass.ts latLon / mapUV)
let worst = 0;
let seed = 12345;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 * 2 - 1; };
for (let i = 0; i < 2000; i++) {
  const d = { x: rnd(), y: rnd(), z: rnd() };
  const a = latLon(d), b = geo.latLon(d);
  const u = mapUV(d), v = geo.mapUV(d);
  worst = Math.max(worst, Math.abs(a.lat - b.lat), Math.abs(a.lon - b.lon), Math.abs(u.u - v.u), Math.abs(u.v - v.v));
}
ok(worst < 1e-12, `geo.js lat/lon and map u,v equal compass.ts over 2000 directions (worst ${worst})`);
// markers: a known spot on a body
const body = { radius: 100, position: { x: 1000, y: 0, z: 500 } };
const north = geo.placeOn([1000, 110, 500], body);
ok(near(north.lat, 90) && near(north.alt, 10) && near(north.v, 0), 'the north pole: lat 90, map top, altitude over the radius');
const east = geo.placeOn([1000, 0, 400], body);   // -Z from the centre is east at lon 0
ok(near(east.lat, 0) && near(east.lon, 90) && near(east.u, 0.75) && near(east.v, 0.5), 'east of lon 0 (-Z): lon 90, three quarters across');
const west = geo.placeOn([900, 0, 500], body);    // -X: the antimeridian
ok(near(Math.abs(west.lon), 180) && (near(west.u, 0) || near(west.u, 1)), 'the antimeridian sits on the map edge');

// ---- the status frame: encode -> the server's checks -> the same frame
ok(STATUS_CHANNEL === ADMIN_REPORT_CONFIG.STATUS_CHANNEL, 'client and server agree on the status channel');
const slots = Array.from({ length: 40 }, () => ({ itemType: 0, quantity: 0 } as { itemType: number; quantity: number; uses?: number }));
slots[0] = { itemType: ItemType.LOG, quantity: 4 };
slots[12] = { itemType: ItemType.STONE, quantity: 64 };
slots[36] = { itemType: ItemType.ROCK_PICKAXE, quantity: 1, uses: 150 };
const frame = encodeStatus({
  slots,
  suit: { worn: true, tankS: 123.4 },
  riding: false,
  missions: { done: ['logs', 'planks'], now: 'stone', prog: [3] },
});
ok(frame.inv.length === 3, 'only non-empty slots go');
ok(JSON.stringify(frame.inv) === JSON.stringify([[0, ItemType.LOG, 4], [12, ItemType.STONE, 64], [36, ItemType.ROCK_PICKAXE, 1, 150]]), 'slot, item, count, wear');
ok(frame.suit?.tankS === 120, 'tank air goes in TANK_STEP_S steps');
const kept = cleanStatus(JSON.parse(JSON.stringify(frame)));
ok(JSON.stringify(kept) === JSON.stringify(frame), 'the server keeps the frame as sent');
ok(cleanStatus({ v: 2 }) === null && cleanStatus(null) === null, 'not a frame: dropped');
const bad = cleanStatus({ v: 1, inv: [[0, 1, 1], ['x', 1, 1], [0, -1, 1], [1, 2, 3, 4, 5]], m: { done: ['ok', 'bad id!', 7], now: '<script>', prog: [1, 'x'] }, ride: 'warp' });
ok(bad.inv.length === 1 && bad.m.done.length === 1 && bad.m.now === null && bad.m.prog.length === 1 && bad.ride === 'walk', 'junk fields are dropped');
const riding = encodeStatus({ slots: [], suit: null, riding: true, missions: null });
ok(riding.ride === 'rocket' && riding.m.now === null && riding.inv.length === 0, 'a rocket ride with no missions yet');
