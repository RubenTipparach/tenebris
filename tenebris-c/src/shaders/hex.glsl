// Hex tile / terrain shader. Atlas-textured per-vertex Lambert-shaded
// chunks. Cross-compiled by sokol-shdc into hex.glsl.h — runtime gets
// hex_shader_desc(sg_query_backend()), hex_vs_params_t / hex_vs_light_t
// / hex_fs_water_t, and ATTR_hex_a_* / UB_hex_* / VIEW_hex_* / SMP_hex_*
// slot constants.
//
// The fs_water uniform block drives the swell-aware "wet line" on
// block faces near sea level. Each fragment evaluates the same sin
// sum the water cap's vertex shader uses (in body-local space) to
// determine the local water height, then tints fragments below that
// height with the water's deep colour. Result: the visible waterline
// on coastal block side-faces ripples with the waves instead of
// sitting at a static sea-level strip.

@vs hex_vs

layout(binding=0) uniform hex_vs_params {
    mat4 u_vp;       // pre-multiplied with body model so a_pos is body-local
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
out vec3  v_local_pos;     // body-local position passed through so the fs
                           // can evaluate swell + radial altitude per fragment.

void main() {
    gl_Position = u_vp * vec4(a_pos, 1.0);
    vec3 n = normalize(a_normal);
    float ndl = max(dot(n, normalize(u_sun_dir)), 0.0);
    v_light = clamp(u_ambient.r + ndl, 0.0, 1.5);
    v_uv = a_uv;
    v_local_pos = a_pos;
}
@end


@fs hex_fs

layout(binding=0) uniform hex_fs_water {
    vec4 wet_params;     // x = sea_radius, y = time, z = wet_band_softness (m), w = unused
    vec4 swell_params;   // x = swell_amplitude, y = swell_frequency, z = swell_speed, w = enabled (0|1)
    vec4 wet_color;      // xyz = wet tint (deep_color), w = mix strength (0..1)
};

layout(binding=0) uniform texture2D hex_atlas;
layout(binding=0) uniform sampler   hex_atlas_smp;

in vec2  v_uv;
in float v_light;
in vec3  v_local_pos;
out vec4 frag_color;

// Three-octave directional swell, body-local space. MUST stay in
// lockstep with the vertex-shader sum in src/shaders/water.glsl —
// any tweak to coefficients here has to be mirrored there or the
// terrain wet-line will desync from the actual wave crests on the
// cap. Keep the per-octave amplitudes summing to 0.36 m at
// amplitude=1.0 (matches the "0.50 m depth_offset_m cap drop"
// safety budget noted in hex_mesher.c).
float swell_at(vec2 xz, float t, float amp, float freq, float speed) {
    float ts = t * speed;
    float fx = freq;
    float s  = 0.0;
    s += sin(ts * 0.9 + xz.x * 1.4 * fx + xz.y * 0.6 * fx) * 0.18;
    s += sin(ts * 1.3 - xz.x * 0.7 * fx + xz.y * 1.2 * fx) * 0.12;
    s += sin(ts * 1.7 + xz.x * 2.3 * fx - xz.y * 1.9 * fx) * 0.06;
    return s * amp;
}

void main() {
    vec4 tex   = texture(sampler2D(hex_atlas, hex_atlas_smp), v_uv);
    vec3 color = tex.rgb * v_light;

    // Wet line. Fragment's signed altitude relative to sea level (in
    // metres along the body-local radial). Below sea_radius is
    // already covered by the water cap — we paint the wet tint there
    // too because a) chunks meet the cap edge along the side face
    // and we want both surfaces to read as the same colour at the
    // seam, and b) it lets a brief swell crest visually "lap up" a
    // few centimetres of dry block when the fragment's altitude
    // sits between 0 and the local crest. The smoothstep softness
    // hides aliasing on the wave-line edge.
    if (swell_params.w > 0.5) {
        float sea_r    = wet_params.x;
        float t        = wet_params.y;
        float softness = max(wet_params.z, 0.001);
        float amp      = swell_params.x;
        float freq     = swell_params.y;
        float speed    = swell_params.z;

        float alt   = length(v_local_pos) - sea_r;
        float wave  = swell_at(v_local_pos.xz, t, amp, freq, speed);
        float wet   = 1.0 - smoothstep(wave - softness, wave + softness, alt);
        color = mix(color, wet_color.xyz, wet * wet_color.w);
    }

    frag_color = vec4(color, tex.a);
}
@end


@program hex hex_vs hex_fs
