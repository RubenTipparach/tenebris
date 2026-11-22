// Skybox vertex shader
// Calculate view direction from camera to vertex on the sphere

varying vec3 vDirection;

void main() {
  // The sky's direction in the sphere's own space: the sphere is centred on
  // the far camera, so this is the view direction with the sphere's turn
  // taken out - turning the sphere (GameEngine.setSkyYaw, the reference
  // frame's spin) turns the stars and nebula with it
  vDirection = normalize(position);

  // Transform vertex to projection space
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
