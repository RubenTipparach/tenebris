// DIAGNOSTIC water shader — strip everything except the time-driven
// motion. If after this commit the cap visibly bobs and cycles
// through colours, u_time is reaching the GPU and we can layer
// realistic shading back on top. If it stays still / single-colour,
// the time uniform isn't getting through and that's the real bug.
//
// Two uniforms only: the view-projection matrix and the time scalar.
// No camera position, no sun direction, no fragment-side block. The
// surface bobs by 0.4 m every pi seconds and the colour cycles
// through R / G / B on a 2 pi-second period — both unmissable if
// animation is wired up.

@vs water_vs

layout(binding=0) uniform vs_params {
    mat4 u_vp;
    float u_time;
};

in vec3 a_pos;
in vec3 a_normal;
in vec2 a_uv;

out float v_time;

void main() {
    vec3 n = normalize(a_normal);
    float swell = sin(u_time * 2.0) * 0.4;
    vec3 p = a_pos + n * swell;
    gl_Position = u_vp * vec4(p, 1.0);
    v_time = u_time;
}
@end


@fs water_fs

in float v_time;
out vec4 frag_color;

void main() {
    float r = 0.5 + 0.5 * sin(v_time);
    float g = 0.5 + 0.5 * sin(v_time + 2.0);
    float b = 0.5 + 0.5 * sin(v_time + 4.0);
    frag_color = vec4(r, g, b, 1.0);
}
@end


@program water water_vs water_fs
