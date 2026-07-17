#version 410

// Distant-LOD globe vertex shader.
//
// v_world_pos MUST be the vertex's WORLD position (fs_pos + a_pos*fs_radius),
// NOT the model-space unit-sphere a_pos. The fragment shader's atmospheric
// rim computes view_dir = normalize(u_camera_pos - v_world_pos); feeding it
// the ~unit-magnitude a_pos while the camera sits at +/-20 km (Sequoia) or
// ~150 km (across the system) made (camera - v_world_pos) ~= camera for every
// vertex, i.e. a per-frame CONSTANT view direction. That collapsed the limb
// fresnel into a camera-directional hemisphere gradient - the "rim covers
// exactly half the planet and swings with the camera" bug. Placing the
// vertex in world space restores a true per-vertex, camera-relative fresnel
// that hugs the visible limb.
//
// distant_vs_params[4] carries the far-shell placement the model matrix uses:
// xyz = fs_pos (shell centre), w = fs_radius (shell scale).
uniform vec4 distant_vs_params[5];   // [0..3] = mvp, [4] = fs_pos.xyz + fs_radius.w

layout(location = 0) in vec3 a_pos;
layout(location = 1) in vec3 a_normal;
layout(location = 0) out vec3 v_dir;
layout(location = 1) out vec3 v_world_pos;

void main() {
    gl_Position = mat4(distant_vs_params[0], distant_vs_params[1],
                       distant_vs_params[2], distant_vs_params[3])
                * vec4(a_pos, 1.0);
    v_dir = normalize(a_normal);
    v_world_pos = distant_vs_params[4].xyz + a_pos * distant_vs_params[4].w;
}
