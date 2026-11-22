// Sky light (openspec sky-lighting): the terrain's sun and fill come from
// the same atmosphere the sky is drawn with. Run: npx tsx scripts/sky-light.test.ts
import { buildSkyLightTable, displayedSky, luminance, skyFill, sunTransmittance, RGB } from '../src/shared/skyLight';
import { SKY_LIGHT_CONFIG as C } from '../src/config/LightingConfig';
import { PlayerConfig } from '../src/config/PlayerConfig';

const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };

// Earth's numbers, as skyParamsFor builds them (radius 100, sea level ~89)
const earth = {
  planetRadius: 100 - PlayerConfig.ATMOSPHERE_SURFACE_OFFSET, groundRadius: 89, atmosphereRadius: 100 * PlayerConfig.ATMOSPHERE_RADIUS_MULT,
  rayleighScale: PlayerConfig.ATMOSPHERE_RAYLEIGH_SCALE, mieScale: PlayerConfig.ATMOSPHERE_MIE_SCALE, mieG: PlayerConfig.ATMOSPHERE_MIE_G,
  sunIntensity: PlayerConfig.ATMOSPHERE_SUN_INTENSITY, samples: PlayerConfig.ATMOSPHERE_SAMPLES, lightSamples: PlayerConfig.ATMOSPHERE_LIGHT_SAMPLES,
  tint: [1, 1, 1] as RGB,
};
const tuning = { lutSize: C.LUT_SIZE, sunDiscE: C.SUN_DISC_E, fillSaturation: C.FILL_SATURATION, nightFill: [...C.NIGHT_FILL] as RGB, airlessFill: [...C.AIRLESS_FILL] as RGB };
const n = C.LUT_SIZE;
const table = buildSkyLightTable(earth, tuning);
const at = (row: number, e: number): RGB => {
  const i = Math.round(((e + 1) / 2) * (n - 1));
  const o = (row * n + i) * 4;
  return [table[o], table[o + 1], table[o + 2]];
};

// ---- the sun through the air
ok(Math.abs(luminance(at(0, 1)) - 1) < 0.05, 'noon sun is 1 (noon keeps the tuned brightness)');
const noonSun = sunTransmittance(earth, 1), lowSun = sunTransmittance(earth, 0.05);
ok(lowSun[2] / lowSun[0] < noonSun[2] / noonSun[0], 'the low sun is redder than the noon sun');
ok(luminance(at(0, -0.2)) === 0, 'no sun below the horizon');
ok(luminance(at(0, 0)) > 0 && luminance(at(0, 0)) < luminance(at(0, 0.1)), 'the sun fades over its disc as it sets');

// ---- the sky's fill
ok(Math.abs(luminance(at(1, 1)) - 1) < 0.05, 'noon fill is 1');
const noonFill = at(1, 1);
ok(noonFill[2] > noonFill[0], 'the noon fill is bluer than it is red (the sky is blue)');
const dusk = luminance(at(1, -0.15));
ok(dusk > 0.3, `a glowing dusk sky still lights the ground (fill ${dusk.toFixed(2)} at e = -0.15)`);
ok(dusk < 1, 'dusk fill is under noon');
const night = at(1, -1);
ok(night.every((c, k) => Math.abs(c - C.NIGHT_FILL[k]) < 1e-3), 'deep night falls to the starlight floor');
let monotone = true;
for (let e = -0.6; e < 1; e += 0.05) if (luminance(at(1, e + 0.05)) + 1e-3 < luminance(at(1, e))) monotone = false;
ok(monotone, 'the fill only grows as the sun climbs');

// ---- the sky shader's own shadow: air over the night side is dark
const deepNightSky = displayedSky(earth, [0, 1, 0], [0, -1, 0]);
ok(luminance(deepNightSky) < 1e-4, 'straight up at midnight the sky is dark (the ground shades the air)');
ok(luminance(skyFill(earth, -0.05)) > luminance(skyFill(earth, -0.4)), 'twilight fades out as the sun sinks');

// ---- airless worlds: no sky light, only ground bounce by day
const airless = buildSkyLightTable(null, tuning);
const aat = (row: number, e: number) => { const i = Math.round(((e + 1) / 2) * (n - 1)), o = (row * n + i) * 4; return [airless[o], airless[o + 1], airless[o + 2]] as RGB; };
ok(Math.abs(luminance(aat(0, 1)) - 1) < 1e-6, 'airless: the sun is full by day (no air to dim it)');
ok(Math.abs(luminance(aat(1, 1)) - luminance([...C.AIRLESS_FILL] as RGB)) < 1e-3, 'airless: the fill is the ground bounce by day');
ok(aat(1, -1).every((c, k) => Math.abs(c - C.NIGHT_FILL[k]) < 1e-3), 'airless: starlight at night');
