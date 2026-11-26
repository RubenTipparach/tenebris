// Auto step (Options > Auto step; Pale Blue Dot's walker): on, a grounded
// walker walks up one block; off, only a low rise (a pad's slab). A step
// climbed is eased on the eye - the rise taken off it and given back over
// EASE_S - while a jump or fall is not.
//   npx tsx scripts/auto-step.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

const store = new Map<string, string>();
(globalThis as any).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) };
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7)', maxTouchPoints: 5 }, configurable: true });

const { autoStepEnabled, setAutoStep, stepHeight, stepEase } = await import('../src/player/AutoStep');
const { PlayerConfig } = await import('../src/config/PlayerConfig');
const A = PlayerConfig.AUTO_STEP;

test('on by default on a phone, and the choice is saved', () => {
  assert.equal(autoStepEnabled(), true);
  setAutoStep(false);
  assert.equal(autoStepEnabled(), false);
  assert.equal(store.get(A.STORAGE_KEY), '0');
});

test('on, one block is walked up; off, only a low rise', () => {
  assert.ok(stepHeight(1, true) > 1, 'a 1 m block climbs');
  assert.ok(stepHeight(1, true) < 1.3, 'but not more');
  assert.equal(stepHeight(1, false), PlayerConfig.AUTO_STEP_HEIGHT);
  assert.ok(stepHeight(1, false) < 1, 'a block needs a jump');
});

test('a step up is eased on the eye, not snapped, and gone within a few tenths of a second', () => {
  let lag = stepEase(0, 1, true, 1 / 60);
  assert.ok(lag > 0.7 && lag < 1, `the eye starts most of a block below (${lag})`);
  let t = 1 / 60;
  const seen = [lag];
  while (lag > 0) { lag = stepEase(lag, 0, true, 1 / 60); t += 1 / 60; seen.push(lag); }
  assert.ok(seen.every((v, i) => i === 0 || v < seen[i - 1]), 'it only ever rises toward the eye height');
  assert.ok(t < 0.5, `caught up in ${t.toFixed(2)} s`);
});

test('a jump, a fall or a teleport is not eased', () => {
  assert.equal(stepEase(0, 1, false, 1 / 60), 0, 'airborne');
  assert.equal(stepEase(0, 0.05, true, 1 / 60), 0, 'too small to be a step');
  assert.equal(stepEase(0, 5, true, 1 / 60), 0, 'a teleport');
});
