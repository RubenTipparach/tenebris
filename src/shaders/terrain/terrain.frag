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

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec2 vUv;
varying float vSunBrightness;
varying float vSkyLight; // Pre-calculated sky light based on depth from surface
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

  // Ambient light: flat 50% of directional intensity, not dependent on face normal
  // This ensures all faces get consistent base lighting regardless of orientation
  // Only modulated by sky light (caves get darker)
  float ambient = ambientIntensity * vSkyLight;

  // Final lighting: ambient provides base, directional adds on top
  float lighting = ambient + directional;
  vec3 finalColor = texColor.rgb * lighting;

  // Apply underwater effects if terrain is below water surface
  if (vWaterDepth > 0.0) {
    // Dim the terrain based on water depth (light absorption)
    float depthDimFactor = exp(-vWaterDepth * underwaterDimming);
    finalColor *= depthDimFactor;

    // Tint towards underwater color as depth increases
    float tintFactor = 1.0 - depthDimFactor;
    finalColor = mix(finalColor, underwaterFogColor * depthDimFactor, tintFactor * 0.5);
  }

  // Apply underwater fog when camera is underwater
  if (isUnderwater > 0.5) {
    float fogFactor = clamp((vDistanceFromCamera - underwaterFogNear) / (underwaterFogFar - underwaterFogNear), 0.0, 1.0);
    finalColor = mix(finalColor, underwaterFogColor, fogFactor);
  }

  gl_FragColor = vec4(finalColor, texColor.a);
}
