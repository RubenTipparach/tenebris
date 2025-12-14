// Skybox vertex shader
// Calculate view direction from camera to vertex on the sphere

varying vec3 vDirection;

void main() {
  // Calculate world position of this vertex
  vec4 worldPos = modelMatrix * vec4(position, 1.0);

  // Calculate view direction from camera to this point on the sphere
  // cameraPosition is a built-in Three.js uniform
  vDirection = normalize(worldPos.xyz - cameraPosition);

  // Transform vertex to projection space
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
