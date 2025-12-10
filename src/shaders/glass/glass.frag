// Glass fragment shader with texture alpha transparency and specular
precision highp float;

uniform sampler2D terrainTexture;
uniform vec3 sunDirection;
uniform float ambientIntensity;
uniform float directionalIntensity;
uniform float specularPower;
uniform float specularStrength;

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
varying vec3 vViewDirection;

void main() {
  // Sample the texture (including alpha channel)
  vec4 texColor = texture2D(terrainTexture, vUv);

  // Discard fully transparent pixels
  if (texColor.a < 0.01) {
    discard;
  }

  // Standard Lambert diffuse lighting on the mesh face
  float meshDiffuse = max(0.0, dot(vNormal, sunDirection));

  // Directional light
  float directional = meshDiffuse * vSunBrightness * directionalIntensity * vSkyLight;

  // Ambient light
  float ambientDayNight = mix(0.1, 1.0, vSunBrightness);
  float ambient = ambientIntensity * ambientDayNight * vSkyLight;

  // Final lighting
  float lighting = ambient + directional;
  vec3 finalColor = texColor.rgb * lighting;

  // Add specular highlight for glass shininess
  vec3 reflectDir = reflect(-sunDirection, vNormal);
  float spec = pow(max(dot(vViewDirection, reflectDir), 0.0), specularPower);
  // Specular is stronger on day side
  vec3 specularColor = vec3(1.0, 1.0, 1.0) * spec * specularStrength * vSunBrightness * vSkyLight;
  finalColor += specularColor;

  // Apply vertex-baked torch light with warm orange color
  vec3 torchContribution = texColor.rgb * TORCH_LIGHT_COLOR * vTorchLight;

  // Apply underwater effects if terrain is below water surface
  if (vWaterDepth > 0.0) {
    float depthDimFactor = exp(-vWaterDepth * underwaterDimming);
    finalColor *= depthDimFactor;
    float tintFactor = 1.0 - depthDimFactor;
    finalColor = mix(finalColor, underwaterFogColor * depthDimFactor, tintFactor * 0.5);
  }

  // Add torch light AFTER depth dimming
  finalColor += torchContribution;

  // Apply underwater fog when camera is underwater
  if (isUnderwater > 0.5) {
    float fogFactor = clamp((vDistanceFromCamera - underwaterFogNear) / (underwaterFogFar - underwaterFogNear), 0.0, 1.0);
    finalColor = mix(finalColor, underwaterFogColor, fogFactor);
  }

  // Output with texture alpha for transparency
  gl_FragColor = vec4(finalColor, texColor.a);
}
