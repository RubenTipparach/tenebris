// Graphics settings (Options > Graphics / Resolution): phones start on Fast,
// the pixel ratio is the device's capped by the preset times the resolution,
// and a saved choice is clamped and kept.
//   npx tsx scripts/graphics-config.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

const store = new Map<string, string>();
(globalThis as any).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) };
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7)', maxTouchPoints: 5 }, configurable: true });
(globalThis as any).window = { devicePixelRatio: 2.625 };

const G = await import('../src/config/GraphicsConfig');

test('a phone starts on Fast at full resolution, nothing chosen yet', () => {
  assert.equal(G.graphicsSettings().preset, 'fast');
  assert.equal(G.graphicsSettings().resolution, 100);
  assert.equal(G.graphicsChosen(), false);
});

test('pixel ratio: the device capped by the preset, times the resolution', () => {
  assert.equal(G.renderPixelRatio(2.625), 1);
  G.setGraphics({ resolution: 50 });
  assert.equal(G.renderPixelRatio(2.625), 0.5);
  G.setGraphics({ preset: 'pretty', resolution: 100 });
  assert.equal(G.renderPixelRatio(2.625), 2);
  assert.equal(G.renderPixelRatio(1), 1, 'never above the device');
});

test('the choice is saved, and listeners hear it', () => {
  let heard = '';
  const off = G.onGraphicsChange((g) => { heard = g.preset; });
  G.setGraphics({ preset: 'balanced' });
  off();
  assert.equal(heard, 'balanced');
  assert.ok(G.graphicsChosen());
  assert.equal(JSON.parse(store.get(G.GRAPHICS.STORAGE_KEY)!).preset, 'balanced');
});

test('presets get cheaper from Pretty to Fast', () => {
  const P = G.GRAPHICS.PRESETS;
  for (const k of ['pixelRatioCap', 'terrainDistanceScale', 'clutterRadiusScale', 'clutterDensity'] as const) {
    assert.ok(P.fast[k] <= P.balanced[k] && P.balanced[k] <= P.pretty[k], k);
  }
  assert.equal(P.fast.antialias, false);
});

test('flat shading: on for Fast only', () => {
  const P = G.GRAPHICS.PRESETS;
  assert.deepEqual([P.fast.flatShading, P.balanced.flatShading, P.pretty.flatShading], [true, false, false]);
});
