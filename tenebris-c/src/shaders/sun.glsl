// Sun shader. Emissive sphere with a soft fresnel-ish radial halo on
// top of a uniformly bright core. The mesh is the shared unit
// uvsphere; the C side passes pre-scaled MVP. Cross-compiled by
// sokol-shdc into sun.glsl.h.

@vs sun_vs

layout(binding=0) uniform sun_vs_params {
    mat4 u_mvp;
};

in vec3 a_pos;

out vec3 v_local;

void main() {
    v_local = a_pos;
    gl_Position = u_mvp * vec4(a_pos, 1.0);
}
@end


@fs sun_fs

layout(binding=1) uniform sun_fs_params {
    vec3 u_color;
};

in vec3 v_local;
out vec4 frag_color;

void main() {
    // Local-space position is on the unit sphere (vbuf is unit). The
    // dot of the normalised position with -view_dir would give true
    // fresnel, but for an isotropic star a radial-from-center power
    // looks the same and is cheaper.
    float r    = length(v_local);
    float core = 1.0;
    float halo = pow(clamp(r, 0.0, 1.0), 8.0);
    vec3  col  = u_color * (core + halo * 0.4);
    /* Alpha = wet mask (0 = dry). Sun is in the sky, never wet. */
    frag_color = vec4(col, 0.0);
}
@end


@program sun sun_vs sun_fs
