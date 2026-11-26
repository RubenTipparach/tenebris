// Terrain fragment shader with planet-aware lighting and underwater effects
precision highp float;

uniform sampler2D terrainTexture;
uniform vec3 sunDirection;
uniform float ambientIntensity;
uniform float directionalIntensity;

// Sky light (openspec sky-lighting): row 0 the sun's light through the air,
// row 1 the sky's fill, across the sun's height (src/shared/skyLight.ts) -
// the same atmosphere the sky is drawn with, so ground and sky agree
#include <tenebris_sky_light>

// Underwater fog uniforms
uniform float isUnderwater; // 1.0 if camera is underwater, 0.0 otherwise
uniform vec3 underwaterFogColor;
uniform float underwaterFogNear;
uniform float underwaterFogFar;
uniform float underwaterDimming; // How much to dim underwater terrain (0-1)

// Night lights (LightingConfig): the face's emissive mask, and light from
// emitting blocks flooded through the voxels; both bright at night, faint by day
uniform sampler2D glowTexture;
uniform float glowNight;
uniform float glowDay;
uniform float blockLightNight;
uniform float blockLightDay;
uniform vec3 blockLightTint;

// Surface relief (LightingConfig SURFACE_RELIEF): the block's own pixel
// art is its height - a texel's brightness - so each face is lit through a
// per-pixel normal built from it (stronger on rock, softer on sand and snow)
uniform float reliefStrength;
uniform float reliefCavity;
uniform float reliefHexTilt;  // each hex leans its own way, this far (per unit of relief)
uniform float reliefHexTone;  // and is a little lighter or darker
varying vec3 vHexSeed;

float reliefHeight(vec2 uv) {
  return dot(texture2D(terrainTexture, uv).rgb, vec3(0.299, 0.587, 0.114));
}

// The face normal tilted by the texture's height steps, in a tangent frame
// worked out from screen-space derivatives (no tangents in the mesh)
vec3 reliefNormal(vec3 N, vec3 pos, vec2 uv, out float h) {
  h = reliefHeight(uv);
  if (reliefStrength <= 0.0) return N;
  vec2 px = 1.0 / vec2(textureSize(terrainTexture, 0));
  float gx = reliefHeight(uv + vec2(px.x, 0.0)) - reliefHeight(uv - vec2(px.x, 0.0));
  float gy = reliefHeight(uv + vec2(0.0, px.y)) - reliefHeight(uv - vec2(0.0, px.y));
  vec3 dp1 = dFdx(pos), dp2 = dFdy(pos);
  vec2 duv1 = dFdx(uv), duv2 = dFdy(uv);
  vec3 dp2perp = cross(dp2, N), dp1perp = cross(N, dp1);
  vec3 T = dp2perp * duv1.x + dp1perp * duv2.x;
  vec3 B = dp2perp * duv1.y + dp1perp * duv2.y;
  float len = max(dot(T, T), dot(B, B));
  if (len < 1e-20) return N;
  float inv = inversesqrt(len);
  return normalize(N - reliefStrength * 0.5 * (gx * T + gy * B) * inv);
}

// Torch light color (warm orange)
const vec3 TORCH_LIGHT_COLOR = vec3(1.0, 0.7, 0.3);

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec2 vUv;
varying float vSunBrightness;
varying float vSunHeight;
varying float vSkyLight; // Pre-calculated sky light based on depth from surface
varying float vTorchLight; // Pre-baked torch light from vertex shader
varying float vBlockLight; // Light from emitting blocks
varying float vWaterDepth; // How far below water surface
varying float vDistanceFromCamera;

#ifdef FLAT_SHADE
// Flat shading (graphics: Fast): the block's average colour, lit per face
uniform vec4 flatColor;
#endif

