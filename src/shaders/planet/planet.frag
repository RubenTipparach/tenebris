// Planet distant LOD fragment shader with day/night lighting and vertex-baked torch lights
precision highp float;

uniform vec3 sunDirection;
uniform float ambientIntensity;
uniform float directionalIntensity;
uniform float darkSideAmbient; // (unused: the sky light table's fill takes its place)
// Sky light (openspec sky-lighting): the same table the near terrain reads
#include <tenebris_sky_light>

// Surface relief from afar (LightingConfig SURFACE_RELIEF): rocky normals
// from noise in the planet's own frame, and each hex its own tone
uniform vec3 planetCenter;
uniform float reliefRadius;
uniform float reliefScale;
uniform float reliefStrength;
uniform float reliefTone;

// The planet seen from space, shaded like the gas giants (LightingConfig
// FAR_SURFACE): a smooth lighting normal, mottled colour, oceans with a sun
// glint, limb darkening, the air's haze on the day-side disc and limb
uniform float farWaterRadius;     // the sea surface (0: no sea)
uniform float farSmooth;          // how far the hex facets' normals bend to the smooth sphere
uniform float farMottle;          // colour mottling
uniform float farMottleScale;
uniform float farOpacity;         // fading in over the terrain (1 = opaque)
uniform float farTime;
// The sea (LightingConfig FAR_WATER)
uniform vec3 farWaterShelf;
uniform float farWaterVariation;
uniform float farWaveScale;
uniform float farWaveStrength;
uniform float farWaveSpeed;
uniform float farSpecular;
uniform float farShininess;
uniform float farSheen;
uniform float farFresnel;
varying float vWater;
uniform float farLimb;            // limb darkening
uniform vec3 farHazeColour;       // the air's haze (0: airless)
uniform float farHazeStrength;
uniform vec3 farTerminatorTint;
uniform float farNight;           // light left on the night side

float rHash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float rNoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(rHash(i), rHash(i + vec3(1,0,0)), f.x), mix(rHash(i + vec3(0,1,0)), rHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(rHash(i + vec3(0,0,1)), rHash(i + vec3(1,0,1)), f.x), mix(rHash(i + vec3(0,1,1)), rHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
// Ridged rock: sharp crests and gullies
float rRock(vec3 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 4; i++) { s += a * (1.0 - abs(rNoise(p) * 2.0 - 1.0)); p *= 2.07; a *= 0.5; }
  return s;
}

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vColor;
varying float vSunFacing;
varying float vTorchLight; // Pre-baked torch light from vertex shader (0-1)

// Warm torch light color
const vec3 TORCH_LIGHT_COLOR = vec3(1.0, 0.7, 0.3);

void main() {
  vec3 rel = vWorldPosition - planetCenter;
  float r = length(rel);
  vec3 radial = rel / max(r, 1e-4);
  vec3 local = rel / max(reliefRadius, 1.0);
  vec3 L = normalize(sunDirection);
  vec3 V = normalize(cameraPosition - vWorldPosition);
  float ndlSphere = dot(radial, L);

  // Water: tiles at the sea surface
  bool water = vWater > 0.5;

  // A smooth lighting normal: the hex facets bend toward the sphere (the
  // gas giants' smooth limb), then rock relief on land
  vec3 N = normalize(mix(normalize(vNormal), radial, water ? 1.0 : farSmooth));
  vec3 base = vColor;
  vec3 face = normalize(cross(dFdx(vWorldPosition), dFdy(vWorldPosition)));
  float hex = rHash(floor(face * 512.0));
  if (!water && reliefStrength > 0.0) {
    vec3 q = local * reliefScale;
    float e = 0.02;
    float h = rRock(q);
    vec3 g = vec3(rRock(q + vec3(e, 0.0, 0.0)) - h, rRock(q + vec3(0.0, e, 0.0)) - h, rRock(q + vec3(0.0, 0.0, e)) - h) / e;
    g -= N * dot(g, N);
    N = normalize(N - reliefStrength * 0.15 * g);
    base *= (1.0 - reliefTone) + reliefTone * 2.0 * hex;   // each hex its own tone
    base *= 0.85 + 0.3 * h;                                 // crests lighter than gullies
  }
  // Mottling: broad patches of lighter and darker ground or water
  float m = rNoise(local * farMottleScale) * 0.6 + rNoise(local * farMottleScale * 2.3) * 0.4;
  base *= 1.0 + farMottle * (m - 0.5) * (water ? 0.5 : 1.0);

  // Light: a soft terminator, the sky light table's colour
  float diff = max(0.0, dot(N, L)) * smoothstep(-0.08, 0.12, ndlSphere);
  vec3 sunLight = skySun(vSunFacing);
  vec3 fill = skyFill(vSunFacing);
  vec3 lit = base * (fill * ambientIntensity * mix(farNight, 1.0, smoothstep(-0.2, 0.2, ndlSphere)) + sunLight * diff * directionalIntensity);

  float facing = max(0.0, dot(radial, V));
  if (water) {
    // Pretty water: deep and shelf patches, waves catching a moving glint,
    // a sheen round it, the sea brightening toward the limb
    float shelf = smoothstep(0.35, 0.75, rNoise(local * 3.0 + 11.0) * 0.6 + rNoise(local * 7.0) * 0.4);
    vec3 sea = base + farWaterShelf * shelf * farWaterVariation;
    vec3 wq = local * farWaveScale + vec3(farTime * farWaveSpeed * farWaveScale);
    vec3 wave = vec3(rNoise(wq), rNoise(wq + 17.1), rNoise(wq + 41.7)) - 0.5;
    vec3 Nw = normalize(radial + farWaveStrength * (wave - radial * dot(wave, radial)));
    vec3 H = normalize(L + V);
    float dayW = smoothstep(0.0, 0.12, ndlSphere);
    float glint = pow(max(0.0, dot(Nw, H)), farShininess) * farSpecular + pow(max(0.0, dot(radial, H)), farShininess * 0.08) * farSheen;
    lit = sea * (fill * ambientIntensity * mix(farNight, 1.0, smoothstep(-0.2, 0.2, ndlSphere)) + sunLight * max(0.0, dot(radial, L)) * smoothstep(-0.08, 0.12, ndlSphere) * directionalIntensity);
    lit += sunLight * glint * dayW;
    vec3 sky = farHazeStrength > 0.0 ? farHazeColour : vec3(0.6, 0.7, 0.8);
    lit = mix(lit, sky * (0.25 + 0.75 * dayW), farFresnel * pow(1.0 - facing, 4.0) * smoothstep(-0.1, 0.3, ndlSphere));
  }

  // Limb darkening, then the air's haze over the day side of the limb,
  // warming along the terminator (the gas giants' surface haze)
  lit *= mix(1.0 - farLimb, 1.0, pow(facing, 0.5));
  if (farHazeStrength > 0.0) {
    float rim = pow(1.0 - facing, 2.0);
    vec3 haze = mix(farHazeColour * farTerminatorTint, farHazeColour, smoothstep(0.0, 0.45, ndlSphere));
    lit += haze * (0.12 + rim) * farHazeStrength * smoothstep(-0.15, 0.3, ndlSphere) * 0.35;
  }

  // Vertex-baked torch light, on the night side
  float dayFactor = smoothstep(-0.1, 0.3, vSunFacing);
  if (vTorchLight > 0.01) {
    float nightFactor = smoothstep(0.5, 0.0, dayFactor);
    lit += vColor * TORCH_LIGHT_COLOR * vTorchLight * nightFactor;
  }

  gl_FragColor = vec4(lit, farOpacity);
}
