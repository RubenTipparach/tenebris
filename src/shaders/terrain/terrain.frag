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
varying float vWaterDepth; // How far below water surface
varying float vDistanceFromCamera;

void main() {
  // Sample the texture
  vec4 texColor = texture2D(terrainTexture, vUv);

  // Standard Lambert diffuse lighting on the mesh face
  float meshDiffuse = max(0.0, dot(vNormal, sunDirection));

  // Combine: directional light is modulated by planet sun brightness
  // On the dark side of the planet, directional light is reduced/eliminated
  float directional = meshDiffuse * vSunBrightness * directionalIntensity;
  float ambient = ambientIntensity;

  // Final lighting
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
