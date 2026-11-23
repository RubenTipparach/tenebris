// Water vertex shader with animation support
uniform float time;
uniform float waveAmplitude;
uniform float waveFrequency;
uniform vec3 planetCenter;
uniform vec3 sunDirection;
// Water flow smoothing between liquid ticks (src/water/LiquidMesh.ts):
// liquidPrev.xyz is where the vertex was at the last tick, liquidPrev.w its
// mode (0 at rest, 1 level ease, 2 sweep in, 3 shrink away then hide) plus
// 4 x the tick it was built for. liquidT runs 0..1 over the current tick.
attribute vec4 liquidPrev;
uniform float liquidT;
uniform float liquidTick;

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec3 vViewDirection;
varying vec2 vUv;
varying float vDepth;
varying float vSunBrightness; // Day/night based on position relative to sun
varying float vSunHeight;     // the sky light table's axis (openspec sky-lighting)

void main() {
  vUv = uv;

  // Where the water is between two liquid ticks
  vec3 pos = position;
  bool liquidGone = false;
  float liquidMode = mod(liquidPrev.w, 4.0);
  if (liquidMode > 0.5) {
    bool thisTick = abs(floor(liquidPrev.w * 0.25) - liquidTick) < 0.5;
    float t = !thisTick ? 1.0 : (liquidMode < 1.5 ? smoothstep(0.0, 1.0, liquidT) : liquidT);
    pos = mix(liquidPrev.xyz, position, t);
    liquidGone = liquidMode > 2.5 && t > 0.999;
  }

  // Get world position
  vec4 worldPos = modelMatrix * vec4(pos, 1.0);
  vWorldPosition = worldPos.xyz;

  // Calculate radial direction from planet center (for spherical water)
  vec3 radialDir = normalize(worldPos.xyz - planetCenter);

  // Animate water surface with gentle waves
  // Use world position for consistent wave pattern
  float wave1 = sin(worldPos.x * waveFrequency + time * 1.5) * 0.5;
  float wave2 = sin(worldPos.z * waveFrequency * 0.8 + time * 1.2) * 0.5;
  float wave3 = sin((worldPos.x + worldPos.z) * waveFrequency * 0.6 + time * 0.8) * 0.3;
  float waveHeight = (wave1 + wave2 + wave3) * waveAmplitude;

  // Displace along radial direction (for spherical planets)
  vec3 displacedPos = worldPos.xyz + radialDir * waveHeight;

  // Transform normal to world space and perturb based on waves
  vec3 baseNormal = normalize(normalMatrix * normal);

  // Calculate wave-based normal perturbation
  float dx = cos(worldPos.x * waveFrequency + time * 1.5) * waveFrequency * waveAmplitude;
  float dz = cos(worldPos.z * waveFrequency * 0.8 + time * 1.2) * waveFrequency * 0.8 * waveAmplitude;

  // Create tangent space perturbation
  vec3 tangent = normalize(cross(baseNormal, vec3(0.0, 0.0, 1.0)));
  if (length(tangent) < 0.1) {
    tangent = normalize(cross(baseNormal, vec3(1.0, 0.0, 0.0)));
  }
  vec3 bitangent = normalize(cross(baseNormal, tangent));

  vNormal = normalize(baseNormal - tangent * dx * 0.3 - bitangent * dz * 0.3);

  // View direction for reflections
  vViewDirection = normalize(cameraPosition - displacedPos);

  // Depth for fog (distance from camera)
  vDepth = length(cameraPosition - displacedPos);

  // Calculate sun brightness based on position on planet (day/night cycle)
  // radialDir points outward from planet center - dot with sun gives day/night
  float sunDot = dot(radialDir, sunDirection);
  // Smooth transition: -0.2 to 0.2 maps to 0 to 1 (terminator zone)
  vSunBrightness = smoothstep(-0.2, 0.2, sunDot);
  vSunHeight = sunDot;

  // Final position
  gl_Position = projectionMatrix * viewMatrix * vec4(displacedPos, 1.0);
  // a dried cell's last tick has played: gone (clipped)
  if (liquidGone) gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
}
