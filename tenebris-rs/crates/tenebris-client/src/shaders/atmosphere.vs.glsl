#version 410

// Fullscreen-triangle atmosphere pass. a_pos is the clip-space triangle;
// view_dir is reconstructed from the camera basis packed into vs_params.
uniform vec4 atmosphere_vs_params[4];   // [0]=cam_right(.w=tan_half), [1]=cam_up(.w=aspect), [2]=cam_forward, [3]=camera_pos

layout(location = 0) in vec2 a_pos;
layout(location = 0) out vec3 view_dir;
layout(location = 1) out vec3 v_camera_pos;

void main() {
    gl_Position = vec4(a_pos, 0.0, 1.0);
    view_dir = atmosphere_vs_params[2].xyz
             + atmosphere_vs_params[0].xyz * (a_pos.x * atmosphere_vs_params[0].w * atmosphere_vs_params[1].w)
             + atmosphere_vs_params[1].xyz * (a_pos.y * atmosphere_vs_params[0].w);
    v_camera_pos = atmosphere_vs_params[3].xyz;
}