void main() {
#ifdef FLAT_SHADE
  vec4 texColor = flatColor;
  vec3 N = normalize(vNormal);
  float height = 1.0;
  float hexTone = 1.0;
  float cavity = 1.0;
#else
  // Sample the texture
  vec4 texColor = texture2D(terrainTexture, vUv);

  // Lambert through the relief normal; a face turned from the sun stays
  // dark whatever its relief, and low texels sit a little in shadow
  float height;
  vec3 N = reliefNormal(normalize(vNormal), vWorldPosition, vUv, height);
  // Each hex its own lean and tone (its seed; none on meshes without one)
  float hexTone = 1.0;
  float cavity = 1.0 - reliefCavity * (1.0 - smoothstep(0.15, 0.6, height)) * step(0.001, reliefStrength);
  if (reliefStrength > 0.0 && dot(vHexSeed, vHexSeed) > 1e-6 && dot(vHexSeed, vec3(1.0)) < 2.999) {
    vec3 n0 = normalize(vNormal);
    vec3 a = normalize(cross(n0, abs(n0.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
    vec3 b = cross(n0, a);
    float k = reliefHexTilt * reliefStrength;
    N = normalize(N + k * ((vHexSeed.g * 2.0 - 1.0) * a + (vHexSeed.b * 2.0 - 1.0) * b));
    hexTone = 1.0 + reliefHexTone * (vHexSeed.r * 2.0 - 1.0);
  }
#endif
  float faceLit = smoothstep(-0.05, 0.15, dot(vNormal, sunDirection));
  float meshDiffuse = max(0.0, dot(N, sunDirection)) * faceLit;

  // The sky light table at this spot's sun height
  vec3 sunLight = skySun(vSunHeight);
  vec3 fill = skyFill(vSunHeight);

  // Direct sunlight on the face: its colour through the air, faded as it
  // sets; only where the sky is open (vSkyLight)
  vec3 directional = sunLight * meshDiffuse * directionalIntensity * vSkyLight;

  // Fill: the light the sky you see sheds - blue by day, a glowing dusk
  // still lights the ground, starlight at night
  vec3 ambient = fill * ambientIntensity * vSkyLight;

  vec3 finalColor = texColor.rgb * hexTone * (ambient + directional) * cavity;

  // Apply vertex-baked torch light with warm orange color
  // vTorchLight is pre-calculated per vertex based on nearby torches
  // Calculate torch contribution separately so it's not dimmed by depth
  vec3 torchContribution = texColor.rgb * TORCH_LIGHT_COLOR * vTorchLight;

  // Apply underwater effects if terrain is below water surface
  // Apply BEFORE adding torch light so torches override depth dimming
  if (vWaterDepth > 0.0) {
    // Dim the terrain based on water depth (light absorption)
    float depthDimFactor = exp(-vWaterDepth * underwaterDimming);
    finalColor *= depthDimFactor;

    // Tint towards underwater color as depth increases
    float tintFactor = 1.0 - depthDimFactor;
    finalColor = mix(finalColor, underwaterFogColor * depthDimFactor, tintFactor * 0.5);
  }

  // Add torch light AFTER depth dimming so torches illuminate underwater areas
  finalColor += torchContribution;

  // Night lights: how much of a night it is here (0 at noon, 1 at night)
  float night = 1.0 - vSunBrightness;
  finalColor += texColor.rgb * blockLightTint * vBlockLight * mix(blockLightDay, blockLightNight, night);
  finalColor += texture2D(glowTexture, vUv).rgb * mix(glowDay, glowNight, night);

  // Apply underwater fog when camera is underwater
  if (isUnderwater > 0.5) {
    // per fragment: the per-vertex distance overshoots on faces close to the camera
    float fragDist = length(cameraPosition - vWorldPosition);
    float fogFactor = clamp((fragDist - underwaterFogNear) / (underwaterFogFar - underwaterFogNear), 0.0, 1.0);
    finalColor = mix(finalColor, underwaterFogColor, fogFactor);
  }

  gl_FragColor = vec4(finalColor, texColor.a);
}
