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
};

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
    // Same trick as the VS: derive the radial from world-space
    // position, not from a per-tile-flat varying. Keeps lighting
    // continuous across tile boundaries.
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
