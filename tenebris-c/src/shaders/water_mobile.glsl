// Mobile water cap shader. Same vertex inputs and same per-body
// uniform feed as water.glsl, but the fragment path skips every
// cost centre that mobile GPUs struggle with:
//
//   * No offscreen scene_color / scene_depth sampling - the cap is
//     plain alpha-blended on top of the swapchain composite, so the
//     mobile path also doesn't need the FBO depth read for thickness
//     or the dependent texture fetch for refraction.
//   * No fbm noise - the surface normal is perturbed by two cheap
//     sines instead of the four 3-octave gradient-noise evaluations
//     the desktop fragment path does.
//   * No Snell-window backface branch, no foam, no Beer-Lambert
//     thickness integral - opacity is a fixed Fresnel-driven alpha
//     blend toward deep_color.
//   * No vertex swell - the surface stays geometrically flat. The
//     fragment-shader bump is enough to read as water without paying
//     for displaced geometry; phones don't gain anything visible
//     from the vertex sines since the same surface reads bumpy via
//     the normal perturbation below.
//
// Picked at renderer_init time when renderer_set_perf_mode(true) was
// called before init - main_web.c calls that when EM_JS detects a
// mobile user agent. The full water.glsl pipeline still ships for
// desktop / high-end paths.

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
    float u_ripple_speed;
    float u_wave_steepness;
    float u_night_floor;
    vec4  u_torch_color;
};

in vec3  v_wpos;
in float v_sun_brightness;
in float v_sky_light;
in float v_torch_light;
out vec4 frag_color;

void main() {
    vec3 radial = normalize(v_wpos);

    // Two-sine normal perturbation - cheap analytical "bump map" for
    // the water surface. Replaces the desktop path's 4-sample fbm
    // gradient. The perturbation direction lives in the surface
    // tangent plane (built by removing the radial component), so it
    // tilts the normal without changing how the cap reads as a
    // sphere.
    float t = u_time * u_ripple_speed;
    float s1 = sin(v_wpos.x * 1.7 + v_wpos.z * 1.3 + t * 1.4);
    float s2 = sin(v_wpos.z * 2.1 - v_wpos.x * 0.9 + t * 1.7);
    vec3  bump = vec3(s1, 0.0, s2) * (u_wave_steepness * 0.18);
    vec3 t_bump = bump - radial * dot(bump, radial);
    vec3 n = normalize(radial - t_bump);

    vec3 view = normalize(u_camera_pos - v_wpos);
    vec3 sun  = normalize(u_sun_dir);

    // Fresnel + sky reflection. Identical math to the desktop path
    // but fed by a flat base colour instead of a screen-sampled
    // refracted scene - mobile gets a stylised solid-water look.
    vec3 refl  = reflect(-view, n);
    float up_f = clamp(dot(refl, radial), 0.0, 1.0);
    vec3 sky   = mix(u_sky_horizon, u_sky_zenith, up_f);

    float vdn = max(dot(view, n), 0.0);
    float f   = 0.02 + 0.98 * pow(1.0 - vdn, 5.0);

    vec3 base = u_deep_color;
    vec3 color = mix(base, sky, f);

    // Sun highlight - cheap Blinn-Phong.
    vec3  halfv = normalize(view + sun);
    float spec  = pow(max(dot(n, halfv), 0.0), u_spec_power);
    color += u_sun_tint * spec * u_spec_intensity;

    // Day/night dim, mirrors the full shader.
    float ambient_dn = mix(u_night_floor, 1.0, v_sun_brightness * v_sky_light);
    color *= ambient_dn;

    // Torch contribution - only feeds the Fresnel sky channel so the
    // body of the water doesn't read as flat yellow under a flame.
    vec3 torch = u_torch_color.xyz * u_torch_color.w * v_torch_light;
    color += torch * f;

    // Alpha-blended output. Higher Fresnel = more opaque (glancing
    // angles show sky reflection); top-down view stays translucent
    // so the seabed reads through. Floor at 0.55 keeps deep water
    // visually present even when viewed straight down.
    float alpha = clamp(0.55 + 0.45 * f, 0.0, 1.0);
    frag_color = vec4(color, alpha);
}
@end

@program water_mobile water_mobile_vs water_mobile_fs
