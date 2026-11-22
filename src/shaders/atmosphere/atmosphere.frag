precision highp float;

// Single scattering through a density shell (after GPU Gems 2, ch. 16),
// with Pale Blue Dot's sky (assets/shaders/sky_atmosphere.wgsl) folded in
// (openspec sky-lighting, design 9):
// - stable midpoint steps, no per-pixel dither (no grain or swimming bands);
// - a soft penumbra for the planet's shadow on the air, not a hard cut;
// - one twilight for the sky and the ground: near the ground every sample's
//   sunlight is the viewer's own twilight, so on a small planet the high air
//   does not glow for hours over ground already in night;
// - a dusk tint and an orange horizon glow on the sun's side: real sunsets;
// - a ray that meets the ground takes the air just over the horizon instead.
// src/shared/skyLight.ts runs this same model on the CPU for the ground's
// fill light, so every term here has its twin there.

uniform vec3 planetCenter;
uniform float planetRadius;      // the shell's density base (effective surface)
uniform float shadowRadius;      // the ground: what the sun sets behind, where the viewer stands
uniform float atmosphereRadius;
uniform vec3 sunDirection;
uniform vec3 viewerPosition;

// Scattering parameters
uniform float rayleighScale;      // Rayleigh scattering coefficient
uniform float mieScale;           // Mie scattering coefficient
uniform float mieG;               // Mie phase asymmetry factor (-0.99 to 0.99)
uniform float sunIntensity;       // Sun brightness

// Sample counts (configurable via uniforms)
uniform int numSamples;           // Primary ray samples
uniform int numLightSamples;      // Light ray samples

// Color tint (default white = no tint)
uniform vec3 atmosphereTint;

// The sunset (LightingConfig SKY_LOOK)
uniform float twilightFrom;       // sun height (sine) where the low air's sunlight is gone
uniform float penumbraWidth;      // soft edge of the planet's shadow on the air (world units)
uniform float duskFrom;           // sun height where the dusk tint starts (sun still up)
uniform float duskTo;             // sun height where it is gone (sun below)
uniform vec3 duskTint;            // what the dusk multiplies the sky by
uniform float duskStrength;       // how much of the tint it takes
uniform vec3 horizonGlow;         // the orange glow along the horizon at dusk
uniform float horizonPower;       // how tightly the glow hugs the horizon

varying vec3 vWorldPosition;
varying vec3 vNormal;

#define PI 3.14159265359
#define MAX_SAMPLES 32
#define MAX_LIGHT_SAMPLES 8

// Wavelengths for RGB (in micrometers, then inverted^4 for Rayleigh)
// 680nm (red), 550nm (green), 440nm (blue)
const vec3 wavelengthsInv4 = vec3(5.602, 9.473, 19.644); // (1/wavelength)^4 normalized

// Scale height - determines how quickly density falls off
const float scaleHeight = 0.25; // H0 in the paper (as fraction of atmosphere height)

// The viewer is "near the ground" below this share of the shell's height
const float NEAR_GROUND_FROM = 0.3;

float rayleighPhase(float cosTheta) {
  return 0.75 * (1.0 + cosTheta * cosTheta);
}

float miePhase(float cosTheta, float g) {
  float g2 = g * g;
  float denom = 1.0 + g2 - 2.0 * g * cosTheta;
  return (1.0 - g2) / (4.0 * PI * pow(max(denom, 0.001), 1.5));
}

// Ray-sphere intersection: vec2(near, far), or vec2(-1) on a miss
vec2 raySphereIntersect(vec3 ro, vec3 rd, vec3 center, float radius) {
  vec3 oc = ro - center;
  float b = dot(oc, rd);
  float c = dot(oc, oc) - radius * radius;
  float disc = b * b - c;
  if (disc < 0.0) return vec2(-1.0);
  float sqrtDisc = sqrt(disc);
  return vec2(-b - sqrtDisc, -b + sqrtDisc);
}

// altitude: 0 = density base, 1 = atmosphere edge
float getDensity(float altitude) {
  return exp(-altitude / scaleHeight);
}

float densityAt(vec3 p) {
  float altitude = (length(p - planetCenter) - planetRadius) / (atmosphereRadius - planetRadius);
  return getDensity(clamp(altitude, 0.0, 1.0));
}

float opticalDepth(vec3 rayOrigin, vec3 rayDir, float rayLength) {
  float stepSize = rayLength / float(numLightSamples);
  float depth = 0.0;
  for (int i = 0; i < MAX_LIGHT_SAMPLES; i++) {
    if (i >= numLightSamples) break;
    depth += densityAt(rayOrigin + rayDir * (stepSize * (float(i) + 0.5))) * stepSize;
  }
  return depth;
}

// Sunlight reaching a point of air (PBD sun_visibility): a soft edge round
// the ground's shadow instead of all or nothing
float sunVisibility(vec3 p, vec3 sunDir) {
  vec3 rel = p - planetCenter;
  float along = dot(rel, sunDir);
  if (along >= 0.0) return 1.0;
  float closest = length(rel - sunDir * along);
  return smoothstep(-penumbraWidth, penumbraWidth, closest - shadowRadius);
}

