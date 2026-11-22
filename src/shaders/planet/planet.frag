// Planet distant LOD fragment shader with day/night lighting and vertex-baked torch lights
precision highp float;

uniform vec3 sunDirection;
uniform float ambientIntensity;
uniform float directionalIntensity;
uniform float darkSideAmbient; // (unused: the sky light table's fill takes its place)
// Sky light (openspec sky-lighting): the same table the near terrain reads
#include <tenebris_sky_light>

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

  // The sky light table at this spot's sun height (texel centres)
  vec3 sunLight = skySun(vSunFacing);
  vec3 fill = skyFill(vSunFacing);

  // Sunlight through the air on the face, plus the sky's fill
  vec3 directional = sunLight * meshDiffuse * directionalIntensity;
  vec3 ambient = fill * ambientIntensity;
  vec3 finalColor = vColor * (ambient + directional);

  // Add vertex-baked torch light (visible on dark side, fades on day side)
  // Use threshold > 0.01 to avoid floating point precision issues
  if (vTorchLight > 0.01) {
    // Night factor - torch light is more visible in darkness
    float nightFactor = smoothstep(0.5, 0.0, dayFactor);
    finalColor += vColor * TORCH_LIGHT_COLOR * vTorchLight * nightFactor;
  }

  gl_FragColor = vec4(finalColor, 1.0);
}
