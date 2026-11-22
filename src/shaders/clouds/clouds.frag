precision highp float;

uniform vec3 sunDirection;
uniform vec3 cloudColor;
uniform vec3 shadowColor;
uniform float ambientIntensity;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vUp;
#include <tenebris_sky_light>

void main() {
  // Simple Lambert shading
  float diffuse = max(0.0, dot(normalize(vNormal), sunDirection));
  vec3 color = mix(shadowColor, cloudColor, diffuse * (1.0 - ambientIntensity) + ambientIntensity);

  // Lit as the ground under them is (openspec sky-lighting): the sun through
  // the air plus the sky's fill at this cloud's sun height - white by day,
  // grey-blue at dusk, dark (not black) at night
  float e = dot(vUp, sunDirection);
  color *= 0.4 * skyFill(e) + 0.6 * skySun(e);

  // Slight transparency for soft edges
  float alpha = 0.9;

  gl_FragColor = vec4(color, alpha);
}