// The ray toward the ground's horizon in the same compass direction (PBD
// horizon_ray): the air seen just over the horizon
vec3 horizonRay(vec3 rel, vec3 dir, float radius) {
  float r = length(rel);
  vec3 up = rel / max(r, 1e-3);
  vec3 across = dir - up * dot(dir, up);
  float a2 = dot(across, across);
  vec3 along = a2 > 1e-10 ? across * inversesqrt(a2) : normalize(cross(up, vec3(0.0, 0.0, 1.0)) + vec3(1e-4, 0.0, 0.0));
  float level = clamp(radius / max(r, 1e-3), 0.0, 1.0);
  float dip = sqrt(max(1.0 - level * level, 0.0)) * 0.995;
  return normalize(along * level - up * dip);
}

void main() {
  vec3 rayOrigin = viewerPosition;
  vec3 rayDir = normalize(vWorldPosition - viewerPosition);
  vec3 sunDir = normalize(sunDirection);
  vec3 rel = rayOrigin - planetCenter;
  float viewerR = length(rel);
  bool inside = viewerR < atmosphereRadius;

  // From inside, a ray into the ground takes the horizon's air
  vec2 groundHit = raySphereIntersect(rayOrigin, rayDir, planetCenter, shadowRadius);
  if (inside && groundHit.x > 0.0) {
    rayDir = horizonRay(rel, rayDir, shadowRadius);
    groundHit = vec2(-1.0);
  }

  vec2 atmosHit = raySphereIntersect(rayOrigin, rayDir, planetCenter, atmosphereRadius);
  if (atmosHit.y < 0.0) { gl_FragColor = vec4(0.0); return; }
  float rayStart = max(0.0, atmosHit.x);
  float rayEnd = atmosHit.y;
  // From outside, the column stops at the ground (or the density base)
  vec2 planetHit = raySphereIntersect(rayOrigin, rayDir, planetCenter, inside ? planetRadius : shadowRadius);
  if (planetHit.x > 0.0) rayEnd = min(rayEnd, planetHit.x);
  if (rayStart >= rayEnd) { gl_FragColor = vec4(0.0); return; }

  // One twilight for sky and ground (PBD dusk-sky)
  vec3 up = rel / max(viewerR, 1e-3);
  float sunHeight = dot(up, sunDir);
  float shell = max(atmosphereRadius - shadowRadius, 1.0);
  float viewerAltitude = max(viewerR - shadowRadius, 0.0);
  float nearGround = 1.0 - smoothstep(shell * NEAR_GROUND_FROM, shell, viewerAltitude);
  float twilight = smoothstep(twilightFrom, 0.0, sunHeight);

  float stepSize = (rayEnd - rayStart) / float(numSamples);
  vec3 rayleighSum = vec3(0.0);
  vec3 mieSum = vec3(0.0);
  float viewDepth = 0.0;
  // Stable midpoint integration: no dither, no swimming grain
  for (int i = 0; i < MAX_SAMPLES; i++) {
    if (i >= numSamples) break;
    vec3 samplePos = rayOrigin + rayDir * (rayStart + stepSize * (float(i) + 0.5));
    if (length(samplePos - planetCenter) < planetRadius) continue;
    float localDensity = densityAt(samplePos);
    viewDepth += localDensity * stepSize;
    float visible = mix(sunVisibility(samplePos, sunDir), twilight, nearGround);
    if (visible <= 0.0) continue;
    vec2 sunAtmosHit = raySphereIntersect(samplePos, sunDir, planetCenter, atmosphereRadius);
    float sunDepth = opticalDepth(samplePos, sunDir, max(0.0, sunAtmosHit.y));
    vec3 tau = (rayleighScale * wavelengthsInv4 + vec3(mieScale)) * (viewDepth + sunDepth);
    vec3 attenuation = exp(-tau) * visible;
    rayleighSum += localDensity * attenuation * stepSize;
    mieSum += localDensity * attenuation * stepSize;
  }
  rayleighSum *= rayleighScale * wavelengthsInv4;
  mieSum *= mieScale;

  float cosTheta = dot(rayDir, sunDir);
  vec3 color = sunIntensity * (rayleighSum * rayleighPhase(cosTheta) + mieSum * miePhase(cosTheta, mieG));
  color *= atmosphereTint;

  // The sunset (PBD): the sky warms as the sun goes down, and the horizon
  // glows orange on the sun's side
  float dusk = (1.0 - smoothstep(0.0, duskFrom, sunHeight)) * smoothstep(duskTo, 0.0, sunHeight);
  float horizon = pow(clamp(1.0 - abs(dot(rayDir, up)), 0.0, 1.0), horizonPower);
  vec3 across = rayDir - up * dot(rayDir, up);
  vec3 toward = sunDir - up * sunHeight;
  float sunSide = smoothstep(-0.3, 1.0, dot(across, toward) * inversesqrt(max(dot(across, across) * dot(toward, toward), 1e-8)));
  color = mix(color, color * duskTint, dusk * duskStrength);
  color += horizonGlow * dusk * horizon * mix(1.0, sunSide, nearGround);

  // Tone mapping to prevent oversaturation
  color = 1.0 - exp(-color);

  // Alpha based on scattering intensity
  float alpha = clamp(length(color) * 1.5, 0.0, 0.95);
  gl_FragColor = vec4(color, alpha);
}
