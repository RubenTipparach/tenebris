precision highp float;

uniform vec3 sunDirection;
uniform vec3 cloudColor;
uniform vec3 shadowColor;
uniform float ambientIntensity;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vUp;

void main() {
  // Simple Lambert shading
  float diffuse = max(0.0, dot(normalize(vNormal), sunDirection));
  vec3 color = mix(shadowColor, cloudColor, diffuse * (1.0 - ambientIntensity) + ambientIntensity);

  // Night side: dim to the same 10% the terrain's ambient falls to
  // (terrain.vert/.frag), so clouds don't glow over a dark planet
  float day = smoothstep(-0.1, 0.3, dot(vUp, sunDirection));
  color *= mix(0.1, 1.0, day);

  // Slight transparency for soft edges
  float alpha = 0.9;

  gl_FragColor = vec4(color, alpha);
}
