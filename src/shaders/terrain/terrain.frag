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

void main() {
  // Sample the texture
  vec4 texColor = texture2D(terrainTexture, vUv);

  // Standard Lambert diffuse lighting on the mesh face
  float meshDiffuse = max(0.0, dot(vNormal, sunDirection));

  // The sky light table at this spot's sun height
  vec3 sunLight = skySun(vSunHeight);
  vec3 fill = skyFill(vSunHeight);

  // Direct sunlight on the face: its colour through the air, faded as it
  // sets; only where the sky is open (vSkyLight)
  vec3 directional = sunLight * meshDiffuse * directionalIntensity * vSkyLight;

  // Fill: the light the sky you see sheds - blue by day, a glowing dusk
  // still lights the ground, starlight at night
  vec3 ambient = fill * ambientIntensity * vSkyLight;

  vec3 finalColor = texColor.rgb * (ambient + directional);

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
