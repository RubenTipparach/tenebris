// The server's NPC rules bundle (openspec friendship-npcs, task 1.5):
// server-js/npc-core.js is generated from src/shared/npc and must be exactly
// what the generator builds now - edit the source and forget to regenerate,
// and this fails. Also checks the bundle is the same rules as the source
// (same people, same requests) and is copied into the server image.
// Run: npx tsx scripts/npc-core.test.ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildNpcCore, NPC_CORE_PATH } from './gen-npc-core';
import { buildPopulation, createPlanetNpc, createTraders } from '../src/shared/npc';

const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };

const shipped = readFileSync(NPC_CORE_PATH, 'utf8');
const fresh = await buildNpcCore();
ok(shipped === fresh, 'server-js/npc-core.js matches src/shared/npc (else: npx tsx scripts/gen-npc-core.ts)');
ok(!/from ['"]three['"]|document\.|window\./.test(fresh), 'the bundle has no three.js and no DOM');

// @ts-ignore - the generated plain JS module
const core = await import('../server-js/npc-core.js');
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
ok(same(core.buildPopulation(31337, 'umbra'), buildPopulation(31337, 'umbra')), 'the bundle builds the same people as the source');
ok(same(core.createPlanetNpc(31337, 'ferrum'), createPlanetNpc(31337, 'ferrum')), 'and the same villages and requests');
ok(same(core.createTraders(31337, () => 0), createTraders(31337, () => 0)), 'and the same traders');

const dockerfile = readFileSync(fileURLToPath(new URL('../server-js/Dockerfile', import.meta.url)), 'utf8');
ok(/^COPY .*\bnpc-core\.js\b/m.test(dockerfile), 'the server Dockerfile copies npc-core.js');
