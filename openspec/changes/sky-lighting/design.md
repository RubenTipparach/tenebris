# Design: sky light

1. **The model** (`src/shared/skyLight.ts`) is `atmosphere.frag` run on the
   CPU for a viewer on the ground (sea level, `groundRadius`):
   - same density shell, phase functions, sample counts, tonemap
     `1 - exp(-c)` and alpha (`length * 1.5`, capped at 0.95), since the shell
     is drawn additively;
   - `sunTransmittance(e)`: `exp(-(rayleigh * lambda^-4 + mie) * depth)`
     along the sun's path, 0 when the ground blocks it;
   - `skyFill(e)`: 6 x 12 directions over the upper hemisphere, cos-weighted,
     of the displayed sky colour.
2. **The table:** `buildSkyLightTable` writes 64 sun heights,
   e = -1 to 1:
   - row 0, the sun: transmittance divided by its noon luminance, times the
     disc fade over `SUN_DISC_E`. It keeps its colour just above the horizon
     while setting;
   - row 1, the fill: the hemisphere average divided by its noon luminance,
     desaturated to `FILL_SATURATION`, never below `NIGHT_FILL`;
   - airless worlds: the sun is the disc fade, and the fill is
     `AIRLESS_FILL` by day with `NIGHT_FILL` under it.
3. **The texture:** `SkyLightTexture` holds the table as half floats (WebGL2
   filters them linearly).
   - It registers `THREE.ShaderChunk.tenebris_sky_light`, and
     `skyLightUniforms()` adds what the chunk reads.
   - A material without its planet's table gets the airless one.
4. **Who gets the table:**
   - `mainPlanet` builds one per body at load (about 20 ms each on the main
     thread).
   - The planet passes it to its mesh builder (terrain, near LOD, ice, glass,
     water) and to its far-LOD materials.
   - Tree managers get it at creation; grass and animals read
     `planet.getSkyLight()` in their update; Earth's clouds get Earth's.
5. **Shading:** a surface's light is
   `albedo * (skyFill(e) * ambientIntensity + skySun(e) * N.L * directionalIntensity)`,
   scaled by its voxel sky light where it has one, with e the sun's height at
   that spot (tile up . sun direction).
   - Water takes half the fill's colour.
   - Clouds take `0.4 * fill + 0.6 * sun`.
6. **The sky's shadow:** a new `shadowRadius` uniform (sea level) replaces
   the effective radius in the shader's in-shadow test. Ray termination still
   uses the effective radius, so terrain variation is unchanged.
7. **Numbers** (`SKY_LIGHT_CONFIG`):
   - `LUT_SIZE` 64;
   - `SUN_DISC_E` 0.03;
   - `FILL_SATURATION` 0.6;
   - `NIGHT_FILL` (0.08, 0.09, 0.13), about the old 10% night ambient and
     bluish;
   - `AIRLESS_FILL` 0.35 grey.
8. **Earth's air is thick:** 21 m over an 89 m planet. So twilight lasts until
   the sun is about 25° down: the fill is 0.62 of noon at e = -0.15 and 0.13 at
   e = -0.4. That is what the sky shows, and the ground now matches it.
9. **Pale Blue Dot's sky** (owner, 2026-11-22: "Can we use a similar sky model
   to pdb? Which doesn't show those ray marched bands at sunset but has
   proper sunsets?"). `atmosphere.frag` takes over the terms of PBD's
   `sky_atmosphere.wgsl`:
   - 16 even midpoint steps with no per-pixel dither, so no grain or
     swimming bands;
   - a soft penumbra (`PENUMBRA_WIDTH`) for the ground's shadow on the air;
   - **one twilight:** near the ground, each sample's sunlight is the
     viewer's own `smoothstep(TWILIGHT_FROM, 0, sun height)`. The sky and the
     ground darken together, gone about 7 degrees after sunset;
   - **a dusk tint:** the sky is multiplied toward `DUSK_TINT` while the sun
     is between `DUSK_FROM` and `DUSK_TO`;
   - **an orange `HORIZON_GLOW`** hugging the horizon (`HORIZON_POWER`) on
     the sun's side;
   - a ray into the ground takes the air just over the horizon
     (`horizonRay`).
   `SKY_LOOK` in LightingConfig holds the numbers. `skyParamsFor` hands them
   to the shader and to `skyLight.ts`, whose `displayedSky` mirrors the
   shader term for term, so the ground's fill follows the new sunset.

