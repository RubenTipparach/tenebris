// Distant body shader. Subdivided icosphere with per-vertex colour
// sampled from the body's terrain at register time. Per-vertex
// Lambert lighting. Used when a body subtends < ~12% of the viewport.
// Cross-compiled by sokol-shdc into distant.glsl.h.

@vs distant_vs

layout(binding=0) uniform distant_vs_params {
    mat4 u_mvp;
    vec3 u_sun_dir;
    vec3 u_ambient;
};

in vec3 a_pos;
in vec3 a_normal;
in vec3 a_color;

out vec3 v_color;

void main() {
    gl_Position = u_mvp * vec4(a_pos, 1.0);
    float ndl = max(dot(normalize(a_normal), normalize(u_sun_dir)), 0.0);
    v_color = a_color * (u_ambient + vec3(ndl));
}
@end


@fs distant_fs

in vec3 v_color;
out vec4 frag_color;

void main() {
    frag_color = vec4(v_color, 1.0);
}
@end


@program distant distant_vs distant_fs
