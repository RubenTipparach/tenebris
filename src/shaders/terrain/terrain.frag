// Terrain fragment shader with planet-aware lighting and underwater effects
precision highp float;

uniform sampler2D terrainTexture;
uniform vec3 sunDirection;
uniform float ambientIntensity;
uniform float directionalIntensity;

// Underwater fog uniforms
uniform float isUnderwater; // 1.0 if camera is underwater, 0.0 otherwise
uniform vec3 underwaterFogColor;
uniform float underwaterFogNear;
uniform float underwaterFogFar;
uniform float underwaterDimming; // How much to dim underwater terrain (0-1)

// Torch light color (warm orange)
const vec3 TORCH_LIGHT_COLOR = vec3(1.0, 0.7, 0.3);

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec2 vUv;
varying float vSunBrightness;
varying float vSkyLight; // Pre-calculated sky light based on depth from surface
varying float vTorchLight; // Pre-baked torch light from vertex shader
varying float vWaterDepth; // How far below water surface
varying float vDistanceFromCamera;

void main() {
  // Sample the texture
  vec4 texColor = texture2D(terrainTexture, vUv);

  // Standard Lambert diffuse lighting on the mesh face
  float meshDiffuse = max(0.0, dot(vNormal, sunDirection));

  // Directional light: direct sunlight on the face
  // Requires: face pointing toward sun (meshDiffuse), tile on day side (vSunBrightness), sky visible (vSkyLight)
  float directional = meshDiffuse * vSunBrightness * directionalIntensity * vSkyLight;

  // Ambient light: transitions from full intensity on day side to 10% on dark side
  // vSunBrightness is based on tile position relative to sun (1.0 = day, 0.0 = night)
  // This creates a gradual day/night transition for ambient lighting
  float ambientDayNight = mix(0.1, 1.0, vSunBrightness); // 10% at night, 100% at day
  float ambient = ambientIntensity * ambientDayNight * vSkyLight;

  // Final lighting: ambient provides base, directional adds on top
  float lighting = ambient + directional;
  vec3 finalColor = texColor.rgb * lighting;

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

  // Apply underwater fog when camera is underwater
  if (isUnderwater > 0.5) {
    float fogFactor = clamp((vDistanceFromCamera - underwaterFogNear) / (underwaterFogFar - underwaterFogNear), 0.0, 1.0);
    finalColor = mix(finalColor, underwaterFogColor, fogFactor);
  }

  gl_FragColor = vec4(finalColor, texColor.a);
}
