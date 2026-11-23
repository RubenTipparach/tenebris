// Tech block fragment shader with planet-aware lighting and torch support
precision highp float;

// TECH_COLOR: one flat colour instead of the texture (player avatars), same light
#ifdef TECH_COLOR
uniform vec3 techColor;
#else
uniform sampler2D techTexture;
#endif
uniform vec3 sunDirection;
uniform float ambientIntensity;
uniform float directionalIntensity;


varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec2 vUv;
varying float vSunFacing;

#include <tenebris_sky_light>
#include <tenebris_torch_light>

void main() {
#ifdef TECH_COLOR
  vec4 texColor = vec4(techColor, 1.0);
#else
  vec4 texColor = texture2D(techTexture, vUv);
#endif
  // Alpha test - discard transparent pixels
  if (texColor.a < 0.5) {
    discard;
  }
  // Flip normal for back faces (needed for double-sided rendering)
  vec3 normal = gl_FrontFacing ? vNormal : -vNormal;
  // The terrain's light (planet.frag, openspec sky-lighting): the sun through
  // the air on the face and the sky's fill, from the planet's sky light table
  float meshDiffuse = max(0.0, dot(normal, sunDirection));
  vec3 lighting = skyFill(vSunFacing) * ambientIntensity + skySun(vSunFacing) * meshDiffuse * directionalIntensity;
  vec3 finalColor = texColor.rgb * lighting;
  // Torches nearby, as on the ground
  finalColor += torchGlow(texColor.rgb, vWorldPosition, vSunFacing);
  gl_FragColor = vec4(finalColor, texColor.a);
}
