// Body environments (openspec space-exploration, body-environments): every
// body has one, and atmosphere density agrees with hasAtmosphere - one fact
// in two places, checked here so they can't drift.
// Run: npx tsx scripts/environment.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SOLAR_SYSTEM, GAS_GIANTS, BODY_ENVIRONMENTS } from '../src/config/SolarSystemConfig';

const ids = [...SOLAR_SYSTEM.bodies.map(b => b.id), ...GAS_GIANTS.map(g => g.id)];

test('every body and gas giant has an environment', () => {
  const missing = ids.filter(id => !BODY_ENVIRONMENTS[id]);
  assert.deepEqual(missing, []);
  const extra = Object.keys(BODY_ENVIRONMENTS).filter(id => !ids.includes(id));
  assert.deepEqual(extra, [], 'no environment for a body that does not exist');
});

test('atmosphere density > 0 exactly where the body has an atmosphere, and on the gas giants', () => {
  for (const b of SOLAR_SYSTEM.bodies) {
    if (b.id === 'sun') continue;
    assert.equal(BODY_ENVIRONMENTS[b.id].atmosphereDensity > 0, !!b.hasAtmosphere, b.id);
  }
  for (const g of GAS_GIANTS) assert.ok(BODY_ENVIRONMENTS[g.id].atmosphereDensity > 0, g.id);
});

test('a breathable world is temperate and shielded', () => {
  for (const b of SOLAR_SYSTEM.bodies.filter(x => x.breathable)) {
    assert.equal(BODY_ENVIRONMENTS[b.id].temperature, 'temperate', b.id);
    assert.equal(BODY_ENVIRONMENTS[b.id].radiation, 'none', b.id);
  }
});
