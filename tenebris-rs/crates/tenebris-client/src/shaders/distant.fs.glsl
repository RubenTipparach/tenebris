#version 410

// Distant-LOD planet surface (the globe seen from orbit). Samples the baked
// equirect albedo + normal texture, does a Lambert + water-specular pass, then
// adds an ATMOSPHERIC RIM fresnel so the limb of the globe glows the way a real
// planet's air shell scatters light at grazing angles - the "less bland from
// space" look (rim knobs in lod.yaml, ported technique from Astrak/three-planets).
//
// distant_fs_params:
//   [0] xyz = sun direction (normalized)
//   [1] xyz = ambient
//   [2] xyz = camera position (same space as v_world_pos), w = normal strength
//   [3] xyz = water specular tint, w = water specular intensity
//   [4] x   = water specular power
//   [5] xyz = rim colour, w = rim fresnel power        (hand-added)
//   [6] x   = rim intensity, y = rim night-side floor  (hand-added)
uniform vec4 distant_fs_params[7];
uniform sampler2D tex_albedo_smp_clamp;
uniform sampler2D tex_normal_smp_clamp;

layout(location = 0) in vec3 v_dir;
layout(location = 1) in vec3 v_world_pos;
layout(location = 0) out vec4 frag_color;

vec2 dir_to_uv(vec3 d) {
    return vec2(0.5 + atan(d.z, d.x) * 0.15915493667125701904296875,
                0.5 - asin(clamp(d.y, -1.0, 1.0)) * 0.3183098733425140380859375);
}

void main() {
    vec3 n_geo = normalize(v_dir);
    vec2 uv = dir_to_uv(n_geo);
    vec4 alb = texture(tex_albedo_smp_clamp, uv);
    vec4 nrm = texture(tex_normal_smp_clamp, uv);
    vec3 sun = normalize(distant_fs_params[0].xyz);

    // Tangent-space normal perturbation about the geometric sphere normal.
    // FADE the perturbation toward the terminator: where the geometric
    // surface is turning into shadow (n_geo . sun near 0), a full-strength
    // bump flips dot(n,sun) light/dark texel to texel and speckles the
    // terminator - the "strange coloring" on the dark edge. Off the sunlit
    // face the globe uses the smooth geometric normal, so the terminator is
    // a clean gradient; the day side keeps its relief.
    float ndl_geo = dot(n_geo, sun);
    float detail_fade = smoothstep(0.0, 0.25, ndl_geo);
    vec3 ref = (abs(n_geo.y) < 0.9) ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 tang = normalize(cross(ref, n_geo));
    vec2 dn = (nrm.xy * 2.0 - vec2(1.0)) * (distant_fs_params[2].w * detail_fade);
    vec3 n = normalize(n_geo + tang * dn.x + cross(n_geo, tang) * dn.y);

    vec3 lit = alb.xyz * (distant_fs_params[1].xyz + vec3(max(dot(n, sun), 0.0)));

    // Water specular glint (alpha of the albedo tags open water).
    float water = alb.w;
    vec3 view_dir = normalize(distant_fs_params[2].xyz - v_world_pos);
    if (water > 0.001) {
        vec3 h = normalize(view_dir + sun);
        lit += distant_fs_params[3].xyz
             * (pow(max(dot(n, h), 0.0), distant_fs_params[4].x) * distant_fs_params[3].w)
             * water;
    }

    // Atmospheric rim: grazing-angle fresnel on the GEOMETRIC normal (so the
    // halo is a clean ring, not broken up by the surface normal map), tinted
    // atmospheric blue and scaled up on the sunlit crescent - with a floor so
    // the night limb keeps a faint edge instead of a hard cut to black space.
    float fres = pow(1.0 - clamp(dot(n_geo, view_dir), 0.0, 1.0), distant_fs_params[5].w);
    float day = max(dot(n_geo, sun), 0.0);
    float rim_lit = distant_fs_params[6].y + (1.0 - distant_fs_params[6].y) * day;
    lit += distant_fs_params[5].xyz * (fres * rim_lit * distant_fs_params[6].x);

    frag_color = vec4(lit, 0.0);
}
