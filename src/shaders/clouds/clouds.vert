varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vUp;

void main() {
  // World-space normal: sunDirection is a world direction (normalMatrix
  // would give a view-space normal and light the clouds from the camera)
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  // The cloud group sits at its planet's centre, so its origin is the centre
  vec3 planetCenter = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vUp = normalize(worldPos.xyz - planetCenter);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
