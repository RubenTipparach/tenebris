// Water cap shader. Animated procedural surface drawn over has_water
// bodies. All visual constants are baked in here; the C side only
// uploads the view-projection, the camera position, the sun
// direction, and a pre-scaled time (water_time_scale in renderer.c
// controls animation pace).
//
// Cross-compiled by sokol-shdc into water.glsl.h — the runtime gets
// water_shader_desc(sg_query_backend()), vs_params_t / fs_params_t,
// and ATTR_water_a_* / UB_* slot constants.

@vs water_vs

layout(binding=0) uniform vs_params {
    mat4 u_vp;     // pre-multiplied with model so a_pos is body-local
    float u_time;  // pre-scaled "subjective" time
};

in vec3 a_pos;
in vec3 a_normal;
in vec2 a_uv;     // unused; declared for shared-vbuf layout parity

out vec3 v_wpos;

void main() {
    // Radial from the planet centre, NOT the per-tile flat normal in
    // a_normal. Adjacent Goldberg tiles each carry their own
    // t->center as their flat normal, so using a_normal makes the
    // vertex swell push neighbour tiles in slightly different
    // directions — visible grid-pattern seams at every tile
    // boundary. normalize(a_pos) is identical for any vertex at the
    // same world position, so the cap stays watertight across
    // boundaries.
    vec3 n = normalize(a_pos);

    // Three-octave directional swell. Max combined amplitude 0.36 m
    // — well inside the 0.50 m cap drop in hex_mesher.c so wave
    // crests can't reach coplanar beach sand.
    float t = u_time;
    float swell = 0.0;
    swell += sin(t * 0.9 + a_pos.x * 1.4 + a_pos.z * 0.6) * 0.18;
    swell += sin(t * 1.3 - a_pos.x * 0.7 + a_pos.z * 1.2) * 0.12;
    swell += sin(t * 1.7 + a_pos.x * 2.3 - a_pos.z * 1.9) * 0.06;

    vec3 p = a_pos + n * swell;
    gl_Position = u_vp * vec4(p, 1.0);
    v_wpos = p;
}
@end


@fs water_fs

layout(binding=1) uniform fs_params {
    vec3 u_camera_pos;
    vec3 u_sun_dir;
    float u_time;
    float u_refract_amount;  // surface-gradient → screen UV perturbation scale
    float u_near;            // projection near plane (m)
    float u_far;             // projection far plane (m)
    vec3 u_absorption;       // Beer-Lambert sigma per RGB channel (1/m)
    vec3 u_deep_color;       // saturation colour where the ray has fully attenuated
    float u_shoreline_fade;  // smoothstep upper edge for thickness-driven alpha (m)
    float u_shore_foam_dist; // smoothstep upper edge for shoreline foam (m)
    float u_spec_intensity;  // sun-highlight strength multiplier
    float u_spec_power;      // Blinn-Phong exponent
    vec3  u_sun_tint;        // warm tint multiplied with the sun highlight
    vec4  u_foam_crest;      // x=lo, y=hi, z=weight, w=overall foam_intensity
    vec4  u_foam_slope;      // x=lo, y=hi, z=weight, w=unused
    vec3  u_foam_color;      // wave-crest + slope foam tint
    vec3  u_shore_foam_color;
    vec3  u_sky_horizon;     // reflected-ray-skimming-horizontal sky tint
    vec3  u_sky_zenith;      // reflected-ray-up sky tint
};

// water_scene_color / water_scene_depth are texture views of the
// offscreen colour + depth attachments rendered before the water
// draw. Sampled at gl_FragCoord-derived UV for screen-space
// refraction + manual depth-discard.
//
// Two samplers — colour gets LINEAR for smooth refraction, depth
// gets NEAREST because WebGL2 disallows linear-filtered depth-as-
// sampler2D and silently returns zero on most drivers (which
// caused the universal discard that made water invisible).
layout(binding=0) uniform texture2D water_scene_color;
layout(binding=1) uniform texture2D water_scene_depth;
layout(binding=0) uniform sampler   water_scene_smp;
layout(binding=1) uniform sampler   water_scene_depth_smp;

precision highp int;

in vec3 v_wpos;
out vec4 frag_color;

