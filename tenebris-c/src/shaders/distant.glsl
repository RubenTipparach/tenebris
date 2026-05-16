// Distant body shader. Subdivided icosphere with PER-PIXEL colour
// sampled from two pre-baked equirectangular textures per body:
//
//   tex_albedo  (RGBA8) — RGB = albedo (biome colour mixed with water
//                         tint, height shade, tileset palette), A =
//                         water mask used to gate the specular layer.
//   tex_normal  (RGBA8) — RG = tangent-space dx/dy of the surface
//                         altitude noise, B = roughness mask (unused
//                         today but reserved), A = unused.
//
// Both textures are generated at register time by the renderer's
// build_planet_lod_textures() helper, driving the same noise + biome
// rules the chunked terrain uses, so the distant LOD looks like a
// zoomed-out preview of the actual planet rather than a per-tile
// blocky average. Lighting is Lambert + Blinn-Phong specular for the
// water mask; the perturbed normal carries the high-frequency terrain
// detail that the icosphere mesh can't represent geometrically.
// Cross-compiled by sokol-shdc into distant.glsl.h.

@vs distant_vs

layout(binding=0) uniform distant_vs_params {
    mat4 u_mvp;
};

in vec3 a_pos;
in vec3 a_normal;

out vec3 v_dir;        /* body-radial direction (= unit normal)  */
out vec3 v_world_pos;  /* world-space position for view ray calc */

void main() {
    gl_Position = u_mvp * vec4(a_pos, 1.0);
    v_dir       = normalize(a_normal);
    v_world_pos = a_pos;
}
@end


@fs distant_fs

layout(binding=1) uniform distant_fs_params {
    vec3  u_sun_dir;
    float u_pad0;
    vec3  u_ambient;
    float u_pad1;
    vec3  u_camera_pos;
    float u_normal_strength;   /* tangent-space slope multiplier      */
    vec3  u_water_specular_tint;
    float u_water_specular_intensity;
    float u_water_specular_power;
    float u_pad2;
    float u_pad3;
    float u_pad4;
};

layout(binding=0) uniform texture2D tex_albedo;
layout(binding=1) uniform texture2D tex_normal;
layout(binding=0) uniform sampler   smp_clamp;

in vec3 v_dir;
in vec3 v_world_pos;
out vec4 frag_color;

const float PI = 3.14159265359;

/* Equirectangular sample. U sweeps longitude (atan2 of XZ); V sweeps
 * latitude (asin of Y). The same mapping the generator uses on the C
 * side - if you change one, change the other. */
vec2 dir_to_uv(vec3 d) {
    float u = 0.5 + atan(d.z, d.x) / (2.0 * PI);
    float v = 0.5 - asin(clamp(d.y, -1.0, 1.0)) / PI;
    return vec2(u, v);
}

void main() {
    vec3 d  = normalize(v_dir);
    vec2 uv = dir_to_uv(d);

    vec4 alb = texture(sampler2D(tex_albedo, smp_clamp), uv);
    vec4 nm  = texture(sampler2D(tex_normal, smp_clamp), uv);
    /* Normal map: RG channels carry (dx, dy) in [-1, +1] after the
     * texture's *2-1 remap; we apply them in a local tangent frame.
     * Tangent built from world-up handles the pole singularity by
     * swapping the reference axis when the surface points along Y. */
    vec3 ref = (abs(d.y) < 0.9) ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 tangent   = normalize(cross(ref, d));
    vec3 bitangent = cross(d, tangent);
    vec2 slope = (nm.rg * 2.0 - 1.0) * u_normal_strength;
    vec3 n = normalize(d + tangent * slope.x + bitangent * slope.y);

    /* Lambert. The terrain albedo already encodes height + biome
     * shading, so the lit colour is just a NdotL multiplier on top
     * of the ambient floor. */
    float ndl = max(dot(n, normalize(u_sun_dir)), 0.0);
    vec3 lit  = alb.rgb * (u_ambient + vec3(ndl));

    /* Specular layer for water. Gated by the water mask (alb.a) so
     * dry terrain stays matte while ocean catches a sun glint. View
     * direction is camera->fragment in world space; reflected highlight
     * along the half-vector of view+sun. */
    float water = alb.a;
    if (water > 0.001) {
        vec3 view     = normalize(u_camera_pos - v_world_pos);
        vec3 half_vec = normalize(view + normalize(u_sun_dir));
        float ndh     = max(dot(n, half_vec), 0.0);
        float spec    = pow(ndh, u_water_specular_power)
                      * u_water_specular_intensity * water;
        lit += u_water_specular_tint * spec;
    }

    /* Alpha = wet mask (0 = dry). Distant LOD planets are sky-side
     * surfaces seen from afar — never the local water we fog. */
    frag_color = vec4(lit, 0.0);
}
@end


@program distant distant_vs distant_fs
