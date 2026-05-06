// Hex tile / terrain shader. Atlas-textured per-vertex Lambert-shaded
// chunks. Cross-compiled by sokol-shdc into hex.glsl.h — runtime gets
// hex_shader_desc(sg_query_backend()), hex_vs_params_t / hex_vs_light_t,
// and ATTR_hex_a_* / UB_hex_* / VIEW_hex_* / SMP_hex_* slot constants.

@vs hex_vs

layout(binding=0) uniform hex_vs_params {
    mat4 u_vp;
};

layout(binding=1) uniform hex_vs_light {
    vec3 u_sun_dir;
    vec3 u_ambient;
};

in vec3 a_pos;
in vec3 a_normal;
in vec2 a_uv;

out vec2  v_uv;
out float v_light;

void main() {
    gl_Position = u_vp * vec4(a_pos, 1.0);
    vec3 n = normalize(a_normal);
    float ndl = max(dot(n, normalize(u_sun_dir)), 0.0);
    v_light = clamp(u_ambient.r + ndl, 0.0, 1.5);
    v_uv = a_uv;
}
@end


@fs hex_fs

layout(binding=0) uniform texture2D hex_atlas;
layout(binding=0) uniform sampler   hex_atlas_smp;

in vec2  v_uv;
in float v_light;
out vec4 frag_color;

void main() {
    vec4 tex = texture(sampler2D(hex_atlas, hex_atlas_smp), v_uv);
    frag_color = vec4(tex.rgb * v_light, tex.a);
}
@end


@program hex hex_vs hex_fs
