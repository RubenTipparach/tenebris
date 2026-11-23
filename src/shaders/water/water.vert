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
// The flow texture (PBD water-look.js; src/water/LiquidMesh.ts liquidFlow):
// liquidFlow.xyz a cap's flow (length = speed) or a side's along-edge
// direction, liquidFlow.w the face code (0 cap, 1 flowing side, 2 still side,
// + 3 x the axis a cap's tile is projected along). Geometry without it reads
// (0,0,0,1): a flowing side with no direction, which only stands the tile up.
attribute vec4 liquidFlow;
uniform float texTileM;      // metres one tile covers
uniform float texPanK;       // a cap's pan, metres a second per unit of flow
uniform float texFallPan;    // a flowing side's pan down, metres a second
uniform vec3 frothPixel;     // pixels a metre, rows stretched up a fall, rows a second falling
varying vec2 vTileUv;        // the tile coordinate (tiles)
varying vec2 vFrothUv;       // a falling side's froth pixels
varying vec3 vFlowCap;       // x: face kind, y: cap speed, z: 1 under a moving cap (foam drifts)
varying vec2 vFoamUv;        // a cap's foam pixels, drifting downstream

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

  // The flow texture's coordinates, from the planet-local position. A cap
  // projects onto the plane of its axis (the same plane for a whole region,
  // so still water and the sea tile without seams) and pans along its flow;
  // a side stands the tile up (u = height, v = along the face), a flowing
  // side panning down.
  vec3 pl = worldPos.xyz - planetCenter;
  float faceCode = floor(liquidFlow.w + 0.5);
  float faceKind = mod(faceCode, 3.0);
  float capAxis = floor(faceCode / 3.0);
  vec2 tuv;
  float spd = 0.0;
  if (faceKind < 0.5) {
    vec3 e1 = capAxis < 0.5 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 e2 = capAxis > 1.5 ? vec3(0.0, 1.0, 0.0) : vec3(0.0, 0.0, 1.0);
    vec2 q = vec2(dot(pl, e1), dot(pl, e2));
    vec2 f2 = vec2(dot(liquidFlow.xyz, e1), dot(liquidFlow.xyz, e2));
    spd = length(liquidFlow.xyz);
    vec2 fd = length(f2) > 1e-4 ? normalize(f2) : vec2(1.0, 0.0);
    tuv = vec2(dot(q, fd) - spd * texPanK * time, dot(q, vec2(-fd.y, fd.x)));
    vFoamUv = (q - f2 * texPanK * time) * frothPixel.x;
  } else {
    float h = length(pl);
    float along = dot(pl, liquidFlow.xyz);
    float falling = faceKind < 1.5 ? 1.0 : 0.0;
    tuv = vec2(h + falling * time * texFallPan, along);
    vFoamUv = vec2(0.0);
    vFrothUv = vec2(along * frothPixel.x, (h * frothPixel.y + time * frothPixel.z) * frothPixel.x);
  }
  if (faceKind < 0.5) vFrothUv = vec2(0.0);
  vTileUv = tuv / texTileM;
  vFlowCap = vec3(faceKind, spd, spd > 0.0 ? 1.0 : 0.0);

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
