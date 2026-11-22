# Proposal: light the world from the sky it shows

## Why

The owner, 2026-11-22: "can we fix the lighting? so that way the sky isnt
glowing and the ground is dark?", with a screenshot of a glowing twilight
sky over black ground, and "pale blue dot has really aweseome lighting".

Two things disagreed:
- **The sky:** `atmosphere.frag` lit the air whenever the sun could reach
  it past the *effective* radius (planet radius - 70: 30 m on Earth, whose
  ground is ~89 m out), so the air kept glowing long after sunset, even at
  midnight.
- **The ground:** every lit shader (terrain, far terrain, trees, grass,
  animals, water, ice, glass, clouds) copied one ramp: sun x
  `smoothstep(-0.1, 0.3, sun height)`, and an ambient that falls to a flat
  10% on the night side. Nothing came from the sky, so dusk ground was
  black under a bright sky.

## What Changes

Pale Blue Dot's lighting model, L1 and L2 (its `lighting-model` change):
- **The sun's colour from the air:** the sun's light is its transmittance
  through the same atmosphere the sky draws. It is warm and dim near the
  horizon, and fades over its disc as it sets.
- **The fill from the sky:** the fill is the displayed sky, using the
  shader's own tonemap and alpha, averaged over the upper hemisphere and
  cosine-weighted. A glowing dusk lights the ground blue, a dark sky leaves
  it dark, and starlight is the floor.
- **One table per planet:** both are tabulated against the sun's height
  into a 64 x 2 lookup texture. One shader chunk
  (`#include <tenebris_sky_light>`: `skySun(e)`, `skyFill(e)`) replaces the
  copied ramp in every lit surface listed above.
- **Values are relative to noon,** so noon keeps the tuned brightness.
- **Airless worlds:** a clear sun and a small ground-bounce fill by day.
- **Sky shader fix:** the air is shaded from the sun by the real ground (sea
  level), not by the effective radius, so the sky darkens at night.

## Impact

- New: `src/shared/skyLight.ts` (the model, pure),
  `src/planet/SkyLightTexture.ts` (the table and shader chunk),
  `scripts/sky-light.test.ts`, and `SKY_LIGHT_CONFIG` in
  `LightingConfig.ts`.
- Changed:
  - `atmosphere.frag` (`shadowRadius`) and `Atmosphere.ts` (`skyParamsFor`,
    the one source of the sky numbers);
  - the terrain, planet, water, ice, glass and clouds shaders;
  - the tree, grass and animal materials;
  - `Planet` and `HexBlock` (they carry the table), and `mainPlanet`, which
    builds a table per body at load.
- Not yet: placed machines, launch pads and rocket parts keep the old ramp
  (a follow-up). No save changes.
