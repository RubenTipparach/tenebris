precision highp float;

uniform vec3 planetCenter;
uniform float planetRadius;    // Actual planet surface
uniform float innerRadius;     // Inner boundary for raymarching (below surface)
uniform float outerRadius;     // Outer boundary
uniform vec3 sunDirection;
uniform vec3 viewerPosition;
uniform float densityFalloff;
uniform float scatterStrength;

varying vec3 vWorldPosition;
varying vec3 vNormal;

#define VIEW_SAMPLES 16
#define DEPTH_SAMPLES 8

const float pi = 3.14159265359;
const vec3 sunIntensity = vec3(1.0);
// Rayleigh scattering coefficients - shorter wavelengths scatter more (blue)
// Normalized so values are reasonable
const vec3 scatterCoeffs = vec3(0.1, 0.3, 0.6); // R, G, B - blue scatters most

// Rayleigh phase function
float phase(float cosTheta) {
  return 0.75 * (1.0 + cosTheta * cosTheta);
}

// Ray-sphere intersection
// Returns (near, far) distances, or (-1, -1) if no intersection
vec2 raySphereIntersect(vec3 ro, vec3 rd, vec3 center, float radius) {
  vec3 oc = ro - center;
  float b = dot(oc, rd);
  float c = dot(oc, oc) - radius * radius;
  float disc = b * b - c;

  if (disc < 0.0) return vec2(-1.0);

  float sqrtDisc = sqrt(disc);
  float near = -b - sqrtDisc;
  float far = -b + sqrtDisc;

  return vec2(near, far);
}

// Atmospheric density at a point
// Density is highest at planet surface (planetRadius) and falls off with altitude
float atmosphereDensity(vec3 p) {
  float altitude = length(p - planetCenter) - planetRadius;
  float atmosphereHeight = outerRadius - planetRadius;

  // Normalize altitude (0 at surface, 1 at atmosphere edge)
  float normalizedAlt = max(0.0, altitude) / atmosphereHeight;

  // Exponential falloff - density highest at surface
  // Below surface (negative altitude), density is clamped to surface density
  if (altitude < 0.0) {
    return 1.0; // Maximum density below/at surface
  }

  return exp(-normalizedAlt * densityFalloff);
}

// Calculate optical depth along a ray segment
float opticalDepth(vec3 rayOrigin, vec3 rayDir, float rayLength) {
  float stepSize = rayLength / float(DEPTH_SAMPLES);
  float depth = 0.0;

  for (int i = 0; i < DEPTH_SAMPLES; i++) {
    vec3 p = rayOrigin + rayDir * (stepSize * (float(i) + 0.5));
    depth += atmosphereDensity(p) * stepSize;
  }

  return depth;
}

void main() {
  vec3 rayOrigin = viewerPosition;
  vec3 rayDir = normalize(vWorldPosition - viewerPosition);

  // Find intersection with atmosphere (outer sphere)
  vec2 atmosHit = raySphereIntersect(rayOrigin, rayDir, planetCenter, outerRadius);

  // No atmosphere intersection
  if (atmosHit.y < 0.0) {
    gl_FragColor = vec4(0.0);
    return;
  }

  // Determine ray start and end points within atmosphere
  float rayStart = max(0.0, atmosHit.x); // Start at camera or atmosphere entry
  float rayEnd = atmosHit.y;              // End at atmosphere exit

  // Check for planet intersection (inner boundary uses innerRadius which is below surface)
  vec2 planetHit = raySphereIntersect(rayOrigin, rayDir, planetCenter, innerRadius);
  if (planetHit.x > 0.0) {
    // Ray hits the inner boundary - stop there
    rayEnd = min(rayEnd, planetHit.x);
  }

  // If ray starts past the end, nothing to render
  if (rayStart >= rayEnd) {
    gl_FragColor = vec4(0.0);
    return;
  }

  float rayLength = rayEnd - rayStart;
  float stepSize = rayLength / float(VIEW_SAMPLES);

  // Sun direction (normalized)
  vec3 sunDir = normalize(sunDirection);

  // Accumulate scattered light
  vec3 totalScatter = vec3(0.0);
  float totalOpticalDepth = 0.0;

  for (int i = 0; i < VIEW_SAMPLES; i++) {
    // Sample point along view ray
    vec3 samplePoint = rayOrigin + rayDir * (rayStart + stepSize * (float(i) + 0.5));
    float sampleAltitude = length(samplePoint - planetCenter);

    // Skip if below inner boundary
    if (sampleAltitude < innerRadius) continue;

    // Local atmospheric density
    float localDensity = atmosphereDensity(samplePoint);

    // Optical depth from camera to this point
    float viewOpticalDepth = opticalDepth(rayOrigin + rayDir * rayStart, rayDir, stepSize * (float(i) + 0.5));
    totalOpticalDepth = viewOpticalDepth;

    // Check if this point can see the sun (not blocked by planet)
    vec2 sunPlanetHit = raySphereIntersect(samplePoint, sunDir, planetCenter, planetRadius);
    bool inShadow = sunPlanetHit.x > 0.0;

    if (!inShadow) {
      // Find distance to atmosphere edge in sun direction
      vec2 sunAtmosHit = raySphereIntersect(samplePoint, sunDir, planetCenter, outerRadius);
      float sunRayLength = max(0.0, sunAtmosHit.y);

      // Optical depth from this point to sun (through atmosphere)
      float sunOpticalDepth = opticalDepth(samplePoint, sunDir, sunRayLength);

      // Total optical depth (sun to point + point to camera)
      float totalDepth = sunOpticalDepth + viewOpticalDepth;

      // Transmittance - how much light reaches this point and then the camera
      vec3 transmittance = exp(-totalDepth * scatterCoeffs);

      // Phase function based on angle between view and sun
      float cosAngle = dot(rayDir, sunDir);
      float phaseValue = phase(cosAngle);

      // Accumulate scattered light
      totalScatter += transmittance * localDensity * phaseValue * stepSize;
    }
  }

  // Final scattered light color
  vec3 scatteredLight = totalScatter * scatterCoeffs * scatterStrength * sunIntensity;

  // Clamp to prevent oversaturation
  scatteredLight = clamp(scatteredLight, 0.0, 1.0);

  // Output: scattered light with alpha based on intensity
  float alpha = clamp(length(scatteredLight) * 0.8, 0.0, 0.95);

  gl_FragColor = vec4(scatteredLight, alpha);
}
