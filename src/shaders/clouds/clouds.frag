precision highp float;

uniform vec3 sunDirection;
uniform vec3 cloudColor;
uniform vec3 shadowColor;
uniform float ambientIntensity;

varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  // Simple Lambert shading
  float diffuse = max(0.0, dot(vNormal, sunDirection));

  // Mix between shadow and lit cloud color
  vec3 color = mix(shadowColor, cloudColor, diffuse * (1.0 - ambientIntensity) + ambientIntensity);

  // Slight transparency for soft edges
  float alpha = 0.9;

  gl_FragColor = vec4(color, alpha);
}
