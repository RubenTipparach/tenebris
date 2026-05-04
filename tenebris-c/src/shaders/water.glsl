// Water cap shader — animated procedural surface for the water layer
// drawn on top of has_water bodies. Authored in sokol-shdc's annotated
// GLSL dialect (@vs / @fs / @program); compiled at build time by
// add_sokol_shader() in tenebris-c/cmake/sokol-shdc.cmake.
//
// Cross-compiles to whichever sokol backend is selected (GLSL ES on
// the WebGL2 build, MSL on macOS, HLSL on Windows, WGSL when we
// switch to WebGPU). The generated header water.glsl.h exposes:
//
//   sg_shader_desc water_shader_desc(sg_backend);
//   typedef struct water_vs_params_t { ... } water_vs_params_t;
//   typedef struct water_fs_params_t { ... } water_fs_params_t;
//   #define UB_water_vs_params  ...
//   #define UB_water_fs_params  ...
//   #define ATTR_water_a_pos    0
//   #define ATTR_water_a_normal 1
//   #define ATTR_water_a_uv     2
//
// All in-shader literals (octave amplitudes, frequencies, palette
// colours, foam thresholds, fog distance, opacity range) live here so
// they can be edited with proper editor tooling. The only
// designer-tunable that flows in from outside is the time scale —
// applied to R.time_seconds in body_draw_water before we upload it as
// u_time, so iteration speed is a one-line C change.

@vs water_vs

// Uniform-block bindings must be unique within a program (not per
// stage). Vertex block claims slot 0; fragment block claims slot 1.
layout(binding=0) uniform vs_params {
    mat4 u_vp;     // view-projection (premultiplied with model so a_pos is in body-local space)
    float u_time;  // pre-scaled "subjective" time — see water_time_scale in renderer.c
};

in vec3 a_pos;
in vec3 a_normal;
in vec2 a_uv;     // unused; declared for layout parity with the shared vbuf

out vec3 v_wpos;
out vec3 v_normal;

void main() {
    vec3 n = normalize(a_normal);

    // Three-octave directional swell. Max combined amplitude 0.36 m,
    // well inside the 0.50 m cap drop in hex_mesher.c so wave crests
    // can't reach coplanar beach sand.
    float t = u_time;
    float swell = 0.0;
    swell += sin(t * 0.9 + a_pos.x * 1.4 + a_pos.z * 0.6) * 0.18;
    swell += sin(t * 1.3 - a_pos.x * 0.7 + a_pos.z * 1.2) * 0.12;
    swell += sin(t * 1.7 + a_pos.x * 2.3 - a_pos.z * 1.9) * 0.06;

    vec3 p = a_pos + n * swell;
    gl_Position = u_vp * vec4(p, 1.0);
    v_wpos = p;
    v_normal = n;
}
@end


@fs water_fs

layout(binding=1) uniform fs_params {
    vec3 u_camera_pos;
    vec3 u_sun_dir;
    float u_time;
};

in vec3 v_wpos;
in vec3 v_normal;
out vec4 frag_color;

// Cheap 3D hash. No textures, no large constants — Dave_Hoskins-style
// scramble is good enough for interactive water.
float h31(vec3 p) {
    p = fract(p * vec3(443.897, 441.423, 437.195));
    p += dot(p, p.yzx + 19.19);
    return fract((p.x + p.y) * p.z);
}

// Trilinear value noise, smoothstep interpolant, output in [-1, 1].
float vnoise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float c000 = h31(i);                 float c100 = h31(i + vec3(1, 0, 0));
    float c010 = h31(i + vec3(0, 1, 0)); float c110 = h31(i + vec3(1, 1, 0));
    float c001 = h31(i + vec3(0, 0, 1)); float c101 = h31(i + vec3(1, 0, 1));
    float c011 = h31(i + vec3(0, 1, 1)); float c111 = h31(i + vec3(1, 1, 1));
    float mx0  = mix(mix(c000, c100, f.x), mix(c010, c110, f.x), f.y);
    float mx1  = mix(mix(c001, c101, f.x), mix(c011, c111, f.x), f.y);
    return mix(mx0, mx1, f.z) * 2.0 - 1.0;
}

// Three-octave fBm with per-octave time advection along different
// directions so the surface doesn't look like a single laminar flow.
float fbm3(vec3 p, float t) {
    float h = 0.0;
    vec3 q = p * 0.9 + vec3(t * 0.35, t * 0.18, -t * 0.42);
    h += vnoise3(q) * 0.50;
    q = q * 2.1 + vec3(-t * 0.22, t * 0.33, t * 0.17);
    h += vnoise3(q) * 0.28;
    q = q * 2.3 + vec3(t * 0.19, -t * 0.27, t * 0.11);
    h += vnoise3(q) * 0.15;
    return h;
}

void main() {
    vec3 radial = normalize(v_normal);

    // Scalar height + 3-sample finite-difference gradient. epsilon
    // ~8 cm — small enough to stay inside the smallest noise cell and
    // big enough to dodge fp noise.
    float h0 = fbm3(v_wpos, u_time);
    float e  = 0.08;
    vec3 grad = vec3(
        fbm3(v_wpos + vec3(e, 0, 0), u_time) - h0,
        fbm3(v_wpos + vec3(0, e, 0), u_time) - h0,
        fbm3(v_wpos + vec3(0, 0, e), u_time) - h0) / e;

    // Tangent-plane gradient tilts the radial normal.
    vec3 t_grad = grad - radial * dot(grad, radial);
    vec3 n = normalize(radial - t_grad * 0.65);

    vec3 view = normalize(u_camera_pos - v_wpos);
    vec3 sun  = normalize(u_sun_dir);

    float vdn = max(dot(view, n), 0.0);
    float f   = 0.02 + 0.98 * pow(1.0 - vdn, 5.0);

    vec3 shallow = vec3(0.28, 0.68, 0.82);
    vec3 deep    = vec3(0.02, 0.10, 0.22);
    vec3 base    = mix(deep, shallow, vdn);

    vec3 refl   = reflect(-view, n);
    float up_f  = clamp(dot(refl, radial), 0.0, 1.0);
    vec3 sky    = mix(vec3(0.85, 0.92, 0.98), vec3(0.35, 0.55, 0.85), up_f);

    vec3  halfv = normalize(view + sun);
    float spec  = pow(max(dot(n, halfv), 0.0), 140.0);
    vec3  sun_highlight = vec3(1.35, 1.25, 1.10) * spec * 0.6;

    // Foam — wave crest + slope. Height fbm goes ~[-1, 1].
    float steepness = length(t_grad);
    float crest     = smoothstep(0.35, 0.60, h0);
    float slope_f   = smoothstep(0.50, 1.20, steepness);
    float foam      = max(crest * 0.55, slope_f * 0.45);

    vec3 color = mix(base, sky, f) + sun_highlight;
    color = mix(color, vec3(0.95, 0.97, 1.0), foam * 0.6);
    float alpha = mix(0.45, 0.80, f);

    frag_color = vec4(color, alpha);
}
@end


@program water water_vs water_fs