// 3D gradient (Perlin) noise — quintic fade, integer-hash gradient
// lookup, output in [-1, +1]. Replaces value noise to kill the
// axis-aligned cell boundaries that showed up as a visible grid
// across the cap surface. Same primitive used by the terrain fix in
// core/rng.c::gnoise3d_seed.
//
// Hash uses uint to keep wrap-around well-defined under GLSL ES 300
// (signed overflow is UB; unsigned is modulo-2^32). The cell coords
// are biased by 2^30 before the uint cast — negative-int-to-uint is
// indeterminate per the spec, so the bias keeps the operand in
// well-defined territory. The bias only relabels the hash space.
float gn_fade(float t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

uint gn_hash(int x, int y, int z) {
    uint ux = uint(x + 0x40000000);
    uint uy = uint(y + 0x40000000);
    uint uz = uint(z + 0x40000000);
    uint h = ux * 374761393u ^ uy * 668265263u ^ uz * 1274126177u;
    h = (h ^ (h >> 13u)) * 1103515245u;
    return h ^ (h >> 16u);
}

float gn_grad(uint hash, float x, float y, float z) {
    uint h = hash & 15u;
    float u = (h < 8u)  ? x : y;
    float v = (h < 4u)  ? y : ((h == 12u || h == 14u) ? x : z);
    return ((h & 1u) != 0u ? -u : u) + ((h & 2u) != 0u ? -v : v);
}

float gnoise3(vec3 p) {
    int ix = int(floor(p.x));
    int iy = int(floor(p.y));
    int iz = int(floor(p.z));
    float fx = p.x - float(ix);
    float fy = p.y - float(iy);
    float fz = p.z - float(iz);
    float u = gn_fade(fx);
    float v = gn_fade(fy);
    float w = gn_fade(fz);
    float g000 = gn_grad(gn_hash(ix,   iy,   iz  ), fx,       fy,       fz);
    float g100 = gn_grad(gn_hash(ix+1, iy,   iz  ), fx-1.0,   fy,       fz);
    float g010 = gn_grad(gn_hash(ix,   iy+1, iz  ), fx,       fy-1.0,   fz);
    float g110 = gn_grad(gn_hash(ix+1, iy+1, iz  ), fx-1.0,   fy-1.0,   fz);
    float g001 = gn_grad(gn_hash(ix,   iy,   iz+1), fx,       fy,       fz-1.0);
    float g101 = gn_grad(gn_hash(ix+1, iy,   iz+1), fx-1.0,   fy,       fz-1.0);
    float g011 = gn_grad(gn_hash(ix,   iy+1, iz+1), fx,       fy-1.0,   fz-1.0);
    float g111 = gn_grad(gn_hash(ix+1, iy+1, iz+1), fx-1.0,   fy-1.0,   fz-1.0);
    float a = mix(mix(g000, g100, u), mix(g010, g110, u), v);
    float b = mix(mix(g001, g101, u), mix(g011, g111, u), v);
    return mix(a, b, w);
}

// Three-octave fBm with per-octave time advection along different
// directions so the surface flow doesn't look like a single laminar
// stream.
float fbm3(vec3 p, float t) {
    float h = 0.0;
    vec3 q = p * 0.9 + vec3(t * 0.35, t * 0.18, -t * 0.42);
    h += gnoise3(q) * 0.50;
    q = q * 2.1 + vec3(-t * 0.22, t * 0.33, t * 0.17);
    h += gnoise3(q) * 0.28;
    q = q * 2.3 + vec3(t * 0.19, -t * 0.27, t * 0.11);
    h += gnoise3(q) * 0.15;
    return h;
}

void main() {
    // Radial from world-space position keeps lighting continuous
    // across tile boundaries.
    vec3 radial = normalize(v_wpos);

    // Scalar height + 3-sample finite-difference world-space
    // gradient. Epsilon ~8 cm — small enough to stay inside the
    // smallest noise cell, big enough to dodge fp noise.
    float h0 = fbm3(v_wpos, u_time);
    float e  = 0.08;
    vec3 grad = vec3(
        fbm3(v_wpos + vec3(e, 0, 0), u_time) - h0,
        fbm3(v_wpos + vec3(0, e, 0), u_time) - h0,
        fbm3(v_wpos + vec3(0, 0, e), u_time) - h0) / e;

    vec3 t_grad = grad - radial * dot(grad, radial);
    vec3 n = normalize(radial - t_grad * 0.65);

    // Screen-space UV: gl_FragCoord.xy is in pixels; texture size
    // gives us the divisor without needing a uniform.
    vec2 screen_size = vec2(textureSize(sampler2D(water_scene_color, water_scene_smp), 0));
    vec2 screen_uv   = gl_FragCoord.xy / screen_size;

    // Manual depth occlusion. Pipeline has HW depth-test disabled
    // (compare = ALWAYS) because the swapchain depth buffer doesn't
    // hold the offscreen scene's depth; we read it directly from the
    // offscreen depth texture and discard fragments behind opaque
    // geometry. Uses the NEAREST sampler (water_scene_depth_smp) —
    // see header comment.
    float scene_z = texture(sampler2D(water_scene_depth, water_scene_depth_smp), screen_uv).r;
    if (gl_FragCoord.z > scene_z) discard;

    // Refraction: perturb the colour-sample UV by the surface
    // tangent-plane gradient. Magnitude scales with u_refract_amount
    // so the C side can dial it without a shader rebuild.
    vec2 refract_uv = clamp(screen_uv + t_grad.xy * u_refract_amount,
                            vec2(0.0), vec2(1.0));
    vec3 refracted = texture(sampler2D(water_scene_color, water_scene_smp), refract_uv).rgb;

    // Beer-Lambert depth-thickness extinction. Linearise both the
    // water-surface depth and the sampled scene depth into camera-z
    // (metres), use their difference as the thickness of water the
    // view ray traverses. Per-channel exp(-thickness * sigma) gives
    // water its characteristic red-absorbed / blue-preserved tint as
    // depth grows.
    float zw = (2.0 * u_near * u_far) /
               (u_far + u_near - (2.0 * gl_FragCoord.z - 1.0) * (u_far - u_near));
    float zs = (2.0 * u_near * u_far) /
               (u_far + u_near - (2.0 * scene_z         - 1.0) * (u_far - u_near));
    float thickness = max(0.0, zs - zw);
    vec3  attenuation = exp(-thickness * u_absorption);

    vec3 view = normalize(u_camera_pos - v_wpos);
    vec3 sun  = normalize(u_sun_dir);

    float vdn = max(dot(view, n), 0.0);
    float f   = 0.02 + 0.98 * pow(1.0 - vdn, 5.0);

    // Mix between the refracted scene (visible through shallow
    // water) and the deep-water saturation tint (where the ray has
    // attenuated to zero). attenuation is a per-channel lerp factor:
    // high → see-through, low → deep colour.
    vec3 base = mix(u_deep_color, refracted, attenuation);

    vec3 refl   = reflect(-view, n);
    float up_f  = clamp(dot(refl, radial), 0.0, 1.0);
    vec3 sky    = mix(u_sky_horizon, u_sky_zenith, up_f);

    vec3  halfv = normalize(view + sun);
    float spec  = pow(max(dot(n, halfv), 0.0), u_spec_power);
    vec3  sun_highlight = u_sun_tint * spec * u_spec_intensity;

    float steepness = length(t_grad);
    float crest     = smoothstep(u_foam_crest.x, u_foam_crest.y, h0);
    float slope_f   = smoothstep(u_foam_slope.x, u_foam_slope.y, steepness);
    float foam      = max(crest * u_foam_crest.z, slope_f * u_foam_slope.z);

    // Shoreline foam — thickness-driven white wash where the water
    // meets the seabed. 1 at thickness=0 (cap edge), 0 by
    // u_shore_foam_dist. Modulated by fbm height so the band has
    // texture instead of being a flat band. Adds to crest/slope foam
    // but lives on its own alpha track so it stays visible inside
    // the shoreline_fade region (otherwise the alpha feather would
    // wash it out).
    float shore_foam = 1.0 - smoothstep(0.0, u_shore_foam_dist, thickness);
    shore_foam *= 0.6 + 0.4 * smoothstep(-0.4, 0.4, h0);

    vec3 color = mix(base, sky, f) + sun_highlight;
    color = mix(color, u_foam_color, foam * u_foam_crest.w);

    // Shoreline foam covers the cap-edge silhouette: at thickness ~0
    // shore_foam is 1.0, so this mix replaces the cap pixel with the
    // foam tint (no underlying terrain visible). Past
    // u_shore_foam_dist the foam fades away and we see the
    // refracted+attenuated water colour from above.
    color = mix(color, u_shore_foam_color, shore_foam);

    frag_color = vec4(color, 1.0);
}
@end


@program water water_vs water_fs
