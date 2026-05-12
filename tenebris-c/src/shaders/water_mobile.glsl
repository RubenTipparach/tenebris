// Mobile water cap shader.
//
// Differences from water.glsl:
//
//   * No vertex swell - the cap stays geometrically flat at the
//     radius hex_mesher placed it. The fragment-shader fbm normal-
//     bump below tilts the lighting; phones don't gain anything
//     visible from displacing the vertices on top of that.
//
//   * No screen-space refraction sample. The base water tone is a
//     constant u_deep_color instead of `mix(deep_color, refracted,
//     attenuation)` - water reads as solid water from above
//     regardless of depth. The seabed shows through the underlying
//     composite_mobile blit only at the shoreline, where the cap
//     mesh ends and dry terrain takes over.
//
//   * No per-fragment Beer-Lambert thickness fog. The depth-fog
//     effect is moved to composite_mobile, triggered on
//     camera-submerged and applied to every pixel rather than gated
//     by the fbm-driven thickness mask.
//
//   * No Snell-window backface branch, no foam, no offscreen depth
//     read (the offscreen depth is forwarded into the swapchain
//     depth buffer by composite_mobile, so the LESS_EQUAL depth
//     test handles terrain occlusion).
//
// The fbm-based normal generation itself is bit-identical to
// water.glsl - same gnoise3 hash, same 3-octave fbm, same 4-sample
// finite-difference gradient, same tangent-plane projection. The
// surface noise pattern matches the heavy shader profile exactly.

@vs water_mobile_vs

layout(binding=0) uniform vs_params_mobile {
    mat4 u_vp;
    vec4 u_planet;
    vec4 u_sun_dir;
    vec4 u_terminator;
};

in vec3  a_pos;
in float a_sky_light;
in float a_torch_light;

out vec3  v_wpos;
out float v_sun_brightness;
out float v_sky_light;
out float v_torch_light;

void main() {
    gl_Position = u_vp * vec4(a_pos, 1.0);
    v_wpos = a_pos;
    v_sky_light   = a_sky_light;
    v_torch_light = a_torch_light;

    vec3 surface_dir = normalize(a_pos - u_planet.xyz);
    float sun_facing = dot(surface_dir, normalize(u_sun_dir.xyz));
    v_sun_brightness = smoothstep(u_terminator.y, u_terminator.z, sun_facing);
}
@end


@fs water_mobile_fs

layout(binding=1) uniform fs_params_mobile {
    vec3  u_camera_pos;
    vec3  u_sun_dir;
    float u_time;
    vec3  u_deep_color;
    float u_spec_intensity;
    float u_spec_power;
    vec3  u_sun_tint;
    vec3  u_sky_horizon;
    vec3  u_sky_zenith;
    float u_sky_horizon_strength;
    float u_ripple_scale;
    float u_ripple_speed;
    float u_wave_steepness;
    float u_night_floor;
    vec4  u_torch_color;
};

precision highp int;

in vec3  v_wpos;
in float v_sun_brightness;
in float v_sky_light;
in float v_torch_light;
out vec4 frag_color;

// 3D gradient (Perlin) noise - identical to water.glsl's
// implementation. Same quintic fade, same uint hash, same gradient
// lookup, same range. Surface noise pattern matches the desktop
// pipeline exactly.
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
    vec3 radial = normalize(v_wpos);

    // Scalar height + 3-sample finite-difference world-space
    // gradient. Identical to water.glsl's normal generation.
    vec3  rp = v_wpos * u_ripple_scale;
    float rt = u_time * u_ripple_speed;
    float e  = 0.08;
    float h0 = fbm3(rp, rt);
    vec3 grad = vec3(
        fbm3(rp + vec3(e, 0, 0), rt) - h0,
        fbm3(rp + vec3(0, e, 0), rt) - h0,
        fbm3(rp + vec3(0, 0, e), rt) - h0) / e;

    vec3 t_grad = grad - radial * dot(grad, radial);
    vec3 n = normalize(radial - t_grad * u_wave_steepness);

    vec3 view = normalize(u_camera_pos - v_wpos);
    vec3 sun  = normalize(u_sun_dir);

    // Fresnel + sky reflection. Same math as the desktop pipeline.
    vec3 refl   = reflect(-view, n);
    float up_f  = clamp(dot(refl, radial), 0.0, 1.0);
    vec3 sky    = mix(u_sky_horizon, u_sky_zenith, up_f);

    float vdn = max(dot(view, n), 0.0);
    float f   = 0.02 + 0.98 * pow(1.0 - vdn, 5.0);

    float sky_weight = f * mix(u_sky_horizon_strength, 1.0, up_f);

    // Constant deep_color body - no thickness fog on the surface,
    // no refraction sample. Camera-submerged fog in composite_mobile
    // takes over for the under-water case.
    vec3 base  = u_deep_color;
    vec3 color = mix(base, sky, sky_weight);

    // Sun highlight - same Blinn-Phong as the desktop path.
    vec3  halfv = normalize(view + sun);
    float spec  = pow(max(dot(n, halfv), 0.0), u_spec_power);
    color += u_sun_tint * spec * u_spec_intensity;

    // Day/night dim - matches the terrain + desktop water shaders.
    float ambient_dn = mix(u_night_floor, 1.0, v_sun_brightness * v_sky_light);
    color *= ambient_dn;

    // Torch contribution - feeds only the Fresnel sky channel, same
    // as the desktop water path; the bulk of the cap doesn't pick
    // up a flat torch tint.
    vec3 torch = u_torch_color.xyz * u_torch_color.w * v_torch_light;
    color += torch * sky_weight;

    frag_color = vec4(color, 1.0);
}
@end

@program water_mobile water_mobile_vs water_mobile_fs
