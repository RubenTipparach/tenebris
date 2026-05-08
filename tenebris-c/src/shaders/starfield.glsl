// Starfield + nebula shader. Fullscreen pass that draws the deep
// space backdrop — three Voronoi star layers + 5-octave fbm nebula
// blended over a constant space colour. Always opaque; replaces
// whatever was in the framebuffer.
//
// Drawn first in the offscreen pass. The atmosphere shader runs
// next, alpha-blended on top; later opaque draws (sun, terrain,
// water, moons) paint over both.

@vs starfield_vs

out vec2 v_ndc;

void main() {
    vec2 pos = vec2((gl_VertexIndex << 1) & 2, gl_VertexIndex & 2);
    pos = pos * 2.0 - 1.0;
    gl_Position = vec4(pos, 0.99999, 1.0);
    v_ndc = pos;
}
@end


@fs starfield_fs

layout(binding=0) uniform starfield_params {
    vec3 u_cam_right;
    vec3 u_cam_up;
    vec3 u_cam_fwd;
    vec4 u_sky_params;        // x=tan(fovY/2), y=aspect, z=time, w=bg_atten
    vec4 u_star_densities;    // xyz=3 layer densities, w=sharpness
    vec4 u_star_intensities;  // xyz=3 layer weights, w=brightness threshold
    vec3 u_star_color;
    vec3 u_nebula_warm;
    vec3 u_nebula_cool;
    vec4 u_nebula_params;     // x=intensity, y=drift, z=scale1, w=scale2
    vec4 u_nebula_smoothstep; // xy=cloud (lo,hi), zw=warm-blend (lo,hi)
    vec3 u_space_color;
};

in vec2 v_ndc;
out vec4 frag_color;

float vh1(float x) {
    return fract(x + 1.3215 * 1.8152);
}
float vh3(vec3 a) {
    return fract((vh1(a.z * 42.8883) + vh1(a.y * 36.9125) + vh1(a.x * 65.4321)) * 291.1257);
}
vec3 rh3(float x) {
    return vec3(
        vh1(((x + 0.5283) * 59.3829) * 274.3487),
        vh1(((x + 0.8192) * 83.6621) * 345.3871),
        vh1(((x + 0.2157) * 36.6521) * 458.3971));
}

float voronoi_star(vec3 dir, float density, out float cell_id) {
    vec3 pos = dir * density;
    vec3 base = floor(pos);
    float m = 9999.0;
    float w = 0.0;
    for (int x = -1; x < 2; ++x) {
        for (int y = -1; y < 2; ++y) {
            for (int z = -1; z < 2; ++z) {
                vec3 cell = base + vec3(float(x), float(y), float(z));
                float h = vh3(cell);
                vec3 pt = rh3(h) + cell;
                vec3 diff = pos - pt;
                float d2 = dot(diff, diff);
                if (d2 < m) { m = d2; w = h; }
            }
        }
    }
    cell_id = w;
    return m;
}
float starfield_layer(vec3 dir, float density) {
    float cid;
    float d2 = voronoi_star(dir, density, cid);
    float star = 1.0 - smoothstep(0.0, u_star_densities.w, d2);
    float br   = fract(cid * 123.456);
    return star * br * step(u_star_intensities.w, br);
}

float vnoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 s = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(mix(vh3(i),                  vh3(i + vec3(1, 0, 0)), s.x),
            mix(vh3(i + vec3(0, 1, 0)),  vh3(i + vec3(1, 1, 0)), s.x), s.y),
        mix(mix(vh3(i + vec3(0, 0, 1)),  vh3(i + vec3(1, 0, 1)), s.x),
            mix(vh3(i + vec3(0, 1, 1)),  vh3(i + vec3(1, 1, 1)), s.x), s.y),
        s.z);
}
float fbm5(vec3 p) {
    float v = 0.0; float a = 0.5; vec3 q = p;
    for (int i = 0; i < 5; ++i) { v += a * vnoise(q); q *= 2.07; a *= 0.5; }
    return v;
}

void main() {
    float t  = u_sky_params.x;
    float ar = u_sky_params.y;
    vec3 d = normalize(u_cam_fwd
                     + v_ndc.x * ar * t * u_cam_right
                     + v_ndc.y * t       * u_cam_up);

    float stars = 0.0;
    stars += starfield_layer(d, u_star_densities.x) * u_star_intensities.x;
    stars += starfield_layer(d, u_star_densities.y) * u_star_intensities.y;
    stars += starfield_layer(d, u_star_densities.z) * u_star_intensities.z;
    vec3 starColor = u_star_color * stars;

    float drift = u_sky_params.z * u_nebula_params.y;
    float n  = fbm5(d * u_nebula_params.z + vec3(drift, 0.0, drift * 0.7));
    float n2 = fbm5(d * u_nebula_params.w + vec3(7.3, 2.1, 9.9));
    float cloud = smoothstep(u_nebula_smoothstep.x, u_nebula_smoothstep.y, n);
    vec3 nebula = mix(u_nebula_cool, u_nebula_warm,
                      smoothstep(u_nebula_smoothstep.z, u_nebula_smoothstep.w, n2))
                  * cloud * u_nebula_params.x;

    vec3 col = u_space_color + nebula + starColor;

    // bg_atten fades stars + nebula as the camera dives into the
    // atmosphere — at ground level it's near zero so the daytime
    // sky is the atmosphere alone, in space it's 1.0 so stars are
    // full-bright. Computed per-frame on the C side from the
    // camera's altitude through the atmosphere shell.
    col *= u_sky_params.w;

    /* Alpha = wet mask (0 = dry). Stars/nebula are sky pixels —
     * never underwater, so dry. composite.glsl reads this. */
    frag_color = vec4(col, 0.0);
}
@end


@program starfield starfield_vs starfield_fs
