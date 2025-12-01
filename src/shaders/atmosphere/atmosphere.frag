precision highp float;

// Based on GPU Gems 2, Chapter 16: Accurate Atmospheric Scattering
// https://developer.nvidia.com/gpugems/gpugems2/part-ii-shading-lighting-and-shadows/chapter-16-accurate-atmospheric-scattering

uniform vec3 planetCenter;
uniform float planetRadius;
uniform float atmosphereRadius;
uniform vec3 sunDirection;
uniform vec3 viewerPosition;

// Scattering parameters
uniform float rayleighScale;      // Rayleigh scattering coefficient
uniform float mieScale;           // Mie scattering coefficient
uniform float mieG;               // Mie phase asymmetry factor (-0.99 to 0.99)
uniform float sunIntensity;       // Sun brightness

varying vec3 vWorldPosition;
varying vec3 vNormal;

#define PI 3.14159265359
#define NUM_SAMPLES 8
#define NUM_LIGHT_SAMPLES 4

// Wavelengths for RGB (in micrometers, then inverted^4 for Rayleigh)
// 680nm (red), 550nm (green), 440nm (blue)
const vec3 wavelengthsInv4 = vec3(5.602, 9.473, 19.644); // (1/wavelength)^4 normalized

// Scale height - determines how quickly density falls off
const float scaleHeight = 0.25; // H0 in the paper (as fraction of atmosphere height)

// Simple hash for dithering to reduce banding
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Rayleigh phase function
float rayleighPhase(float cosTheta) {
  return 0.75 * (1.0 + cosTheta * cosTheta);
}

// Mie phase function (Henyey-Greenstein)
float miePhase(float cosTheta, float g) {
  float g2 = g * g;
  float denom = 1.0 + g2 - 2.0 * g * cosTheta;
  return (1.0 - g2) / (4.0 * PI * pow(denom, 1.5));
}

// Ray-sphere intersection
// Returns vec2(near, far) distances, or vec2(-1) if no hit
vec2 raySphereIntersect(vec3 ro, vec3 rd, vec3 center, float radius) {
  vec3 oc = ro - center;
  float b = dot(oc, rd);
  float c = dot(oc, oc) - radius * radius;
  float disc = b * b - c;

  if (disc < 0.0) return vec2(-1.0);

  float sqrtDisc = sqrt(disc);
  return vec2(-b - sqrtDisc, -b + sqrtDisc);
}

// Get atmospheric density at a given altitude
// altitude: 0 = planet surface, 1 = atmosphere edge
float getDensity(float altitude) {
  return exp(-altitude / scaleHeight);
}

// Calculate optical depth along a ray segment
float opticalDepth(vec3 rayOrigin, vec3 rayDir, float rayLength) {
  float stepSize = rayLength / float(NUM_LIGHT_SAMPLES);
  float depth = 0.0;

  for (int i = 0; i < NUM_LIGHT_SAMPLES; i++) {
    vec3 samplePos = rayOrigin + rayDir * (stepSize * (float(i) + 0.5));
    float altitude = (length(samplePos - planetCenter) - planetRadius) / (atmosphereRadius - planetRadius);
    altitude = clamp(altitude, 0.0, 1.0);
    depth += getDensity(altitude) * stepSize;
  }

  return depth;
}

void main() {
  vec3 rayOrigin = viewerPosition;
  vec3 rayDir = normalize(vWorldPosition - viewerPosition);

  // Find atmosphere intersection
  vec2 atmosHit = raySphereIntersect(rayOrigin, rayDir, planetCenter, atmosphereRadius);

  if (atmosHit.y < 0.0) {
    gl_FragColor = vec4(0.0);
    return;
  }

  // Ray start and end within atmosphere
  float rayStart = max(0.0, atmosHit.x);
  float rayEnd = atmosHit.y;

  // Check for planet intersection
  vec2 planetHit = raySphereIntersect(rayOrigin, rayDir, planetCenter, planetRadius);
  if (planetHit.x > 0.0) {
    rayEnd = min(rayEnd, planetHit.x);
  }

  if (rayStart >= rayEnd) {
    gl_FragColor = vec4(0.0);
    return;
  }

  float rayLength = rayEnd - rayStart;
  float stepSize = rayLength / float(NUM_SAMPLES);

  // Normalized sun direction
  vec3 sunDir = normalize(sunDirection);

  // Dither offset to reduce banding (varies per-pixel)
  float dither = hash(gl_FragCoord.xy) * 0.5;

  // Accumulate Rayleigh and Mie scattering separately
  vec3 rayleighSum = vec3(0.0);
  vec3 mieSum = vec3(0.0);
  float opticalDepthR = 0.0;
  float opticalDepthM = 0.0;

  for (int i = 0; i < NUM_SAMPLES; i++) {
    // Sample point along view ray (with dither offset to reduce banding)
    vec3 samplePos = rayOrigin + rayDir * (rayStart + stepSize * (float(i) + dither));
    float height = length(samplePos - planetCenter);

    // Skip if inside planet
    if (height < planetRadius) continue;

    // Normalized altitude (0 at surface, 1 at atmosphere edge)
    float altitude = (height - planetRadius) / (atmosphereRadius - planetRadius);
    altitude = clamp(altitude, 0.0, 1.0);

    // Local density
    float localDensity = getDensity(altitude);

    // Accumulate optical depth from camera to this point
    float segmentDepthR = localDensity * stepSize;
    float segmentDepthM = localDensity * stepSize;
    opticalDepthR += segmentDepthR;
    opticalDepthM += segmentDepthM;

    // Check if this point can see the sun
    vec2 sunPlanetHit = raySphereIntersect(samplePos, sunDir, planetCenter, planetRadius);
    if (sunPlanetHit.x > 0.0) continue; // In shadow

    // Find distance to atmosphere edge toward sun
    vec2 sunAtmosHit = raySphereIntersect(samplePos, sunDir, planetCenter, atmosphereRadius);
    float sunRayLength = max(0.0, sunAtmosHit.y);

    // Optical depth from sun to this point
    float sunOpticalDepth = opticalDepth(samplePos, sunDir, sunRayLength);

    // Total attenuation (sun->point->camera)
    // Rayleigh: wavelength dependent
    vec3 tauR = rayleighScale * wavelengthsInv4 * (opticalDepthR + sunOpticalDepth);
    // Mie: wavelength independent
    vec3 tauM = vec3(mieScale * (opticalDepthM + sunOpticalDepth));

    vec3 attenuation = exp(-(tauR + tauM));

    // Accumulate scattering
    rayleighSum += localDensity * attenuation * stepSize;
    mieSum += localDensity * attenuation * stepSize;
  }

  // Apply scattering coefficients
  rayleighSum *= rayleighScale * wavelengthsInv4;
  mieSum *= mieScale;

  // Phase functions based on angle between view and sun
  float cosTheta = dot(rayDir, sunDir);
  float phaseR = rayleighPhase(cosTheta);
  float phaseM = miePhase(cosTheta, mieG);

  // Final color
  vec3 color = sunIntensity * (rayleighSum * phaseR + mieSum * phaseM);

  // Tone mapping to prevent oversaturation
  color = 1.0 - exp(-color);

  // Alpha based on scattering intensity
  float alpha = clamp(length(color) * 1.5, 0.0, 0.95);

  gl_FragColor = vec4(color, alpha);
}
