// Planet distant LOD fragment shader with day/night lighting and vertex-baked torch lights
precision highp float;

uniform vec3 sunDirection;
uniform float ambientIntensity;
uniform float directionalIntensity;
uniform float darkSideAmbient; // Minimum ambient on dark side (0-1)

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vColor;
varying float vSunFacing;
varying float vTorchLight; // Pre-baked torch light from vertex shader (0-1)

// Warm torch light color
const vec3 TORCH_LIGHT_COLOR = vec3(1.0, 0.7, 0.3);

void main() {
  // Calculate day/night factor with smooth terminator
  // vSunFacing: 1 = full day, -1 = full night
  float dayFactor = smoothstep(-0.1, 0.3, vSunFacing);

  // Lambert diffuse lighting on the mesh face
  float meshDiffuse = max(0.0, dot(vNormal, sunDirection));

  // Directional light: direct sunlight on the face
  float directional = meshDiffuse * dayFactor * directionalIntensity;

  // Ambient light: transitions from full intensity on day side to dim on dark side
  float ambientDayNight = mix(darkSideAmbient, 1.0, dayFactor);
  float ambient = ambientIntensity * ambientDayNight;

  // Final lighting
  float lighting = ambient + directional;
  vec3 finalColor = vColor * lighting;

  // Add vertex-baked torch light (visible on dark side, fades on day side)
  if (vTorchLight > 0.0) {
    // Night factor - torch light is more visible in darkness
    float nightFactor = smoothstep(0.5, 0.0, dayFactor);
    finalColor += vColor * TORCH_LIGHT_COLOR * vTorchLight * nightFactor;
  }

  gl_FragColor = vec4(finalColor, 1.0);
}
