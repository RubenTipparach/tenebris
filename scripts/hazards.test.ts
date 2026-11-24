// Hostile environments (openspec space-exploration, body-environments 2.2):
// heat, cold and high radiation drain their own gauges unless the suit is
// rated or the player is in a powered cabin; gauges recover when safe.
// Run: npx tsx scripts/hazards.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ENVIRONMENT } from '../src/config/SurvivalConfig';
import { bodyEnvironment } from '../src/config/SolarSystemConfig';
import { ItemType } from '../src/player/Inventory';
import { environmentExposure, newEnvState, tickEnvironment, hazardLevels, ExposureInput } from '../src/player/Survival';

const on = (body: string, extra: Partial<ExposureInput> = {}): ExposureInput =>
  ({ inRocket: false, rocketPowered: false, inGravityWell: true, bodyBreathable: false, environment: bodyEnvironment(body), ...extra });

test('levels: hot 1 / scorching 2 heat, cold 1 / frozen 2 cold, high radiation 1', () => {
  assert.deepEqual(hazardLevels(bodyEnvironment('vesper')), { heat: 1, cold: 0, radiation: 0 });
  assert.deepEqual(hazardLevels(bodyEnvironment('pyrra')), { heat: 2, cold: 0, radiation: 1 });
  assert.deepEqual(hazardLevels(bodyEnvironment('tessaly')), { heat: 0, cold: 2, radiation: 0 });
  assert.deepEqual(hazardLevels(bodyEnvironment('moon')), { heat: 0, cold: 0, radiation: 0 }, 'low radiation is harmless');
});

test('cold drains on Tessaly in a plain space suit, and kills when it runs out', () => {
  const s = newEnvState();
  const ex = environmentExposure(on('tessaly'), ItemType.SPACE_SUIT);
  assert.equal(ex.cold, true);
  assert.equal(tickEnvironment(s, ENVIRONMENT.GAUGE_S / 2, ex), null);
  assert.ok(Math.abs(s.cold - ENVIRONMENT.GAUGE_S / 2) < 1e-9);
  assert.equal(tickEnvironment(s, ENVIRONMENT.GAUGE_S, ex), 'cold');
});

test('a temperate world drains nothing, even without a suit', () => {
  assert.deepEqual(environmentExposure(on('sequoia'), null), { heat: false, cold: false, radiation: false });
});

test('a powered cabin keeps everything out; an unpowered one does not', () => {
  assert.deepEqual(environmentExposure(on('pyrra', { inRocket: true, rocketPowered: true }), null), { heat: false, cold: false, radiation: false });
  assert.equal(environmentExposure(on('pyrra', { inRocket: true, rocketPowered: false }), null).heat, true);
});

test('open space has no temperature; the debug jetpack skips it all', () => {
  assert.equal(environmentExposure({ inRocket: false, rocketPowered: false, inGravityWell: false, bodyBreathable: false, environment: null }, null).cold, false);
  assert.equal(environmentExposure(on('glacia', { jetpack: true }), null).cold, false);
});

test('gauges recover once safe, up to full', () => {
  const s = newEnvState();
  tickEnvironment(s, 30, { heat: true, cold: false, radiation: false });
  tickEnvironment(s, 30 / ENVIRONMENT.RECOVER_RATE, { heat: false, cold: false, radiation: false });
  assert.ok(Math.abs(s.heat - ENVIRONMENT.GAUGE_S) < 1e-9);
});
